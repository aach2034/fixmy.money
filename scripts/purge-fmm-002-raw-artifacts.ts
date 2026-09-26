import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminFetch } from '../src/lib/supabase/admin';

const EXPECTED_PROJECT_REF = 'agxzfdyvewptjwdfuvwq';
const EXPECTED_ORIGIN = `https://${EXPECTED_PROJECT_REF}.supabase.co`;
const BUCKET = 'evidence-documents';
const PAGE_SIZE = 1_000;
const EXPECTED_MANIFEST_SHA256 = '3bb4da1484adc7cc75186d5e71e94eb10160ef517826717d8945aafe3a80a869';
const EXPECTED_OBJECTS = 13;
const EXPECTED_BYTES = 9_702_750;
const EXPECTED_CACHE_OBJECTS = 12;
const EXPECTED_TEMP_OBJECTS = 1;
const EXECUTE_CONFIRMATION = 'DELETE_EXACT_13_VERIFIED_FMM002_OBJECTS';
const TARGET_NAMESPACES = ['ocr-cache', 'ocr-temp'] as const;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const TARGET_PATH = new RegExp(`^${UUID}/(ocr-cache|ocr-temp)/[^/]+$`, 'i');

type StorageError = { message: string } | null;
type StorageEntry = {
  name: string;
  id?: string | null;
  updated_at?: string | null;
  metadata?: { size?: number | string | null } | null;
};

export type ApprovedObject = {
  path: string;
  bytes: number;
  sha256: string;
};

export type ManifestExpectations = {
  manifestSha256: string;
  objects: number;
  bytes: number;
  cacheObjects: number;
  tempObjects: number;
};

export type StoragePort = {
  list: (
    prefix: string,
    options: { limit: number; offset: number; sortBy: { column: 'name'; order: 'asc' } },
  ) => Promise<{ data: StorageEntry[] | null; error: StorageError }>;
  download: (path: string) => Promise<{ data: Blob | null; error: StorageError }>;
  remove: (paths: string[]) => Promise<{ error: StorageError }>;
};

type LiveObject = {
  path: string;
  bytes: number;
  id: string;
  updatedAt: string;
};

const productionExpectations: ManifestExpectations = {
  manifestSha256: EXPECTED_MANIFEST_SHA256,
  objects: EXPECTED_OBJECTS,
  bytes: EXPECTED_BYTES,
  cacheObjects: EXPECTED_CACHE_OBJECTS,
  tempObjects: EXPECTED_TEMP_OBJECTS,
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function parseManifestRecords(raw: unknown): ApprovedObject[] {
  if (!Array.isArray(raw)) throw new Error('Recovery manifest must be a JSON array');
  return raw.map((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`Recovery manifest entry ${index + 1} is invalid`);
    }
    const keys = Object.keys(record).sort().join(',');
    if (keys !== 'bytes,path,sha256') {
      throw new Error(`Recovery manifest entry ${index + 1} has unexpected fields`);
    }
    const { path, bytes, sha256: digest } = record as Record<string, unknown>;
    if (typeof path !== 'string' || !TARGET_PATH.test(path) || path.includes('..')) {
      throw new Error(`Recovery manifest entry ${index + 1} has an unsafe path`);
    }
    if (!Number.isSafeInteger(bytes) || Number(bytes) <= 0) {
      throw new Error(`Recovery manifest entry ${index + 1} has an invalid byte count`);
    }
    if (typeof digest !== 'string' || !/^[0-9a-f]{64}$/.test(digest)) {
      throw new Error(`Recovery manifest entry ${index + 1} has an invalid checksum`);
    }
    return { path, bytes: Number(bytes), sha256: digest };
  });
}

export function validateManifestBytes(
  contents: Uint8Array,
  expectations: ManifestExpectations = productionExpectations,
): ApprovedObject[] {
  if (sha256(contents) !== expectations.manifestSha256) {
    throw new Error('Recovery manifest checksum does not match the approved preimage');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(contents).toString('utf8'));
  } catch {
    throw new Error('Recovery manifest is not valid JSON');
  }
  const records = parseManifestRecords(parsed);
  const uniquePaths = new Set(records.map(record => record.path));
  const bytes = records.reduce((total, record) => total + record.bytes, 0);
  const cacheObjects = records.filter(record => record.path.includes('/ocr-cache/')).length;
  const tempObjects = records.filter(record => record.path.includes('/ocr-temp/')).length;

  if (records.length !== expectations.objects
      || uniquePaths.size !== expectations.objects
      || bytes !== expectations.bytes
      || cacheObjects !== expectations.cacheObjects
      || tempObjects !== expectations.tempObjects) {
    throw new Error('Recovery manifest does not match the approved object preimage');
  }

  return records.sort((left, right) => left.path.localeCompare(right.path));
}

export function loadApprovedManifest(path: string): ApprovedObject[] {
  const file = statSync(path);
  if (!file.isFile()) throw new Error('FMM002_PURGE_MANIFEST must reference a file');
  if ((file.mode & 0o077) !== 0) {
    throw new Error('FMM002_PURGE_MANIFEST must not be accessible to group or other users');
  }
  return validateManifestBytes(readFileSync(path));
}

export function assertProductionTarget(urlValue: string, serviceKey: string): void {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is invalid');
  }
  if (url.origin !== EXPECTED_ORIGIN
      || url.pathname !== '/'
      || url.username !== ''
      || url.password !== ''
      || url.search !== ''
      || url.hash !== '') {
    throw new Error(`FMM-002 purge is locked to project ${EXPECTED_PROJECT_REF}`);
  }
  if (!serviceKey.startsWith('sb_secret_')) {
    throw new Error('FMM-002 purge requires the active modern Supabase secret key');
  }
}

export function assertPrivateBucket(
  bucket: { id?: string; name?: string; public?: boolean } | null,
): void {
  if (!bucket
      || bucket.id !== BUCKET
      || bucket.name !== BUCKET
      || bucket.public !== false) {
    throw new Error('FMM-002 purge requires the exact private evidence-documents bucket');
  }
}

async function listPage(storage: StoragePort, prefix: string): Promise<StorageEntry[]> {
  const items: StorageEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await storage.list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error || !Array.isArray(data)) {
      throw new Error('Storage listing failed during guarded preflight');
    }
    items.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return items;
}

async function walkFiles(
  storage: StoragePort,
  prefix: string,
  depth = 0,
): Promise<LiveObject[]> {
  if (depth > 8) throw new Error('Storage target hierarchy exceeds the approved depth');
  const entries = await listPage(storage, prefix);
  const files: LiveObject[] = [];
  for (const entry of entries) {
    if (!entry.name || entry.name === '.' || entry.name === '..' || entry.name.includes('/')) {
      throw new Error('Storage listing returned an unsafe object name');
    }
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) {
      files.push(...await walkFiles(storage, path, depth + 1));
      continue;
    }
    const bytes = Number(entry.metadata?.size);
    if (typeof entry.id !== 'string'
        || entry.id.length === 0
        || typeof entry.updated_at !== 'string'
        || entry.updated_at.length === 0
        || !Number.isSafeInteger(bytes)
        || bytes < 0) {
      throw new Error('Storage listing omitted required approved-object metadata');
    }
    files.push({
      path,
      bytes,
      id: entry.id,
      updatedAt: entry.updated_at ?? '',
    });
  }
  return files;
}

export async function discoverTargetObjects(storage: StoragePort): Promise<LiveObject[]> {
  const topLevel = await listPage(storage, '');
  for (const entry of topLevel) {
    if (!entry.name || entry.name === '.' || entry.name === '..' || entry.name.includes('/')) {
      throw new Error('Storage listing returned an unsafe root prefix');
    }
    if (entry.id !== null && (typeof entry.id !== 'string' || entry.id.length === 0)) {
      throw new Error('Storage listing omitted required root-object metadata');
    }
  }
  const rootPrefixes = topLevel.filter(entry => entry.id === null).map(entry => entry.name).sort();
  const files: LiveObject[] = [];
  for (const root of rootPrefixes) {
    for (const namespace of TARGET_NAMESPACES) {
      files.push(...await walkFiles(storage, `${root}/${namespace}`));
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export function assertLivePreimage(
  approved: ApprovedObject[],
  live: LiveObject[],
): void {
  if (approved.length !== live.length) {
    throw new Error('Live Storage target count does not match the approved manifest');
  }
  for (let index = 0; index < approved.length; index += 1) {
    if (approved[index].path !== live[index].path
        || approved[index].bytes !== live[index].bytes) {
      throw new Error('Live Storage paths or sizes do not match the approved manifest');
    }
  }
}

async function verifyLiveChecksums(
  storage: StoragePort,
  approved: ApprovedObject[],
): Promise<void> {
  for (const object of approved) {
    const { data, error } = await storage.download(object.path);
    if (error || !data) throw new Error('Approved Storage object could not be checksummed');
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (bytes.byteLength !== object.bytes || sha256(bytes) !== object.sha256) {
      throw new Error('Live Storage object checksum does not match the approved manifest');
    }
  }
}

function sameLiveSnapshot(left: LiveObject[], right: LiveObject[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function runGuardedPurge(options: {
  storage: StoragePort;
  approved: ApprovedObject[];
  execute: boolean;
  confirmation?: string;
  log?: (value: string) => void;
}): Promise<void> {
  const log = options.log ?? console.log;
  const initial = await discoverTargetObjects(options.storage);
  assertLivePreimage(options.approved, initial);
  await verifyLiveChecksums(options.storage, options.approved);

  log(JSON.stringify({
    mode: options.execute ? 'execute-preflight' : 'dry-run',
    approvedObjects: options.approved.length,
    approvedBytes: options.approved.reduce((total, object) => total + object.bytes, 0),
    checksumsVerified: options.approved.length,
  }));

  if (!options.execute) return;
  if (options.confirmation !== EXECUTE_CONFIRMATION) {
    throw new Error(`Set FMM002_PURGE_CONFIRM=${EXECUTE_CONFIRMATION} to execute the exact purge`);
  }

  const immediatelyBeforeDelete = await discoverTargetObjects(options.storage);
  assertLivePreimage(options.approved, immediatelyBeforeDelete);
  if (!sameLiveSnapshot(initial, immediatelyBeforeDelete)) {
    throw new Error('Live Storage metadata changed during checksum preflight');
  }

  let deletionError = false;
  for (let index = 0; index < options.approved.length; index += PAGE_SIZE) {
    const { error } = await options.storage.remove(
      options.approved.slice(index, index + PAGE_SIZE).map(object => object.path),
    );
    if (error) {
      deletionError = true;
      break;
    }
  }

  const remaining = await discoverTargetObjects(options.storage);
  if (deletionError) {
    throw new Error(`Storage deletion returned an error; ${remaining.length} target objects remain`);
  }
  if (remaining.length !== 0) {
    throw new Error(`Legacy raw artifact purge incomplete: ${remaining.length} target objects remain`);
  }
  log(JSON.stringify({ mode: 'verified', legacyRawArtifacts: 0 }));
}

async function main() {
  const execute = process.argv.includes('--execute');
  const url = required('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
  assertProductionTarget(url, serviceKey);
  const approved = loadApprovedManifest(required('FMM002_PURGE_MANIFEST'));
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: createSupabaseAdminFetch(serviceKey) },
  });
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(BUCKET);
  if (bucketError) throw new Error('Private Storage bucket preflight failed');
  assertPrivateBucket(bucket);
  await runGuardedPurge({
    storage: supabase.storage.from(BUCKET),
    approved,
    execute,
    confirmation: process.env.FMM002_PURGE_CONFIRM,
  });
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'FMM-002 purge failed');
    process.exit(1);
  });
}
