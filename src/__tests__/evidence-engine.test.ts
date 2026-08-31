import { describe, expect, it } from 'vitest';
import {
  calculateEvidenceStrength,
  compareDisputedFields,
  detectPotentialIssues,
  detectPotentialReinsertions,
  normalizeCrossBureauAccounts,
  type BureauTradelineSnapshot,
} from '@/lib/disputeEngine/evidenceEngine';
import type { NormalizedAccount } from '@/lib/creditReport/adapters';

function account(overrides: Partial<NormalizedAccount>): NormalizedAccount {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    creditorName: 'Capital One',
    furnisherName: 'Capital One',
    bureau: 'Experian',
    bureaus: ['Experian'],
    accountNumberMasked: '****1234',
    accountType: 'Credit Card',
    responsibility: 'Individual',
    dateOpened: '2021-04-15',
    accountStatus: 'Charge-off',
    paymentStatus: '',
    balance: 4812,
    creditLimit: 5000,
    pastDue: 4812,
    monthlyPayment: null,
    lastPaymentDate: '',
    dateReported: '07/2026',
    paymentHistory: '',
    remarks: [],
    originalCreditor: '',
    collectionAgency: '',
    isNegative: true,
    negativeReason: 'Charge-off',
    isCollection: false,
    isChargeOff: true,
    isLate: false,
    rawText: '',
    parserConfidence: 90,
    ...overrides,
  };
}

describe('evidence-driven dispute engine', () => {
  it('normalizes likely same accounts while preserving each bureau tradeline separately', () => {
    const normalized = normalizeCrossBureauAccounts([
      account({ bureau: 'Experian', balance: 4812, accountStatus: 'Charge-off' }),
      account({ bureau: 'Equifax', balance: 4812, accountStatus: 'Charge-off' }),
      account({ bureau: 'TransUnion', balance: 0, accountStatus: 'Paid charge-off' }),
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].bureaus).toEqual(['Experian', 'Equifax', 'TransUnion']);
    expect(normalized[0].tradelines).toHaveLength(3);
  });

  it('flags bureau differences as potential discrepancies, not violations or errors', () => {
    const [canonical] = normalizeCrossBureauAccounts([
      account({ bureau: 'Experian', balance: 1847, accountStatus: 'Collection' }),
      account({ bureau: 'Equifax', balance: 1392, accountStatus: 'Collection' }),
      account({ bureau: 'TransUnion', balance: 1847, accountStatus: 'Collection' }),
    ]);

    const issues = detectPotentialIssues(canonical);

    expect(issues.map(issue => issue.issueType)).toContain('balance_discrepancy');
    expect(issues[0].whyFlagged.toLowerCase()).toContain('balance differs');
    expect(JSON.stringify(issues).toLowerCase()).not.toContain('violation');
    expect(JSON.stringify(issues).toLowerCase()).not.toContain('error');
  });

  describe('cross-bureau account-status normalization', () => {
    function statusIssues(statuses: Array<[string, string]>) {
      const [canonical] = normalizeCrossBureauAccounts(statuses.map(([bureau, accountStatus]) => account({
        bureau,
        accountStatus,
        balance: 0,
        isChargeOff: false,
        isCollection: false,
      })));
      return detectPotentialIssues(canonical).filter(issue => issue.issueType === 'status_discrepancy');
    }

    it.each([
      { statuses: [['Equifax', '- - -'], ['Experian', 'Closed'], ['TransUnion', 'Closed']] as Array<[string, string]> },
      { statuses: [['Equifax', '   '], ['Experian', 'Open'], ['TransUnion', 'Open']] as Array<[string, string]> },
      { statuses: [['Equifax', 'N/A'], ['Experian', 'Closed'], ['TransUnion', 'Closed']] as Array<[string, string]> },
    ])('ignores missing bureau placeholders instead of treating them as statuses', ({ statuses }) => {
      expect(statusIssues(statuses)).toEqual([]);
    });

    it('flags genuinely conflicting meaningful statuses', () => {
      const issues = statusIssues([['Equifax', 'Open'], ['Experian', 'Closed']]);

      expect(issues).toHaveLength(1);
      expect(new Set(issues[0].conflictingData.statusesReported as string[])).toEqual(new Set(['open', 'closed']));
    });

    it('treats semantically equivalent closed wording as one status', () => {
      expect(statusIssues([
        ['Equifax', 'Closed'],
        ['Experian', 'Account Closed'],
        ['TransUnion', 'Closed Account'],
      ])).toEqual([]);
    });

    it('requires at least two meaningful statuses before comparing bureaus', () => {
      expect(statusIssues([
        ['Equifax', 'Open'],
        ['Experian', 'Not Reported'],
        ['TransUnion', '---'],
      ])).toEqual([]);
    });

    it('does not turn conflicting duplicate rows from one bureau into a cross-bureau mismatch', () => {
      const [canonical] = normalizeCrossBureauAccounts([
        account({ id: 'eq-other', bureau: 'Equifax', accountStatus: '- - Other', balance: 5866, accountType: 'Revolving', lastPaymentDate: '2026-08-05' }),
        account({ id: 'eq-chargeoff', bureau: 'Equifax', accountStatus: 'Charge-off', balance: 5866, accountType: 'Revolving account', lastPaymentDate: '2026-08-06' }),
      ]);

      const crossBureauTypes = new Set([
        'status_discrepancy', 'charge_off_status_discrepancy', 'balance_discrepancy',
        'date_discrepancy', 'last_payment_date_discrepancy', 'account_type_discrepancy',
      ]);
      expect(detectPotentialIssues(canonical).filter(issue => crossBureauTypes.has(issue.issueType))).toEqual([]);
    });
  });

  describe('field-specific anomaly routing', () => {
    function issuesFor(overrides: [Partial<NormalizedAccount>, Partial<NormalizedAccount>]) {
      const [canonical] = normalizeCrossBureauAccounts([
        account({ bureau: 'Equifax', isChargeOff: false, ...overrides[0] }),
        account({ bureau: 'Experian', isChargeOff: false, ...overrides[1] }),
      ]);
      return detectPotentialIssues(canonical);
    }

    it('uses balance-specific wording for a balance mismatch', () => {
      const finding = issuesFor([{ balance: 4812 }, { balance: 0 }])
        .find(issue => issue.issueType === 'balance_discrepancy');

      expect(finding).toMatchObject({
        issueTitle: 'Account balance mismatch',
        whyFlagged: 'The reported account balance differs across bureaus.',
        disputeReason: 'Incorrect account balance reported across bureaus.',
      });
      expect(finding?.factualBasis).toContain('conflicting balance information');
    });

    it('does not treat a closed account with a positive balance as inconsistent', () => {
      const issues = issuesFor([
        { accountStatus: 'Closed', balance: 443 },
        { accountStatus: 'Closed', balance: 443 },
      ]);

      expect(issues.find(issue => issue.issueType === 'paid_account_reporting_balance')).toBeUndefined();
    });

    it.each(['Paid', 'Settled'])('flags an explicit %s status with a positive balance', accountStatus => {
      const issues = issuesFor([
        { accountStatus, balance: 443 },
        { accountStatus, balance: 443 },
      ]);

      expect(issues.find(issue => issue.issueType === 'paid_account_reporting_balance')).toBeDefined();
    });

    it('uses status-specific wording for a status mismatch', () => {
      const finding = issuesFor([
        { accountStatus: 'Open', balance: 0 },
        { accountStatus: 'Closed', balance: 0 },
      ]).find(issue => issue.issueType === 'status_discrepancy');

      expect(finding?.issueTitle).toBe('Account status mismatch');
      expect(finding?.disputeReason).toContain('account status');
    });

    it('uses date-specific wording for a Date Opened mismatch', () => {
      const finding = issuesFor([
        { dateOpened: '01/2021', balance: 0 },
        { dateOpened: '02/2021', balance: 0 },
      ]).find(issue => issue.issueType === 'date_discrepancy');

      expect(finding?.issueTitle).toBe('Date opened mismatch');
      expect(finding?.disputeReason).toContain('Date Opened');
    });

    it('suppresses a DOLA mismatch when the mapped date fields are ambiguous', () => {
      const issues = issuesFor([
        { lastPaymentDate: '2021-06-01', balance: 0 },
        { lastPaymentDate: '2026-06-08', balance: 0 },
      ]);

      expect(issues.find(issue => issue.issueType === 'last_payment_date_discrepancy')).toBeUndefined();
    });

    it('renders a DOLA mismatch when every value is explicitly the same supported field', () => {
      const issues = issuesFor([
        { lastPaymentDate: '2021-06-01', lastActivityField: 'date_of_last_activity', balance: 0 },
        { lastPaymentDate: '2026-06-08', lastActivityField: 'date_of_last_activity', balance: 0 },
      ]);

      expect(issues.find(issue => issue.issueType === 'last_payment_date_discrepancy')).toMatchObject({
        issueTitle: 'Date of last activity mismatch',
        reportedData: { Equifax: '2021-06-01', Experian: '2026-06-08' },
      });
      expect(issues.find(issue => issue.issueType === 'last_payment_date_discrepancy')?.factualBasis)
        .toBe('The same account is reporting conflicting Date of Last Activity values across the consumer reporting agencies.');
      expect(issues.find(issue => issue.issueType === 'last_payment_date_discrepancy')?.factualBasis)
        .not.toContain('or last payment');
    });

    it('does not expose Multiple as a bureau in consumer-facing evidence', () => {
      const [canonical] = normalizeCrossBureauAccounts([
        account({ bureau: 'Equifax', balance: 100, isChargeOff: false }),
        account({ bureau: 'Experian', balance: 0, isChargeOff: false }),
        account({ bureau: 'Multiple', balance: 100, isChargeOff: false }),
      ]);
      const finding = detectPotentialIssues(canonical).find(issue => issue.issueType === 'balance_discrepancy');

      expect(finding?.affectedBureaus).toEqual(['Experian', 'Equifax']);
      expect(finding?.reportedData).toEqual({ Equifax: 100, Experian: 0 });
    });

    it('suppresses remarks mismatches that are merely different text', () => {
      const issues = issuesFor([
        { remarks: ['Account information disputed by consumer'], balance: 0 },
        { remarks: ['Consumer disputes account information'], balance: 0 },
      ]);

      expect(issues.find(issue => issue.issueType === 'remarks_discrepancy')).toBeUndefined();
    });

    it('renders remarks mismatches only for contradictory normalized facts', () => {
      const issues = issuesFor([
        { remarks: ['Account disputed by consumer'], balance: 0 },
        { remarks: ['Account not disputed'], balance: 0 },
      ]);

      expect(issues.find(issue => issue.issueType === 'remarks_discrepancy')).toMatchObject({
        issueTitle: 'Remarks or comments mismatch',
      });
    });

    it('continues to render a valid account-type mismatch', () => {
      const issues = issuesFor([
        { accountType: 'Revolving', balance: 0 },
        { accountType: 'Installment', balance: 0 },
      ]);

      expect(issues.find(issue => issue.issueType === 'account_type_discrepancy')).toMatchObject({
        issueTitle: 'Account type mismatch',
      });
    });

    it('suppresses an ownership mismatch when only one bureau has a meaningful value', () => {
      const issues = issuesFor([
        { responsibility: 'Individual Account', balance: 0 },
        { responsibility: 'account - -', balance: 0 },
      ]);

      expect(issues.find(issue => issue.issueType === 'responsibility_discrepancy')).toBeUndefined();
    });

    it('renders a mismatch for two clean contradictory ownership values', () => {
      const issues = issuesFor([
        { responsibility: 'Individual Account', balance: 0 },
        { responsibility: 'Joint Account', balance: 0 },
      ]);

      expect(issues.find(issue => issue.issueType === 'responsibility_discrepancy')).toBeDefined();
    });

    it('suppresses dirty account-type parser residue', () => {
      const issues = issuesFor([
        { accountType: '- COLLECTION COLLECTION', balance: 0 },
        { accountType: 'Open account - -', balance: 0 },
      ]);

      expect(issues.find(issue => issue.issueType === 'account_type_discrepancy')).toBeUndefined();
    });

    it('uses payment-status wording for a payment-status mismatch', () => {
      const finding = issuesFor([
        { paymentStatus: 'Current', balance: 0 },
        { paymentStatus: 'Late 30 days', balance: 0 },
      ]).find(issue => issue.issueType === 'payment_status_discrepancy');

      expect(finding?.issueTitle).toBe('Payment status mismatch');
      expect(finding?.disputeReason).toContain('payment status');
    });

    it('keeps two supported field anomalies on the same account distinct', () => {
      const issues = issuesFor([
        { balance: 4812, dateOpened: '01/2021' },
        { balance: 0, dateOpened: '02/2021' },
      ]);

      expect(issues.map(issue => issue.issueType)).toEqual(expect.arrayContaining(['balance_discrepancy', 'date_discrepancy']));
      expect(new Set(issues.map(issue => issue.disputeReason)).size).toBe(issues.length);
    });

    it('deduplicates an identical anomaly finding for the same account and field', () => {
      const [canonical] = normalizeCrossBureauAccounts([
        account({ bureau: 'Equifax', balance: 4812, isChargeOff: false }),
        account({ bureau: 'Experian', balance: 0, isChargeOff: false }),
        account({ bureau: 'TransUnion', balance: 0, isChargeOff: false }),
      ]);
      const balanceFindings = detectPotentialIssues(canonical)
        .filter(issue => issue.issueType === 'balance_discrepancy');

      expect(balanceFindings).toHaveLength(1);
    });

    it('does not route different anomaly types to the same dispute reason', () => {
      const issues = issuesFor([
        { balance: 4812, accountStatus: 'Open', paymentStatus: 'Current', dateOpened: '01/2021' },
        { balance: 0, accountStatus: 'Closed', paymentStatus: 'Late 30 days', dateOpened: '02/2021' },
      ]).filter(issue => ['balance_discrepancy', 'status_discrepancy', 'payment_status_discrepancy', 'date_discrepancy'].includes(issue.issueType));

      expect(issues).toHaveLength(4);
      expect(new Set(issues.map(issue => issue.disputeReason)).size).toBe(4);
    });
  });

  it('requires evidence before marking a potential issue strong', () => {
    const [canonical] = normalizeCrossBureauAccounts([
      account({ bureau: 'Equifax', balance: 1847 }),
      account({ bureau: 'Experian', balance: 0 }),
    ]);
    const [issue] = detectPotentialIssues(canonical);

    expect(calculateEvidenceStrength(issue, [])).toMatchObject({
      strength: 'insufficient',
      recommendedAction: 'Gather additional documentation before disputing.',
    });

    expect(calculateEvidenceStrength(issue, [
      {
        factType: 'documented_balance',
        fieldName: 'balance',
        value: 0,
        sourceType: 'uploaded_evidence',
        confirmedByUser: true,
        documentType: 'Final creditor statement',
        documentDate: '2026-06-12',
        identifiesAccount: true,
      },
    ])).toMatchObject({ strength: 'strong' });
  });

  it('compares before and after disputed fields without legal conclusions', () => {
    const before: BureauTradelineSnapshot = {
      bureau: 'Equifax',
      creditorName: 'Metro Collection',
      furnisherName: 'Metro Collection',
      accountNumberMasked: '****2222',
      accountType: 'Collection',
      responsibility: 'Individual',
      originalCreditor: '',
      collectionAgency: 'Metro Collection',
      accountStatus: 'Collection',
      paymentStatus: '',
      balance: 1847,
      highBalance: null,
      creditLimit: null,
      pastDue: null,
      dateOpened: '05/2025',
      dateReported: '06/2026',
      lastPaymentDate: '',
      paymentHistory: '',
      remarks: [],
      isCollection: true,
      isChargeOff: false,
      parserConfidence: 90,
    };

    const result = compareDisputedFields(before, { ...before, dateReported: '08/2026' }, ['balance', 'accountStatus']);

    expect(result.materialCorrectionDetected).toBe(false);
    expect(result.unchangedDisputedFields).toEqual(['balance', 'accountStatus']);
    expect(result.recommendation).toContain('No material correction detected');
    expect(result.recommendation.toLowerCase()).not.toContain('violation');
  });

  it('flags potential reinsertions from historical snapshot presence', () => {
    const reinsertions = detectPotentialReinsertions([
      { canonicalKey: 'capital-one|****1234', bureau: 'Experian', detected: true, snapshotDate: '2026-06-01', materialFields: ['balance', 'accountStatus'] },
      { canonicalKey: 'capital-one|****1234', bureau: 'Experian', detected: false, snapshotDate: '2026-07-01', materialFields: ['balance', 'accountStatus'] },
      { canonicalKey: 'capital-one|****1234', bureau: 'Experian', detected: true, snapshotDate: '2026-08-01', materialFields: ['balance', 'accountStatus'] },
    ]);

    expect(reinsertions).toEqual([
      expect.objectContaining({
        bureau: 'Experian',
        label: 'Potential reinsertion',
        dateRemovedOrNotDetected: '2026-07-01',
        dateSubsequentlyDetected: '2026-08-01',
      }),
    ]);
  });
});
