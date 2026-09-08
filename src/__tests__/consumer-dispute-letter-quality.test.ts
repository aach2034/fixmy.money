import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildConsumerBureauLetter,
  NoQualifyingLetterEvidenceError,
  type ConsumerLetterItem,
} from '../lib/disputes/consumerLetter';
import { buildLetterProvenanceAuditRow } from '../lib/disputes/letterProvenance';
import { getLetterSenderInfo } from '../lib/disputes/letterSender';
import type { AnomalyFindingView } from '../lib/disputes/anomalyFindings';

const sender = getLetterSenderInfo({
  name: 'Taylor Example',
  address: '100 Test Avenue',
  city: 'Testville',
  state: 'NY',
  zip: '10001',
  email: 'taylor@test.invalid',
})!;

function finding(overrides: Partial<AnomalyFindingView> = {}): AnomalyFindingView {
  return {
    issueType: 'paid_account_reporting_balance',
    title: 'Paid account with positive balance',
    discrepancy: 'The same tradeline contains inconsistent fields.',
    reportedData: 'Status and balance differ.',
    factualBasis: 'The same report row contains inconsistent fields.',
    disputeReason: 'Investigate the inconsistent balance.',
    strengthLabel: 'Moderate',
    score: 76,
    affectedBureaus: ['Equifax'],
    reportedDataByBureau: { Equifax: { status: 'Paid/Closed', balance: 1284 } },
    sourceRowIds: ['synthetic-eq-1'],
    isAmbiguous: false,
    ...overrides,
  };
}

function item(overrides: Partial<ConsumerLetterItem> = {}): ConsumerLetterItem {
  return {
    source: 'negative_items',
    sourceRowId: 'synthetic-eq-1',
    bureau: 'Equifax',
    creditorName: 'Synthetic Bank',
    accountNumberMasked: '4111111111111234',
    findings: [finding()],
    ...overrides,
  };
}

function build(bureau: string, items: ConsumerLetterItem[]) {
  return buildConsumerBureauLetter({ sender, bureau, round: 1, letterId: `${bureau}-SYNTHETIC`, items, date: new Date('2026-09-08T12:00:00Z') });
}

describe('evidence-specific consumer bureau letters', () => {
  it('routes only the selected bureau account and evidence to each letter', () => {
    const equifax = item();
    const experian = item({
      sourceRowId: 'synthetic-ex-1', bureau: 'Experian', creditorName: 'Synthetic Auto', accountNumberMasked: '****7788',
      findings: [findingHold('Experian', 'synthetic-ex-1', 'date_discrepancy', '2023-05-01', '2022-05-01')],
    });
    const transUnion = item({
      sourceRowId: 'synthetic-tu-1', bureau: 'TransUnion', creditorName: 'Synthetic Credit', accountNumberMasked: '****9911',
      findings: [findingHold('TransUnion', 'synthetic-tu-1', 'balance_discrepancy', 900, 0)],
    });

    const letters = [build('Equifax', [equifax, experian, transUnion]), build('Experian', [equifax, experian, transUnion]), build('TransUnion', [equifax, experian, transUnion])];
    expect(letters[0].content).toContain('Synthetic Bank');
    expect(letters[0].content).not.toMatch(/Synthetic Auto|Synthetic Credit/);
    expect(letters[1].content).toContain('Synthetic Auto');
    expect(letters[1].content).not.toMatch(/Synthetic Bank|Synthetic Credit/);
    expect(letters[2].content).toContain('Synthetic Credit');
    expect(letters[2].content).not.toMatch(/Synthetic Bank|Synthetic Auto/);
  });

  it('records every paragraph with its stored source rows and evidence source', () => {
    const letter = build('Equifax', [item()]);
    expect(letter.provenance).toEqual([expect.objectContaining({
      paragraphId: 'dispute-item-1', sourceTable: 'negative_items', sourceRowId: 'synthetic-eq-1',
      sourceRowIds: ['synthetic-eq-1'], bureau: 'Equifax', issueType: 'paid_account_reporting_balance',
      supportingSourceId: 'synthetic-eq-1',
    })]);

    const audit = buildLetterProvenanceAuditRow({
      ownerId: 'synthetic-owner', clientId: 'synthetic-client', actorEmail: 'operator@test.invalid',
      letterRecordId: 'synthetic-letter', letterReference: 'EQ-SYNTHETIC', letterTable: 'dispute_letters', letter,
    });
    expect(audit.action).toBe('dispute_generated');
    expect(audit.metadata.paragraphs).toEqual(letter.provenance);
  });

  it('omits unsupported, ambiguous, weak, and positive findings and fails safely when none qualify', () => {
    const unsafe = [
      item({ findings: [finding({ issueType: 'balance_discrepancy', affectedBureaus: ['Equifax', 'Experian'], isAmbiguous: true })] }),
      item({ sourceRowId: 'weak', findings: [finding({ strengthLabel: 'Weak', sourceRowIds: ['weak'] })] }),
      item({ sourceRowId: 'positive', isPositive: true, findings: [finding({ sourceRowIds: ['positive'] })] }),
      item({ sourceRowId: 'unsupported', findings: [] }),
    ];
    expect(() => build('Equifax', unsafe)).toThrow(NoQualifyingLetterEvidenceError);
  });

  it('allows a cross-bureau difference only when confirmed support identifies the incorrect bureau value', () => {
    const supported = findingHold('Equifax', 'synthetic-eq-1', 'balance_discrepancy', 1284, 0);
    const letter = build('Equifax', [item({ findings: [supported] })]);
    expect(letter.content).toContain('Equifax reports: $1,284');
    expect(letter.content).toContain('Synthetic payoff statement — $0');
    expect(letter.content).toContain('correct this field to $0');

    const alreadyMatching = findingHold('Equifax', 'synthetic-eq-1', 'balance_discrepancy', 0, 0);
    expect(() => build('Equifax', [item({ findings: [alreadyMatching] })])).toThrow(NoQualifyingLetterEvidenceError);
  });

  it('masks raw account numbers and never emits internal scores or generic legal accusations', () => {
    const letter = build('Equifax', [item()]);
    expect(letter.content).toContain('account ****1234');
    expect(letter.content).not.toContain('4111111111111234');
    expect(letter.content).not.toMatch(/Dispute Strength|score|violation|civil liability|legal action|Adam Hamilton|FixMy\.Money generated/i);
  });

  it('deduplicates identical findings and suppresses contradictory supporting values', () => {
    const duplicate = finding();
    expect(build('Equifax', [item({ findings: [duplicate, { ...duplicate }] })]).itemCount).toBe(1);

    const left = findingHold('Equifax', 'synthetic-eq-1', 'balance_discrepancy', 1284, 0);
    const right = findingHold('Equifax', 'synthetic-eq-1', 'balance_discrepancy', 1284, 100);
    expect(() => build('Equifax', [item({ findings: [left, right] })])).toThrow(NoQualifyingLetterEvidenceError);
  });

  it('lists only explicitly confirmed attachments and stays concise and readable', () => {
    const letter = buildConsumerBureauLetter({
      sender, bureau: 'Equifax', round: 1, letterId: 'EQ-SYNTHETIC', items: [item()],
      attachments: [{ id: 'synthetic-proof-1', label: 'Synthetic payoff statement', confirmed: true }],
      date: new Date('2026-09-08T12:00:00Z'),
    });
    expect(letter.content).toContain('Enclosures:\n- Synthetic payoff statement');
    expect(letter.content).not.toMatch(/Social Security card|additional documentation|HIPAA/i);
    expect(letter.content.split(/\s+/).length).toBeLessThan(190);
  });

  it('keeps all three UI generators on the shared builder and contains no unsafe letter boilerplate', () => {
    const generators = [
      'src/app/dispute-letter-management/components/GenerateLetterForm.tsx',
      'src/app/dispute-wizard/components/DisputeWizardContent.tsx',
      'src/app/clients/[clientId]/disputes/[roundId]/components/DisputeRoundContent.tsx',
    ].map(file => readFileSync(path.join(process.cwd(), file), 'utf8'));
    for (const source of generators) {
      expect(source).toContain('buildConsumerBureauLetter');
      expect(source).toContain('recordLetterProvenance');
      expect(source).not.toMatch(/civil liability|legal action without further notice|may constitute identity theft|Adam Hamilton/);
    }
    const builder = readFileSync(path.join(process.cwd(), 'src/lib/disputes/consumerLetter.ts'), 'utf8');
    expect(builder).not.toMatch(/civil liability|legal action without further notice|may constitute identity theft|Adam Hamilton/);
  });

  it('uses synthetic identities only in this fixture', () => {
    const source = readFileSync(__filename, 'utf8');
    expect(source).toContain('@test.invalid');
    expect(source).not.toMatch(/@(gmail|yahoo|outlook|hotmail)\./i);
  });
});

function findingHold(
  bureau: 'Equifax' | 'Experian' | 'TransUnion',
  sourceRowId: string,
  issueType: string,
  reportedValue: unknown,
  supportingValue: unknown,
): AnomalyFindingView {
  return finding({
    issueType,
    affectedBureaus: [bureau],
    reportedDataByBureau: { [bureau]: reportedValue },
    sourceRowIds: [sourceRowId],
    isAmbiguous: false,
    confirmedSupportingEvidence: {
      confirmed: true,
      value: supportingValue,
      sourceId: `synthetic-support-${sourceRowId}`,
      sourceLabel: issueType === 'date_discrepancy' ? 'Synthetic signed agreement' : 'Synthetic payoff statement',
    },
  });
}
