import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSafeRedirectPath } from '../app/sign-up-login-screen/components/AuthForm';

const route = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('production readiness security checks', () => {
  it('allows only same-origin auth redirect paths', () => {
    expect(getSafeRedirectPath('/credit-audit')).toBe('/credit-audit');
    expect(getSafeRedirectPath('/credit-audit?from=report')).toBe('/credit-audit?from=report');
    expect(getSafeRedirectPath('https://evil.example/steal')).toBe('');
    expect(getSafeRedirectPath('//evil.example/steal')).toBe('');
    expect(getSafeRedirectPath('\\evil.example\\steal')).toBe('');
  });

  it('keeps credit-report parse writes bound to the authenticated user client', () => {
    const source = route('src/app/api/credit-report/parse-report/route.ts');

    expect(source).toContain('importRecord.client_id !== clientId');
    expect(source).toContain(".from('staff_clients')");
    expect(source).toContain(".eq('id', clientId)");
    expect(source).toContain(".eq('owner_id', user.id)");
  });

  it('keeps tag-and-save writes bound to the authenticated user client', () => {
    const source = route('src/app/api/credit-report/tag-and-save/route.ts');

    expect(source).toContain('reportRow.client_id && reportRow.client_id !== clientId');
    expect(source).toContain(".from('staff_clients')");
    expect(source).toContain(".eq('id', clientId)");
    expect(source).toContain(".eq('owner_id', user.id)");
  });

  it('keeps evidence-engine writes bound to the authenticated user client', () => {
    const source = route('src/app/api/credit-report/evidence-engine/route.ts');

    expect(source).toContain('report.client_id && report.client_id !== clientId');
    expect(source).toContain(".from('staff_clients')");
    expect(source).toContain(".eq('id', clientId)");
    expect(source).toContain(".eq('owner_id', user.id)");
  });

  it('credit audit queries only production negative_items columns', () => {
    const source = route('src/app/credit-audit/components/CreditAuditContent.tsx');

    expect(source).not.toContain('payment_status');
    expect(source).not.toContain('payment_history');
    expect(source).not.toContain('is_charge_off');
    expect(source).not.toContain('is_late');
    expect(source).not.toContain('original_creditor');
    expect(source).not.toContain('collection_agency');
  });
});
