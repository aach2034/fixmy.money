import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  stored: '',
  uploadError: false,
  downloadError: false,
  upload: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ storage: { from: () => ({
    upload: async (_path: string, bytes: Buffer) => {
      mocks.upload();
      if (mocks.uploadError) return { error: new Error('object exists') };
      mocks.stored = bytes.toString('utf8');
      return { error: null };
    },
    download: async () => ({ data: mocks.downloadError ? null : new Blob([mocks.stored]),
      error: mocks.downloadError ? new Error('unavailable') : null }),
  }) } }),
}));
vi.mock('@/lib/admin/authorization', () => ({ requireRecentPlatformAdmin: vi.fn() }));

import { ensurePrivateArtifact } from '@/app/api/admin/personal-packets/[cycleId]/generate/route';

const content = 'private review packet';
const hash = createHash('sha256').update(content).digest('hex');

describe('private packet artifact writes', () => {
  beforeEach(() => {
    mocks.stored = '';
    mocks.uploadError = false;
    mocks.downloadError = false;
    mocks.upload.mockReset();
  });
  it('verifies uploaded bytes before they can be used as completion evidence', async () => {
    await expect(ensurePrivateArtifact('owner/cycle/packet.txt', content, hash)).resolves.toBeUndefined();
    expect(mocks.stored).toBe(content);
  });
  it('accepts an idempotent retry only when prior bytes match', async () => {
    mocks.uploadError = true;
    mocks.stored = content;
    await expect(ensurePrivateArtifact('owner/cycle/packet.txt', content, hash)).resolves.toBeUndefined();
    mocks.stored = 'different packet';
    await expect(ensurePrivateArtifact('owner/cycle/packet.txt', content, hash)).rejects.toMatchObject({ code: 'ARTIFACT_WRITE_FAILED' });
  });
  it('stops partial generation when verification fails after upload', async () => {
    mocks.downloadError = true;
    await expect(ensurePrivateArtifact('owner/cycle/packet.txt', content, hash)).rejects.toMatchObject({ code: 'ARTIFACT_HASH_MISMATCH' });
  });
});
