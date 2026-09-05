import { createClient } from '@supabase/supabase-js';

const BUCKET = 'evidence-documents';
const PAGE_SIZE = 1_000;
const EXECUTE_CONFIRMATION = 'DELETE_LEGACY_OCR_ARTIFACTS';
const execute = process.argv.includes('--execute');

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function listAll(prefix: string) {
  const supabase = client();
  const items: Array<{ name: string; id?: string | null }> = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Storage listing failed for approved prefix: ${error.message}`);
    items.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }
  return items;
}

let singleton: ReturnType<typeof createClient> | null = null;
function client() {
  if (!singleton) {
    singleton = createClient(
      required('NEXT_PUBLIC_SUPABASE_URL'),
      required('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return singleton;
}

async function main() {
  const topLevel = await listAll('');
  const ownerPrefixes = topLevel
    .filter(item => item.id == null && /^[0-9a-f-]{36}$/i.test(item.name))
    .map(item => item.name);
  const paths: string[] = [];

  for (const owner of ownerPrefixes) {
    for (const namespace of ['ocr-cache', 'ocr-temp'] as const) {
      const prefix = `${owner}/${namespace}`;
      const entries = await listAll(prefix);
      for (const entry of entries) {
        if (entry.id) paths.push(`${prefix}/${entry.name}`);
      }
    }
  }

  console.log(JSON.stringify({ mode: execute ? 'execute' : 'dry-run', legacyRawArtifacts: paths.length }));
  if (!execute || paths.length === 0) return;
  if (process.env.FMM002_PURGE_CONFIRM !== EXECUTE_CONFIRMATION) {
    throw new Error(`Set FMM002_PURGE_CONFIRM=${EXECUTE_CONFIRMATION} to execute the bounded purge`);
  }

  for (let index = 0; index < paths.length; index += PAGE_SIZE) {
    const { error } = await client().storage.from(BUCKET).remove(paths.slice(index, index + PAGE_SIZE));
    if (error) throw new Error(`Storage deletion failed: ${error.message}`);
  }

  const remaining = await Promise.all(ownerPrefixes.flatMap(owner =>
    ['ocr-cache', 'ocr-temp'].map(namespace => listAll(`${owner}/${namespace}`)),
  ));
  const remainingCount = remaining.flat().filter(item => item.id).length;
  if (remainingCount !== 0) throw new Error(`Legacy raw artifact purge incomplete: ${remainingCount} remain`);
  console.log(JSON.stringify({ mode: 'verified', legacyRawArtifacts: 0 }));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'FMM-002 purge failed');
  process.exit(1);
});
