import type { NormalizedAccount } from '@/lib/creditReport/adapters';

export type BureauName = 'Experian' | 'Equifax' | 'TransUnion' | 'Unknown' | string;

export type EvidenceStrength = 'strong' | 'moderate' | 'insufficient';

export type DetectedIssueType =
  | 'balance_discrepancy'
  | 'status_discrepancy'
  | 'charge_off_status_discrepancy'
  | 'collection_status_discrepancy'
  | 'payment_status_discrepancy'
  | 'past_due_discrepancy'
  | 'high_balance_discrepancy'
  | 'credit_limit_discrepancy'
  | 'date_discrepancy'
  | 'last_payment_date_discrepancy'
  | 'account_type_discrepancy'
  | 'responsibility_discrepancy'
  | 'payment_history_discrepancy'
  | 'remarks_discrepancy'
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
  responsibility: string;
  originalCreditor: string;
  collectionAgency: string;
  accountStatus: string;
  paymentStatus: string;
  balance: number | null;
  highBalance: number | null;
  creditLimit: number | null;
  pastDue: number | null;
  dateOpened: string;
  dateReported: string;
  lastPaymentDate: string;
  paymentHistory: string;
  remarks: string[];
  isCollection: boolean;
  isChargeOff: boolean;
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
  issueTitle: string;
  affectedBureaus: BureauName[];
  affectedFurnisher: string;
  reportedData: Record<string, unknown>;
  conflictingData: Record<string, unknown>;
  whyFlagged: string;
  factualBasis: string;
  disputeReason: string;
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
    responsibility: account.responsibility,
    originalCreditor: account.originalCreditor,
    collectionAgency: account.collectionAgency,
    accountStatus: account.accountStatus,
    paymentStatus: account.paymentStatus,
    balance: account.balance,
    highBalance: account.highBalance ?? null,
    creditLimit: account.creditLimit,
    pastDue: account.pastDue,
    dateOpened: account.dateOpened,
    dateReported: account.dateReported,
    lastPaymentDate: account.lastPaymentDate,
    paymentHistory: account.paymentHistory,
    remarks: account.remarks,
    isCollection: account.isCollection,
    isChargeOff: account.isChargeOff,
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

const MISSING_REPORT_VALUE_KEYS = new Set([
  'na',
  'unknown',
  'notreported',
  'nodata',
  'notavailable',
  'notapplicable',
  'none',
  'null',
  'noinformation',
  'notprovided',
  'unavailable',
  'undetermined',
]);

function meaningfulReportValue(value: unknown): unknown | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) {
    const meaningful = value.map(meaningfulReportValue).filter(item => item !== null);
    return meaningful.length > 0 ? meaningful : null;
  }

  const trimmed = String(value).trim();
  if (!trimmed || /^[\s\-–—_.•]+$/.test(trimmed)) return null;

  const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  return MISSING_REPORT_VALUE_KEYS.has(key) ? null : trimmed;
}

function normalizeAccountStatus(value: unknown): string | null {
  const meaningful = meaningfulReportValue(value);
  if (meaningful === null) return null;

  const normalized = clean(meaningful).replace(/[_-]+/g, ' ');
  const statusAliases: Record<string, string> = {
    'account closed': 'closed',
    'closed account': 'closed',
    'account open': 'open',
    'open account': 'open',
    'account paid': 'paid',
    'paid account': 'paid',
    'charge off': 'charge-off',
    chargeoff: 'charge-off',
    'charged off': 'charge-off',
  };
  return statusAliases[normalized] ?? normalized;
}

function normalizeComparableText(value: unknown): string | null {
  const meaningful = meaningfulReportValue(value);
  return meaningful === null ? null : clean(meaningful);
}

function normalizeRemarks(value: unknown): string | null {
  const meaningful = meaningfulReportValue(value);
  if (meaningful === null) return null;
  const values = (Array.isArray(meaningful) ? meaningful : [meaningful])
    .map(item => clean(item))
    .filter(Boolean)
    .sort();
  return values.length > 0 ? values.join(' | ') : null;
}

function valuesByBureau(tradelines: BureauTradelineSnapshot[], field: keyof BureauTradelineSnapshot): Record<string, unknown> {
  return Object.fromEntries(tradelines.map(row => [String(row.bureau), meaningfulReportValue(row[field])]));
}

function distinctMeaningful(values: unknown[], normalizer: (value: unknown) => unknown | null = meaningfulReportValue): unknown[] {
  return [...new Set(values.map(normalizer).filter((value): value is Exclude<unknown, null> => value !== null))];
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
      issueTitle: rows.some(row => row.isCollection) ? 'Collection balance mismatch' : 'Account balance mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'balance'),
      conflictingData: { balancesReported: balanceValues },
      whyFlagged: 'The reported account balance differs across bureaus.',
      factualBasis: 'The same account is reporting conflicting balance information across the consumer reporting agencies.',
      disputeReason: 'Incorrect account balance reported across bureaus.',
      confidenceLevel: 82,
      evidenceStillNeeded: ['Current creditor or collector statement showing the correct balance', 'Consumer confirmation that the compared tradelines are the same obligation'],
    }));
  }

  const statuses = distinctMeaningful(rows.map(row => row.accountStatus), normalizeAccountStatus);
  if (statuses.length > 1) {
    const statusIssueType: DetectedIssueType = rows.some(row => row.isChargeOff || normalizeAccountStatus(row.accountStatus) === 'charge-off')
      ? 'charge_off_status_discrepancy'
      : rows.some(row => row.isCollection || normalizeAccountStatus(row.accountStatus) === 'collection')
        ? 'collection_status_discrepancy'
        : 'status_discrepancy';
    issues.push(issue({
      issueType: statusIssueType,
      issueTitle: statusIssueType === 'charge_off_status_discrepancy'
        ? 'Charge-off status mismatch'
        : statusIssueType === 'collection_status_discrepancy'
          ? 'Collection status mismatch'
          : 'Account status mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'accountStatus'),
      conflictingData: { statusesReported: statuses },
      whyFlagged: statusIssueType === 'charge_off_status_discrepancy'
        ? 'The reported charge-off status differs across bureaus.'
        : statusIssueType === 'collection_status_discrepancy'
          ? 'The reported collection status differs across bureaus.'
          : 'The reported account status differs across bureaus.',
      factualBasis: statusIssueType === 'charge_off_status_discrepancy'
        ? 'The same account is reporting conflicting charge-off status information across the consumer reporting agencies.'
        : statusIssueType === 'collection_status_discrepancy'
          ? 'The same collection account is reporting conflicting status information across the consumer reporting agencies.'
          : 'The same account is reporting conflicting account status information across the consumer reporting agencies.',
      disputeReason: statusIssueType === 'charge_off_status_discrepancy'
        ? 'Inconsistent charge-off status reported across bureaus.'
        : statusIssueType === 'collection_status_discrepancy'
          ? 'Inconsistent collection status reported across bureaus.'
          : 'Incorrect account status reported across bureaus.',
      confidenceLevel: 78,
      evidenceStillNeeded: ['Creditor correspondence, payoff letter, or statement supporting the correct account status'],
    }));
  }

  const paymentStatuses = distinctMeaningful(rows.map(row => row.paymentStatus), normalizeComparableText);
  if (paymentStatuses.length > 1) {
    issues.push(issue({
      issueType: 'payment_status_discrepancy',
      issueTitle: 'Payment status mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'paymentStatus'),
      conflictingData: { paymentStatusesReported: paymentStatuses },
      whyFlagged: 'Payment status differs between bureau tradelines for the same likely account.',
      factualBasis: 'The same account is reporting conflicting current payment status information across the consumer reporting agencies.',
      disputeReason: 'Incorrect payment status reported across bureaus.',
      confidenceLevel: 74,
      evidenceStillNeeded: ['Payment records or creditor statement that supports the correct payment status'],
    }));
  }

  const pastDueValues = distinctMeaningful(rows.map(row => row.pastDue));
  if (pastDueValues.length > 1) {
    issues.push(issue({
      issueType: 'past_due_discrepancy',
      issueTitle: 'Past-due amount mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'pastDue'),
      conflictingData: { pastDueAmountsReported: pastDueValues },
      whyFlagged: 'The reported past-due amount differs across bureaus.',
      factualBasis: 'The same account is reporting conflicting past-due amounts across the consumer reporting agencies.',
      disputeReason: 'Incorrect past-due amount reported across bureaus.',
      confidenceLevel: 76,
      evidenceStillNeeded: ['Current creditor statement or payment records showing the correct past-due amount'],
    }));
  }

  const creditLimitValues = distinctMeaningful(rows.map(row => row.creditLimit));
  if (creditLimitValues.length > 1) {
    issues.push(issue({
      issueType: 'credit_limit_discrepancy',
      issueTitle: 'Credit limit mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'creditLimit'),
      conflictingData: { creditLimitsReported: creditLimitValues },
      whyFlagged: 'The reported credit limit differs across bureaus.',
      factualBasis: 'The same account is reporting conflicting credit limits across the consumer reporting agencies.',
      disputeReason: 'Incorrect credit limit reported across bureaus.',
      confidenceLevel: 72,
      evidenceStillNeeded: ['Account agreement or creditor statement showing the correct credit limit'],
    }));
  }

  const highBalanceValues = distinctMeaningful(rows.map(row => row.highBalance));
  if (highBalanceValues.length > 1) {
    issues.push(issue({
      issueType: 'high_balance_discrepancy',
      issueTitle: 'High balance mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'highBalance'),
      conflictingData: { highBalancesReported: highBalanceValues },
      whyFlagged: 'The reported high balance differs across bureaus.',
      factualBasis: 'The same account is reporting conflicting high-balance amounts across the consumer reporting agencies.',
      disputeReason: 'Incorrect high balance reported across bureaus.',
      confidenceLevel: 70,
      evidenceStillNeeded: ['Historical statements or creditor records showing the correct high balance'],
    }));
  }

  const openedDates = distinctMeaningful(rows.map(row => row.dateOpened), normalizeComparableText);
  if (openedDates.length > 1) {
    issues.push(issue({
      issueType: 'date_discrepancy',
      issueTitle: 'Date opened mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'dateOpened'),
      conflictingData: { openedDatesReported: openedDates },
      whyFlagged: 'Opening dates differ across bureau tradelines for the same likely account.',
      factualBasis: 'The same account is reporting conflicting Date Opened values across the consumer reporting agencies.',
      disputeReason: 'Incorrect Date Opened reported across bureaus.',
      confidenceLevel: 68,
      evidenceStillNeeded: ['Original agreement, statement, or creditor record showing the opening date'],
    }));
  }

  const lastPaymentDates = distinctMeaningful(rows.map(row => row.lastPaymentDate), normalizeComparableText);
  if (lastPaymentDates.length > 1) {
    issues.push(issue({
      issueType: 'last_payment_date_discrepancy',
      issueTitle: 'Date of last activity mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'lastPaymentDate'),
      conflictingData: { lastActivityDatesReported: lastPaymentDates },
      whyFlagged: 'The reported date of last activity differs across bureaus.',
      factualBasis: 'The same account is reporting conflicting dates of last activity or last payment across the consumer reporting agencies.',
      disputeReason: 'Incorrect date of last activity reported across bureaus.',
      confidenceLevel: 68,
      evidenceStillNeeded: ['Account statements or payment records showing the correct date of last activity'],
    }));
  }

  const accountTypes = distinctMeaningful(rows.map(row => row.accountType), normalizeComparableText);
  if (accountTypes.length > 1) {
    issues.push(issue({
      issueType: 'account_type_discrepancy',
      issueTitle: 'Account type mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'accountType'),
      conflictingData: { accountTypesReported: accountTypes },
      whyFlagged: 'The reported account type differs across bureaus.',
      factualBasis: 'The same account is classified under conflicting account types across the consumer reporting agencies.',
      disputeReason: 'Incorrect account type reported across bureaus.',
      confidenceLevel: 66,
      evidenceStillNeeded: ['Account agreement or creditor statement identifying the correct account type'],
    }));
  }

  const responsibilities = distinctMeaningful(rows.map(row => row.responsibility), normalizeComparableText);
  if (responsibilities.length > 1) {
    issues.push(issue({
      issueType: 'responsibility_discrepancy',
      issueTitle: 'Ownership or responsibility mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'responsibility'),
      conflictingData: { responsibilitiesReported: responsibilities },
      whyFlagged: 'The reported ownership or account responsibility differs across bureaus.',
      factualBasis: 'The same account is reporting conflicting ownership or responsibility designations across the consumer reporting agencies.',
      disputeReason: 'Incorrect ownership or account responsibility reported across bureaus.',
      confidenceLevel: 74,
      evidenceStillNeeded: ['Account agreement or creditor records showing the correct ownership designation'],
    }));
  }

  const paymentHistories = distinctMeaningful(rows.map(row => row.paymentHistory), normalizeComparableText);
  if (paymentHistories.length > 1) {
    issues.push(issue({
      issueType: 'payment_history_discrepancy',
      issueTitle: 'Payment history mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'paymentHistory'),
      conflictingData: { paymentHistoriesReported: paymentHistories },
      whyFlagged: 'The reported payment history differs across bureaus.',
      factualBasis: 'The same account is reporting conflicting payment history information across the consumer reporting agencies.',
      disputeReason: 'Incorrect payment history reported across bureaus.',
      confidenceLevel: 70,
      evidenceStillNeeded: ['Payment records or account statements supporting the correct payment history'],
    }));
  }

  const remarks = distinctMeaningful(rows.map(row => row.remarks), normalizeRemarks);
  if (remarks.length > 1) {
    issues.push(issue({
      issueType: 'remarks_discrepancy',
      issueTitle: 'Remarks or comments mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'remarks'),
      conflictingData: { remarksReported: remarks },
      whyFlagged: 'The reported account remarks or comments differ across bureaus.',
      factualBasis: 'The same account includes conflicting remarks or comments across the consumer reporting agencies.',
      disputeReason: 'Incorrect account remarks or comments reported across bureaus.',
      confidenceLevel: 62,
      evidenceStillNeeded: ['Creditor correspondence or account records clarifying the correct remarks'],
    }));
  }

  const originalCreditors = distinctMeaningful(rows.map(row => row.originalCreditor), normalizeComparableText);
  if (originalCreditors.length > 1) {
    issues.push(issue({
      issueType: 'original_creditor_discrepancy',
      issueTitle: 'Original creditor mismatch',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: valuesByBureau(rows, 'originalCreditor'),
      conflictingData: { originalCreditorsReported: originalCreditors },
      whyFlagged: 'Original creditor information differs across bureau tradelines.',
      factualBasis: 'The same account is reporting conflicting original creditor information across the consumer reporting agencies.',
      disputeReason: 'Incorrect original creditor information reported across bureaus.',
      confidenceLevel: 70,
      evidenceStillNeeded: ['Collection notice, creditor assignment record, or account statement identifying the original creditor'],
    }));
  }

  for (const row of rows) {
    const paidLike = /paid|settled|closed/i.test(`${row.accountStatus} ${row.paymentStatus}`);
    if (paidLike && (row.balance ?? 0) > 0) {
      issues.push(issue({
        issueType: 'paid_account_reporting_balance',
        issueTitle: 'Closed or paid account with positive balance',
        affectedBureaus: [row.bureau],
        affectedFurnisher: row.furnisherName,
        reportedData: { [String(row.bureau)]: { status: row.accountStatus, paymentStatus: row.paymentStatus, balance: row.balance } },
        conflictingData: { paidOrClosedStatusWithPositiveBalance: true },
        whyFlagged: 'A tradeline that appears paid, settled, or closed is also reporting a positive balance.',
        factualBasis: 'The same tradeline reports a paid, settled, or closed status while also reporting a positive outstanding balance.',
        disputeReason: 'Closed or paid account is reporting an inconsistent positive balance.',
        confidenceLevel: 76,
        evidenceStillNeeded: ['Final statement, settlement letter, payoff confirmation, or payment confirmation showing the balance after resolution'],
      }));
    }
  }

  const duplicateCandidates = rows.length > 1 && affectedBureaus.length === 1;
  if (duplicateCandidates) {
    issues.push(issue({
      issueType: 'potential_duplicate_obligation',
      issueTitle: 'Potential duplicate account reporting',
      affectedBureaus,
      affectedFurnisher: furnisher,
      reportedData: { tradelines: rows.map(row => ({ creditorName: row.creditorName, accountNumberMasked: row.accountNumberMasked, balance: row.balance, status: row.accountStatus })) },
      conflictingData: { sameBureauTradelineCount: rows.length },
      whyFlagged: 'Multiple similar tradelines from the same bureau may represent a duplicate obligation.',
      factualBasis: 'Multiple tradelines from the same bureau share account-identifying fields and may represent the same obligation.',
      disputeReason: 'Potential duplicate account reporting requires verification.',
      confidenceLevel: 62,
      evidenceStillNeeded: ['Consumer confirmation and creditor records showing whether the tradelines represent one obligation or separate accounts'],
    }));
  }

  const seen = new Set<string>();
  return issues.filter(candidate => {
    const key = `${account.canonicalKey}|${candidate.issueType}|${JSON.stringify(candidate.conflictingData)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
