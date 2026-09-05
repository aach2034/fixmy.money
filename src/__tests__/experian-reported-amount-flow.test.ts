import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatReportedAmount, getReportedAmount, needsAccountReview } from '@/lib/creditReport/reviewFlow';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Experian reported amount and exception review regressions', () => {
  it('prefers a confirmed collection amount', () => expect(getReportedAmount({ isCollection: true, collectionAmount: 900, balance: 700 }).value).toBe(900));
  it('does not use a collection amount for an unconfirmed collection', () => expect(getReportedAmount({ isCollection: false, collectionAmount: 900, balance: 700 }).value).toBe(700));
  it('prefers an explicit charge-off amount', () => expect(getReportedAmount({ isChargeOff: true, chargeOffAmount: 800, balance: 700 }).value).toBe(800));
  it('uses current balance before past due', () => expect(getReportedAmount({ balance: 700, pastDue: 200 }).value).toBe(700));
  it('uses past due before original balance', () => expect(getReportedAmount({ pastDue: 200, originalBalance: 1000 }).value).toBe(200));
  it('uses original balance before high balance', () => expect(getReportedAmount({ originalBalance: 1000, highBalance: 1200 }).value).toBe(1000));
  it('uses high balance as the last monetary fallback', () => expect(getReportedAmount({ highBalance: 1200 }).value).toBe(1200));
  it('renders missing amounts as Not reported', () => expect(formatReportedAmount({})).toBe('Not reported'));
  it('preserves a reported zero instead of treating it as missing', () => expect(formatReportedAmount({ balance: 0 })).toBe('$0.00'));
  it('returns the selected amount source', () => expect(getReportedAmount({ pastDue: 45 }).source).toBe('Past due'));
  it('auto-accepts a coherent high-confidence account', () => expect(needsAccountReview({ creditorName: 'Acme', accountNumberMasked: '****1234', bureau: 'Experian', accountType: 'Installment', status: 'Closed', parserConfidence: 90, isNegative: true, negativeReason: 'Charge-off' })).toBe(false));
  it('flags low-confidence accounts', () => expect(needsAccountReview({ creditorName: 'Acme', accountNumberMasked: '****1234', bureau: 'Experian', accountType: 'Installment', status: 'Closed', parserConfidence: 69 })).toBe(true));
  it('flags unknown metadata', () => expect(needsAccountReview({ creditorName: 'Acme', accountNumberMasked: '****1234', bureau: 'Experian', accountType: 'Unknown', status: 'Closed', parserConfidence: 90 })).toBe(true));
  it('keeps save-to-audit and audit-to-dispute as explicit separate actions', () => {
    const review = read('src/app/clients/[clientId]/reports/[reportId]/review/components/ReportReviewContent.tsx');
    expect(review).toContain('Continue Audit');
    expect(review).toContain('router.push(`/credit-audit?clientId=${clientId}&reportId=${reportId}`)');
    expect(read('src/app/credit-audit/components/CreditAuditContent.tsx')).toContain('Start Dispute');
  });
  it('extracts and persists distinct Experian amount fields in the report snapshot', () => {
    const parser = read('src/lib/creditReport/parser.ts');
    const importer = read('src/app/credit-report-import/components/CreditReportImportContent.tsx');
    expect(parser).toContain("['collectionAmount'");
    expect(parser).toContain("['chargeOffAmount'");
    expect(parser).toContain("['originalBalance'");
    expect(importer).toContain('all_accounts: stripRawReportArtifacts(parsedReport.accounts)');
  });
});
