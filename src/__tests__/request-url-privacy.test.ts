import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('request URL privacy', () => {
  it('keeps raw client and credit finding data out of generated navigation URLs', () => {
    const importWizard = read('src/components/ImportWizard.tsx');
    const creditAudit = read('src/app/credit-audit/components/CreditAuditContent.tsx');
    const disputeWizard = read('src/app/dispute-wizard/components/DisputeWizardContent.tsx');
    const combined = `${importWizard}\n${creditAudit}\n${disputeWizard}`;

    expect(combined).not.toContain('clientName=${encodeURIComponent');
    expect(combined).not.toContain('findingCreditor=');
    expect(combined).not.toContain('findingAccount=');
    expect(disputeWizard).not.toContain("searchParams.get('clientName')");
    expect(disputeWizard).not.toContain("searchParams.get('findingCreditor')");
    expect(disputeWizard).not.toContain("searchParams.get('findingAccount')");
    expect(creditAudit).toContain('&findingId=${encodeURIComponent(auditResult.priorityItems[0].id)}');
    expect(creditAudit).toContain('&bureau=${encodeURIComponent(auditResult.priorityItems[0].bureau.split');
  });

  it('does not emit the worker request URL through application logging', () => {
    const worker = read('worker/index.ts');

    expect(worker).not.toMatch(/console\.(?:log|info|warn|error)\([^\n]*request\.url/);
    expect(worker).toContain('new URL(request.url).pathname');
  });
});
