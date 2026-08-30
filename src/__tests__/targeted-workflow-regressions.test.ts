import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildConsumerSenderBlock, getLetterSenderInfo } from '../lib/disputes/letterSender';
import { isLikelyCreditorName, parseCreditReport } from '../lib/creditReport/parser';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('client enrollment report boundary', () => {
  const enrollment = read('src/app/client-management/components/AddClientForm.tsx');

  it('does not render or analyze a credit report during enrollment', () => {
    expect(enrollment).not.toContain('Credit report (optional)');
    expect(enrollment).not.toContain('/api/credit-report/analyze');
    expect(enrollment).not.toContain('credit_report_uploads');
    expect(enrollment).not.toContain('analysisStatus');
  });
});

describe('canonical client mailing address handoff', () => {
  it('preserves address line 2 in the sender block used by letter preparation and preview', () => {
    const sender = getLetterSenderInfo({
      name: 'Jordan Bennett',
      address: '123 Main Street\nApt 4B',
      city: 'Atlanta',
      state: 'ga',
      zip: '30301',
    });

    expect(sender?.address).toBe('123 Main Street\nApt 4B');
    expect(buildConsumerSenderBlock(sender!)).toContain('123 Main Street\nApt 4B\nAtlanta, GA 30301');
  });

  it('loads the selected persisted client address instead of report personal information', () => {
    const wizard = read('src/app/dispute-wizard/components/DisputeWizardContent.tsx');
    const audit = read('src/app/credit-audit/components/CreditAuditContent.tsx');
    const preparation = read('src/app/dispute-letter-management/components/GenerateLetterForm.tsx');

    expect(wizard).toContain(".select('id, name, email, phone, address, city, state, zip')");
    expect(wizard).toContain("const sender = getLetterSenderInfo(persistedClient)");
    expect(wizard).toContain(".eq('id', selectedClient.id)");
    expect(audit).toContain(".select('id, name, email, address, city, state, zip')");
    expect(preparation).toContain(".select('id, name, email, phone, address, city, state, zip')");
    expect(wizard).not.toMatch(/personalInfo\.(?:address|addresses)/);
  });
});

describe('Experian navigation and status fragments', () => {
  it.each(['experian/now', 'Experian Now', 'EXPERIAN - NOW', 'experian > now'])(
    'rejects %s as a creditor',
    value => expect(isLikelyCreditorName(value)).toBe(false),
  );

  it.each(['Late payment', '30 days late', '60 days late', '90 days late', 'Charge-off', 'Collection', 'Past due', 'Current', 'Closed', 'Open'])(
    'does not accept status-only creditor %s',
    value => expect(isLikelyCreditorName(value)).toBe(false),
  );

  it('attaches negative evidence to real accounts, preserves identifiers, and keeps same-creditor accounts separate', () => {
    const report = `
Experian Credit Report
Accounts

experian/now
Account Status: Late payment
Balance: $200

CAPITAL ONE
Account Number: ****1111
Account Type: Revolving
Account Status: 60 days late
Balance: $500
Date Opened: 01/01/2020
Bureau: Experian

CAPITAL ONE
Account Number: ****2222
Account Type: Revolving
Account Status: Charge-off
Balance: $900
Date Opened: 02/01/2021
Bureau: Experian

Late payment
Charge-off
Inquiries
`;
    const parsed = parseCreditReport(report, 'experian');

    expect(parsed.accounts.some(account => /experian[\s/\->]*now/i.test(account.creditorName))).toBe(false);
    const capitalOne = parsed.accounts.filter(account => account.creditorName === 'CAPITAL ONE');
    expect(capitalOne).toHaveLength(2);
    expect(capitalOne.map(account => account.accountNumber).sort()).toEqual(['****1111', '****2222']);
    expect(parsed.negativeAccounts.every(account => parsed.accounts.some(parent => parent.id === account.id))).toBe(true);
    expect(capitalOne.some(account => account.isLate)).toBe(true);
    expect(capitalOne.some(account => account.isChargeOff)).toBe(true);
  });

  it('does not report malformed identity fragments with high confidence', () => {
    const malformed = parseCreditReport(`Experian Credit Report\nAccounts\nexperian/now\nAccount Status: 60 days late\nBalance: $200\nDate Opened: 01/01/2020`, 'experian');
    expect(malformed.accounts).toHaveLength(0);
    expect(malformed.negativeAccounts).toHaveLength(0);
    expect(malformed.overallConfidence).toBeLessThan(50);
  });

  it('keeps high confidence for a correctly identified Experian fixture', () => {
    const valid = parseCreditReport(`Experian Credit Report\nPersonal Information\nName: Jordan Bennett\nCurrent Address: 123 Main St, Atlanta, GA 30301\nCredit Scores\nExperian Score: 680\nAccounts\nCAPITAL ONE\nAccount Number: ****1111\nAccount Type: Revolving\nAccount Status: Current\nBalance: $500\nDate Opened: 01/01/2020\nBureau: Experian`, 'experian');
    expect(valid.accounts).toHaveLength(1);
    expect(valid.overallConfidence).toBeGreaterThanOrEqual(50);
  });

  it('does not label incomplete extraction as none reported', () => {
    expect(read('src/app/credit-report-import/components/CreditReportImportContent.tsx')).not.toContain('Detected — none reported');
    expect(read('src/app/clients/[clientId]/reports/[reportId]/review/components/ReportReviewContent.tsx')).not.toContain('Detected — none reported');
  });
});
