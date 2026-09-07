import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { contentSecurityPolicyFor } from '../../worker/security-controls';
import {
  isRequiredReleaseGate,
  validateAuthenticatedE2EEnvironment,
} from '../../tests/e2e/test-environment';

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
    expect(workflow.match(/supabase db reset --local --no-seed/g)).toHaveLength(4);
    expect(workflow).toContain('supabase test db');
    expect(workflow).toContain('supabase db lint --local --level error --fail-on error');
    expect(fs.existsSync('supabase/config.toml')).toBe(true);
    expect(workflow).toContain('pnpm test:d1-replay');
    const d1Replay = fs.readFileSync('scripts/validate-d1-migrations.mjs', 'utf8');
    expect(d1Replay).toContain("readdirSync('drizzle')");
    expect(d1Replay).toContain("['clean', 'repeat']");
    expect(d1Replay).toContain("'--local'");
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

  it('requires Chromium, Firefox, and WebKit coverage', () => {
    expect(workflow).toContain('project: chromium');
    expect(workflow).toContain('project: firefox');
    expect(workflow).toContain('project: webkit');
    expect(workflow).toContain('project: mobile-webkit-390');
    expect(workflow).toContain('playwright install --with-deps ${{ matrix.engine }}');
    expect(workflow).toContain('playwright test --project=${{ matrix.project }}');
    expect(workflow).toContain('supabase start');
    expect(workflow).toContain('pnpm seed:e2e-local');
    expect(workflow).toContain('FMM_RELEASE_GATE: "1"');
    expect(workflow).toContain('TEST_USER_EMAIL=fmm-e2e-owner@test.invalid');
    expect(workflow).toContain('TEST_MEMBER_EMAIL=fmm-e2e-member@test.invalid');
    expect(workflow).toContain('NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA');
  });

  it('seeds authenticated browser identity only into localhost', () => {
    const seed = fs.readFileSync('scripts/seed-local-e2e-user.ts', 'utf8');
    expect(seed).toContain("['127.0.0.1', 'localhost']");
    expect(seed).toContain("email.endsWith('@test.invalid')");
    expect(seed).toContain("memberEmail.endsWith('@test.invalid')");
    expect(seed).toContain('Refusing to seed E2E identity outside an isolated local Supabase stack.');
    expect(seed).toContain('With no Stripe customer');
    expect(seed).not.toContain('stripe_customer_id');
    expect(seed).not.toContain('process.env.NEXT_PUBLIC_SUPABASE_URL');
    expect(seed).not.toContain('process.env.SUPABASE_SERVICE_ROLE_KEY');
  });

  it('restricts every mutable Supabase integration fixture to localhost', () => {
    for (const file of [
      'src/__tests__/auth-lifecycle.test.ts',
      'src/__tests__/cross-tenant-security.test.ts',
      'scripts/seed-test-fixtures.ts',
    ]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("['127.0.0.1', 'localhost']");
      expect(source).toContain("testUrl.protocol !== 'http:'");
    }
  });

  it('keeps the dedicated integration suite executable instead of inheriting unit exclusions', () => {
    const integrationConfig = fs.readFileSync('vitest.integration.config.ts', 'utf8');
    expect(integrationConfig).not.toContain('mergeConfig');
    expect(integrationConfig).toContain("'src/__tests__/auth-lifecycle.test.ts'");
    expect(integrationConfig).toContain("'src/__tests__/cross-tenant-security.test.ts'");
    expect(integrationConfig).toContain("'src/__tests__/stripe-live.test.ts'");
    expect(workflow).toContain('pnpm test:integration');
    expect(workflow).toContain('secrets.STRIPE_TEST_SECRET_KEY');
    expect(workflow).toContain('if [[ "$STRIPE_SECRET_KEY" != sk_test_* ]]');
    expect(workflow).toContain('NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4028');
  });

  it('fails closed in CI when isolated authenticated E2E configuration is absent', () => {
    expect(isRequiredReleaseGate({ CI: 'true' })).toBe(true);
    expect(isRequiredReleaseGate({ FMM_RELEASE_GATE: '1' })).toBe(true);
    expect(validateAuthenticatedE2EEnvironment({}, false)).toEqual([
      'TEST_USER_EMAIL',
      'TEST_USER_PASSWORD',
      'TEST_SUPABASE_URL',
      'TEST_SUPABASE_ANON_KEY',
    ]);
  });

  it('refuses authenticated E2E against non-local services or real email domains', () => {
    const safe = {
      PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:4028',
      TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
      TEST_SUPABASE_ANON_KEY: 'local-anon-key',
      TEST_USER_EMAIL: 'owner@test.invalid',
      TEST_USER_PASSWORD: 'local-only-password',
    };
    expect(validateAuthenticatedE2EEnvironment(safe)).toEqual([]);
    expect(() => validateAuthenticatedE2EEnvironment({
      ...safe,
      TEST_SUPABASE_URL: 'https://example.supabase.co',
    })).toThrow(/restricted to local/);
    expect(() => validateAuthenticatedE2EEnvironment({
      ...safe,
      TEST_USER_EMAIL: 'customer@example.com',
    })).toThrow(/@test\.invalid/);
  });

  it('refuses every release-gate browser test against a non-local application', () => {
    const playwrightConfig = fs.readFileSync('playwright.config.ts', 'utf8');
    expect(playwrightConfig).toContain("process.env.CI === 'true'");
    expect(playwrightConfig).toContain("process.env.FMM_RELEASE_GATE === '1'");
    expect(playwrightConfig).toContain('Release-gate browser tests are restricted to the local application server.');
  });

  it('exposes a single fail-closed release gate', () => {
    expect(workflow).toContain('needs: [quality, migration-replay, integration, browser]');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('node scripts/verify-release-gate.mjs');

    const passing = spawnSync(process.execPath, [
      'scripts/verify-release-gate.mjs',
      'quality=success',
      'migration-replay=success',
      'integration=success',
      'browser=success',
    ]);
    expect(passing.status).toBe(0);

    const failing = spawnSync(process.execPath, [
      'scripts/verify-release-gate.mjs',
      'quality=success',
      'migration-replay=success',
      'integration=failure',
      'browser=success',
    ]);
    expect(failing.status).not.toBe(0);
    expect(failing.stderr.toString()).toContain('integration did not succeed');
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
