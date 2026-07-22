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
});
