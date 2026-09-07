#!/usr/bin/env node

import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const migrations = readdirSync('drizzle')
  .filter((file) => /^\d+.*\.sql$/.test(file))
  .sort();

if (migrations.length === 0) {
  throw new Error('No D1 migrations found in drizzle/.');
}

const persistenceDirectory = mkdtempSync(join(tmpdir(), 'fmm-d1-replay-'));
const wrangler = process.platform === 'win32'
  ? 'node_modules/.bin/wrangler.cmd'
  : 'node_modules/.bin/wrangler';

try {
  // A second pass verifies that checked-in migrations remain replay-safe. D1's
  // production migration history is never contacted or modified by this script.
  for (const pass of ['clean', 'repeat']) {
    for (const migration of migrations) {
      const result = spawnSync(wrangler, [
        'd1',
        'execute',
        'DB',
        '--config',
        'worker/wrangler.local.jsonc',
        '--local',
        '--persist-to',
        persistenceDirectory,
        '--file',
        join('drizzle', migration),
        '--yes',
      ], { stdio: 'inherit' });

      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(`D1 ${pass} replay failed for ${migration}.`);
      }
    }
  }

  console.log(`D1 replay passed for ${migrations.length} migration(s), twice.`);
} finally {
  rmSync(persistenceDirectory, { recursive: true, force: true });
}
