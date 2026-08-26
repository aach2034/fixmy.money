export interface SavedAuditItem {
  id?: string | null;
  creditor_name?: string | null;
  furnisher_name?: string | null;
  negative_category?: string | null;
  bureau?: string | null;
  bureaus_reporting?: string[] | null;
  balance?: number | string | null;
  past_due?: number | string | null;
  dispute_reason?: string | null;
  negative_reason?: string | null;
  dispute_status?: string | null;
  is_negative?: boolean | null;
  is_collection?: boolean | null;
  is_charge_off?: boolean | null;
  is_late?: boolean | null;
  parser_confidence?: number | null;
  account_number_masked?: string | null;
  account_type?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_history?: string | null;
  remarks?: string[] | null;
  original_creditor?: string | null;
  collection_agency?: string | null;
  date_opened?: string | null;
  date_reported?: string | null;
  date_last_activity?: string | null;
}

import {
  detectPotentialIssues,
  normalizeCrossBureauAccounts,
  type DetectedIssueDraft,
} from '@/lib/disputeEngine/evidenceEngine';
import type { NormalizedAccount } from '@/lib/creditReport/adapters';

const BUREAU_NAMES: Record<string, string> = {
  equifax: 'Equifax',
  eq: 'Equifax',
  experian: 'Experian',
  ex: 'Experian',
  transunion: 'TransUnion',
  'trans union': 'TransUnion',
  tu: 'TransUnion',
};

export function getReportingBureaus(item: SavedAuditItem): string[] {
  const supplied = Array.isArray(item.bureaus_reporting) ? item.bureaus_reporting : [];
  const values = supplied.length > 0 ? supplied : [item.bureau];

  return [...new Set(values
    .map(value => typeof value === 'string' ? BUREAU_NAMES[value.trim().toLowerCase()] : undefined)
    .filter((value): value is string => Boolean(value))
  )];
}

export function hasPlausibleInquiryDate(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const date = value.trim();
  let year = 0;
  let month = 0;
  let day = 0;

  const iso = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const us = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (us) {
    month = Number(us[1]);
    day = Number(us[2]);
    year = Number(us[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
  } else {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return year >= 1900 && year <= 2100 &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

export function isReliableInquiry(item: Pick<SavedAuditItem, 'creditor_name' | 'bureau' | 'bureaus_reporting' | 'date_reported'>): boolean {
  return hasPlausibleCreditorName(item.creditor_name) &&
    hasPlausibleInquiryDate(item.date_reported) &&
    getReportingBureaus(item).length > 0;
}

const PDF_GARBAGE = /(?:endstream|endobj|xref|startxref|\/xobject|\/dctdecode|\/flatedecode|\bjfif\b|\btrailer\b)/i;
const SECTION_LABEL = /^(?:for more details|account history|personal information|credit report|hard inquiries?|soft inquiries?|inquiries?|page \d+)\.?$/i;

export function hasPlausibleCreditorName(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 3 || name.length > 120) return false;
  if (PDF_GARBAGE.test(name) || SECTION_LABEL.test(name)) return false;
  if (/[^\x20-\x7E]/.test(name)) return false;
  if (/[^A-Za-z0-9\s.,&'()\/-]/.test(name)) return false;
  if ((name.match(/[A-Za-z]/g) ?? []).length < 3) return false;
  return /[A-Za-z]{2,}/.test(name);
}

function isUsableItem(item: SavedAuditItem): boolean {
  if (['deleted', 'closed'].includes(item.dispute_status ?? '')) return false;
  if (!hasPlausibleCreditorName(item.creditor_name)) return false;

  if (item.negative_category === 'hard_inquiry') {
    return isReliableInquiry(item);
  }

  // Account rows are persisted even when the parser is uncertain. The audit is
  // a decision surface, so only include rows with actual negative status and
  // enough extracted fields to clear the parser's confidence threshold.
  return item.is_negative === true && (item.parser_confidence ?? 0) >= 40;
}

export function selectReliableAuditItems(items: SavedAuditItem[]): SavedAuditItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!isUsableItem(item)) return false;
    const key = [
      item.negative_category ?? '',
      item.bureau ?? '',
      item.creditor_name?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '',
      item.account_number_masked ?? '',
      item.date_reported ?? '',
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type DisputeStrengthLabel = 'Strong' | 'Moderate' | 'Weak';

export interface DisputeStrengthResult {
  dispute_strength_score: number;
  strengthLabel: DisputeStrengthLabel;
  strongestAnomaly: string;
  reportedDataSummary: string;
  recommendedReason: string;
  disputeBasis: string;
  issueType?: string;
  isRecommended: boolean;
}

export type ScoredAuditItem<T extends SavedAuditItem = SavedAuditItem> = T & {
  disputeStrength: DisputeStrengthResult;
};

function amountValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

function asNormalizedAccount(item: SavedAuditItem, index: number): NormalizedAccount {
  const type = String(item.negative_category ?? '').toLowerCase();
  const status = item.status ?? item.negative_reason ?? '';

  return {
    id: item.id ?? `audit-${index}`,
    creditorName: item.creditor_name ?? '',
    furnisherName: item.furnisher_name ?? item.creditor_name ?? '',
    bureau: item.bureau ?? 'Unknown',
    bureaus: Array.isArray(item.bureaus_reporting) && item.bureaus_reporting.length > 0
      ? item.bureaus_reporting
      : [item.bureau ?? 'Unknown'],
    accountNumberMasked: item.account_number_masked ?? '',
    accountType: item.account_type ?? item.negative_category ?? '',
    responsibility: 'Individual',
    dateOpened: item.date_opened ?? '',
    accountStatus: status,
    paymentStatus: item.payment_status ?? '',
    balance: amountValue(item.balance),
    creditLimit: null,
    pastDue: amountValue(item.past_due),
    monthlyPayment: null,
    lastPaymentDate: item.date_last_activity ?? '',
    dateReported: item.date_reported ?? '',
    paymentHistory: item.payment_history ?? '',
    remarks: item.remarks ?? [],
    originalCreditor: item.original_creditor ?? '',
    collectionAgency: item.collection_agency ?? '',
    isNegative: item.is_negative === true || type === 'hard_inquiry' || Boolean(item.negative_reason),
    negativeReason: item.negative_reason ?? '',
    isCollection: item.is_collection === true || type === 'collection',
    isChargeOff: item.is_charge_off === true || type === 'charge_off',
    isLate: item.is_late === true || type === 'late_payment',
    rawText: '',
    parserConfidence: item.parser_confidence ?? 0,
  };
}

function formatFieldValues(values: Record<string, unknown>): string {
  return Object.entries(values)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([bureau, value]) => `${bureau}: ${formatEvidenceValue(value)}`)
    .join('; ');
}

function formatAmount(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatEvidenceValue(value: unknown): string {
  if (typeof value === 'number') return formatAmount(value);
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);

  if (Array.isArray(value)) {
    return value.map(formatEvidenceValue).filter(Boolean).join(', ');
  }

  const labels: Record<string, string> = {
    status: 'Status',
    accountStatus: 'Status',
    paymentStatus: 'Payment Status',
    balance: 'Current Balance',
    pastDue: 'Past Due',
    dateOpened: 'Date Opened',
    dateReported: 'Last Reported Date',
    lastPaymentDate: 'Last Payment Date',
    creditorName: 'Creditor',
    accountNumberMasked: 'Account',
  };

  return Object.entries(value as Record<string, unknown>)
    .filter(([, nested]) => nested !== null && nested !== undefined && String(nested).trim() !== '')
    .map(([key, nested]) => `${labels[key] ?? key}: ${formatEvidenceValue(nested)}`)
    .join('; ');
}

function issueFieldLabel(issue: DetectedIssueDraft): string {
  switch (issue.issueType) {
    case 'balance_discrepancy':
    case 'collection_balance_discrepancy':
      return 'Current Balance';
    case 'status_discrepancy':
      return 'Account Status';
    case 'payment_status_discrepancy':
      return 'Payment Status';
    case 'date_discrepancy':
      return 'Date Opened';
    case 'original_creditor_discrepancy':
      return 'Original Creditor';
    case 'paid_account_reporting_balance':
      return 'Status and Current Balance';
    case 'potential_duplicate_obligation':
      return 'Duplicate Tradeline Identity Fields';
    default:
      return 'Reported Field';
  }
}

function reportedDataSummaryFor(issue: DetectedIssueDraft): string {
  const reported = issue.reportedData as Record<string, unknown>;
  const field = issueFieldLabel(issue);

  if (issue.issueType === 'potential_duplicate_obligation' && Array.isArray(reported.tradelines)) {
    const lines = reported.tradelines
      .map((tradeline, index) => `Tradeline ${index + 1}: ${formatEvidenceValue(tradeline)}`)
      .filter(line => !line.endsWith(': '));
    return lines.length > 0 ? `${field}: ${lines.join(' | ')}.` : '';
  }

  const values = formatFieldValues(reported);
  return values ? `${field}: ${values}.` : '';
}

function disputeBasisFor(issue: DetectedIssueDraft): string {
  const reported = issue.reportedData as Record<string, unknown>;
  switch (issue.issueType) {
    case 'balance_discrepancy':
    case 'collection_balance_discrepancy':
      return `The same likely account reports different current balances across bureaus. Please investigate and correct or delete any information that cannot be verified as accurate.`;
    case 'status_discrepancy':
      return `The same likely account reports different account statuses across bureaus. Please investigate and correct or delete any information that cannot be verified as accurate.`;
    case 'payment_status_discrepancy':
      return `The same likely account reports different payment statuses across bureaus. Please investigate and correct or delete any information that cannot be verified as accurate.`;
    case 'date_discrepancy':
      return `The same likely account reports conflicting Date Opened values across bureaus. Please investigate and correct or delete any information that cannot be verified as accurate.`;
    case 'original_creditor_discrepancy':
      return `The same likely account reports conflicting original creditor information across bureaus. Please investigate and correct or delete any information that cannot be verified as accurate.`;
    case 'paid_account_reporting_balance':
      return `The account is being reported with a paid, settled, or closed status while also carrying a positive outstanding balance. Please investigate and correct or delete any information that cannot be verified as accurate.`;
    case 'potential_duplicate_obligation':
      return 'Multiple similar tradelines from the same bureau share account-identifying fields and may represent a duplicate obligation. Please investigate whether this item is duplicated and correct or delete any information that cannot be verified as accurate.';
    default:
      return `${issue.whyFlagged} Please investigate and correct or delete any information that cannot be verified as accurate.`;
  }
}

function scoreIssue(issue: DetectedIssueDraft): number {
  const baseByType: Partial<Record<DetectedIssueDraft['issueType'], number>> = {
    collection_balance_discrepancy: 86,
    balance_discrepancy: 84,
    status_discrepancy: 82,
    payment_status_discrepancy: 78,
    paid_account_reporting_balance: 78,
    original_creditor_discrepancy: 72,
    date_discrepancy: 70,
    potential_duplicate_obligation: 66,
  };
  return Math.max(baseByType[issue.issueType] ?? 60, issue.confidenceLevel);
}

function emptyStrength(item: SavedAuditItem): DisputeStrengthResult {
  const reason = item.dispute_reason || item.negative_reason || 'Negative item found, but no objective discrepancy was detected in the imported report data.';
  return {
    dispute_strength_score: 25,
    strengthLabel: 'Weak',
    strongestAnomaly: 'No factual anomaly detected',
    reportedDataSummary: '',
    recommendedReason: 'Available for review, but not recommended as a first-round priority without a factual discrepancy.',
    disputeBasis: reason,
    isRecommended: false,
  };
}

export function scoreDisputeStrength<T extends SavedAuditItem>(items: T[]): ScoredAuditItem<T>[] {
  const normalized = items.map(asNormalizedAccount);
  const issueByRawId = new Map<string, DetectedIssueDraft[]>();

  for (const account of normalizeCrossBureauAccounts(normalized)) {
    const issues = detectPotentialIssues(account);
    for (const issue of issues) {
      const affected = new Set(issue.affectedBureaus.map(String));
      for (const tradeline of account.tradelines) {
        if (affected.has(String(tradeline.bureau)) && tradeline.rawAccountId) {
          issueByRawId.set(tradeline.rawAccountId, [...(issueByRawId.get(tradeline.rawAccountId) ?? []), issue]);
        }
      }
    }
  }

  return items.map((item, index) => {
    const id = item.id ?? `audit-${index}`;
    const issues = [...(issueByRawId.get(id) ?? [])].sort((a, b) => scoreIssue(b) - scoreIssue(a));
    const strongest = issues[0];
    if (!strongest) return { ...item, disputeStrength: emptyStrength(item) };

    const score = Math.min(100, scoreIssue(strongest) + Math.max(0, issues.length - 1) * 5);
    const strengthLabel: DisputeStrengthLabel = score >= 80 ? 'Strong' : score >= 55 ? 'Moderate' : 'Weak';

    return {
      ...item,
      disputeStrength: {
        dispute_strength_score: score,
        strengthLabel,
        strongestAnomaly: strongest.whyFlagged,
        reportedDataSummary: reportedDataSummaryFor(strongest),
        recommendedReason: strengthLabel === 'Strong'
          ? 'Recommended for the first round because the imported report contains a specific factual discrepancy.'
          : 'Keep available for review; the detected discrepancy is less direct or lower confidence than stronger items.',
        disputeBasis: disputeBasisFor(strongest),
        issueType: strongest.issueType,
        isRecommended: strengthLabel === 'Strong',
      },
    };
  }).sort((a, b) => b.disputeStrength.dispute_strength_score - a.disputeStrength.dispute_strength_score);
}
