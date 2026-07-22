import { describe, expect, it } from 'vitest';
import { isLegacySeedClient, LEGACY_SEED_CLIENTS } from '@/lib/demo/purgeLegacyProductionSeeds';
import fs from 'node:fs';
import path from 'node:path';

describe('permanent dashboard seed isolation', () => {
  it('recognizes only an exact legacy name and email pair', () => {
    expect(isLegacySeedClient(LEGACY_SEED_CLIENTS[0])).toBe(true);
    expect(isLegacySeedClient({ name: 'Real Customer', email: LEGACY_SEED_CLIENTS[0].email })).toBe(false);
    expect(isLegacySeedClient({ name: LEGACY_SEED_CLIENTS[0].name, email: 'real@example.com' })).toBe(false);
  });

  it('contains no production seed block in the original schema migration', () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260603170000_staff_clients_disputes.sql'),
      'utf8'
    );
    expect(migration).not.toContain('Darnell Washington');
    expect(migration).not.toContain('Seed staff_clients');
    expect(migration).toContain('Production migrations intentionally contain no seed data');
  });

  it('keeps legacy fictional clients out of all production components', () => {
    const srcRoot = path.join(process.cwd(), 'src');
    const excluded = new Set([
      path.join(srcRoot, 'lib/demo/demoData.ts'),
      path.join(srcRoot, 'lib/demo/purgeLegacyProductionSeeds.ts'),
      path.join(srcRoot, '__tests__/dashboard-seed-isolation.test.ts'),
      path.join(srcRoot, '__tests__/credit-report-parser.test.ts'),
    ]);
    const files: string[] = [];
    const walk = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(target);
        else if (/\.(ts|tsx)$/.test(entry.name) && !excluded.has(target)) files.push(target);
      }
    };
    walk(srcRoot);
    const productionSource = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
    for (const client of LEGACY_SEED_CLIENTS) {
      expect(productionSource).not.toContain(client.name);
      expect(productionSource).not.toContain(client.email);
    }
  });
});
