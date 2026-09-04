import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('FMM-014 enforced release gates', () => {
  const workflow = fs.readFileSync('.github/workflows/quality.yml', 'utf8');

  it('requires code, security, build, and revenue-path checks', () => {
    for (const gate of ['pnpm type-check', 'pnpm lint --max-warnings=50', 'pnpm test', 'pnpm test:revenue-path', 'pnpm audit --audit-level high', 'pnpm build', 'pnpm build:budget']) {
      expect(workflow).toContain(gate);
    }
  });

  it('requires clean migration replay and database tests', () => {
    expect(workflow).toContain('supabase db reset --local');
    expect(workflow).toContain('supabase test db');
  });

  it('requires Chromium and WebKit coverage', () => {
    expect(workflow).toContain('playwright install --with-deps chromium webkit');
    expect(workflow).toContain('--project=chromium --project=webkit --project=mobile-webkit-390');
  });
});
