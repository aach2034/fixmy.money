import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { formatAnomalyFindingsForLetter, prepareAnomalyFindings, type AnomalyFindingView } from '../lib/disputes/anomalyFindings';

const finding = (overrides: Partial<AnomalyFindingView>): AnomalyFindingView => ({
  issueType: 'status_discrepancy',
  title: 'Account status mismatch',
  discrepancy: 'The reported account status differs across bureaus.',
  reportedData: 'Account Status: Equifax: Open; Experian: Closed.',
  factualBasis: 'The same account reports conflicting statuses.',
  disputeReason: 'Please investigate and correct the account status.',
  strengthLabel: 'Moderate',
  score: 60,
  ...overrides,
});

describe('anomaly findings workflow', () => {
  it('keeps the strongest distinct finding first and removes exact duplicates', () => {
    const status = finding({});
    const balance = finding({
      issueType: 'balance_discrepancy',
      title: 'Account balance mismatch',
      discrepancy: 'The reported account balance differs across bureaus.',
      reportedData: 'Current Balance: Equifax: $4,812; Experian: $0.',
      factualBasis: 'The same account reports conflicting balances.',
      disputeReason: 'Please investigate and correct the account balance.',
      strengthLabel: 'Strong',
      score: 90,
    });

    const prepared = prepareAnomalyFindings([status, balance, { ...status }]);

    expect(prepared.map(item => item.issueType)).toEqual(['balance_discrepancy', 'status_discrepancy']);
  });

  it('preserves each finding’s separate evidence and reason in letter handoff', () => {
    const output = formatAnomalyFindingsForLetter([
      finding({}),
      finding({
        issueType: 'date_opened_discrepancy',
        title: 'Date opened mismatch',
        discrepancy: 'The reported opening date differs across bureaus.',
        reportedData: 'Date Opened: Equifax: 01/02/2020; TransUnion: 04/05/2021.',
        factualBasis: 'The same account reports conflicting opening dates.',
        disputeReason: 'Please investigate and correct the date opened.',
        score: 55,
      }),
    ]);

    expect(output).toContain('Finding 1: Account status mismatch');
    expect(output).toContain('Finding 2: Date opened mismatch');
    expect(output).toContain('Reported Data: Account Status:');
    expect(output).toContain('Reported Data: Date Opened:');
    expect(output).toContain('correct the account status');
    expect(output).toContain('correct the date opened');
  });

  it('renders additional Credit Audit findings and preserves them through both letter paths', () => {
    const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
    const audit = read('src/app/credit-audit/components/CreditAuditContent.tsx');
    const wizard = read('src/app/dispute-wizard/components/DisputeWizardContent.tsx');
    const letterForm = read('src/app/dispute-letter-management/components/GenerateLetterForm.tsx');

    expect(audit).toContain('item.findings.map');
    expect(audit).toContain('finding.disputeReason');
    expect(wizard).toContain('scoreDisputeStrength(negativeData).filter(belongsToSelectedBureau)');
    expect(wizard).toContain('formatAnomalyFindingsForLetter(item.findings)');
    expect(letterForm).toContain('scoreDisputeStrength(availableNegativeRows).filter(belongsToSelectedBureau)');
    expect(letterForm).toContain('formatAnomalyFindingsForLetter(item.findings ?? [])');
  });
});
