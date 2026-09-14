import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildCanonicalDisputeLetter,
  maskAccountNumber,
  type CanonicalLetterInput,
  type StoredNegativeItem,
} from '@/lib/disputes/canonicalLetter';
import {
  bindLegacyEvidenceToTenant,
  bindNegativeEvidenceToTenant,
  createEvidenceLetterRequest,
  createRoundLetterRequest,
  isOwnedEvidenceStoragePath,
  LetterGenerationBoundaryError,
  resolveRoundEvidence,
  resolveVerifiedEnclosures,
} from '@/lib/disputes/letterGenerationBoundary';
import type { AuthorizedStaffClient } from '@/lib/workspaces/authorization';

const authorization: AuthorizedStaffClient = {
  actorUserId: 'actor-synthetic',
  clientId: 'client-synthetic',
  workspaceId: 'workspace-synthetic',
  workspaceOwnerId: 'owner-synthetic',
  role: 'owner',
};

const sender = {
  name: 'Taylor Example',
  address: '100 Test Avenue',
  city: 'Testville',
  state: 'NY',
  zip: '10001',
  email: 'taylor@test.invalid',
  phone: '',
};

function row(id: string, bureau: string, overrides: Partial<StoredNegativeItem> = {}): StoredNegativeItem {
  return {
    id,
    owner_id: authorization.workspaceOwnerId,
    client_id: authorization.clientId,
    credit_account_id: 'account-synthetic',
    report_id: 'report-synthetic',
    bureau,
    creditor_name: 'Synthetic Bank',
    furnisher_name: 'Synthetic Bank',
    account_number_masked: '4111111111111234',
    account_type: 'credit card',
    responsibility: 'Individual',
    status: 'Open',
    payment_status: 'Current',
    balance: bureau === 'Equifax' ? 1284 : 0,
    past_due: 0,
    date_opened: '2024-01-15',
    date_reported: '2026-08-01',
    date_last_activity: '2026-07-15',
    negative_category: 'derogatory',
    negative_reason: 'Stored report flag',
    is_negative: true,
    parser_confidence: 95,
    ...overrides,
  };
}

const equifax = row('evidence-equifax', 'Equifax');
const experian = row('evidence-experian', 'Experian');

function input(overrides: Partial<CanonicalLetterInput> = {}): CanonicalLetterInput {
  return {
    sender,
    bureau: 'Equifax',
    letterReference: 'EQ-SYNTHETIC',
    generatedOn: new Date('2026-09-13T12:00:00Z'),
    selectedEvidenceIds: [equifax.id],
    evidenceRows: [equifax, experian],
    ...overrides,
  };
}

describe('canonical dispute-letter consolidation', () => {
  it('produces deterministic substantive output from management, wizard, and round request adapters', () => {
    const management = createEvidenceLetterRequest({
      entryPoint: 'management', clientId: authorization.clientId, bureau: 'Equifax', roundNumber: 1,
      evidenceSelections: [{ id: equifax.id, source: 'negative_items' }],
    });
    const wizard = createEvidenceLetterRequest({
      entryPoint: 'wizard', clientId: authorization.clientId, bureau: 'Equifax', roundNumber: 1,
      evidenceSelections: [{ id: equifax.id, source: 'negative_items' }],
    });
    const { groups: [round] } = resolveRoundEvidence({
      authorization,
      requestedRoundId: 'round-synthetic',
      round: { id: 'round-synthetic', owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId },
      roundItems: [{ id: 'round-item', owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId, round_id: 'round-synthetic', negative_item_id: equifax.id, bureau: 'Equifax' }],
      negativeItems: [equifax],
    });
    const roundRequest = createRoundLetterRequest({ clientId: authorization.clientId, roundId: 'round-synthetic' });
    expect(management).toEqual(expect.objectContaining({ entryPoint: 'management', evidenceSelections: [{ id: equifax.id, source: 'negative_items' }] }));
    expect(wizard).toEqual(expect.objectContaining({ entryPoint: 'wizard', evidenceSelections: [{ id: equifax.id, source: 'negative_items' }] }));
    expect(roundRequest).toEqual({ entryPoint: 'round', clientId: authorization.clientId, roundId: 'round-synthetic', enclosureIds: [] });
    const selections = [management.evidenceSelections!.map(value => value.id), wizard.evidenceSelections!.map(value => value.id), round.evidenceIds];
    const results = selections.map(selectedEvidenceIds => buildCanonicalDisputeLetter(input({
      selectedEvidenceIds,
      evidenceRows: [experian, equifax],
    })));
    expect(results.map(result => result.status)).toEqual(['ready', 'ready', 'ready']);
    expect(new Set(results.map(result => result.substantiveContent)).size).toBe(1);
    expect(new Set(results.map(result => JSON.stringify(result.paragraphs))).size).toBe(1);
  });

  it('isolates the target bureau and attributes each cross-bureau value correctly', () => {
    const unrelated = row('evidence-tu-other', 'TransUnion', {
      creditor_name: 'Other Synthetic Furnisher',
      furnisher_name: 'Other Synthetic Furnisher',
      account_number_masked: '****9876',
      balance: 999,
      date_opened: '2020-02-02',
    });
    const result = buildCanonicalDisputeLetter(input({ evidenceRows: [unrelated, experian, equifax] }));
    expect(result.status).toBe('ready');
    expect(result.letterContent).toContain('Equifax reports $1,284');
    expect(result.letterContent).toContain('Experian reports $0');
    expect(result.letterContent).not.toContain('Other Synthetic Furnisher');
    expect(result.letterContent).not.toContain('$999');
  });

  it('requires the selected evidence row to belong to the target bureau', () => {
    const result = buildCanonicalDisputeLetter(input({ selectedEvidenceIds: [experian.id] }));
    expect(result.status).toBe('review_required');
    expect(result.letterContent).toBeNull();
    expect(result.exclusions).toContainEqual(expect.objectContaining({
      sourceEvidenceId: experian.id,
      code: 'unsupported_bureau',
    }));
  });

  it('attributes a reciprocal Experian letter without reversing bureau values', () => {
    const result = buildCanonicalDisputeLetter(input({ bureau: 'Experian', selectedEvidenceIds: [experian.id] }));
    expect(result.status).toBe('ready');
    expect(result.paragraphs[0]).toEqual(expect.objectContaining({
      bureau: 'Experian',
      sourceEvidenceId: experian.id,
      reportedValue: 'Experian reports $0',
      contradictoryOrExpectedValue: 'Equifax reports $1,284',
    }));
  });

  it('does not join similar cross-bureau rows with different account masks', () => {
    const target = row('evidence-mask-target', 'Equifax', {
      account_number_masked: '****1234',
      original_creditor: 'Synthetic Original Creditor',
      credit_limit: 5000,
      balance: 1284,
    });
    const differentAccount = row('evidence-mask-other', 'Experian', {
      account_number_masked: '****9876',
      original_creditor: 'Synthetic Original Creditor',
      credit_limit: 5000,
      balance: 0,
    });
    const result = buildCanonicalDisputeLetter(input({
      selectedEvidenceIds: [target.id],
      evidenceRows: [target, differentAccount],
    }));
    expect(result.status).toBe('review_required');
    expect(result.letterContent).toBeNull();
    expect(result.exclusions).toContainEqual(expect.objectContaining({
      sourceEvidenceId: target.id,
      code: 'ambiguous_account_match',
    }));
  });

  it('fails closed when linked rows lack matching furnisher identity or stable anchors', () => {
    const otherFurnisher = row('evidence-other-furnisher', 'Experian', { furnisher_name: 'Different Synthetic Bank', creditor_name: 'Different Synthetic Bank' });
    expect(buildCanonicalDisputeLetter(input({ evidenceRows: [equifax, otherFurnisher] })).status).toBe('review_required');

    const weakTarget = row('evidence-weak-target', 'Equifax', { account_type: 'Revolving', date_opened: '2024-01-15' });
    const weakComparison = row('evidence-weak-comparison', 'Experian', { account_type: 'Installment', date_opened: '2023-02-10' });
    expect(buildCanonicalDisputeLetter(input({ selectedEvidenceIds: [weakTarget.id], evidenceRows: [weakTarget, weakComparison] })).status).toBe('review_required');

    const placeholderTarget = row('evidence-placeholder-target', 'Equifax', { original_creditor: 'N/A', date_opened: '2024-01-15' });
    const placeholderComparison = row('evidence-placeholder-comparison', 'Experian', { original_creditor: 'N/A', date_opened: '2023-02-10' });
    expect(buildCanonicalDisputeLetter(input({
      selectedEvidenceIds: [placeholderTarget.id],
      evidenceRows: [placeholderTarget, placeholderComparison],
    })).status).toBe('review_required');
  });

  it('allows punctuation and case normalization only when stable account anchors still match', () => {
    const target = row('evidence-format-target', 'Equifax', { furnisher_name: 'Synthetic Bank, N.A.', creditor_name: 'Synthetic Bank, N.A.' });
    const comparison = row('evidence-format-comparison', 'Experian', { furnisher_name: 'synthetic bank n a', creditor_name: 'synthetic bank n a' });
    expect(buildCanonicalDisputeLetter(input({ selectedEvidenceIds: [target.id], evidenceRows: [comparison, target] })).status).toBe('ready');
  });

  it('never compares identical-looking rows from different report snapshots', () => {
    const comparison = row('evidence-other-report', 'Experian', { report_id: 'report-other' });
    const result = buildCanonicalDisputeLetter(input({ evidenceRows: [equifax, comparison] }));
    expect(result.status).toBe('review_required');
    expect(result.letterContent).toBeNull();
  });

  it('records complete paragraph-level provenance for the target and comparison rows', () => {
    const result = buildCanonicalDisputeLetter(input());
    expect(result.paragraphs).toEqual([
      expect.objectContaining({
        paragraphId: 'evidence-1',
        accountOrFurnisher: 'Synthetic Bank',
        accountNumberMasked: '****1234',
        bureau: 'Equifax',
        disputedField: 'Current balance',
        reportedValue: 'Equifax reports $1,284',
        contradictoryOrExpectedValue: 'Experian reports $0',
        sourceEvidenceId: 'evidence-equifax',
        sourceEvidenceIds: ['evidence-equifax', 'evidence-experian'],
        disputeReason: expect.stringContaining('different values'),
      }),
    ]);
  });

  it('fails closed for low-confidence, ambiguous, unsupported, or missing evidence', () => {
    const low = row('evidence-low', 'Equifax', { parser_confidence: 69 });
    const lowResult = buildCanonicalDisputeLetter(input({ selectedEvidenceIds: [low.id], evidenceRows: [low, experian] }));
    expect(lowResult.status).toBe('review_required');
    expect(lowResult.exclusions).toContainEqual(expect.objectContaining({ sourceEvidenceId: low.id, code: 'low_confidence' }));

    const ambiguous = row('evidence-eq-duplicate', 'Equifax', { balance: 900 });
    const ambiguousResult = buildCanonicalDisputeLetter(input({ evidenceRows: [equifax, ambiguous, experian] }));
    expect(ambiguousResult.status).toBe('review_required');
    expect(ambiguousResult.exclusions).toContainEqual(expect.objectContaining({ code: 'ambiguous_account_match' }));

    const missingResult = buildCanonicalDisputeLetter(input({ selectedEvidenceIds: ['missing-evidence'], evidenceRows: [equifax, experian] }));
    expect(missingResult.status).toBe('review_required');
    expect(missingResult.letterContent).toBeNull();
  });

  it('uses only supported stored facts and never accepts free-form allegations', () => {
    const unsafeTarget = row('evidence-unsafe-target', 'Equifax', {
      negative_reason: 'Identity theft, fraud, prior correspondence, and a legal violation',
    });
    const unsafeComparison = row('evidence-unsafe-comparison', 'Experian', {
      negative_reason: 'Invented perfect payment history',
    });
    const result = buildCanonicalDisputeLetter(input({ selectedEvidenceIds: [unsafeTarget.id], evidenceRows: [unsafeTarget, unsafeComparison] }));
    expect(result.letterContent).not.toMatch(/identity theft|fraud|unauthorized inquiry|prior dispute|payment history was perfect|legal violation|civil liability|Adam Hamilton/i);
    expect(Object.keys(input())).not.toContain('notes');
    expect(Object.keys(input())).not.toContain('disputeReason');
    expect(Object.keys(input())).not.toContain('requestedAction');
  });

  it('masks every account reference at output even when storage contains a raw number', () => {
    const result = buildCanonicalDisputeLetter(input());
    expect(maskAccountNumber('4111-1111-1111-1234')).toBe('****1234');
    expect(result.letterContent).toContain('****1234');
    expect(result.letterContent).not.toContain('4111111111111234');
  });

  it('lists only selected, stored enclosures backed by verified evidence', () => {
    const resolution = resolveVerifiedEnclosures({
      authorization,
      requestedIds: ['document-verified', 'document-unverified'],
      documents: [
        { id: 'document-verified', owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId, document_name: 'Synthetic payoff statement', storage_bucket: 'evidence-documents', storage_path: `${authorization.workspaceOwnerId}/documents/payoff.pdf`, object_exists: true, user_confirmed_facts: [] },
        { id: 'document-unverified', owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId, document_name: 'Unverified document', storage_bucket: 'evidence-documents', storage_path: `${authorization.workspaceOwnerId}/documents/unverified.pdf`, object_exists: true, user_confirmed_facts: [] },
      ],
      facts: [{ id: 'fact-verified', owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId, evidence_document_id: 'document-verified', confirmed_by_user: true }],
    });
    expect(resolution.enclosures).toEqual([{ documentId: 'document-verified', label: 'Synthetic payoff statement', sourceEvidenceIds: ['fact-verified'] }]);
    expect(resolution.exclusions).toContainEqual(expect.objectContaining({ sourceEvidenceId: 'document-unverified', code: 'unverified_enclosure' }));

    const result = buildCanonicalDisputeLetter(input({ enclosures: resolution.enclosures, priorExclusions: resolution.exclusions }));
    expect(result.letterContent).toContain('Enclosures:\n- Synthetic payoff statement');
    expect(result.letterContent).not.toContain('Unverified document');
    expect(buildCanonicalDisputeLetter(input()).letterContent).not.toContain('Enclosures:');
  });

  it('requires an existing object, owned path, expected bucket, and meaningful confirmed fact for enclosures', () => {
    const variants = [
      { id: 'missing-object', storage_bucket: 'evidence-documents', storage_path: `${authorization.workspaceOwnerId}/documents/missing.pdf`, object_exists: false, user_confirmed_facts: [{ field: 'balance', value: '0' }] },
      { id: 'wrong-bucket', storage_bucket: 'public-files', storage_path: `${authorization.workspaceOwnerId}/documents/file.pdf`, object_exists: true, user_confirmed_facts: [{ field: 'balance', value: '0' }] },
      { id: 'wrong-path', storage_bucket: 'evidence-documents', storage_path: 'other-owner/documents/file.pdf', object_exists: true, user_confirmed_facts: [{ field: 'balance', value: '0' }] },
      { id: 'empty-object', storage_bucket: 'evidence-documents', storage_path: `${authorization.workspaceOwnerId}/documents/empty.pdf`, object_exists: true, user_confirmed_facts: [{}] },
      { id: 'false-fact', storage_bucket: 'evidence-documents', storage_path: `${authorization.workspaceOwnerId}/documents/false.pdf`, object_exists: true, user_confirmed_facts: [false] },
      { id: 'unconfirmed-fact', storage_bucket: 'evidence-documents', storage_path: `${authorization.workspaceOwnerId}/documents/unconfirmed.pdf`, object_exists: true, user_confirmed_facts: [] },
    ].map(value => ({ ...value, owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId, document_name: value.id }));
    const resolution = resolveVerifiedEnclosures({
      authorization,
      requestedIds: variants.map(value => value.id),
      documents: variants,
      facts: [{
        id: 'fact-unconfirmed', owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId,
        evidence_document_id: 'unconfirmed-fact', confirmed_by_user: false,
      }],
    });
    expect(resolution.enclosures).toEqual([]);
    expect(resolution.exclusions).toHaveLength(variants.length);
    expect(isOwnedEvidenceStoragePath(`${authorization.workspaceOwnerId}/documents/file.pdf`, authorization.workspaceOwnerId)).toBe(true);
    expect(isOwnedEvidenceStoragePath('../escape.pdf', authorization.workspaceOwnerId)).toBe(false);
    expect(() => resolveVerifiedEnclosures({ authorization, requestedIds: ['not-returned'], documents: [], facts: [] }))
      .toThrow(LetterGenerationBoundaryError);
  });

  it('rejects cross-tenant evidence, attachments, and round items before generation', () => {
    const foreign = row('foreign-evidence', 'Equifax', { owner_id: 'other-owner', client_id: 'other-client' });
    expect(() => bindNegativeEvidenceToTenant({ authorization, requestedIds: [foreign.id], records: [foreign] }))
      .toThrow(LetterGenerationBoundaryError);
    expect(() => resolveVerifiedEnclosures({
      authorization,
      requestedIds: ['foreign-document'],
      documents: [{ id: 'foreign-document', owner_id: 'other-owner', client_id: 'other-client', document_name: 'Foreign', storage_bucket: 'evidence-documents', storage_path: 'foreign/file.pdf', object_exists: true, user_confirmed_facts: [{ field: 'status', value: 'paid' }] }],
      facts: [],
    })).toThrow(LetterGenerationBoundaryError);
    expect(() => resolveRoundEvidence({
      authorization,
      requestedRoundId: 'round-synthetic',
      round: { id: 'round-synthetic', owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId },
      roundItems: [{ id: 'round-item', owner_id: 'other-owner', client_id: 'other-client', round_id: 'round-synthetic', negative_item_id: equifax.id, bureau: 'Equifax' }],
      negativeItems: [equifax],
    })).toThrow(LetterGenerationBoundaryError);
  });

  it('marks legacy and unlinked round evidence for review instead of alleging facts', () => {
    expect(bindLegacyEvidenceToTenant({
      authorization,
      requestedIds: ['legacy-synthetic'],
      records: [{ id: 'legacy-synthetic', owner_id: authorization.workspaceOwnerId, staff_client_id: authorization.clientId }],
    })).toEqual([expect.objectContaining({ code: 'legacy_unstructured_source' })]);

    const { groups } = resolveRoundEvidence({
      authorization,
      requestedRoundId: 'round-synthetic',
      round: { id: 'round-synthetic', owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId },
      roundItems: [{ id: 'round-item-unlinked', owner_id: authorization.workspaceOwnerId, client_id: authorization.clientId, round_id: 'round-synthetic', negative_item_id: null, bureau: 'Equifax' }],
      negativeItems: [],
    });
    expect(groups[0]).toEqual(expect.objectContaining({ evidenceIds: [], exclusions: [expect.objectContaining({ code: 'legacy_unstructured_source' })] }));
  });

  it('keeps every UI entry point on the same server boundary with no local generator', () => {
    const generators = [
      'src/app/dispute-letter-management/components/GenerateLetterForm.tsx',
      'src/app/dispute-wizard/components/DisputeWizardContent.tsx',
      'src/app/clients/[clientId]/disputes/[roundId]/components/DisputeRoundContent.tsx',
    ];
    for (const file of generators) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8');
      expect(source).toContain("fetch('/api/dispute-letters/generate'");
      expect(source).not.toMatch(/buildFallbackLetter|generateLetterContent|from\('dispute_letters'\)\.insert|from\('generated_dispute_letters'\)\.insert/);
    }
    const management = readFileSync(path.join(process.cwd(), 'src/app/dispute-letter-management/components/DisputeLetterContent.tsx'), 'utf8');
    expect(management).not.toMatch(/handleDuplicateLetter|title="Duplicate letter"|\.from\('dispute_letters'\)\s*\.insert/);
  });

  it('persists provenance before the draft and compensates on draft failure without an external AI call', () => {
    const route = readFileSync(path.join(process.cwd(), 'src/app/api/dispute-letters/generate/route.ts'), 'utf8');
    const auditInsert = route.indexOf("from('audit_logs').insert");
    const letterInsert = Math.min(
      route.indexOf("from('generated_dispute_letters').insert"),
      route.indexOf("from('dispute_letters').insert"),
    );
    expect(auditInsert).toBeGreaterThan(-1);
    expect(letterInsert).toBeGreaterThan(auditInsert);
    expect(route).toContain("from('audit_logs').delete()");
    expect(route).toContain('authorizeStaffClient');
    expect(route).not.toMatch(/openai|anthropic|gemini|fetch\([^)]*ai/i);
  });

  it('uses synthetic identities only', () => {
    const source = readFileSync(__filename, 'utf8');
    expect(source).toContain('@test.invalid');
    expect(source).not.toMatch(/@(gmail|yahoo|outlook|hotmail|icloud)\./i);
  });
});
