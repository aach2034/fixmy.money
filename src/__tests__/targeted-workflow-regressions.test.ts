import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildConsumerSenderBlock, getLetterSenderInfo } from '../lib/disputes/letterSender';
import { isLikelyCreditorName, parseCreditReport } from '../lib/creditReport/parser';
import { getActionableUnmatchedBlocks, summarizePersistedReportItems } from '../lib/creditReport/persistenceContract';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('fresh report persistence and handoff contract', () => {
  it('shows only final unresolved readable blocks, not pre-reconciliation exclusions', () => {
    const report = {
      unparsedBlocks: Array.from({ length: 48 }, (_, index) => `raw excluded block ${index + 1}`),
      blockDispositions: [{
        blockIndex: 0,
        rawText: 'resolved account metadata',
        normalizedText: 'resolved account metadata',
        initialClassification: 'unknown',
        finalDisposition: 'attached-to-account',
        reason: 'reconciled',
      }],
      diagnostics: { readableTextBlocksRejected: 0 },
    } as any;

    expect(getActionableUnmatchedBlocks(report)).toEqual([]);
  });

  it('summarizes the exact persisted 18 / 14 / 9 / 5 / 1 result without inquiry inflation', () => {
    const accounts = Array.from({ length: 18 }, (_, index) => ({
      id: `account-${index}`,
      bureau: 'Experian',
      creditor_name: `Creditor ${index}`,
      account_number_masked: `****${1000 + index}`,
      account_type: 'Revolving',
      negative_category: index < 9 ? 'collection' : index < 14 ? 'charge_off' : null,
      is_negative: index < 14,
      is_collection: index < 9,
    }));
    const inquiry = {
      id: 'inquiry-1',
      bureau: 'Experian',
      creditor_name: 'Inquiry Creditor',
      account_number_masked: null,
      account_type: 'Hard Inquiry',
      negative_category: 'hard_inquiry',
      is_negative: true,
      is_collection: false,
    };

    expect(summarizePersistedReportItems([...accounts, inquiry])).toEqual({
      accounts: 18,
      negatives: 14,
      collections: 9,
      chargeOffs: 5,
      inquiries: 1,
      duplicates: 0,
    });
  });

  it('detects duplicate persisted classifications', () => {
    const row = {
      id: 'one',
      bureau: 'Experian',
      creditor_name: 'ACME BANK',
      account_number_masked: '****1234',
      account_type: 'Revolving',
      negative_category: 'charge_off',
      is_negative: true,
      is_collection: false,
    };
    expect(summarizePersistedReportItems([row, { ...row, id: 'two' }]).duplicates).toBe(1);
  });

  it('keeps Report Review and Credit Audit scoped to the freshly saved report', () => {
    const importer = read('src/app/credit-report-import/components/CreditReportImportContent.tsx');
    const review = read('src/app/clients/[clientId]/reports/[reportId]/review/components/ReportReviewContent.tsx');
    const audit = read('src/app/credit-audit/components/CreditAuditContent.tsx');

    expect(importer).toContain('getActionableUnmatchedBlocks(parsedReport)');
    expect(importer).toContain(".eq('report_id', reportRecord.id)");
    expect(importer.indexOf('if (!persistenceMatches)')).toBeLessThan(importer.indexOf('router.push(`/clients/'));
    expect(review).toContain("item.negative_category !== 'hard_inquiry'");
    expect(audit).toContain("savedItemsQuery = savedItemsQuery.eq('report_id', requestedReportId)");
    expect(audit).toContain("reportSnapshotsQuery = reportSnapshotsQuery.eq('id', requestedReportId)");
    expect(audit).toContain("label: 'Accounts', value: auditResult.accountCount");
  });
});

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

describe('wizard draft persistence handoff', () => {
  const wizard = read('src/app/dispute-wizard/components/DisputeWizardContent.tsx');
  const letters = read('src/app/dispute-letter-management/components/DisputeLetterContent.tsx');

  it('does not report success until the persisted draft row and its database id are returned', () => {
    expect(wizard).toContain("from('dispute_letters').insert({");
    expect(wizard).toContain("letter_status: 'draft'");
    expect(wizard).toContain('letter_content: letterContent');
    expect(wizard).toContain("}).select('id, letter_id').single()");
    expect(wizard).toContain("if (insertError || !savedLetter?.id)");
    expect(wizard.indexOf('setGeneratedLetter({ id: savedLetter.id')).toBeGreaterThan(wizard.indexOf("if (insertError || !savedLetter?.id)"));
  });

  it('opens the exact saved draft from the final CTA and after the Drafts query reloads', () => {
    expect(wizard).toContain('View Draft Letter');
    expect(wizard).toContain('draftId=${encodeURIComponent(generatedLetter.id)}');
    expect(letters).toContain("const requestedDraftId = searchParams.get('draftId')");
    expect(letters).toContain('letters.find(letter => letter.id === requestedDraftId)');
    expect(letters).toContain('setPreviewLetter(requestedDraft)');
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

  it('uses confirmed collection evidence consistently for rows and totals', () => {
    const parsed = parseCreditReport(`
Experian Credit Report
Accounts
MIDLAND CREDIT MANAGEMENT
Account Number: ****1001
Account Type: Revolving
Account Status: Current
Balance: $100
Date Opened: 01/01/2020
Bureau: Experian

ACME RECOVERY
Account Number: ****1002
Account Type: Collection
Account Status: Collection account
Balance: $200
Date Opened: 02/01/2021
Bureau: Experian
`, 'experian');

    expect(parsed.accounts).toHaveLength(2);
    expect(parsed.collections.map(account => account.accountNumber)).toEqual(['****1002']);
    expect(parsed.accounts.find(account => account.accountNumber === '****1001')?.isCollection).toBe(false);
    expect(read('src/app/clients/[clientId]/reports/[reportId]/review/components/ReportReviewContent.tsx')).not.toContain('Collection?');
  });

  it('keeps adjacent Experian metadata on its identified account without creating another account', () => {
    const parsed = parseCreditReport(`
Experian Credit Report
Accounts
CAPITAL ONE
Account Number: ****7788
Balance: $450
Date Opened: 03/04/2020
Account Type
Revolving
Account Status
60 days late
Responsibility
Individual
Bureau: Experian
Inquiries
`, 'experian');

    expect(parsed.accounts).toHaveLength(1);
    expect(parsed.accounts[0]).toMatchObject({
      accountNumber: '****7788',
      accountType: 'Revolving',
      status: '60 days late',
      responsibility: 'Individual',
      isNegative: true,
    });
  });

  it('requires account-specific derogatory evidence for an Experian negative item', () => {
    const parsed = parseCreditReport(`
Experian Credit Report
Accounts
CAPITAL ONE
Account Number: ****3000
Account Type: Revolving
Account Status: Current
Balance: $300
Date Opened: 01/01/2022
Bureau: Experian
Negative Accounts Summary
Late payment
`, 'experian');
    expect(parsed.accounts).toHaveLength(1);
    expect(parsed.negativeAccounts).toHaveLength(0);
  });

  it('penalizes Experian confidence when major metadata remains unknown and readable blocks are unresolved', () => {
    const sparse = parseCreditReport(`
Experian Credit Report
Accounts
CAPITAL ONE
Account Number: ****4000
Balance: $100
Account Status: Current
unmatched readable narrative one
unmatched readable narrative two
unmatched readable narrative three
unmatched readable narrative four
`, 'experian');
    const coherent = parseCreditReport(`
Experian Credit Report
Personal Information
Name: Jordan Bennett
Current Address: 123 Main St, Atlanta, GA 30301
Credit Scores
Experian Score: 680
Accounts
CAPITAL ONE
Account Number: ****4000
Account Type: Revolving
Account Status: Current
Balance: $100
Date Opened: 01/01/2022
Responsibility: Individual
Bureau: Experian
`, 'experian');

    expect(sparse.overallConfidence).toBeLessThan(coherent.overallConfidence);
    expect(coherent.overallConfidence).toBeGreaterThanOrEqual(50);
  });

  it.each([
    ['delinquent status', 'Credit card', 'Open/60 days late.', '$450', '60 days late'],
    ['collection', 'Collection', 'Collection account. $620 past due.', '$620', 'Collection account'],
    ['charge-off', 'Credit card', 'Account charged off. $830 written off.', '$830', 'Charge-off'],
  ])('classifies Experian space-delimited %s fields', (_label, accountType, status, pastDue, reason) => {
    const parsed = parseCreditReport(`
Experian Credit Report
Accounts
ACME FINANCIAL
Account info
Account name ACME FINANCIAL
Account number 123456XX
Date opened Jan 1, 2022
Status updated Aug 2026
Account type ${accountType}
Status ${status}
Balance ${pastDue}
Past due amount ${pastDue}
Responsibility Individual
Comments -
Inquiries
`, 'experian');

    expect(parsed.accounts).toHaveLength(1);
    expect(parsed.accounts[0]).toMatchObject({ accountType, isNegative: true });
    expect(parsed.accounts[0].status).toContain(status.split('.')[0]);
    expect(parsed.accounts[0].negativeReason).toContain(reason);
  });

  it('attaches standalone Experian late-payment codes without reading the legend as account history', () => {
    const late = parseCreditReport(`
Experian Credit Report
Accounts
ACME AUTO
Account info
Account name ACME AUTO
Account number 987654XX
Account type Auto Loan
Status Open.
Balance $500
Payment history
2026
Jan
30
Feb
60
Current / Terms met 30 Past due 30 days 60 Past due 60 days CO Charge off
Contact info
Inquiries
`, 'experian');
    const positive = parseCreditReport(`
Experian Credit Report
Accounts
ACME AUTO
Account info
Account name ACME AUTO
Account number 987654XX
Account type Auto Loan
Status Open/Never late.
Balance $500
Payment history
2026
Jan
-
Current / Terms met 30 Past due 30 days 60 Past due 60 days CO Charge off
Contact info
Inquiries
`, 'experian');

    expect(late.accounts[0].latePayments).toEqual(expect.arrayContaining([{ days: 30, count: 1 }, { days: 60, count: 1 }]));
    expect(late.negativeAccounts).toHaveLength(1);
    expect(positive.negativeAccounts).toHaveLength(0);
  });

  it('attaches Experian remarks and past-due values to the identified account', () => {
    const parsed = parseCreditReport(`
Experian Credit Report
Accounts
ACME BANK
Account info
Account name ACME BANK
Account number 112233XX
Account type Revolving
Status Open.
Balance $900
Past due amount $125
Responsibility Individual
Comments Account is delinquent
Inquiries
`, 'experian');

    expect(parsed.accounts[0]).toMatchObject({ pastDue: 125, isNegative: true });
    expect(parsed.accounts[0].remarks.join(' ')).toContain('Account is delinquent');
  });

  it('does not classify a closed or positive-balance Experian account as negative without adverse evidence', () => {
    const parsed = parseCreditReport(`
Experian Credit Report
Accounts
ACME BANK
Account info
Account name ACME BANK
Account number 445566XX
Account type Credit card
Status Paid, Closed/Never late.
Balance $0
Original balance $900
Responsibility Individual
Comments -
Inquiries
`, 'experian');

    expect(parsed.accounts).toHaveLength(1);
    expect(parsed.negativeAccounts).toHaveLength(0);
    expect(parsed.collections).toHaveLength(0);
  });

  it('classifies an Experian closed account with a written-off status as a charge-off', () => {
    const parsed = parseCreditReport(`
Experian Credit Report
Accounts
ACME BANK
Account info
Account name ACME BANK
Account number 778899XX
Account type Credit card
Status Closed. $429 written off.
Balance $0
Comments Purchased by another lender
Inquiries
`, 'experian');

    expect(parsed.accounts).toHaveLength(1);
    expect(parsed.accounts[0]).toMatchObject({ isNegative: true, isChargeOff: true, negativeReason: 'Written off' });
  });
});
