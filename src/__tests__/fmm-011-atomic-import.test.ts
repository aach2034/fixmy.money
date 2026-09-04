import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260904013000_fmm_011_atomic_report_save.sql'),
  'utf8',
);
const importPage = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/credit-report-import/components/CreditReportImportContent.tsx'),
  'utf8',
);
const saveRoute = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/api/credit-report/save-atomic/route.ts'),
  'utf8',
);
const tagRoute = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/api/credit-report/tag-and-save/route.ts'),
  'utf8',
);

describe('FMM-011 atomic credit-report persistence', () => {
  it('moves browser multi-write persistence behind one authenticated endpoint', () => {
    expect(importPage).toContain("fetch('/api/credit-report/save-atomic'");
    expect(importPage).not.toContain("from('parsed_credit_reports').insert");
    expect(importPage).not.toContain("from('negative_items').insert");
    expect(importPage).not.toContain("from('staff_clients').update");
  });

  it('uses a single database RPC for each save workflow', () => {
    expect(saveRoute).toContain("admin.rpc('save_credit_report_atomic_server'");
    expect(tagRoute).toContain("'finalize_credit_report_import_server'");
    expect(tagRoute).not.toContain(".from('credit_report_snapshots')\n      .insert");
  });

  it('requires server role and an active selected tenant membership', () => {
    expect(migration).toContain("MESSAGE = 'SERVER_ROLE_REQUIRED'");
    expect(migration).toContain("membership.status = 'active'");
    expect(migration).toContain('membership.is_selected IS TRUE');
    expect(migration).toContain("membership.role IN ('owner', 'admin', 'specialist')");
    expect(migration).toContain("MESSAGE = 'IMPORT_CLIENT_ACCESS_DENIED'");
  });

  it('is idempotent and concurrency-safe for duplicate direct saves', () => {
    expect(migration).toContain('parsed_credit_reports_import_commit_key');
    expect(migration).toContain('CREATE UNIQUE INDEX parsed_credit_reports_import_commit_key');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(saveRoute).toContain("createHash('sha256')");
  });

  it('bounds request and item sizes before entering the transaction', () => {
    expect(saveRoute).toContain('MAX_ITEMS = 500');
    expect(saveRoute).toContain('MAX_BODY_BYTES = 2_000_000');
    expect(migration).toContain('jsonb_array_length(p_items) > 500');
    expect(migration).toContain("MESSAGE = 'INVALID_IMPORT_COMMIT'");
  });

  it('commits report, items, client status, snapshot, and workflow state together', () => {
    for (const statement of [
      'INSERT INTO public.parsed_credit_reports',
      'INSERT INTO public.negative_items',
      'UPDATE public.staff_clients',
      'INSERT INTO public.credit_report_snapshots',
      'UPDATE public.credit_report_imports',
    ]) expect(migration).toContain(statement);
    expect(migration).not.toMatch(/\bCOMMIT\b/);
  });

  it('does not attempt compensating browser deletes after a partial failure', () => {
    expect(importPage).not.toContain("from('negative_items').delete");
    expect(importPage).not.toContain("from('parsed_credit_reports').delete");
    expect(saveRoute).toContain('no partial data was committed');
  });

  it('keeps privileged transaction functions unavailable to browsers', () => {
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO service_role');
  });
});
