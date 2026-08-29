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
    expect(issues[0].whyFlagged.toLowerCase()).toContain('different balances');
    expect(JSON.stringify(issues).toLowerCase()).not.toContain('violation');
    expect(JSON.stringify(issues).toLowerCase()).not.toContain('error');
  });

  describe('cross-bureau account-status normalization', () => {
    function statusIssues(statuses: Array<[string, string]>) {
      const [canonical] = normalizeCrossBureauAccounts(statuses.map(([bureau, accountStatus]) => account({
        bureau,
        accountStatus,
        balance: 0,
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
      originalCreditor: '',
      collectionAgency: 'Metro Collection',
      accountStatus: 'Collection',
      paymentStatus: '',
      balance: 1847,
      creditLimit: null,
      pastDue: null,
      dateOpened: '05/2025',
      dateReported: '06/2026',
      lastPaymentDate: '',
      paymentHistory: '',
      remarks: [],
      isCollection: true,
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
