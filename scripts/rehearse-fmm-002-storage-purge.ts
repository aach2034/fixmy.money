import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import {
  loadApprovedManifest,
  runGuardedPurge,
  type StoragePort,
} from './purge-fmm-002-raw-artifacts';

const EXECUTE_CONFIRMATION = 'DELETE_EXACT_13_VERIFIED_FMM002_OBJECTS';

function safeTarget(root: string, relative: string): string {
  const target = resolve(root, relative);
  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error('Rehearsal path escaped its disposable root');
  }
  return target;
}

function filesystemStorage(root: string): StoragePort {
  return {
    async list(prefix, options) {
      const directory = prefix ? safeTarget(root, prefix) : root;
      if (!existsSync(directory)) return { data: [], error: null };
      const entries = readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name))
        .slice(options.offset, options.offset + options.limit)
        .map(entry => {
          if (entry.isDirectory()) {
            return { name: entry.name, id: null, updated_at: null, metadata: null };
          }
          if (!entry.isFile()) throw new Error('Rehearsal encountered a non-file object');
          const file = statSync(join(directory, entry.name));
          return {
            name: entry.name,
            id: `local:${prefix}/${entry.name}`,
            updated_at: file.mtime.toISOString(),
            metadata: { size: file.size },
          };
        });
      return { data: entries, error: null };
    },
    async download(path) {
      const target = safeTarget(root, path);
      return existsSync(target)
        ? { data: new Blob([readFileSync(target)]), error: null }
        : { data: null, error: { message: 'missing' } };
    },
    async remove(paths) {
      for (const path of paths) unlinkSync(safeTarget(root, path));
      return { error: null };
    },
  };
}

async function main() {
  const sourceArgument = process.argv[2];
  if (!sourceArgument) {
    throw new Error('usage: rehearse-fmm-002-storage-purge.ts <restored-storage-directory>');
  }
  const source = realpathSync(sourceArgument);
  const allowedTemporaryRoots = [realpathSync('/private/tmp'), realpathSync(tmpdir())];
  if (!allowedTemporaryRoots.some(root => source.startsWith(`${root}${sep}`))) {
    throw new Error('Rehearsal source must be inside the private temporary directory');
  }

  const manifestPath = join(source, 'manifest.json');
  const approved = loadApprovedManifest(manifestPath);
  const rehearsalRoot = mkdtempSync(join(tmpdir(), 'fmm-fmm002-storage-rehearsal-'));
  const disposable = join(rehearsalRoot, 'evidence-documents');
  cpSync(source, disposable, { recursive: true, preserveTimestamps: true });

  await runGuardedPurge({
    storage: filesystemStorage(disposable),
    approved,
    execute: true,
    confirmation: EXECUTE_CONFIRMATION,
  });

  if (!existsSync(join(disposable, 'manifest.json')) || !existsSync(manifestPath)) {
    throw new Error('Rehearsal damaged recovery evidence');
  }
  console.log(JSON.stringify({
    rehearsalRoot,
    deletedObjects: approved.length,
    deletedBytes: approved.reduce((total, object) => total + object.bytes, 0),
    sourcePreserved: true,
  }));
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Storage purge rehearsal failed');
    process.exit(1);
  });
}
