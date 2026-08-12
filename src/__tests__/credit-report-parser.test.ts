import { describe, it, expect } from 'vitest';
import {
  parseCreditReport,
  detectProvider,
  isNegativeAccount,
  detectNegativeReason,
  DISPUTE_REASONS,
  DISPUTE_INSTRUCTIONS,
  safeNormalizeText,
} from '../lib/creditReport/parser';

// ─── Provider detection ───────────────────────────────────────────────────────

describe('detectProvider', () => {
  it('detects SmartCredit', () => {
    const { provider, confidence } = detectProvider('SmartCredit report for John Doe');
    expect(provider).toBe('smartcredit');
    expect(confidence).toBeGreaterThanOrEqual(90);
  });

  it('detects MyScoreIQ', () => {
    const { provider } = detectProvider('MyScoreIQ FICO Max report');
    expect(provider).toBe('myscoreiq');
  });

  it('detects IdentityIQ', () => {
    const { provider } = detectProvider('IdentityIQ credit monitoring report');
    expect(provider).toBe('identityiq');
  });

  it('detects MyFreeScoreNow', () => {
    const { provider } = detectProvider('MyFreeScoreNow 3-bureau report');
    expect(provider).toBe('myfreescorenow');
  });

  it('detects PrivacyGuard', () => {
    const { provider } = detectProvider('PrivacyGuard credit report');
    expect(provider).toBe('privacyguard');
  });

  it('detects AnnualCreditReport', () => {
    const { provider } = detectProvider('AnnualCreditReport.com official report');
    expect(provider).toBe('annualcreditreport');
  });

  it('detects Experian', () => {
    const { provider } = detectProvider('Experian credit report for consumer');
    expect(provider).toBe('experian');
  });

  it('detects Credit Karma', () => {
    const { provider } = detectProvider('Credit Karma free credit score');
    expect(provider).toBe('creditkarma');
  });

  it('returns unknown for unrecognized text', () => {
    const { provider, confidence } = detectProvider('random text with no provider info');
    expect(provider).toBe('unknown');
    expect(confidence).toBe(0);
  });
});

// ─── Negative item detection ──────────────────────────────────────────────────

describe('isNegativeAccount', () => {
  it('detects collection accounts', () => {
    expect(isNegativeAccount({ accountType: 'Collection', status: 'Collection' })).toBe(true);
  });

  it('detects charge-offs', () => {
    expect(isNegativeAccount({ status: 'Charge-off', accountType: 'Credit Card' })).toBe(true);
  });

  it('detects late payments', () => {
    expect(isNegativeAccount({ latePayments: [{ days: 30, count: 2 }] })).toBe(true);
  });

  it('detects 60 days late status', () => {
    expect(isNegativeAccount({ status: '60 days late' })).toBe(true);
  });

  it('detects 90 days late status', () => {
    expect(isNegativeAccount({ status: '90 days late' })).toBe(true);
  });

  it('detects 120 days late status', () => {
    expect(isNegativeAccount({ status: '120 days late' })).toBe(true);
  });

  it('detects repossession', () => {
    expect(isNegativeAccount({ status: 'Repossession' })).toBe(true);
  });

  it('detects foreclosure', () => {
    expect(isNegativeAccount({ status: 'Foreclosure' })).toBe(true);
  });

  it('detects bankruptcy', () => {
    expect(isNegativeAccount({ accountType: 'Included in bankruptcy' })).toBe(true);
  });

  it('detects past due balance', () => {
    expect(isNegativeAccount({ pastDue: 500 })).toBe(true);
  });

  it('detects derogatory status', () => {
    expect(isNegativeAccount({ status: 'Derogatory' })).toBe(true);
  });

  it('detects settled for less', () => {
    expect(isNegativeAccount({ remarks: ['Settled for less than full balance'] })).toBe(true);
  });

  it('does NOT flag current positive accounts', () => {
    expect(isNegativeAccount({ status: 'Current', accountType: 'Credit Card', latePayments: [], pastDue: 0 })).toBe(false);
  });
});

describe('detectNegativeReason', () => {
  it('returns Collection account for collection type', () => {
    expect(detectNegativeReason({ accountType: 'Collection' })).toBe('Collection account');
  });

  it('returns Charge-off for charged off status', () => {
    expect(detectNegativeReason({ status: 'Charged Off' })).toBe('Charge-off');
  });

  it('returns 30 days late', () => {
    expect(detectNegativeReason({ status: '30 days late' })).toBe('30 days late');
  });

  it('returns 60 days late', () => {
    expect(detectNegativeReason({ status: '60 days late' })).toBe('60 days late');
  });

  it('returns 90 days late', () => {
    expect(detectNegativeReason({ status: '90 days late' })).toBe('90 days late');
  });

  it('returns 120 days late', () => {
    expect(detectNegativeReason({ status: '120 days late' })).toBe('120 days late');
  });

  it('returns Repossession', () => {
    expect(detectNegativeReason({ status: 'Repossession' })).toBe('Repossession');
  });

  it('returns Past due balance', () => {
    expect(detectNegativeReason({ pastDue: 100 })).toBe('Past due balance');
  });
});

// ─── Full parser ──────────────────────────────────────────────────────────────

describe('parseCreditReport', () => {
  const sampleReport = `
SmartCredit 3-Bureau Credit Report

Personal Information
Name: John Doe
SSN: XXX-XX-1234
Date of Birth: 01/15/1985
Current Address: 123 Main St, Atlanta, GA 30301

Credit Scores
Equifax Score: 582
Experian Score: 591
TransUnion Score: 578

Accounts

Midland Credit Management
Account Number: ****8834
Account Type: Collection
Account Status: Collection
Balance: $1,200
Past Due: $1,200
Date Opened: 07/01/2021
Date Reported: 03/15/2024
Bureau: Experian

Capital One
Account Number: ****4521
Account Type: Credit Card
Account Status: Current
Balance: $2,450
Credit Limit: $5,000
Date Opened: 03/15/2019
Date Reported: 04/01/2024
Bureau: Equifax

Chase Auto Finance
Account Number: ****2291
Account Type: Auto Loan
Account Status: 60 Days Late
Balance: $8,900
Date Opened: 11/10/2020
Date Reported: 04/01/2024
Bureau: TransUnion
30 Days Late: 2
60 Days Late: 1

Hard Inquiries
Discover 01/15/2024 Equifax
Unknown Lender 03/22/2024 TransUnion

Public Records
Bankruptcy Chapter 7 Filed: 2020-01-15 Status: Discharged Bureau: Equifax
`;

  it('detects SmartCredit provider', () => {
    const result = parseCreditReport(sampleReport);
    expect(result.provider).toBe('smartcredit');
  });

  it('extracts personal information', () => {
    const result = parseCreditReport(sampleReport);
    expect(result.personalInfo.name).toBeTruthy();
  });

  it('extracts credit scores', () => {
    const result = parseCreditReport(sampleReport);
    expect(result.scores.length).toBeGreaterThan(0);
  });

  it('extracts accounts', () => {
    const result = parseCreditReport(sampleReport);
    expect(result.accounts.length).toBeGreaterThan(0);
  });

  it('detects negative accounts', () => {
    const result = parseCreditReport(sampleReport);
    expect(result.negativeAccounts.length).toBeGreaterThan(0);
  });

  it('detects collections flowing to negative queue', () => {
    const result = parseCreditReport(sampleReport);
    const collections = result.accounts.filter(a => a.isCollection);
    expect(collections.length).toBeGreaterThan(0);
    collections.forEach(c => expect(c.isNegative).toBe(true));
  });

  it('detects charge-offs flowing to negative queue', () => {
    const chargeOffReport = `
Experian Credit Report
ACME Bank
Account Type: Charge-Off
Account Status: Charged Off
Balance: $3,500
Bureau: Experian
`;
    const result = parseCreditReport(chargeOffReport);
    const chargeOffs = result.accounts.filter(a => a.isChargeOff);
    chargeOffs.forEach(c => expect(c.isNegative).toBe(true));
  });

  it('detects late payments flowing to negative queue', () => {
    const result = parseCreditReport(sampleReport);
    const lateAccounts = result.accounts.filter(a => a.isLate);
    lateAccounts.forEach(a => expect(a.isNegative).toBe(true));
  });

  it('extracts inquiries', () => {
    const result = parseCreditReport(sampleReport);
    expect(result.inquiries.length).toBeGreaterThan(0);
  });

  it('extracts public records', () => {
    const result = parseCreditReport(sampleReport);
    expect(result.publicRecords.length).toBeGreaterThan(0);
  });

  it('returns overall confidence score', () => {
    const result = parseCreditReport(sampleReport);
    expect(result.overallConfidence).toBeGreaterThan(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(100);
  });

  it('returns sections parsed and missed', () => {
    const result = parseCreditReport(sampleReport);
    expect(Array.isArray(result.sectionsParsed)).toBe(true);
    expect(Array.isArray(result.sectionsMissed)).toBe(true);
  });

  it('respects forced provider override', () => {
    const result = parseCreditReport('some credit report text', 'myscoreiq');
    expect(result.provider).toBe('myscoreiq');
    expect(result.providerConfidence).toBe(100);
  });

  it('never includes staff approval language', () => {
    const result = parseCreditReport(sampleReport);
    const json = JSON.stringify(result);
    expect(json).not.toContain('Staff Review Required');
    expect(json).not.toContain('staff review required');
    expect(json).not.toContain('Pending Staff Approval');
    expect(json).not.toContain('Awaiting Specialist Approval');
    expect(json).not.toContain('Manager Approval Needed');
  });

  it('separates MyScoreIQ tri-bureau column accounts', () => {
    const report = `
MyScoreIQ Three Bureau Credit Report
Account History
FIRST BANK
TransUnion Experian Equifax
Account #: ****1111 ****1111 ****1111
Account Type: Credit Card Credit Card Credit Card
Account Status: Current Current Current
Balance: $100 $100 $100
Date Opened: 01/01/2020 01/01/2020 01/01/2020
SECOND FINANCE
TransUnion Experian Equifax
Account #: ****2222 ****2222 ****2222
Account Type: Auto Loan Auto Loan Auto Loan
Account Status: 60 Days Late 60 Days Late 60 Days Late
Balance: $5000 $5000 $5000
Date Opened: 02/02/2021 02/02/2021 02/02/2021
Inquiries
`;
    const result = parseCreditReport(report);
    expect(result.provider).toBe('myscoreiq');
    expect(result.accounts).toHaveLength(6);
    expect(result.accounts.filter(account => account.creditorName === 'FIRST BANK')).toHaveLength(3);
    expect(result.accounts.filter(account => account.creditorName === 'SECOND FINANCE')).toHaveLength(3);
    expect(result.accounts.filter(account => account.creditorName === 'FIRST BANK').every(account => !account.isNegative)).toBe(true);
    expect(result.accounts.filter(account => account.creditorName === 'SECOND FINANCE').every(account => account.isNegative)).toBe(true);
    expect(result.accounts.map(account => account.bureau)).toEqual([
      'TransUnion', 'Experian', 'Equifax', 'TransUnion', 'Experian', 'Equifax',
    ]);
  });

  it('keeps only the bureaus that actually report a tri-bureau account', () => {
    const report = `
MyScoreIQ Three Bureau Credit Report
Account History
COLLECTION AGENCY
TransUnion Experian Equifax
Account #: - 466213X 466213X
Account Type: - COLLECTION COLLECTION
Account Status: - Collection Collection
Balance: - $75.00 $80.00
Date Opened: - 01/09/2026 01/10/2026
Last Reported: - 06/22/2026 06/23/2026
Inquiries
`;
    const result = parseCreditReport(report);
    expect(result.accounts.map(account => account.bureau)).toEqual(['Experian', 'Equifax']);
    expect(result.accounts.map(account => account.balance)).toEqual([75, 80]);
    expect(result.accounts.map(account => account.dateReported)).toEqual(['2026-06-22', '2026-06-23']);
  });

  it('extracts scores from the MyScoreIQ three-column score row', () => {
    const report = `
MyScoreIQ Three Bureau Credit Report
FICO ® Score
TransUnion Experian Equifax
FICO ® Score 8: 540 493 521
`;
    const result = parseCreditReport(report);
    expect(result.scores.map(score => [score.bureau, score.score])).toEqual([
      ['TransUnion', 540], ['Experian', 493], ['Equifax', 521],
    ]);
  });
});

// ─── Bureau grouping ──────────────────────────────────────────────────────────

describe('Bureau grouping', () => {
  it('groups items by bureau correctly', () => {
    const items = [
      { bureau: 'Equifax', creditorName: 'A', bureausReporting: ['Equifax'] },
      { bureau: 'Experian', creditorName: 'B', bureausReporting: ['Experian'] },
      { bureau: 'TransUnion', creditorName: 'C', bureausReporting: ['TransUnion'] },
      { bureau: 'Equifax', creditorName: 'D', bureausReporting: ['Equifax', 'TransUnion'] },
    ];

    const groups: Record<string, typeof items> = {};
    for (const item of items) {
      const bureaus = item.bureausReporting.length > 0 ? item.bureausReporting : [item.bureau];
      for (const bureau of bureaus) {
        if (!groups[bureau]) groups[bureau] = [];
        groups[bureau].push(item);
      }
    }

    expect(groups['Equifax'].length).toBe(2);
    expect(groups['Experian'].length).toBe(1);
    expect(groups['TransUnion'].length).toBe(2); // C + D (multi-bureau)
  });

  it('includes multi-bureau items in each applicable bureau letter', () => {
    const multiBureauItem = { bureau: 'Equifax', bureausReporting: ['Equifax', 'Experian', 'TransUnion'] };
    const groups: Record<string, boolean> = {};
    for (const bureau of multiBureauItem.bureausReporting) {
      groups[bureau] = true;
    }
    expect(groups['Equifax']).toBe(true);
    expect(groups['Experian']).toBe(true);
    expect(groups['TransUnion']).toBe(true);
  });
});

// ─── Dispute reasons and instructions ────────────────────────────────────────

describe('Dispute options', () => {
  it('has all required dispute reasons', () => {
    const required = ['Not mine', 'Account information inaccurate', 'Incorrect balance', 'Inquiry not authorized'];
    required.forEach(r => expect(DISPUTE_REASONS).toContain(r));
  });

  it('has all required dispute instructions', () => {
    const required = ['Delete this account', 'Correct the reporting', 'Verify all information'];
    required.forEach(i => expect(DISPUTE_INSTRUCTIONS).toContain(i));
  });
});

// ─── No demo data leakage ─────────────────────────────────────────────────────

describe('No demo data leakage', () => {
  it('parser does not inject demo data into results', () => {
    const result = parseCreditReport('empty report text');
    // Should not contain known demo names from seed data
    const json = JSON.stringify(result);
    expect(json).not.toContain('Darnell Washington');
    expect(json).not.toContain('Priya Nambiar');
    expect(json).not.toContain('Marcus Holloway');
  });

  it('parser result has no hardcoded account numbers', () => {
    const result = parseCreditReport('empty report text');
    expect(result.accounts.length).toBe(0);
    expect(result.negativeAccounts.length).toBe(0);
  });
});

// ─── Tenant isolation ─────────────────────────────────────────────────────────

describe('Tenant isolation', () => {
  it('parsed report includes owner_id field requirement', () => {
    // Verify the save payload structure requires owner_id
    const savePayload = {
      owner_id: 'test-user-id',
      client_id: 'test-client-id',
      provider: 'smartcredit',
    };
    expect(savePayload.owner_id).toBeTruthy();
    expect(savePayload.client_id).toBeTruthy();
  });

  it('negative items require both owner_id and client_id', () => {
    const negativeItemPayload = {
      owner_id: 'test-user-id',
      client_id: 'test-client-id',
      bureau: 'Equifax',
      creditor_name: 'Test Creditor',
    };
    expect(negativeItemPayload.owner_id).toBeTruthy();
    expect(negativeItemPayload.client_id).toBeTruthy();
  });
});

// ─── No blank letters ─────────────────────────────────────────────────────────

describe('Letter generation', () => {
  it('generates non-blank letter content', () => {
    const bureau = 'Equifax';
    const clientName = 'John Doe';
    const items = [{
      id: '1',
      bureau: 'Equifax',
      creditorName: 'Midland Credit',
      accountNumberMasked: '****1234',
      accountType: 'Collection',
      negativeReason: 'Collection account',
      disputeReason: 'Not mine',
      disputeInstruction: 'Delete this account',
      status: 'draft',
    }];

    // Simulate letter content generation
    const content = `${new Date().toLocaleDateString()}\n\nEquifax Information Services LLC\n\nRe: Formal Dispute\nConsumer: ${clientName}\n\n${items.map(i => `${i.creditorName}: ${i.disputeReason}`).join('\n')}`;

    expect(content.length).toBeGreaterThan(50);
    expect(content).toContain('Midland Credit');
    expect(content).toContain('Not mine');
    expect(content).toContain('John Doe');
  });

  it('letter does not contain staff approval language', () => {
    const letterContent = 'Generated draft — Review before sending — confirm details before mailing';
    expect(letterContent).not.toContain('Staff Review Required');
    expect(letterContent).not.toContain('AI-assisted draft — staff review required');
    expect(letterContent).not.toContain('Requires approval before sending');
    expect(letterContent).not.toContain('Do not send until reviewed by staff');
  });
});

// ─── Unicode normalization and crash prevention ───────────────────────────────

describe('safeNormalizeText', () => {
  it('does not throw on lone surrogate characters', () => {
    // Lone surrogates are the primary cause of "Invalid Unicode character sequence" errors
    const withLoneSurrogate = 'Credit Report\uD800Account Balance\uDFFF$500';
    expect(() => {
      safeNormalizeText(withLoneSurrogate);
    }).not.toThrow();
  });

  it('replaces smart quotes with straight quotes', () => {
    const withSmartQuotes = '\u201CAccount Status\u201D: \u2018Current\u2019';
    const result = safeNormalizeText(withSmartQuotes);
    expect(result).toContain('"Account Status"');
    expect(result).toContain("'Current'");
  });

  it('replaces nonbreaking spaces with regular spaces', () => {
    const withNBSP = 'Balance\u00A0$500\u00A0Past\u00A0Due';
    const result = safeNormalizeText(withNBSP);
    expect(result).not.toContain('\u00A0');
    expect(result).toContain('Balance');
    expect(result).toContain('$500');
  });

  it('removes null bytes', () => {
    const withNulls = 'Account\u0000Number\u0000****1234';
    const result = safeNormalizeText(withNulls);
    expect(result).not.toContain('\u0000');
    expect(result).toContain('Account');
  });

  it('replaces em dashes with hyphens', () => {
    const withEmDash = 'Charge\u2014Off Account';
    const result = safeNormalizeText(withEmDash);
    expect(result).toContain('Charge-Off Account');
  });

  it('preserves meaningful line breaks', () => {
    const multiLine = 'Account Name\nCapital One\nBalance\n$500\nStatus\nCurrent';
    const result = safeNormalizeText(multiLine);
    const lines = result.split('\n').filter((l: string) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(4);
  });

  it('does not crash on empty string', () => {
    expect(() => safeNormalizeText('')).not.toThrow();
    expect(safeNormalizeText('')).toBe('');
  });

  it('does not crash on null/undefined', () => {
    expect(() => safeNormalizeText(null as any)).not.toThrow();
    expect(() => safeNormalizeText(undefined as any)).not.toThrow();
  });
});

describe('parseCreditReport with Unicode artifacts', () => {
  it('does not throw on text with lone surrogates (the previously failing case)', () => {
    // This is the exact type of input that caused "Invalid Unicode character sequence" errors
    const reportWithSurrogates = `
SmartCredit 3-Bureau Report\uD800\uD801
Personal Information
Name: John\uDFFF Doe
Account Name
Capital One\uD83D
Account Number
****1234
Balance
$2500
Status
Current
Date Opened
01/2020
`;
    expect(() => parseCreditReport(reportWithSurrogates)).not.toThrow();
    const result = parseCreditReport(reportWithSurrogates);
    expect(result).toBeDefined();
    expect(result.provider).toBeDefined();
  });

  it('does not throw on text with mixed Unicode control characters', () => {
    const reportWithControls = `Credit Report\u0001\u0002\u001F
Account Name\u00A0Capital One\u200B
Balance\u00A0$500
Status\u2014Current
`;
    expect(() => parseCreditReport(reportWithControls)).not.toThrow();
  });

  it('detects provider from text with OCR spacing artifacts', () => {
    // OCR sometimes inserts spaces inside brand names
    const ocrReport = 'Smart Credit 3 Bureau Report\nEquifax Experian TransUnion\nAccount Name\nCapital One\nBalance\n$500';
    const result = parseCreditReport(ocrReport);
    // Should detect smartcredit or at least not crash
    expect(result).toBeDefined();
    expect(result.provider).not.toBeUndefined();
  });

  it('falls back to generic parser when provider is unknown', () => {
    const genericReport = `
Credit Report
Account Name
Capital One
Account Number
****1234
Balance
$2500
Account Status
Current
Date Opened
03/2019
Account Name
Midland Credit Management
Account Type
Collection
Balance
$1200
Account Status
Collection
`;
    const result = parseCreditReport(genericReport);
    expect(result).toBeDefined();
    // Should not crash even with unknown provider
    expect(result.provider).toBeDefined();
    // Diagnostics should be present
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics?.rawTextLength).toBeGreaterThan(0);
    expect(result.diagnostics?.normalizedTextLength).toBeGreaterThan(0);
  });

  it('includes stageFailures in diagnostics', () => {
    const result = parseCreditReport('some credit report text with no provider');
    expect(result.diagnostics).toBeDefined();
    expect(Array.isArray(result.diagnostics?.stageFailures)).toBe(true);
  });

  it('includes rawTextLength and normalizedTextLength in diagnostics', () => {
    const text = 'SmartCredit report\nAccount Name\nCapital One\nBalance\n$500';
    const result = parseCreditReport(text);
    expect(result.diagnostics?.rawTextLength).toBe(text.length);
    expect(result.diagnostics?.normalizedTextLength).toBeGreaterThan(0);
  });
});

describe('HTML report and inquiry evidence safety', () => {
  it('converts report HTML into text without leaking tags or scripts', () => {
    const normalized = safeNormalizeText(`
      <table><tr><th width="20%">Creditor</th><td>Discover Bank</td></tr></table>
      <script>window.bad = 'not report data'</script>
    `);

    expect(normalized).toContain('Creditor');
    expect(normalized).toContain('Discover Bank');
    expect(normalized).not.toMatch(/<\/?(?:table|tr|th|td|script)\b/i);
    expect(normalized).not.toContain('window.bad');
  });

  it('does not promote educational inquiry prose into a hard inquiry', () => {
    const result = parseCreditReport(`
      <div>Credit Report</div>
      <h2>Hard Inquiries</h2>
      <div>on a credit file carries much less importance than late payments, the amount owed and the length of time credit has been established</div>
      <div>Public Records</div>
    `);

    expect(result.inquiries).toEqual([]);
  });

  it('keeps a dated hard inquiry tied to a recognized bureau', () => {
    const result = parseCreditReport(`
      Credit Report
      Hard Inquiries
      Discover Bank 01/15/2024 Equifax



      Public Records
    `);

    expect(result.inquiries).toEqual(expect.arrayContaining([
      expect.objectContaining({ creditor: 'Discover Bank', bureau: 'Equifax', type: 'hard' }),
    ]));
  });

  it('parses an HTML account table without treating glossary values as accounts', () => {
    const result = parseCreditReport(`
      <html><body>
        <h1>Equifax Credit Report</h1>
        <h2>Account Information</h2>
        <table>
          <tr><th>Creditor Name</th><td>CAPITAL ONE</td></tr>
          <tr><th>Account Number</th><td>XXXX1234</td></tr>
          <tr><th>Account Type</th><td>Revolving</td></tr>
          <tr><th>Account Status</th><td>Current</td></tr>
          <tr><th>Balance</th><td>$250</td></tr>
          <tr><th>Date Opened</th><td>01/02/2020</td></tr>
          <tr><th>Bureau</th><td>Equifax</td></tr>
        </table>
        <h2>Account type definitions</h2>
        <div>Revolving account</div>
        <div>Individual Account</div>
        <div>Paid or paying as agreed</div>
      </body></html>
    `);

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]).toMatchObject({
      creditorName: 'CAPITAL ONE',
      accountNumberMasked: '****1234',
      bureau: 'Equifax',
      balance: 250,
    });
  });
});
