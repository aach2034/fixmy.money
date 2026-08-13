import type { NormalizedAccount } from '@/lib/creditReport/adapters';

export type BureauName = 'Experian' | 'Equifax' | 'TransUnion' | 'Unknown' | string;

export type EvidenceStrength = 'strong' | 'moderate' | 'insufficient';

export type DetectedIssueType =
  | 'balance_discrepancy'
  | 'status_discrepancy'
  | 'payment_status_discrepancy'
  | 'date_discrepancy'
  | 'potential_duplicate_obligation'
  | 'potentially_obsolete_reporting'
  | 'original_creditor_discrepancy'
  | 'collection_balance_discrepancy'
  | 'paid_account_reporting_balance'
  | 'open_after_documented_closure'
  | 'late_payment_discrepancy'
  | 'ownership_identity_review'
  | 'mixed_file_indicator'
  | 'potential_reinsertion'
  | 'post_dispute_material_change';

export interface BureauTradelineSnapshot {
  bureau: BureauName;
  creditorName: string;
  furnisherName: string;
  accountNumberMasked: string;
  accountType: string;
  originalCreditor: string;
  collectionAgency: string;
  accountStatus: string;
  paymentStatus: string;
  balance: number | null;
  creditLimit: number | null;
  pastDue: number | null;
  dateOpened: string;
  dateReported: string;
  lastPaymentDate: string;
  paymentHistory: string;
  remarks: string[];
  isCollection: boolean;
  rawAccountId?: string;
  parserConfidence: number;
}

export interface CanonicalCreditAccount {
  canonicalKey: string;
  displayName: string;
  accountNumberMasked: string;
  accountType: string;
  originalCreditor: string;
  bureaus: BureauName[];
  tradelines: BureauTradelineSnapshot[];
}

export interface DetectedIssueDraft {
  issueType: DetectedIssueType;
  affectedBureaus: BureauName[];
  affectedFurnisher: string;
  reportedData: Record<string, unknown>;
  conflictingData: Record<string, unknown>;
  whyFlagged: string;
  confidenceLevel: number;
  evidenceCurrentlyAvailable: string[];
  evidenceStillNeeded: string[];
  recommendedAction: string;
}

export interface EvidenceFactDraft {
  factType: string;
  fieldName?: string;
  value?: string | number | null;
  sourceType: 'credit_report' | 'uploaded_evidence' | 'consumer_confirmed' | 'investigation_response';
  confirmedByUser?: boolean;
  documentType?: string;
  documentDate?: string;
  identifiesAccount?: boolean;
}

export interface EvidenceStrengthResult {
  strength: EvidenceStrength;
  reasons: string[];
  recommendedAction: string;
}

export interface ReportingComparisonResult {
  materialCorrectionDetected: boolean;
  changedFields: string[];
  unchangedDisputedFields: string[];
  recommendation: string;
}

export interface ReinsertionDraft {
  bureau: BureauName;
  canonicalKey: string;
  dateRemovedOrNotDetected: string;
  dateSubsequentlyDetected: string;
  materialFields: string[];
  label: 'Potential reinsertion';
  requestedConsumerDocuments: string[];
}

const BUREAU_ORDER = ['Experian', 'Equifax', 'TransUnion'];

function clean(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function compact(value: unknown): string {
  return clean(value).replace(/[^a-z0-9*]/g, '');
}

function normalizeBureau(value: unknown): BureauName {
  const normalized = clean(value);
  if (normalized.includes('experian')) return 'Experian';
  if (normalized.includes('equifax')) return 'Equifax';
  if (normalized.includes('transunion') || normalized.includes('trans union')) return 'TransUnion';
  return value ? String(value) : 'Unknown';
}

function toTradeline(account: NormalizedAccount): BureauTradelineSnapshot {
  return {
    bureau: normalizeBureau(account.bureau),
    creditorName: account.creditorName,
    furnisherName: account.furnisherName || account.creditorName,
    accountNumberMasked: account.accountNumberMasked,
    accountType: account.accountType,
    originalCreditor: account.originalCreditor,
    collectionAgency: account.collectionAgency,
    accountStatus: account.accountStatus,
    paymentStatus: account.paymentStatus,
    balance: account.balance,
    creditLimit: account.creditLimit,
    pastDue: account.pastDue,
    dateOpened: account.dateOpened,
    dateReported: account.dateReported,
    lastPaymentDate: account.lastPaymentDate,
    paymentHistory: account.paymentHistory,
    remarks: account.remarks,
    isCollection: account.isCollection,
    rawAccountId: account.id,
    parserConfidence: account.parserConfidence,
  };
}

function accountSimilarity(left: BureauTradelineSnapshot, right: BureauTradelineSnapshot): number {
  let score = 0;
  const leftCreditor = compact(left.creditorName || left.furnisherName);
  const rightCreditor = compact(right.creditorName || right.furnisherName);
  const sameCreditor = leftCreditor && rightCreditor && (leftCreditor === rightCreditor || leftCreditor.includes(rightCreditor) || rightCreditor.includes(leftCreditor));

  if (sameCreditor) score += 0.26;
  if (left.accountNumberMasked && right.accountNumberMasked && compact(left.accountNumberMasked) === compact(right.accountNumberMasked)) score += 0.30;
  if (clean(left.accountType) && clean(left.accountType) === clean(right.accountType)) score += 0.10;
  if (clean(left.originalCreditor) && clean(left.originalCreditor) === clean(right.originalCreditor)) score += 0.10;
  if (left.dateOpened && left.dateOpened === right.dateOpened) score += 0.10;
  if (left.balance != null && right.balance != null && left.balance === right.balance) score += 0.05;
  if (left.creditLimit != null && right.creditLimit != null && left.creditLimit === right.creditLimit) score += 0.04;
  if (clean(left.paymentHistory) && clean(left.paymentHistory) === clean(right.paymentHistory)) score += 0.03;
  if (left.isCollection === right.isCollection && (left.collectionAgency || right.collectionAgency)) score += 0.02;

  return score;
}

function canonicalKeyFor(tradeline: BureauTradelineSnapshot): string {
  const parts = [
    compact(tradeline.furnisherName || tradeline.creditorName),
    compact(tradeline.accountNumberMasked),
    compact(tradeline.accountType),
    compact(tradeline.originalCreditor),
    clean(tradeline.dateOpened),
  ].filter(Boolean);
  return parts.join('|') || compact(tradeline.creditorName) || 'unknown-account';
}

export function normalizeCrossBureauAccounts(accounts: NormalizedAccount[]): CanonicalCreditAccount[] {
  const canonical: CanonicalCreditAccount[] = [];

  for (const account of accounts) {
    const tradeline = toTradeline(account);
    let bestIndex = -1;
    let bestScore = 0;

    canonical.forEach((candidate, index) => {
      const candidateScore = Math.max(...candidate.tradelines.map(existing => accountSimilarity(existing, tradeline)));
      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestIndex = index;
      }
    });

    if (bestIndex >= 0 && bestScore >= 0.58) {
      canonical[bestIndex].tradelines.push(tradeline);
      canonical[bestIndex].bureaus = uniqueSortedBureaus(canonical[bestIndex].tradelines.map(row => row.bureau));
      continue;
    }

    canonical.push({
      canonicalKey: canonicalKeyFor(tradeline),
      displayName: tradeline.furnisherName || tradeline.creditorName || 'Reported account',
      accountNumberMasked: tradeline.accountNumberMasked,
      accountType: tradeline.accountType,
      originalCreditor: tradeline.originalCreditor,
      bureaus: [tradeline.bureau],
      tradelines: [tradeline],
    });
  }

  return canonical.map(account => ({
    ...account,
    canonicalKey: account.canonicalKey || canonicalKeyFor(account.tradelines[0]),
    tradelines: [...account.tradelines].sort((a, b) => BUREAU_ORDER.indexOf(String(a.bureau)) - BUREAU_ORDER.indexOf(String(b.bureau))),
    bureaus: uniqueSortedBureaus(account.bureaus),
  }));
}

function uniqueSortedBureaus(bureaus: BureauName[]): BureauName[] {
  return [...new Set(bureaus)].sort((a, b) => BUREAU_ORDER.indexOf(String(a)) - BUREAU_ORDER.indexOf(String(b)));
}

function valuesByBureau(tradelines: BureauTradelineSnapshot[], field: keyof BureauTradelineSnapshot): Record<string, unknown> {
  return Object.fromEntries(tradelines.map(row => [String(row.bureau), row[field] ?? null]));
}

function distinctMeaningful(values: unknown[]): unknown[] {
  return [...new Set(values.filter(value => value !== null && value !== undefined && String(value).trim() !== '').map(value => String(value).trim()))];
}

function issue(params: Omit<DetectedIssueDraft, 'evidenceCurrentlyAvailable' | 'recommendedAction'> & Partial<Pick<DetectedIssueDraft, 'evidenceCurrentlyAvailable' | 'recommendedAction'>>): DetectedIssueDraft {
  return {
    evidenceCurrentlyAvailable: params.evidenceCurrentlyAvailable ?? ['Credit report field comparison'],
    recommendedAction: params.recommendedAction ?? 'Review the reported fields and gather documentation before preparing any dispute.',
    ...params,
  };
}

export function detectPotentialIssues(account: CanonicalCreditAccount): DetectedIssueDraft[] {
  const rows = account.tradelines;
  const issues: DetectedIssueDraft[] = [];
  if (rows.length === 0) return issues;

  const furnisher = account.displayName;
  const affectedBureaus = uniqueSortedBureaus(rows.map(row => row.bureau));

  const balanceValues = distinctMeaningful(rows.map(row => row.balance));
  if (balanceValues.length > 1) {
    issues.push(issue({
      issueType: rows.some(row => row.isCollection) ? 'collection_balance_discrepancy' : 'balance_discrepancy',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'balance'),
      conflictingData: { balancesReported: balanceValues },
      whyFlagged: 'The same likely account is reporting different balances across bureaus.',
      confidenceLevel: 82,
      evidenceStillNeeded: ['Current creditor or collector statement showing the correct balance', 'Consumer confirmation that the compared tradelines are the same obligation'],
    }));
  }

  const statuses = distinctMeaningful(rows.map(row => row.accountStatus));
  if (statuses.length > 1) {
    issues.push(issue({
      issueType: 'status_discrepancy',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'accountStatus'),
      conflictingData: { statusesReported: statuses },
      whyFlagged: 'The same likely account is reporting different account statuses across bureaus.',
      confidenceLevel: 78,
      evidenceStillNeeded: ['Creditor correspondence, payoff letter, or statement supporting the correct account status'],
    }));
  }

  const paymentStatuses = distinctMeaningful(rows.map(row => row.paymentStatus));
  if (paymentStatuses.length > 1) {
    issues.push(issue({
      issueType: 'payment_status_discrepancy',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'paymentStatus'),
      conflictingData: { paymentStatusesReported: paymentStatuses },
      whyFlagged: 'Payment status differs between bureau tradelines for the same likely account.',
      confidenceLevel: 74,
      evidenceStillNeeded: ['Payment records or creditor statement that supports the correct payment status'],
    }));
  }

  const openedDates = distinctMeaningful(rows.map(row => row.dateOpened));
  if (openedDates.length > 1) {
    issues.push(issue({
      issueType: 'date_discrepancy',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'dateOpened'),
      conflictingData: { openedDatesReported: openedDates },
      whyFlagged: 'Opening dates differ across bureau tradelines for the same likely account.',
      confidenceLevel: 68,
      evidenceStillNeeded: ['Original agreement, statement, or creditor record showing the opening date'],
    }));
  }

  const originalCreditors = distinctMeaningful(rows.map(row => row.originalCreditor));
  if (originalCreditors.length > 1) {
    issues.push(issue({
      issueType: 'original_creditor_discrepancy',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'originalCreditor'),
      conflictingData: { originalCreditorsReported: originalCreditors },
      whyFlagged: 'Original creditor information differs across bureau tradelines.',
      confidenceLevel: 70,
      evidenceStillNeeded: ['Collection notice, creditor assignment record, or account statement identifying the original creditor'],
    }));
  }

  for (const row of rows) {
    const paidLike = /paid|settled|closed/i.test(`${row.accountStatus} ${row.paymentStatus}`);
    if (paidLike && (row.balance ?? 0) > 0) {
      issues.push(issue({
        issueType: 'paid_account_reporting_balance',
        affectedBureaus: [row.bureau],
        affectedFurnisher: row.furnisherName,
        reportedData: { [String(row.bureau)]: { status: row.accountStatus, paymentStatus: row.paymentStatus, balance: row.balance } },
        conflictingData: { paidOrClosedStatusWithPositiveBalance: true },
        whyFlagged: 'A tradeline that appears paid, settled, or closed is also reporting a positive balance.',
        confidenceLevel: 76,
        evidenceStillNeeded: ['Final statement, settlement letter, payoff confirmation, or payment confirmation showing the balance after resolution'],
      }));
    }
  }

  const duplicateCandidates = rows.length > 1 && affectedBureaus.length === 1;
  if (duplicateCandidates) {
    issues.push(issue({
      issueType: 'potential_duplicate_obligation',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: { tradelines: rows.map(row => ({ creditorName: row.creditorName, accountNumberMasked: row.accountNumberMasked, balance: row.balance, status: row.accountStatus })) },
      conflictingData: { sameBureauTradelineCount: rows.length },
      whyFlagged: 'Multiple similar tradelines from the same bureau may represent a duplicate obligation.',
      confidenceLevel: 62,
      evidenceStillNeeded: ['Consumer confirmation and creditor records showing whether the tradelines represent one obligation or separate accounts'],
    }));
  }

  return issues;
}

export function calculateEvidenceStrength(issueDraft: DetectedIssueDraft, facts: EvidenceFactDraft[]): EvidenceStrengthResult {
  const confirmed = facts.filter(fact => fact.confirmedByUser);
  const uploadedFacts = facts.filter(fact => fact.sourceType === 'uploaded_evidence');
  const accountIdentifying = uploadedFacts.some(fact => fact.identifiesAccount);
  const issueText = `${issueDraft.issueType} ${JSON.stringify(issueDraft.reportedData)} ${JSON.stringify(issueDraft.conflictingData)}`.toLowerCase();
  const fieldSpecific = facts.some(fact => {
    const fieldName = clean(fact.fieldName);
    const factType = clean(fact.factType);
    return Boolean((fieldName && issueText.includes(fieldName)) || (factType && issueText.includes(factType.replace('documented_', ''))));
  });
  const datedDocument = uploadedFacts.some(fact => Boolean(fact.documentDate));

  const reasons: string[] = [];
  if (uploadedFacts.length > 0) reasons.push('Uploaded documentation is associated with this issue.');
  if (accountIdentifying) reasons.push('At least one document identifies the matching account.');
  if (confirmed.length > 0) reasons.push('A user confirmed extracted or entered facts.');
  if (fieldSpecific) reasons.push('Evidence references a field involved in the potential discrepancy.');
  if (datedDocument) reasons.push('At least one supporting document has a document date.');
  if (issueDraft.evidenceCurrentlyAvailable.length > 0) reasons.push('Credit report field comparison is available.');

  if (uploadedFacts.length > 0 && accountIdentifying && confirmed.length > 0 && fieldSpecific) {
    return {
      strength: 'strong',
      reasons,
      recommendedAction: 'Evidence supports preparing a narrowly factual dispute or investigation request for human review.',
    };
  }

  if (uploadedFacts.length > 0 || confirmed.length > 0) {
    return {
      strength: 'moderate',
      reasons,
      recommendedAction: 'Review the evidence and confirm any extracted facts before generating factual claims.',
    };
  }

  return {
    strength: 'insufficient',
    reasons: ['Bureau reporting discrepancy detected.', 'No confirmed supporting documentation is associated with this issue.'],
    recommendedAction: 'Gather additional documentation before disputing.',
  };
}

export function compareDisputedFields(before: BureauTradelineSnapshot, after: BureauTradelineSnapshot, fields: Array<keyof BureauTradelineSnapshot>): ReportingComparisonResult {
  const changedFields = fields.filter(field => before[field] !== after[field]).map(String);
  const unchangedDisputedFields = fields.filter(field => before[field] === after[field]).map(String);

  return {
    materialCorrectionDetected: changedFields.length > 0,
    changedFields,
    unchangedDisputedFields,
    recommendation: changedFields.length > 0
      ? 'Review the updated reporting and investigation result before closing the case.'
      : 'No material correction detected. Review the investigation result and supporting documentation for a possible documented follow-up or escalation.',
  };
}

export function detectPotentialReinsertions(history: Array<{ canonicalKey: string; bureau: BureauName; detected: boolean; snapshotDate: string; materialFields: string[] }>): ReinsertionDraft[] {
  const grouped = new Map<string, typeof history>();
  for (const item of history) {
    const key = `${item.canonicalKey}|${item.bureau}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  const reinsertions: ReinsertionDraft[] = [];
  for (const items of grouped.values()) {
    const sorted = [...items].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    let removed: typeof sorted[number] | null = null;
    for (const item of sorted) {
      if (!item.detected) removed = item;
      if (removed && item.detected && item.snapshotDate > removed.snapshotDate) {
        reinsertions.push({
          bureau: item.bureau,
          canonicalKey: item.canonicalKey,
          dateRemovedOrNotDetected: removed.snapshotDate,
          dateSubsequentlyDetected: item.snapshotDate,
          materialFields: item.materialFields,
          label: 'Potential reinsertion',
          requestedConsumerDocuments: ['Any notice received from the bureau about the information being reinserted', 'The investigation result or report where the item was no longer detected'],
        });
        break;
      }
    }
  }

  return reinsertions;
}
