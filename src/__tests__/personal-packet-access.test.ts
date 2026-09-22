import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  cycleOwner: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  cycleId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  state: 'suspended_nonpayment',
  expectedHash: '',
  body: 'private packet',
  signed: vi.fn(),
  audited: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({
    data: { user: mocks.userId ? { id: mocks.userId } : null }, error: null,
  }) } }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: (table: string) => table === 'consumer_service_audit_events'
      ? { insert: async (record: unknown) => { mocks.audited(record); return { error: null }; } }
      : { select: () => {
        const filters: Record<string, string> = {};
        const query = {
          eq: (key: string, value: string) => { filters[key] = value; return query; },
          maybeSingle: async () => ({ data: filters.consumer_id === mocks.cycleOwner &&
            filters.id === mocks.cycleId ? {
              id: mocks.cycleId, state: mocks.state, cycle_started_at: '2026-08-01T00:00:00Z',
              cycle_ends_at: '2026-08-31T00:00:00Z',
              packet_storage_path: `${mocks.cycleOwner}/${mocks.cycleId}/packet.txt`,
              packet_sha256: mocks.expectedHash, completed_at: '2026-09-01T00:00:00Z',
            } : null, error: null }),
        };
        return query;
      } },
    storage: { from: () => ({
      download: async () => ({ data: new Blob([mocks.body]), error: null }),
      createSignedUrl: async () => { mocks.signed(); return { data: { signedUrl: 'https://example.test/signed' }, error: null }; },
    }) },
  }),
}));

import { GET } from '@/app/api/personal-packets/[cycleId]/route';

const request = () => new NextRequest(`https://fixmy.money/api/personal-packets/${mocks.cycleId}`);
const context = () => ({ params: Promise.resolve({ cycleId: mocks.cycleId }) });

describe('private Personal packet access', () => {
  beforeEach(async () => {
    const { createHash } = await import('node:crypto');
    mocks.userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    mocks.cycleOwner = mocks.userId;
    mocks.state = 'suspended_nonpayment';
    mocks.body = 'private packet';
    mocks.expectedHash = createHash('sha256').update(mocks.body).digest('hex');
    mocks.signed.mockReset();
    mocks.audited.mockReset();
  });

  it('denies unauthenticated and cross-tenant requests without signing', async () => {
    mocks.userId = '';
    expect((await GET(request(), context())).status).toBe(401);
    mocks.userId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    expect((await GET(request(), context())).status).toBe(404);
    expect(mocks.signed).not.toHaveBeenCalled();
  });

  it('denies a stored-byte hash mismatch before signing or access audit', async () => {
    mocks.body = 'tampered packet';
    expect((await GET(request(), context())).status).toBe(503);
    expect(mocks.signed).not.toHaveBeenCalled();
    expect(mocks.audited).not.toHaveBeenCalled();
  });

  it('retains historical access during suspension and audits the access', async () => {
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    expect((await response.json()).url).toBe('https://example.test/signed');
    expect(mocks.signed).toHaveBeenCalledOnce();
    expect(mocks.audited).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'packet_accessed', actor_id: mocks.userId, evidence_ref: mocks.expectedHash,
    }));
  });
});
