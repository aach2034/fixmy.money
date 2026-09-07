import { readdir, stat } from 'node:fs/promises';
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
if (failed) {
  console.error('Build-size budget exceeded. Investigate or explicitly review the budget change.');
  process.exit(1);
}
