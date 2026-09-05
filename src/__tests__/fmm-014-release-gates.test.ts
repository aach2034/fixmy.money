import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { contentSecurityPolicyFor } from '../../worker/security-controls';

describe('FMM-014 enforced release gates', () => {
  const workflow = fs.readFileSync('.github/workflows/quality.yml', 'utf8');

  it('requires code, security, build, and revenue-path checks', () => {
    for (const gate of ['pnpm type-check', 'pnpm lint --max-warnings=50', 'pnpm test', 'pnpm test:revenue-path', 'pnpm audit --audit-level high', 'pnpm build', 'pnpm build:budget']) {
      expect(workflow).toContain(gate);
    }
    expect(workflow).toContain('GHSA-w3rx-r6r6-pgpr');
    expect(workflow).toContain('GHSA-5p2g-fcmc-qvqq');
    expect(fs.existsSync('rocket/audit_report/dependency_exceptions_20260904.md')).toBe(true);
  });

  it('requires clean migration replay and database tests', () => {
    expect(workflow.match(/supabase db reset --local --no-seed/g)).toHaveLength(3);
    expect(workflow).toContain('supabase test db');
    expect(workflow).toContain('supabase db lint --local --level error --fail-on error');
    expect(fs.existsSync('supabase/config.toml')).toBe(true);
  });

  it('keeps clean auth schema and current-state pgTAP discovery self-consistent', () => {
    const repair = fs.readFileSync(
      'supabase/migrations/20260905023201_repair_user_profiles_account_type.sql',
      'utf8',
    );
    expect(repair).toContain(
      "ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'business'",
    );
    for (const clientColumn of ['address', 'city', 'state', 'zip']) {
      expect(repair).toContain(`ADD COLUMN IF NOT EXISTS ${clientColumn} text`);
    }

    const currentDatabaseTests = fs.readdirSync('supabase/tests/database');
    expect(currentDatabaseTests).not.toContain('fmm_003_rls_reconciliation.test.sql');
    expect(currentDatabaseTests).not.toContain(
      'fmm_003_phase_1b_forward_upgrade.test.sql',
    );
    expect(
      fs.existsSync(
        'supabase/rehearsals/fmm-003/fmm_003_rls_reconciliation.test.sql',
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        'supabase/rehearsals/fmm-003/fmm_003_phase_1b_forward_upgrade.test.sql',
      ),
    ).toBe(true);
  });

  it('requires Chromium and WebKit coverage', () => {
    expect(workflow).toContain('playwright install --with-deps chromium webkit');
    expect(workflow).toContain('--project=chromium --project=webkit --project=mobile-webkit-390');
    expect(workflow).toContain('supabase start');
    expect(workflow).toContain('pnpm seed:e2e-local');
    expect(workflow).toContain('TEST_USER_EMAIL=fmm-e2e-owner@test.invalid');
    expect(workflow).toContain('TEST_MEMBER_EMAIL=fmm-e2e-member@test.invalid');
  });

  it('seeds authenticated browser identity only into localhost', () => {
    const seed = fs.readFileSync('scripts/seed-local-e2e-user.ts', 'utf8');
    expect(seed).toContain("['127.0.0.1', 'localhost']");
    expect(seed).toContain("email.endsWith('@test.invalid')");
    expect(seed).toContain("memberEmail.endsWith('@test.invalid')");
    expect(seed).toContain('Refusing to seed E2E identity outside an isolated local Supabase stack.');
    expect(seed).not.toContain("stripe_status: 'trialing'");
  });

  it('allows only the isolated local Supabase runtime without weakening production CSP', () => {
    const local = contentSecurityPolicyFor('http://localhost:4028/login');
    expect(local).toContain('http://127.0.0.1:54321');
    expect(local).toContain('ws://127.0.0.1:54321');
    expect(local).not.toContain('upgrade-insecure-requests');

    const production = contentSecurityPolicyFor('https://fixmy.money/login');
    expect(production).toContain('upgrade-insecure-requests');
    expect(production).not.toContain('http://127.0.0.1:54321');
    expect(production).not.toContain('ws://127.0.0.1:54321');
  });
});
