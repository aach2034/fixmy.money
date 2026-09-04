import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

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
  });
});
