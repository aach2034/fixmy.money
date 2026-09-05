import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluatePlanAuthorization } from '@/lib/subscription/planEnforcement';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260904020000_fmm_009_allocation_trigger_row_safety.sql'),
  'utf8',
);
const productionShape = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260603170000_staff_clients_disputes.sql'),
  'utf8',
);
const atomicImportMigration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260904013000_fmm_011_atomic_report_save.sql'),
  'utf8',
);

const active = { canAccess: true, state: 'active', reason: 'active_subscription' } as const;
const usage = { clients: 0, seats: 0, storageBytes: 0 };

describe('FMM-009 shared allocation trigger row safety', () => {
  it('reproduces the production shape: staff_clients has no role field', () => {
    const staffClientsDefinition = productionShape.match(
      /CREATE TABLE IF NOT EXISTS public\.staff_clients \([\s\S]*?\n\);/,
    )?.[0];
    expect(staffClientsDefinition).toBeDefined();
    expect(staffClientsDefinition).toContain('case_stage');
    expect(staffClientsDefinition).not.toMatch(/\n\s*role\s+/);
  });

  it('resolves NEW.role only inside the workspace_memberships branch', () => {
    expect(migration).toContain("IF TG_TABLE_NAME = 'workspace_memberships' THEN\n    IF NEW.role = 'owner' THEN");
    expect(migration).not.toMatch(/TG_TABLE_NAME\s*=\s*'[^']+'\s+AND\s+NEW\./);
    const executableRoleReferences = migration
      .split('\n')
      .filter(line => !line.trimStart().startsWith('--') && line.includes('NEW.role'));
    expect(executableRoleReferences).toEqual(["    IF NEW.role = 'owner' THEN"]);
  });

  it('keeps normal and entitled client creation on case_stage and catalog limits', () => {
    expect(migration).toContain("IF TG_TABLE_NAME = 'staff_clients' THEN\n    IF NEW.case_stage NOT IN ('completed', 'churned') THEN");
    expect(evaluatePlanAuthorization({
      planId: 'starter', entitlement: active, limit: 'clients', currentUsage: usage,
    })).toMatchObject({ allowed: true });
  });

  it('denies over-limit client allocation without weakening enforcement', () => {
    expect(evaluatePlanAuthorization({
      planId: 'starter', entitlement: active, limit: 'clients',
      currentUsage: { ...usage, clients: 3 },
    })).toMatchObject({ allowed: false, reason: 'CLIENTS_LIMIT_REACHED' });
    expect(migration).toContain("MESSAGE = 'CLIENTS_LIMIT_REACHED'");
    expect(migration).toContain("MESSAGE = 'PLAN_ENTITLEMENT_REQUIRED'");
    expect(migration).toContain("MESSAGE = 'PLAN_NOT_CONFIGURED'");
  });

  it('serializes concurrent allocations before reading usage', () => {
    expect(migration.indexOf('pg_advisory_xact_lock')).toBeGreaterThan(-1);
    expect(migration.indexOf('pg_advisory_xact_lock')).toBeLessThan(
      migration.indexOf('SELECT count(*) INTO used_count FROM public.staff_clients'),
    );
  });

  it('keeps cross-tenant identity authoritative and fails closed for accidental trigger reuse', () => {
    expect(migration).toContain('target_workspace := NEW.workspace_id');
    expect(migration).toContain("TG_TABLE_SCHEMA <> 'public'");
    expect(migration).toContain("MESSAGE = 'UNSUPPORTED_ALLOCATION_TABLE'");
    expect(migration).not.toContain('auth.jwt');
  });

  it('retains the legacy growth alias for professional limits', () => {
    expect(migration).toContain('private.plan_catalog_aliases');
    expect(evaluatePlanAuthorization({
      planId: 'growth', entitlement: active, limit: 'clients',
      currentUsage: { ...usage, clients: 299 },
    })).toMatchObject({ allowed: true, planId: 'professional' });
    expect(evaluatePlanAuthorization({
      planId: 'growth', entitlement: active, limit: 'clients',
      currentUsage: { ...usage, clients: 300 },
    })).toMatchObject({ allowed: false, reason: 'CLIENTS_LIMIT_REACHED' });
  });

  it('is non-destructive and leaves a trigger exception to roll back its statement', () => {
    expect(migration).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
    expect(migration).not.toMatch(/\bCOMMIT\b/i);
    expect(migration).toContain("RAISE EXCEPTION USING ERRCODE = 'P0001'");
  });

  it('does not alter FMM-011 atomic persistence or its transaction guarantees', () => {
    expect(migration).not.toContain('save_credit_report_atomic_server');
    expect(migration).not.toContain('finalize_credit_report_import_server');
    expect(atomicImportMigration).toContain('INSERT INTO public.parsed_credit_reports');
    expect(atomicImportMigration).toContain('INSERT INTO public.negative_items');
    expect(atomicImportMigration).toContain('UPDATE public.staff_clients');
    expect(atomicImportMigration).not.toMatch(/\bCOMMIT\b/);
  });
});
