import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const limits = {
  'dist/client': 38 * 1024 * 1024,
  'dist/server': 150 * 1024 * 1024,
  public: 36 * 1024 * 1024,
};

async function size(path) {
  let total = 0;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    total += entry.isDirectory() ? await size(child) : (await stat(child)).size;
  }
  return total;
}

let failed = false;
for (const [path, limit] of Object.entries(limits)) {
  const actual = await size(join(root, path));
  console.log(`${relative(root, join(root, path))}: ${actual} / ${limit} bytes`);
  if (actual > limit) failed = true;
}

const workerConfig = JSON.parse(
  await readFile(join(root, 'dist/server/wrangler.json'), 'utf8'),
);
const cronSchedule = workerConfig?.triggers?.crons;
if (
  !Array.isArray(cronSchedule) ||
  cronSchedule.length !== 1 ||
  cronSchedule[0] !== '0 * * * *'
) {
  console.error('FMM-023 hourly rate-limit cleanup trigger is missing from the Worker build.');
  failed = true;
}
const expectedWorkerFirstAssetRoutes = [
  '/assets/*.css',
  '/assets/*.js',
  '/assets/*.woff2',
];
if (
  workerConfig?.assets?.binding !== 'ASSETS' ||
  JSON.stringify(workerConfig?.assets?.run_worker_first) !==
    JSON.stringify(expectedWorkerFirstAssetRoutes)
) {
  console.error(
    'FMM-017 fingerprinted asset classes are not routed through the header-authoritative Worker.',
  );
  failed = true;
}
if (failed) {
  console.error('Build release gate failed. Investigate or explicitly review the change.');
  process.exit(1);
}
