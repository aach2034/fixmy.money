import type { AnomalyFindingView } from './anomalyFindings';
import { buildConsumerSenderBlock, type LetterSenderInfo } from './letterSender';

export const CONSUMER_BUREAUS = ['Equifax', 'Experian', 'TransUnion'] as const;
export type ConsumerBureau = (typeof CONSUMER_BUREAUS)[number];

export interface ConfirmedLetterAttachment {
  id: string;
  label: string;
  confirmed: true;
}

export interface ConsumerLetterItem {
  source: 'negative_items';
  sourceRowId: string;
  bureau: string;
  creditorName: string;
  accountNumberMasked: string;
  isPositive?: boolean;
  findings: AnomalyFindingView[];
}

export interface LetterParagraphProvenance {
  paragraphId: string;
  sourceTable: 'negative_items';
  sourceRowId: string;
  sourceRowIds: string[];
  bureau: ConsumerBureau;
  creditorName: string;
  accountNumberMasked: string;
  issueType: string;
  disputedField: string;
  reportedValue: string;
  supportingValue: string;
  supportingSourceId: string;
  supportingSourceLabel: string;
}

export interface BuiltConsumerLetter {
  content: string;
  bureau: ConsumerBureau;
  itemCount: number;
  provenance: LetterParagraphProvenance[];
  attachments: ConfirmedLetterAttachment[];
}

export class NoQualifyingLetterEvidenceError extends Error {
  constructor() {
    super('No bureau-specific, supported dispute findings qualify for a letter. Review or add evidence before generating.');
    this.name = 'NoQualifyingLetterEvidenceError';
  }
}

const BUREAU_ADDRESSES: Record<ConsumerBureau, string> = {
  Equifax: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256',
  Experian: 'Experian\nDispute by Mail\nP.O. Box 4500\nAllen, TX 75013',
  TransUnion: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000',
};

const CROSS_BUREAU_ONLY_ISSUES = new Set([
  'balance_discrepancy',
  'collection_balance_discrepancy',
  'status_discrepancy',
  'charge_off_status_discrepancy',
  'collection_status_discrepancy',
  'payment_status_discrepancy',
  'past_due_discrepancy',
  'credit_limit_discrepancy',
  'high_balance_discrepancy',
  'date_discrepancy',
  'last_payment_date_discrepancy',
  'account_type_discrepancy',
  'responsibility_discrepancy',
  'payment_history_discrepancy',
  'remarks_discrepancy',
  'original_creditor_discrepancy',
]);

const FIELD_LABELS: Record<string, string> = {
  balance_discrepancy: 'Current balance',
  collection_balance_discrepancy: 'Current balance',
  status_discrepancy: 'Account status',
  charge_off_status_discrepancy: 'Account status',
  collection_status_discrepancy: 'Account status',
  payment_status_discrepancy: 'Payment status',
  past_due_discrepancy: 'Past-due amount',
  credit_limit_discrepancy: 'Credit limit',
  high_balance_discrepancy: 'High balance',
  date_discrepancy: 'Date opened',
  collection_activity_before_opening: 'Collection activity date and date opened',
  last_payment_date_discrepancy: 'Date of last activity',
  account_type_discrepancy: 'Account type',
  responsibility_discrepancy: 'Ownership or responsibility',
  payment_history_discrepancy: 'Payment history',
  remarks_discrepancy: 'Remarks or comments',
  original_creditor_discrepancy: 'Original creditor',
  paid_account_reporting_balance: 'Current balance',
  potential_duplicate_obligation: 'Duplicate tradeline',
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function comparable(value: unknown): string {
  return normalizeText(typeof value === 'object' ? JSON.stringify(value) : value).toLowerCase();
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (Array.isArray(value)) return value.map(formatValue).filter(Boolean).join(', ');
  if (!value || typeof value !== 'object') return normalizeText(value);

  const labels: Record<string, string> = {
    status: 'Status',
    paymentStatus: 'Payment status',
    balance: 'Balance',
    dateOpened: 'Date opened',
    collectionActivityDate: 'Collection activity date',
    creditorName: 'Creditor',
    accountNumberMasked: 'Account',
  };
  return Object.entries(value as Record<string, unknown>)
    .filter(([, nested]) => nested !== null && nested !== undefined && normalizeText(nested))
    .map(([key, nested]) => `${labels[key] ?? key}: ${formatValue(nested)}`)
    .join('; ');
}

export function normalizeMaskedAccountNumber(value: string): string {
  const characters = normalizeText(value).replace(/[^a-zA-Z0-9]/g, '');
  const lastFour = characters.slice(-4);
  return lastFour.length === 4 ? `****${lastFour}` : '';
}

function asConsumerBureau(value: string): ConsumerBureau | null {
  return CONSUMER_BUREAUS.find(bureau => bureau.toLowerCase() === normalizeText(value).toLowerCase()) ?? null;
}

interface QualifiedParagraph extends LetterParagraphProvenance {
  reason: string;
  requestedAction: string;
}

function qualifyFinding(item: ConsumerLetterItem, finding: AnomalyFindingView, bureau: ConsumerBureau): QualifiedParagraph | null {
  if (item.isPositive || item.source !== 'negative_items' || finding.strengthLabel === 'Weak') return null;
  if (!item.sourceRowId || !finding.issueType || finding.isAmbiguous === true) return null;
  if (!(finding.affectedBureaus ?? []).some(value => asConsumerBureau(value) === bureau)) return null;

  const accountNumberMasked = normalizeMaskedAccountNumber(item.accountNumberMasked);
  const creditorName = normalizeText(item.creditorName);
  if (!accountNumberMasked || !creditorName || /^unknown(?: creditor)?$/i.test(creditorName)) return null;

  const bureauValue = finding.reportedDataByBureau?.[bureau];
  if (bureauValue === null || bureauValue === undefined || !formatValue(bureauValue)) return null;

  const confirmedSupport = finding.confirmedSupportingEvidence?.confirmed === true
    ? finding.confirmedSupportingEvidence
    : null;
  if (CROSS_BUREAU_ONLY_ISSUES.has(finding.issueType) && !confirmedSupport) return null;

  let supportingValue = '';
  let supportingSourceId = '';
  let supportingSourceLabel = '';
  let reason = '';
  let requestedAction = '';

  if (confirmedSupport) {
    supportingValue = formatValue(confirmedSupport.value);
    supportingSourceId = normalizeText(confirmedSupport.sourceId);
    supportingSourceLabel = normalizeText(confirmedSupport.sourceLabel);
    if (!supportingValue || !supportingSourceId || !supportingSourceLabel || comparable(bureauValue) === comparable(confirmedSupport.value)) return null;
    reason = `The value reported by ${bureau} differs from the confirmed supporting record.`;
    requestedAction = `Please investigate and correct this field to ${supportingValue}, or delete the disputed information if it cannot be verified.`;
  } else if (finding.issueType === 'paid_account_reporting_balance') {
    const values = bureauValue as Record<string, unknown>;
    const status = formatValue(values.status || values.paymentStatus);
    const balance = formatValue(values.balance);
    if (!status || !balance) return null;
    supportingValue = status;
    supportingSourceId = item.sourceRowId;
    supportingSourceLabel = `${bureau} tradeline status`;
    reason = `The same ${bureau} tradeline reports a balance-ending status and a positive balance.`;
    requestedAction = 'Please investigate and correct the inconsistent balance, or delete the disputed information if it cannot be verified.';
  } else if (finding.issueType === 'collection_activity_before_opening') {
    const values = bureauValue as Record<string, unknown>;
    const activity = formatValue(values.collectionActivityDate);
    const opened = formatValue(values.dateOpened);
    if (!activity || !opened) return null;
    supportingValue = `Date opened: ${opened}`;
    supportingSourceId = item.sourceRowId;
    supportingSourceLabel = `${bureau} tradeline date opened`;
    reason = `The same ${bureau} tradeline reports collection activity dated before its reported opening date.`;
    requestedAction = 'Please investigate and correct the inconsistent date information, or delete the disputed information if it cannot be verified.';
  } else {
    return null;
  }

  const sourceRowIds = [...new Set([item.sourceRowId, ...(finding.sourceRowIds ?? [])].filter(Boolean))];
  return {
    paragraphId: '',
    sourceTable: 'negative_items',
    sourceRowId: item.sourceRowId,
    sourceRowIds,
    bureau,
    creditorName,
    accountNumberMasked,
    issueType: finding.issueType,
    disputedField: FIELD_LABELS[finding.issueType] ?? 'Reported information',
    reportedValue: formatValue(bureauValue),
    supportingValue,
    supportingSourceId,
    supportingSourceLabel,
    reason,
    requestedAction,
  };
}

function removeContradictions(paragraphs: QualifiedParagraph[]): QualifiedParagraph[] {
  const groups = new Map<string, QualifiedParagraph[]>();
  for (const paragraph of paragraphs) {
    const key = [paragraph.bureau, paragraph.accountNumberMasked, paragraph.disputedField].join('|');
    groups.set(key, [...(groups.get(key) ?? []), paragraph]);
  }

  return [...groups.values()].flatMap(group => {
    const supportingValues = new Set(group.map(paragraph => comparable(paragraph.supportingValue)));
    if (supportingValues.size > 1) return [];
    const seen = new Set<string>();
    return group.filter(paragraph => {
      const key = [paragraph.issueType, paragraph.reportedValue, paragraph.supportingValue].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
}

export function buildConsumerBureauLetter(params: {
  sender: LetterSenderInfo;
  bureau: string;
  round: number;
  letterId: string;
  items: ConsumerLetterItem[];
  attachments?: ConfirmedLetterAttachment[];
  date?: Date;
}): BuiltConsumerLetter {
  const bureau = asConsumerBureau(params.bureau);
  if (!bureau) throw new NoQualifyingLetterEvidenceError();

  const qualified = removeContradictions(params.items
    .filter(item => asConsumerBureau(item.bureau) === bureau)
    .flatMap(item => item.findings.map(finding => qualifyFinding(item, finding, bureau)).filter((value): value is QualifiedParagraph => Boolean(value))))
    .map((paragraph, index) => ({ ...paragraph, paragraphId: `dispute-item-${index + 1}` }));

  if (qualified.length === 0) throw new NoQualifyingLetterEvidenceError();

  const attachments = (params.attachments ?? []).filter(attachment => attachment.confirmed && attachment.id && attachment.label);
  const today = (params.date ?? new Date()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const senderBlock = buildConsumerSenderBlock(params.sender);
  const itemText = qualified.map((paragraph, index) => `${index + 1}. ${paragraph.creditorName} — account ${paragraph.accountNumberMasked}
   Disputed field: ${paragraph.disputedField}
   ${bureau} reports: ${paragraph.reportedValue}
   Supporting evidence: ${paragraph.supportingSourceLabel} — ${paragraph.supportingValue}
   Why disputed: ${paragraph.reason}
   Requested action: ${paragraph.requestedAction}`).join('\n\n');
  const attachmentText = attachments.length > 0
    ? `\n\nEnclosures:\n${attachments.map(attachment => `- ${attachment.label}`).join('\n')}`
    : '';

  const content = `${senderBlock}

${today}

${BUREAU_ADDRESSES[bureau]}

Re: Dispute of specific information in my ${bureau} credit file
Letter reference: ${normalizeText(params.letterId)}

To Whom It May Concern:

I am disputing the specific information identified below. Please investigate each item and send the investigation results to my address above.

${itemText}${attachmentText}

If any disputed information is inaccurate, incomplete, or cannot be verified, please correct or delete it as appropriate and provide an updated copy of my credit report.

Sincerely,


_________________________________
${params.sender.name}`;

  return {
    content,
    bureau,
    itemCount: qualified.length,
    provenance: qualified.map(({ reason: _reason, requestedAction: _requestedAction, ...paragraph }) => paragraph),
    attachments,
  };
}
