import type { NormalizedAccount } from '@/lib/creditReport/adapters';
import {
  detectPotentialIssues,
  normalizeCrossBureauAccounts,
  type CanonicalCreditAccount,
  type DetectedIssueDraft,
} from '@/lib/disputeEngine/evidenceEngine';
import { buildConsumerSenderBlock, type LetterSenderInfo } from './letterSender';

export const CANONICAL_BUREAUS = ['Equifax', 'Experian', 'TransUnion'] as const;
export type CanonicalBureau = (typeof CANONICAL_BUREAUS)[number];
export type LetterGenerationStatus = 'ready' | 'review_required';

export interface StoredNegativeItem {
  id: string;
  owner_id: string;
  client_id: string;
  credit_account_id?: string | null;
  report_id?: string | null;
  bureau?: string | null;
  bureaus_reporting?: string[] | null;
  creditor_name?: string | null;
  furnisher_name?: string | null;
  account_number_masked?: string | null;
  account_type?: string | null;
  responsibility?: string | null;
  status?: string | null;
  payment_status?: string | null;
  balance?: number | string | null;
  high_balance?: number | string | null;
  credit_limit?: number | string | null;
  past_due?: number | string | null;
  date_opened?: string | null;
  date_reported?: string | null;
  date_last_activity?: string | null;
  last_activity_field?: string | null;
  collection_activity_date?: string | null;
  collection_activity_field?: string | null;
  payment_history?: string | null;
  remarks?: string[] | null;
  original_creditor?: string | null;
  collection_agency?: string | null;
  negative_reason?: string | null;
  negative_category?: string | null;
  is_negative?: boolean | null;
  is_collection?: boolean | null;
  is_charge_off?: boolean | null;
  is_late?: boolean | null;
  parser_confidence?: number | null;
}

export interface VerifiedLetterEnclosure {
  documentId: string;
  label: string;
  sourceEvidenceIds: string[];
}

export type LetterExclusionCode =
  | 'ambiguous_account_match'
  | 'invalid_account_reference'
  | 'legacy_unstructured_source'
  | 'low_confidence'
  | 'missing_structured_evidence'
  | 'unsupported_bureau'
  | 'unverified_enclosure';

export interface LetterEvidenceExclusion {
  sourceEvidenceId: string;
  code: LetterExclusionCode;
  reason: string;
}

export interface LetterParagraphProvenance {
  paragraphId: string;
  accountOrFurnisher: string;
  accountNumberMasked: string;
  bureau: CanonicalBureau;
  disputedField: string;
  reportedValue: string;
  contradictoryOrExpectedValue: string;
  sourceEvidenceId: string;
  sourceEvidenceIds: string[];
  disputeReason: string;
}

export interface CanonicalLetterResult {
  status: LetterGenerationStatus;
  bureau: CanonicalBureau;
  letterContent: string | null;
  substantiveContent: string | null;
  paragraphs: LetterParagraphProvenance[];
  enclosures: VerifiedLetterEnclosure[];
  exclusions: LetterEvidenceExclusion[];
}

export interface CanonicalLetterInput {
  sender: LetterSenderInfo;
  bureau: CanonicalBureau;
  letterReference: string;
  generatedOn: Date;
  selectedEvidenceIds: string[];
  evidenceRows: StoredNegativeItem[];
  enclosures?: VerifiedLetterEnclosure[];
  priorExclusions?: LetterEvidenceExclusion[];
}

const BUREAU_ADDRESSES: Record<CanonicalBureau, string> = {
  Equifax: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256',
  Experian: 'Experian\nP.O. Box 4500\nAllen, TX 75013',
  TransUnion: 'TransUnion LLC Consumer Dispute Center\nP.O. Box 2000\nChester, PA 19016',
};

const CROSS_BUREAU_FIELDS: Partial<Record<DetectedIssueDraft['issueType'], string>> = {
  balance_discrepancy: 'Current balance',
  collection_balance_discrepancy: 'Current balance',
  status_discrepancy: 'Account status',
  charge_off_status_discrepancy: 'Account status',
  collection_status_discrepancy: 'Account status',
  payment_status_discrepancy: 'Payment status',
  past_due_discrepancy: 'Past-due amount',
  credit_limit_discrepancy: 'Credit limit',
  high_balance_discrepancy: 'High balance',
  last_payment_date_discrepancy: 'Date of last activity',
  account_type_discrepancy: 'Account type',
  responsibility_discrepancy: 'Responsibility designation',
  payment_history_discrepancy: 'Payment history',
  remarks_discrepancy: 'Remarks or comments',
  original_creditor_discrepancy: 'Original creditor',
};

const SELF_CONTAINED_FIELDS: Partial<Record<DetectedIssueDraft['issueType'], string>> = {
  paid_account_reporting_balance: 'Account status and current balance',
  collection_activity_before_opening: 'Collection activity date and date opened',
};

function oneLine(value: unknown, maximum = 240): string {
  return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function amount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  if (Array.isArray(value)) return value.map(formatValue).filter(Boolean).join(', ');
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return oneLine(value);

  const labels: Record<string, string> = {
    accountStatus: 'Status',
    status: 'Status',
    paymentStatus: 'Payment status',
    balance: 'Balance',
    highBalance: 'High balance',
    creditLimit: 'Credit limit',
    pastDue: 'Past due',
    dateOpened: 'Date opened',
    collectionActivityDate: 'Collection activity date',
    lastPaymentDate: 'Date of last activity',
    accountType: 'Account type',
    responsibility: 'Responsibility',
    paymentHistory: 'Payment history',
    remarks: 'Remarks',
    originalCreditor: 'Original creditor',
  };
  return Object.entries(value as Record<string, unknown>)
    .filter(([, nested]) => formatValue(nested))
    .map(([key, nested]) => `${labels[key] ?? oneLine(key)}: ${formatValue(nested)}`)
    .join('; ');
}

function comparable(value: unknown): string {
  return formatValue(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

export function asCanonicalBureau(value: unknown): CanonicalBureau | null {
  const normalized = oneLine(value).toLowerCase().replace(/\s+/g, '');
  if (normalized === 'equifax') return 'Equifax';
  if (normalized === 'experian') return 'Experian';
  if (normalized === 'transunion') return 'TransUnion';
  return null;
}

export function maskAccountNumber(value: unknown): string {
  const normalized = oneLine(value).replace(/[^A-Za-z0-9]/g, '');
  const lastFour = normalized.slice(-4);
  return lastFour.length === 4 ? `****${lastFour}` : '';
}

function plausibleFurnisher(value: unknown): string {
  const candidate = oneLine(value, 120);
  if (candidate.length < 3 || /^(?:unknown(?: creditor| furnisher)?|n\/?a|none|not reported)$/i.test(candidate)) return '';
  if (!/[A-Za-z]{2}/.test(candidate)) return '';
  return candidate;
}

function normalizedAccount(row: StoredNegativeItem): NormalizedAccount {
  const type = oneLine(row.negative_category).toLowerCase();
  return {
    id: row.id,
    creditorName: oneLine(row.creditor_name),
    furnisherName: oneLine(row.furnisher_name || row.creditor_name),
    bureau: asCanonicalBureau(row.bureau) ?? 'Unknown',
    bureaus: [asCanonicalBureau(row.bureau) ?? 'Unknown'],
    accountNumberMasked: oneLine(row.account_number_masked),
    accountType: oneLine(row.account_type),
    responsibility: oneLine(row.responsibility),
    dateOpened: oneLine(row.date_opened),
    dateOpenedField: row.date_opened ? 'date_opened' : undefined,
    accountStatus: oneLine(row.status),
    paymentStatus: oneLine(row.payment_status),
    balance: amount(row.balance),
    highBalance: amount(row.high_balance),
    creditLimit: amount(row.credit_limit),
    pastDue: amount(row.past_due),
    monthlyPayment: null,
    lastPaymentDate: oneLine(row.date_last_activity),
    lastActivityField: row.last_activity_field === 'date_of_last_activity' ? 'date_of_last_activity' : undefined,
    collectionActivityDate: oneLine(row.collection_activity_date),
    collectionActivityField: row.collection_activity_field === 'collection_account_activity' ? 'collection_account_activity' : undefined,
    dateReported: oneLine(row.date_reported),
    paymentHistory: oneLine(row.payment_history),
    remarks: Array.isArray(row.remarks) ? row.remarks.map(value => oneLine(value)).filter(Boolean) : [],
    originalCreditor: oneLine(row.original_creditor),
    collectionAgency: oneLine(row.collection_agency),
    isNegative: row.is_negative === true || type === 'hard_inquiry' || Boolean(oneLine(row.negative_reason)),
    negativeReason: oneLine(row.negative_reason),
    isCollection: row.is_collection === true || type === 'collection',
    isChargeOff: row.is_charge_off === true || type === 'charge_off',
    isLate: row.is_late === true || type === 'late_payment',
    rawText: '',
    parserConfidence: row.parser_confidence ?? 0,
  };
}

function safeRow(row: StoredNegativeItem): boolean {
  return Boolean(
    row.id &&
    asCanonicalBureau(row.bureau) &&
    plausibleFurnisher(row.furnisher_name || row.creditor_name) &&
    maskAccountNumber(row.account_number_masked) &&
    (row.parser_confidence ?? 0) >= 70
  );
}

function sourceIdsByBureau(account: CanonicalCreditAccount): Map<CanonicalBureau, string[]> {
  const result = new Map<CanonicalBureau, string[]>();
  for (const row of account.tradelines) {
    const bureau = asCanonicalBureau(row.bureau);
    if (!bureau || !row.rawAccountId) continue;
    result.set(bureau, [...(result.get(bureau) ?? []), row.rawAccountId].sort());
  }
  return result;
}

function normalizedIdentity(value: unknown): string {
  const normalized = oneLine(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  return new Set(['', 'na', 'none', 'null', 'unknown', 'notreported', 'notavailable']).has(normalized) ? '' : normalized;
}

function hasUnambiguousCrossBureauIdentity(account: CanonicalCreditAccount, issue: DetectedIssueDraft): boolean {
  if (account.tradelines.length < 2) return false;
  const furnishers = new Set(account.tradelines.map(row => normalizedIdentity(row.furnisherName || row.creditorName)));
  const masks = new Set(account.tradelines.map(row => maskAccountNumber(row.accountNumberMasked)));
  if (furnishers.size !== 1 || furnishers.has('') || masks.size !== 1 || masks.has('')) return false;

  if (issue.issueType === 'date_discrepancy') return false;
  const disputedAnchor = issue.issueType === 'account_type_discrepancy'
    ? 'accountType'
    : issue.issueType === 'original_creditor_discrepancy'
      ? 'originalCreditor'
      : null;
  const dateOpenedValues = account.tradelines.map(row => normalizedIdentity(row.dateOpened));
  if (!dateOpenedValues.every(Boolean) || new Set(dateOpenedValues).size !== 1) return false;
  const anchors: Array<'accountType' | 'originalCreditor'> = ['accountType', 'originalCreditor'];
  const matchingAnchors = anchors
    .filter(anchor => anchor !== disputedAnchor)
    .filter(anchor => {
      const values = account.tradelines.map(row => normalizedIdentity(row[anchor]));
      return values.every(Boolean) && new Set(values).size === 1;
    });
  return matchingAnchors.length >= 1;
}

function crossBureauParagraph(
  issue: DetectedIssueDraft,
  account: CanonicalCreditAccount,
  targetBureau: CanonicalBureau,
  sourceIds: Map<CanonicalBureau, string[]>,
): Omit<LetterParagraphProvenance, 'paragraphId'> | null {
  const disputedField = CROSS_BUREAU_FIELDS[issue.issueType];
  if (!disputedField || issue.confidenceLevel < 70 || !hasUnambiguousCrossBureauIdentity(account, issue)) return null;
  const reported = issue.reportedData as Record<string, unknown>;
  const targetValue = reported[targetBureau];
  if (!formatValue(targetValue) || (sourceIds.get(targetBureau)?.length ?? 0) !== 1) return null;

  const comparisons = CANONICAL_BUREAUS
    .filter(bureau => bureau !== targetBureau && formatValue(reported[bureau]))
    .filter(bureau => (sourceIds.get(bureau)?.length ?? 0) === 1)
    .map(bureau => ({ bureau, value: reported[bureau], sourceId: sourceIds.get(bureau)![0] }))
    .filter(comparison => comparable(comparison.value) !== comparable(targetValue));
  if (comparisons.length === 0) return null;

  const target = account.tradelines.find(row => asCanonicalBureau(row.bureau) === targetBureau);
  if (!target?.rawAccountId) return null;
  const accountNumberMasked = maskAccountNumber(target.accountNumberMasked);
  const accountOrFurnisher = plausibleFurnisher(target.furnisherName || target.creditorName);
  if (!accountNumberMasked || !accountOrFurnisher) return null;

  const sourceEvidenceIds = [target.rawAccountId, ...comparisons.map(value => value.sourceId)].sort();
  const comparisonText = comparisons.map(value => `${value.bureau} reports ${formatValue(value.value)}`).join('; ');
  return {
    accountOrFurnisher,
    accountNumberMasked,
    bureau: targetBureau,
    disputedField,
    reportedValue: `${targetBureau} reports ${formatValue(targetValue)}`,
    contradictoryOrExpectedValue: comparisonText,
    sourceEvidenceId: target.rawAccountId,
    sourceEvidenceIds,
    disputeReason: `The stored bureau reports contain different values for ${disputedField.toLowerCase()}.`,
  };
}

function selfContainedParagraph(
  issue: DetectedIssueDraft,
  account: CanonicalCreditAccount,
  targetBureau: CanonicalBureau,
  sourceIds: Map<CanonicalBureau, string[]>,
): Omit<LetterParagraphProvenance, 'paragraphId'> | null {
  const disputedField = SELF_CONTAINED_FIELDS[issue.issueType];
  if (!disputedField || issue.confidenceLevel < 70 || (sourceIds.get(targetBureau)?.length ?? 0) !== 1) return null;
  const target = account.tradelines.find(row => asCanonicalBureau(row.bureau) === targetBureau);
  const sourceEvidenceId = sourceIds.get(targetBureau)?.[0];
  const reported = (issue.reportedData as Record<string, unknown>)[targetBureau];
  if (!target || !sourceEvidenceId || !formatValue(reported)) return null;
  const accountNumberMasked = maskAccountNumber(target.accountNumberMasked);
  const accountOrFurnisher = plausibleFurnisher(target.furnisherName || target.creditorName);
  if (!accountNumberMasked || !accountOrFurnisher) return null;

  const contradiction = issue.issueType === 'paid_account_reporting_balance'
    ? 'The same stored row reports both a balance-ending status and a positive balance.'
    : 'The same stored row reports collection activity before its reported opening date.';
  return {
    accountOrFurnisher,
    accountNumberMasked,
    bureau: targetBureau,
    disputedField,
    reportedValue: `${targetBureau} reports ${formatValue(reported)}`,
    contradictoryOrExpectedValue: contradiction,
    sourceEvidenceId,
    sourceEvidenceIds: [sourceEvidenceId],
    disputeReason: 'The stored credit-report row contains internally contradictory field values.',
  };
}

function uniqueSortedEnclosures(enclosures: VerifiedLetterEnclosure[]): VerifiedLetterEnclosure[] {
  const byId = new Map<string, VerifiedLetterEnclosure>();
  for (const enclosure of enclosures) {
    const label = oneLine(enclosure.label, 160);
    if (!enclosure.documentId || !label || enclosure.sourceEvidenceIds.length === 0) continue;
    byId.set(enclosure.documentId, {
      documentId: enclosure.documentId,
      label,
      sourceEvidenceIds: [...new Set(enclosure.sourceEvidenceIds)].sort(),
    });
  }
  return [...byId.values()].sort((left, right) => left.label.localeCompare(right.label) || left.documentId.localeCompare(right.documentId));
}

function exclusion(sourceEvidenceId: string, code: LetterExclusionCode, reason: string): LetterEvidenceExclusion {
  return { sourceEvidenceId, code, reason };
}

export function buildCanonicalDisputeLetter(input: CanonicalLetterInput): CanonicalLetterResult {
  const selectedIds = [...new Set(input.selectedEvidenceIds)].sort();
  const exclusions = [...(input.priorExclusions ?? [])];
  const rowsById = new Map(input.evidenceRows.map(row => [row.id, row]));

  for (const id of selectedIds) {
    const row = rowsById.get(id);
    if (!row) {
      exclusions.push(exclusion(id, 'missing_structured_evidence', 'The selected stored evidence could not be resolved.'));
    } else if (!asCanonicalBureau(row.bureau)) {
      exclusions.push(exclusion(id, 'unsupported_bureau', 'The stored row does not identify one supported bureau.'));
    } else if ((row.parser_confidence ?? 0) < 70) {
      exclusions.push(exclusion(id, 'low_confidence', 'The stored parser confidence is below the letter-generation threshold.'));
    } else if (!plausibleFurnisher(row.furnisher_name || row.creditor_name) || !maskAccountNumber(row.account_number_masked)) {
      exclusions.push(exclusion(id, 'invalid_account_reference', 'The stored row lacks a safe furnisher or maskable account reference.'));
    } else if (asCanonicalBureau(row.bureau) !== input.bureau) {
      exclusions.push(exclusion(id, 'unsupported_bureau', `The stored row belongs to ${asCanonicalBureau(row.bureau)}, not ${input.bureau}.`));
    }
  }

  const usableRows = input.evidenceRows.filter(safeRow).sort((left, right) => left.id.localeCompare(right.id));
  const rowsByAccount = new Map<string, StoredNegativeItem[]>();
  for (const row of usableRows) {
    const accountKey = row.credit_account_id && row.report_id
      ? `${row.report_id}:${row.credit_account_id}`
      : `unlinked:${row.id}`;
    rowsByAccount.set(accountKey, [...(rowsByAccount.get(accountKey) ?? []), row]);
  }
  const accounts = [...rowsByAccount.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, rows]) => normalizeCrossBureauAccounts(rows.map(normalizedAccount)));
  const candidateParagraphs: Array<Omit<LetterParagraphProvenance, 'paragraphId'>> = [];
  const supportedSelectedIds = new Set<string>();

  for (const account of accounts) {
    const accountSourceIds = account.tradelines.map(row => row.rawAccountId).filter((value): value is string => Boolean(value));
    const selectedInAccount = accountSourceIds.filter(id => selectedIds.includes(id));
    if (selectedInAccount.length === 0) continue;
    const selectedTargetIds = selectedInAccount.filter(id => asCanonicalBureau(rowsById.get(id)?.bureau) === input.bureau);
    if (selectedTargetIds.length === 0) continue;
    const idsByBureau = sourceIdsByBureau(account);
    if ((idsByBureau.get(input.bureau)?.length ?? 0) !== 1) {
      selectedTargetIds.forEach(id => exclusions.push(exclusion(id, 'ambiguous_account_match', 'Multiple or missing rows prevent a unique bureau-specific account match.')));
      continue;
    }
    const accountMasks = new Set(account.tradelines.map(row => maskAccountNumber(row.accountNumberMasked)));
    if (accountMasks.size !== 1 || accountMasks.has('')) {
      selectedTargetIds.forEach(id => exclusions.push(exclusion(id, 'ambiguous_account_match', 'Cross-bureau rows do not share one verified masked account reference.')));
      continue;
    }

    const accountParagraphs = detectPotentialIssues(account)
      .map(issue => crossBureauParagraph(issue, account, input.bureau, idsByBureau)
        ?? selfContainedParagraph(issue, account, input.bureau, idsByBureau))
      .filter((value): value is Omit<LetterParagraphProvenance, 'paragraphId'> => Boolean(value));
    if (accountParagraphs.length === 0) continue;
    candidateParagraphs.push(...accountParagraphs);
    selectedTargetIds.forEach(id => supportedSelectedIds.add(id));
  }

  for (const id of selectedIds) {
    if (rowsById.has(id) && !supportedSelectedIds.has(id) && !exclusions.some(value => value.sourceEvidenceId === id)) {
      exclusions.push(exclusion(id, 'missing_structured_evidence', 'No supported, field-specific discrepancy was found for this bureau.'));
    }
  }

  const paragraphMap = new Map<string, Omit<LetterParagraphProvenance, 'paragraphId'>>();
  for (const paragraph of candidateParagraphs) {
    const key = [
      paragraph.bureau,
      paragraph.accountOrFurnisher.toLowerCase(),
      paragraph.accountNumberMasked,
      paragraph.disputedField,
      paragraph.reportedValue,
      paragraph.contradictoryOrExpectedValue,
      paragraph.sourceEvidenceIds.join(','),
    ].join('|');
    paragraphMap.set(key, paragraph);
  }
  const paragraphs = [...paragraphMap.values()]
    .sort((left, right) => [left.accountOrFurnisher, left.accountNumberMasked, left.disputedField, left.sourceEvidenceIds.join(',')].join('|')
      .localeCompare([right.accountOrFurnisher, right.accountNumberMasked, right.disputedField, right.sourceEvidenceIds.join(',')].join('|')))
    .map((paragraph, index) => ({ ...paragraph, paragraphId: `evidence-${index + 1}` }));
  const enclosures = uniqueSortedEnclosures(input.enclosures ?? []);
  const sortedExclusions = [...new Map(exclusions.map(value => [`${value.sourceEvidenceId}|${value.code}`, value])).values()]
    .sort((left, right) => left.sourceEvidenceId.localeCompare(right.sourceEvidenceId) || left.code.localeCompare(right.code));

  if (paragraphs.length === 0) {
    return {
      status: 'review_required',
      bureau: input.bureau,
      letterContent: null,
      substantiveContent: null,
      paragraphs: [],
      enclosures,
      exclusions: sortedExclusions,
    };
  }

  const substantiveContent = paragraphs.map((paragraph, index) => `${index + 1}. ${paragraph.accountOrFurnisher} — account ${paragraph.accountNumberMasked}
   Disputed field: ${paragraph.disputedField}
   ${paragraph.reportedValue}
   Comparison or contradiction: ${paragraph.contradictoryOrExpectedValue}
   Reason for review: ${paragraph.disputeReason}
   Requested action: Please investigate this specific discrepancy and correct any information found to be inaccurate or incomplete.`).join('\n\n');
  const enclosureSection = enclosures.length > 0
    ? `\n\nEnclosures:\n${enclosures.map(value => `- ${value.label}`).join('\n')}`
    : '';
  const date = input.generatedOn.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const reference = oneLine(input.letterReference, 80);
  const letterContent = `${buildConsumerSenderBlock(input.sender)}

${date}

${BUREAU_ADDRESSES[input.bureau]}

Re: Specific information in my ${input.bureau} credit file
Letter reference: ${reference}

To Whom It May Concern:

I am asking you to investigate the specific reporting discrepancies identified below and send the results to my address above.

${substantiveContent}${enclosureSection}

Please send the investigation results and an updated copy of my credit report if any information changes.

Sincerely,


_________________________________
${input.sender.name}`;

  return {
    status: 'ready',
    bureau: input.bureau,
    letterContent,
    substantiveContent,
    paragraphs,
    enclosures,
    exclusions: sortedExclusions,
  };
}
