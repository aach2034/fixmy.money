import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  assertPrivateBucket,
  assertProductionTarget,
  runGuardedPurge,
  validateManifestBytes,
  type ApprovedObject,
  type StoragePort,
} from '../../scripts/purge-fmm-002-raw-artifacts';

const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const contents = new Map([
  [`${ownerA}/ocr-cache/a.json`, 'alpha'],
  [`${ownerB}/ocr-temp/b.pdf`, 'beta'],
]);

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function approvedObjects(): ApprovedObject[] {
  return [...contents].map(([path, value]) => ({
    path,
    bytes: Buffer.byteLength(value),
    sha256: digest(value),
  }));
}

function manifestBytes(records = approvedObjects()) {
  return Buffer.from(JSON.stringify(records));
}

function manifestExpectations(bytes: Uint8Array) {
  return {
    manifestSha256: createHash('sha256').update(bytes).digest('hex'),
    objects: 2,
    bytes: 9,
    cacheObjects: 1,
    tempObjects: 1,
  };
}

class FakeStorage implements StoragePort {
  readonly files = new Map<string, { content: string; id: string; updatedAt: string }>();
  readonly downloads: string[] = [];
  readonly removals: string[][] = [];

  constructor(values = contents) {
    let index = 0;
    for (const [path, content] of values) {
      this.files.set(path, {
        content,
        id: `object-${index += 1}`,
        updatedAt: '2026-09-25T00:00:00Z',
      });
    }
  }

  async list(prefix: string) {
    const childNames = new Set<string>();
    for (const path of this.files.keys()) {
      if (prefix && !path.startsWith(`${prefix}/`)) continue;
      const remainder = prefix ? path.slice(prefix.length + 1) : path;
      if (remainder) childNames.add(remainder.split('/')[0]);
    }
    const data = [...childNames].sort().map(name => {
      const path = prefix ? `${prefix}/${name}` : name;
      const file = this.files.get(path);
      return file
        ? {
            name,
            id: file.id,
            updated_at: file.updatedAt,
            metadata: { size: Buffer.byteLength(file.content) },
          }
        : { name, id: null, updated_at: null, metadata: null };
    });
    return { data, error: null };
  }

  async download(path: string) {
    this.downloads.push(path);
    const file = this.files.get(path);
    return file
      ? { data: new Blob([file.content]), error: null }
      : { data: null, error: { message: 'missing' } };
  }

  async remove(paths: string[]) {
    this.removals.push([...paths]);
    for (const path of paths) this.files.delete(path);
    return { error: null };
  }
}

describe('FMM-002 Storage purge guard', () => {
  it('accepts only the exact checksummed manifest shape', () => {
    const bytes = manifestBytes();
    expect(validateManifestBytes(bytes, manifestExpectations(bytes))).toHaveLength(2);

    const tampered = Buffer.from(bytes);
    tampered[tampered.length - 2] ^= 1;
    expect(() => validateManifestBytes(tampered, manifestExpectations(bytes)))
      .toThrow('checksum does not match');
  });

  it('rejects duplicate manifest paths before Storage access', () => {
    const records = approvedObjects();
    records[1] = { ...records[0] };
    const bytes = manifestBytes(records);
    expect(() => validateManifestBytes(bytes, manifestExpectations(bytes)))
      .toThrow('does not match the approved object preimage');
  });

  it('locks execution to the production project and a modern secret', () => {
    expect(() => assertProductionTarget(
      'https://agxzfdyvewptjwdfuvwq.supabase.co',
      'sb_secret_test',
    )).not.toThrow();
    expect(() => assertProductionTarget('https://example.supabase.co', 'sb_secret_test'))
      .toThrow('locked to project');
    expect(() => assertProductionTarget(
      'https://agxzfdyvewptjwdfuvwq.supabase.co/?unexpected=1',
      'sb_secret_test',
    )).toThrow('locked to project');
    expect(() => assertProductionTarget(
      'https://agxzfdyvewptjwdfuvwq.supabase.co',
      'legacy-jwt',
    )).toThrow('modern Supabase secret');
  });

  it('requires the exact private recovery bucket', () => {
    expect(() => assertPrivateBucket({
      id: 'evidence-documents',
      name: 'evidence-documents',
      public: false,
    })).not.toThrow();
    expect(() => assertPrivateBucket({
      id: 'evidence-documents',
      name: 'evidence-documents',
      public: true,
    })).toThrow('exact private evidence-documents bucket');
  });

  it('checks every approved object without deleting in dry-run mode', async () => {
    const storage = new FakeStorage();
    const log = vi.fn();
    await runGuardedPurge({ storage, approved: approvedObjects(), execute: false, log });
    expect(storage.downloads).toHaveLength(2);
    expect(storage.removals).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"checksumsVerified":2'));
  });

  it('performs zero deletes when the live set or a checksum differs', async () => {
    const extra = new Map(contents);
    extra.set(`${ownerA}/ocr-cache/unapproved.json`, 'extra');
    const extraStorage = new FakeStorage(extra);
    await expect(runGuardedPurge({
      storage: extraStorage,
      approved: approvedObjects(),
      execute: true,
      confirmation: 'DELETE_EXACT_13_VERIFIED_FMM002_OBJECTS',
    })).rejects.toThrow('count does not match');
    expect(extraStorage.downloads).toHaveLength(0);
    expect(extraStorage.removals).toHaveLength(0);

    const changed = new Map(contents);
    changed.set(`${ownerA}/ocr-cache/a.json`, 'ALPHA');
    const changedStorage = new FakeStorage(changed);
    await expect(runGuardedPurge({
      storage: changedStorage,
      approved: approvedObjects(),
      execute: true,
      confirmation: 'DELETE_EXACT_13_VERIFIED_FMM002_OBJECTS',
    })).rejects.toThrow('checksum does not match');
    expect(changedStorage.removals).toHaveLength(0);
  });

  it('never treats a malformed null listing as proof that zero objects remain', async () => {
    const storage = new FakeStorage();
    storage.list = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(runGuardedPurge({
      storage,
      approved: approvedObjects(),
      execute: true,
      confirmation: 'DELETE_EXACT_13_VERIFIED_FMM002_OBJECTS',
    })).rejects.toThrow('Storage listing failed');
    expect(storage.removals).toHaveLength(0);
  });

  it('never treats an omitted object id as a folder or a zero-object result', async () => {
    const storage = new FakeStorage();
    storage.list = vi.fn().mockResolvedValue({
      data: [{ name: ownerA, id: undefined, updated_at: null, metadata: null }],
      error: null,
    });
    await expect(runGuardedPurge({
      storage,
      approved: approvedObjects(),
      execute: true,
      confirmation: 'DELETE_EXACT_13_VERIFIED_FMM002_OBJECTS',
    })).rejects.toThrow('root-object metadata');
    expect(storage.removals).toHaveLength(0);
  });

  it('requires the exact execute confirmation after successful preflight', async () => {
    const storage = new FakeStorage();
    await expect(runGuardedPurge({
      storage,
      approved: approvedObjects(),
      execute: true,
      confirmation: 'wrong',
    })).rejects.toThrow('FMM002_PURGE_CONFIRM');
    expect(storage.downloads).toHaveLength(2);
    expect(storage.removals).toHaveLength(0);
  });

  it('deletes only the approved paths and proves the target set is empty', async () => {
    const storage = new FakeStorage();
    const log = vi.fn();
    await runGuardedPurge({
      storage,
      approved: approvedObjects(),
      execute: true,
      confirmation: 'DELETE_EXACT_13_VERIFIED_FMM002_OBJECTS',
      log,
    });
    expect(storage.removals).toEqual([approvedObjects().map(object => object.path)]);
    expect(storage.files.size).toBe(0);
    expect(log).toHaveBeenLastCalledWith('{"mode":"verified","legacyRawArtifacts":0}');
  });
});
