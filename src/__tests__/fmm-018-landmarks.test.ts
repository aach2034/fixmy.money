import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function files(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? files(target) : target.endsWith('.tsx') ? [target] : [];
  });
}

describe('FMM-018 landmark structure', () => {
  it('uses the root layout as the single main landmark', () => {
    const nested = files('src/app').filter(file => file !== 'src/app/layout.tsx')
      .filter(file => /<main\b|role=["']main["']/.test(fs.readFileSync(file, 'utf8')));
    expect(nested).toEqual([]);
    expect(fs.readFileSync('src/app/layout.tsx', 'utf8')).toContain('<main id="main-content"');
  });
});
