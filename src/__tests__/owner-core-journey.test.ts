import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseWithAdapter, type NormalizedAccount } from '@/lib/creditReport/adapters';
import { parseCreditReport } from '@/lib/creditReport/parser';
import {
  calculateEvidenceStrength,
  compareDisputedFields,
  detectPotentialIssues,
  normalizeCrossBureauAccounts,
} from '@/lib/disputeEngine/evidenceEngine';
import {
  buildCanonicalDisputeLetter,
  type CanonicalLetterInput,
  type StoredNegativeItem,
} from '@/lib/disputes/canonicalLetter';

const syntheticReport = `Experian Credit Report
Personal Information
Name: Synthetic Consumer
Current Address: 100 Test Avenue, Testville, NY 10001

Accounts

Creditor: SYNTHETIC BANK
Account Number: ****1234
Account Type: Revolving
Account Status: Current
Balance: $1,284
Date Opened: 01/15/2024
Date Reported: 08/01/2026
Bureau: Experian`;

const controlledProductionReport = readFileSync(
  'src/__tests__/fixtures/credit-reports/fmm-production-ai-controlled.txt',
  'utf8',
);

function storedRow(id: string, bureau: string, balance: number): StoredNegativeItem {
  return {
    id,
    owner_id: 'owner-synthetic',
    client_id: 'client-synthetic',
    credit_account_id: 'account-synthetic',
    report_id: 'report-synthetic',
    bureau,
    creditor_name: 'Synthetic Bank',
    furnisher_name: 'Synthetic Bank',
    account_number_masked: '****1234',
    account_type: 'Revolving',
    responsibility: 'Individual',
    status: 'Current',
    payment_status: 'Current',
    balance,
    past_due: 0,
    date_opened: '2024-01-15',
    date_reported: '2026-08-01',
    date_last_activity: '2026-07-15',
    negative_category: 'other',
    negative_reason: 'Potential cross-bureau discrepancy',
    is_negative: false,
    parser_confidence: 95,
  };
}

describe('owner-priority synthetic customer journey', () => {
  it('detects the seeded mismatch while leaving the accurate control account unflagged', () => {
    const intake = parseCreditReport(controlledProductionReport, 'myscoreiq');
    const canonicalAccounts = normalizeCrossBureauAccounts(intake.bureauTradelines ?? intake.accounts);
    expect(canonicalAccounts.map(account => account.displayName)).toEqual(['SYNTHETIC BANK', 'SYNTHETIC AUTO']);
    const bank = canonicalAccounts.find(account => account.displayName === 'SYNTHETIC BANK');
    const auto = canonicalAccounts.find(account => account.displayName === 'SYNTHETIC AUTO');

    expect(bank?.tradelines).toHaveLength(3);
    expect(detectPotentialIssues(bank!)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        issueType: 'balance_discrepancy',
        evidenceCurrentlyAvailable: ['Credit report field comparison'],
      }),
    ]));
    expect(auto?.tradelines).toHaveLength(3);
    expect(detectPotentialIssues(auto!)).toEqual([]);
  });

  it('moves from report intake to evidence review, factual preparation, and tracked outcome without converting an anomaly into an unsupported claim', () => {
    const intake = parseWithAdapter(syntheticReport, 'experian');
    const importedAccount = intake.accounts.find(value => value.creditorName === 'SYNTHETIC BANK');
    expect(importedAccount).toMatchObject({
      creditorName: 'SYNTHETIC BANK',
      accountNumberMasked: '****1234',
      bureau: 'Experian',
    });

    const experian: NormalizedAccount = {
      ...importedAccount!,
      id: 'source-experian',
      bureau: 'Experian',
      bureaus: ['Experian'],
      balance: 1284,
      parserConfidence: 95,
    };
    const equifax: NormalizedAccount = {
      ...experian,
      id: 'source-equifax',
      bureau: 'Equifax',
      bureaus: ['Equifax'],
      balance: 0,
    };

    const [account] = normalizeCrossBureauAccounts([experian, equifax]);
    const finding = detectPotentialIssues(account)
      .find(value => value.issueType === 'balance_discrepancy');
    expect(finding).toMatchObject({
      issueTitle: 'Account balance mismatch',
      whyFlagged: 'The reported account balance differs across bureaus.',
    });
    expect(calculateEvidenceStrength(finding!, []).strength).toBe('insufficient');

    const supported = calculateEvidenceStrength(finding!, [{
      factType: 'documented_balance',
      fieldName: 'balance',
      value: 0,
      sourceType: 'uploaded_evidence',
      confirmedByUser: true,
      documentType: 'Synthetic final statement',
      documentDate: '2026-08-10',
      identifiesAccount: true,
    }]);
    expect(supported).toMatchObject({
      strength: 'strong',
      recommendedAction: 'Evidence supports preparing a narrowly factual dispute or investigation request for human review.',
    });

    const target = storedRow('evidence-equifax', 'Equifax', 0);
    const comparison = storedRow('evidence-experian', 'Experian', 1284);
    const letterInput: CanonicalLetterInput = {
      sender: {
        name: 'Synthetic Consumer',
        address: '100 Test Avenue',
        city: 'Testville',
        state: 'NY',
        zip: '10001',
        email: 'synthetic@test.invalid',
        phone: '',
      },
      bureau: 'Equifax',
      letterReference: 'SYNTHETIC-REVIEW',
      generatedOn: new Date('2026-10-01T12:00:00Z'),
      selectedEvidenceIds: [target.id],
      evidenceRows: [target, comparison],
    };
    const draft = buildCanonicalDisputeLetter(letterInput);
    expect(draft.status).toBe('ready');
    expect(draft.letterContent).toContain('investigate this specific discrepancy');
    expect(draft.letterContent).not.toMatch(/violation|guarantee|must delete/i);

    const before = account.tradelines.find(value => value.bureau === 'Experian')!;
    const after = { ...before, balance: 0, dateReported: '2026-10-01' };
    expect(compareDisputedFields(before, after, ['balance'])).toMatchObject({
      materialCorrectionDetected: true,
      changedFields: ['balance'],
    });

    const trackingUi = readFileSync('src/app/disputes/components/DisputesContent.tsx', 'utf8');
    expect(trackingUi).toContain("awaiting: 'waiting_for_response'");
    expect(trackingUi).toContain("resolved: 'closed'");
  });

  it('refuses letter preparation when the synthetic reports contain no supported discrepancy', () => {
    const equifax = storedRow('same-equifax', 'Equifax', 0);
    const experian = storedRow('same-experian', 'Experian', 0);
    const result = buildCanonicalDisputeLetter({
      sender: {
        name: 'Synthetic Consumer',
        address: '100 Test Avenue',
        city: 'Testville',
        state: 'NY',
        zip: '10001',
        email: 'synthetic@test.invalid',
        phone: '',
      },
      bureau: 'Equifax',
      letterReference: 'SYNTHETIC-NO-FINDING',
      generatedOn: new Date('2026-10-01T12:00:00Z'),
      selectedEvidenceIds: [equifax.id],
      evidenceRows: [equifax, experian],
    });

    expect(result.status).toBe('review_required');
    expect(result.letterContent).toBeNull();
  });
});
