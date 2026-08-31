import { extractCreditReportDate } from './dateValidation';
import { isReliableInquiry } from './auditItems';

export type SupportedProvider =
  | 'smartcredit' | 'myscoreiq' | 'identityiq' | 'myfreescorenow' | 'privacyguard' |'experian' | 'transunion' | 'equifax' | 'annualcreditreport' | 'creditkarma' | 'unknown';

// ─── Developer logging ────────────────────────────────────────────────────────
// Structured log for parser diagnostics. Written to console.debug so it only
// appears when DevTools is open. Never shown to end users.

export interface ParserDiagnostics {
  providerSelected: string;
  providerConfidence: number;
  totalTextBlocks: number;
  excludedBlocks: number;
  exclusionReasons: { block: string; reason: string }[];
  blockDispositions: ParseBlockDisposition[];
  classifiedBlocks: number;
  duplicateBlocks: number;
  boilerplateBlocks: number;
  preservedUnclassifiedBlocks: number;
  fallbackConsumedBlocks: number;
  rejectedAccountCandidates: { block: string; reason: string }[];
  accountFragmentsMerged: number;
  canonicalHtml?: CreditReportHtmlNormalizationSummary;
  reconciliation: {
    readableBlocks: number;
    classifiedBlocks: number;
    duplicateBlocks: number;
    boilerplateBlocks: number;
    preservedUnclassifiedBlocks: number;
    accountedFor: number;
  };
  accountsDetected: number;
  inquiriesDetected: number;
  scoresDetected: number;
  finalConfidence: number;
  sectionConfidence: Record<string, number>;
  sectionStatuses: ReportSectionStatuses;
  fallbackUsed: boolean;
  rawTextLength: number;
  normalizedTextLength: number;
  stageFailures: ParseStageError[];
  // ── New counters for image-based PDF handling ──────────────────────────
  totalPdfPages: number;
  pagesWithEmbeddedText: number;
  pagesRequiringOcr: number;
  ocrPagesSucceeded: number;
  ocrPagesFailed: number;
  binaryBlocksSkipped: number;
  readableTextBlocksAccepted: number;
  readableTextBlocksRejected: number;
  isImageBasedPdf: boolean;
  ocrWasUsed: boolean;
}

export type SemanticBlockType =
  | 'provider/header'
  | 'personal information'
  | 'account creditor name'
  | 'account field label'
  | 'account field value'
  | 'payment history'
  | 'balance'
  | 'credit limit'
  | 'payment amount'
  | 'account status'
  | 'account type'
  | 'account number'
  | 'opened date'
  | 'closed date'
  | 'last reported date'
  | 'delinquency'
  | 'charge-off'
  | 'collection'
  | 'inquiry'
  | 'public record'
  | 'credit score'
  | 'summary/statistics'
  | 'footer/navigation/legal boilerplate'
  | 'duplicate'
  | 'continuation of adjacent block'
  | 'unknown/unclassified';

export type FinalBlockDisposition =
  | 'classified'
  | 'duplicate'
  | 'boilerplate'
  | 'account'
  | 'fallback-account'
  | 'preserved-unclassified';

export interface ParseBlockDisposition {
  blockId: string;
  page: number;
  blockIndex: number;
  rawText: string;
  normalizedText: string;
  primaryParserDisposition: string;
  fallbackParserDisposition: string;
  semanticType: SemanticBlockType;
  associatedAccountId?: string;
  confidence: number;
  finalDisposition: FinalBlockDisposition;
  reason: string;
  provider?: SupportedProvider | 'unknown';
}

export interface CreditReportHtmlNormalizationSummary {
  sourceBlocksReceived: number;
  blocksClassified: number;
  blocksPaired: number;
  accountSectionsProduced: number;
  collectionSectionsProduced: number;
  inquirySectionsProduced: number;
  publicRecordSectionsProduced: number;
  unclassifiedBlocksPreserved: number;
  blocksRejected: number;
  rejectedAccountCandidates: { block: string; reason: string }[];
  accountFragmentsMerged: number;
  validationErrors: string[];
}

export interface CreditReportHtmlNormalizationResult {
  html: string;
  diagnostics: CreditReportHtmlNormalizationSummary;
  blockDispositions: ParseBlockDisposition[];
}

export interface ParseStageError {
  stage: 'upload' | 'text_extraction' | 'normalization' | 'provider_detection' | 'account_parsing' | 'personal_info' | 'scores' | 'inquiries' | 'public_records' | 'negative_classification';
  message: string;
  fatal: boolean;
}

function logDiagnostics(d: ParserDiagnostics): void {
  try {
    if (typeof console !== 'undefined') {
      console.debug('[CreditReportParser] ── Diagnostics ──────────────────────');
      console.debug(`  Provider selected:    ${d.providerSelected} (${d.providerConfidence}% confidence)`);
      console.debug(`  Raw text length:      ${d.rawTextLength} chars`);
      console.debug(`  Normalized length:    ${d.normalizedTextLength} chars`);
      console.debug(`  Image-based PDF:      ${d.isImageBasedPdf}`);
      console.debug(`  OCR was used:         ${d.ocrWasUsed}`);
      console.debug(`  Total PDF pages:      ${d.totalPdfPages}`);
      console.debug(`  Pages w/ text:        ${d.pagesWithEmbeddedText}`);
      console.debug(`  Pages needing OCR:    ${d.pagesRequiringOcr}`);
      console.debug(`  OCR pages succeeded:  ${d.ocrPagesSucceeded}`);
      console.debug(`  OCR pages failed:     ${d.ocrPagesFailed}`);
      console.debug(`  Binary blocks skipped:${d.binaryBlocksSkipped}`);
      console.debug(`  Text blocks accepted: ${d.readableTextBlocksAccepted}`);
      console.debug(`  Text blocks rejected: ${d.readableTextBlocksRejected}`);
      console.debug(`  Total text blocks:    ${d.totalTextBlocks}`);
      console.debug(`  Classified blocks:    ${d.classifiedBlocks}`);
      console.debug(`  Fallback blocks:      ${d.fallbackConsumedBlocks}`);
      console.debug(`  Boilerplate blocks:   ${d.boilerplateBlocks}`);
      console.debug(`  Duplicate blocks:     ${d.duplicateBlocks}`);
      console.debug(`  Unresolved blocks:    ${d.preservedUnclassifiedBlocks}`);
      console.debug(`  Accounts detected:    ${d.accountsDetected}`);
      console.debug(`  Rejected candidates:  ${d.rejectedAccountCandidates.length}`);
      console.debug(`  Fragments merged:     ${d.accountFragmentsMerged}`);
      console.debug(`  Inquiries detected:   ${d.inquiriesDetected}`);
      console.debug(`  Scores detected:      ${d.scoresDetected}`);
      console.debug(`  Final confidence:     ${d.finalConfidence}%`);
      console.debug(`  Fallback parser used: ${d.fallbackUsed}`);
      console.debug('  Section confidence:', d.sectionConfidence);
      console.debug('  Section statuses:', d.sectionStatuses);
      if (d.stageFailures.length > 0) {
        console.debug('  Stage failures:');
        d.stageFailures.forEach(f => {
          console.debug(`    [${f.fatal ? 'FATAL' : 'WARN'}] ${f.stage}: ${f.message}`);
        });
      }
      if (d.exclusionReasons.length > 0) {
        console.debug('  Excluded block reasons:');
        d.exclusionReasons.forEach((e, i) => {
          console.debug(`    [${i + 1}] Reason: ${e.reason}`);
          console.debug(`         Block: ${e.block.slice(0, 80).replace(/\n/g, ' ')}…`);
        });
      }
      if (d.rejectedAccountCandidates.length > 0) {
        console.debug('  Rejected account candidates:');
        d.rejectedAccountCandidates.forEach((candidate, i) => {
          console.debug(`    [${i + 1}] ${candidate.reason}`);
          console.debug(`         Candidate: ${candidate.block.slice(0, 80).replace(/\n/g, ' ')}…`);
        });
      }
      console.debug('[CreditReportParser] ────────────────────────────────────');
    }
  } catch {
    // logging must never crash the parser
  }
}

// ─── Safe text normalization ──────────────────────────────────────────────────
export function safeNormalizeText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  try {
    // Step 1: Replace lone surrogates (invalid UTF-16) before any other processing
    // This prevents "Invalid Unicode character sequence" errors in regex engines
    let safe = raw.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');

    // HTML exports must become text before section and row detection. Keeping
    // tags lets table markup masquerade as creditor or inquiry data.
    const isHtmlExport = /<(?:!doctype|html|head|body|table|thead|tbody|tr|td|th|div|span|p|br|script|style)\b/i.test(safe);
    if (isHtmlExport) {
      safe = safe
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(?:script|style|noscript|template)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|template)>/gi, ' ')
        .replace(/[\r\n]+/g, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/dt\s*>/gi, '\t')
        .replace(/<\/dd\s*>/gi, '\n')
        .replace(/<\/(?:td|th)\s*>/gi, '\t')
        .replace(/<\/(?:p|div|li|tr|section|article|header|footer|h[1-6]|dl)\s*>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(Number(value)))
        .replace(/&#x([0-9a-f]+);/gi, (_, value: string) => String.fromCodePoint(parseInt(value, 16)))
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'");
      safe = safe.replace(/ *\t */g, '\t').split('\n').map(line => line.trim()).filter(Boolean).join('\n');
    }

    // Step 2: Apply NFKC normalization (compatibility decomposition + canonical composition)
    // This resolves ligatures, fullwidth chars, superscripts, etc. from PDF extraction
    try {
      safe = safe.normalize('NFKC');
    } catch {
      // normalize() not available in all environments — skip gracefully
    }

    // Step 3: Replace replacement characters and null bytes
    safe = safe.replace(/\uFFFD/g, ' ');
    safe = safe.replace(/\u0000/g, '');

    // Step 4: Replace nonbreaking spaces and other whitespace variants with regular space
    safe = safe.replace(/[\u00A0\u00AD\u200B\u200C\u200D\u2060\uFEFF]/g, ' ');

    // Step 5: Replace smart/curly quotes with straight quotes
    safe = safe.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
    safe = safe.replace(/[\u201C\u201D\u201E\u201F]/g, '"');

    // Step 6: Replace em/en dashes with regular hyphen
    safe = safe.replace(/[\u2013\u2014\u2015]/g, '-');

    // Step 7: Replace odd bullet characters with a plain hyphen
    safe = safe.replace(/[\u2022\u2023\u2024\u2025\u2026\u2027\u25AA\u25AB\u25B6\u25CF\u2219\u22C5]/g, '-');

    // Step 8: Replace invisible control characters (C0 except tab/LF/CR, and C1 block)
    safe = safe.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F\u0080-\u009F]/g, ' ');

    // Step 9: Normalize line endings — preserve meaningful line breaks
    safe = safe.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Step 10: Collapse excessive blank lines (4+ → 2) but keep double newlines for block detection
    safe = safe.replace(/\n{4,}/g, '\n\n\n');

    // Step 11: Collapse runs of spaces/tabs within a line (but not newlines)
    safe = safe.replace(/ {3,}/g, '  ');

    return safe;
  } catch {
    // Last resort: strip anything outside printable ASCII + newlines
    try {
      return (raw ?? '').replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ');
    } catch {
      return '';
    }
  }
}

export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  raw: string;
}

export interface ParsedPersonalInfo {
  name: string;
  nameVariations: string[];
  ssn: string;
  dob: string;
  currentAddress: ParsedAddress | null;
  previousAddresses: ParsedAddress[];
  employers: string[];
  phones: string[];
}

export interface ParsedScore {
  bureau: string;
  score: number;
  model: string;
  date: string;
}

export interface ParsedAccount {
  id: string;
  canonicalKey?: string;
  tradelines?: ParsedAccount[];
  originalCreditor?: string;
  creditorName: string;
  furnisherName: string;
  accountNumber: string;
  accountNumberMasked: string;
  accountType: string;
  responsibility: string;
  status: string;
  balance: number | null;
  originalBalance: number | null;
  collectionAmount: number | null;
  chargeOffAmount: number | null;
  highBalance: number | null;
  creditLimit: number | null;
  pastDue: number | null;
  dateOpened: string;
  dateOpenedField?: 'date_opened';
  dateClosed: string;
  dateReported: string;
  dateLastActivity: string;
  lastActivityField?: 'date_of_last_activity';
  collectionActivityDate?: string;
  collectionActivityField?: 'collection_account_activity';
  bureaus: string[];
  bureau: string;
  paymentHistory: string;
  remarks: string[];
  isNegative: boolean;
  negativeReason: string;
  disputeStatus: string;
  isCollection: boolean;
  isChargeOff: boolean;
  isLate: boolean;
  latePayments: { days: number; count: number }[];
  rawText: string;
  parserConfidence: number;
}

export interface ParsedInquiry {
  creditor: string;
  date: string;
  bureau: string;
  type: 'hard' | 'soft';
  purpose: string;
  rawText?: string;
}

export interface ParsedPublicRecord {
  type: string;
  court: string;
  amount: number | null;
  dateFiled: string;
  dateResolved: string;
  bureau: string;
  status: string;
  remarks: string;
}

export interface BureauDifference {
  field: string;
  equifax: string;
  experian: string;
  transunion: string;
}

export interface ParserWarning {
  section: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SectionConfidence {
  providerDetection: number;
  personalInfo: number;
  accounts: number;
  negativeClassification: number;
  inquiries: number;
  publicRecords: number;
  overall: number;
}

export type ReportSectionStatus =
  | 'parsed_with_results'
  | 'parsed_none_reported'
  | 'section_not_found'
  | 'section_unreadable'
  | 'parser_failed';

export type ReportSectionStatuses = Record<
  'creditScores' | 'inquiries' | 'collections' | 'publicRecords' | 'chargeOffs' | 'accounts',
  ReportSectionStatus
>;

export interface ParsedCreditReport {
  provider: SupportedProvider;
  providerConfidence: number;
  parserVersion: string;
  parsedAt: string;
  reportDate: string;
  rawText: string;
  personalInfo: ParsedPersonalInfo;
  scores: ParsedScore[];
  accounts: ParsedAccount[];
  negativeAccounts: ParsedAccount[];
  positiveAccounts: ParsedAccount[];
  collections: ParsedAccount[];
  chargeOffs: ParsedAccount[];
  latePayments: ParsedAccount[];
  closedAccounts: ParsedAccount[];
  openAccounts: ParsedAccount[];
  inquiries: ParsedInquiry[];
  publicRecords: ParsedPublicRecord[];
  bankruptcies: ParsedPublicRecord[];
  bureauDifferences: BureauDifference[];
  warnings: ParserWarning[];
  sectionsParsed: string[];
  sectionsMissed: string[];
  sectionsNotFound: string[];
  overallConfidence: number;
  sectionConfidence: SectionConfidence;
  sectionStatuses: ReportSectionStatuses;
  negativeClassificationRan: boolean;
  unparsedBlocks: string[];
  diagnostics?: ParserDiagnostics;
  bureauTradelines?: ParsedAccount[];
  canonicalAccounts?: ParsedAccount[];
  blockDispositions?: ParseBlockDisposition[];
}

// ─── Comprehensive negative detection keywords ────────────────────────────────

const NEGATIVE_KEYWORDS = [
  'collection',
  'collections',
  'collection account',
  'collection agency',
  'debt buyer',
  'medical collection',
  'placed for collection',
  'assigned to collection',
  'transferred to collection',
  'paid collection',
  'unpaid collection',
  'charge-off',
  'charge off',
  'chargeoff',
  'charged off',
  'profit and loss',
  'profit and loss writeoff',
  'written off',
  'writeoff',
  'write-off',
  'derogatory',
  'potentially negative',
  'adverse',
  'late',
  '30 days late',
  '60 days late',
  '90 days late',
  '120 days late',
  'past due',
  'delinquent',
  'seriously past due',
  'seriously delinquent',
  'foreclosure',
  'repossession',
  'voluntary surrender',
  'involuntary repossession',
  'bankruptcy',
  'included in bankruptcy',
  'settled',
  'settled for less',
  'legally paid in full for less than full balance',
  'paid collection',
  'transferred/sold',
  'purchased by another lender',
  'account closed by credit grantor',
  'closed by credit grantor',
  'closed by grantor',
  'unpaid',
  'bad debt',
  'default',
  'deed in lieu',
  'short sale',
  'consumer disputes',
  'in dispute',
  'account in dispute',
];

const NEGATIVE_PAYMENT_CODES = ['30', '60', '90', '120', 'co', 'col', 'rf', 'r', 'f', '2', '3', '4', '5', '6', '7', '8', '9'];

const COLLECTION_NAME_HINTS = [
  'collection',
  'collections',
  'debt recovery',
  'debt buyer',
  'credit coll',
  'credit collection',
  'credence',
  'national recovery',
  'national credit system',
  'natlcrsys',
  'synergetic',
  'syncom',
  'southwest credit',
  'sw crdt',
  'portfolio recovery',
  'portfolio recov',
  'jefferson capital',
  'columbia debt',
  'cdr genesis',
  '1st crd srvc',
  '1st credit service',
  'indebted',
];

export function isNegativeAccount(account: Partial<ParsedAccount>): boolean {
  try {
    const allText = [
      account.status ?? '',
      account.accountType ?? '',
      ...(account.remarks ?? []),
      account.paymentHistory ?? '',
      account.negativeReason ?? '',
      account.rawText ?? '',
    ].join(' ').toLowerCase();

    if (NEGATIVE_KEYWORDS.some(kw => allText.includes(kw))) return true;
    if (/\brepo(?:ssession|ssessed)?\b/i.test(allText)) return true;
    if ((account.pastDue ?? 0) > 0) return true;
    if ((account.latePayments ?? []).length > 0) return true;

    const ph = (account.paymentHistory ?? '').toLowerCase();
    if (NEGATIVE_PAYMENT_CODES.some(code => {
      const regex = new RegExp(`\\b${code}\\b`, 'i');
      return regex.test(ph);
    })) return true;

    return false;
  } catch {
    return false;
  }
}

export function detectNegativeReason(account: Partial<ParsedAccount>): string {
  try {
    const allText = [
      account.status ?? '',
      account.accountType ?? '',
      ...(account.remarks ?? []),
      account.rawText ?? '',
    ].join(' ').toLowerCase();

    if (allText.includes('collection')) return 'Collection account';
    if (allText.includes('charge-off') || allText.includes('chargeoff') || allText.includes('charged off') || allText.includes('charge off')) return 'Charge-off';
    if (allText.includes('120 days')) return '120 days late';
    if (allText.includes('90 days')) return '90 days late';
    if (allText.includes('60 days')) return '60 days late';
    if (allText.includes('30 days')) return '30 days late';
    if (allText.includes('late')) return 'Late payment';
    if (/\brepo(?:ssession|ssessed)?\b/i.test(allText)) return 'Repossession';
    if (allText.includes('foreclosure')) return 'Foreclosure';
    if (allText.includes('bankruptcy')) return 'Included in bankruptcy';
    if (allText.includes('settled for less') || allText.includes('legally paid in full for less')) return 'Settled for less than full balance';
    if (allText.includes('settled')) return 'Settled';
    if (allText.includes('past due') || (account.pastDue ?? 0) > 0) return 'Past due balance';
    if (allText.includes('derogatory')) return 'Derogatory status';
    if (allText.includes('potentially negative')) return 'Potentially negative';
    if (allText.includes('closed by credit grantor') || allText.includes('closed by grantor')) return 'Closed by credit grantor';
    if (allText.includes('profit and loss') || allText.includes('written off')) return 'Written off';
    if (allText.includes('dispute')) return 'Account in dispute';
    if ((account.latePayments ?? []).length > 0) return 'Late payment history';
    return 'Negative account';
  } catch {
    return 'Negative account';
  }
}

export function isCollectionAccount(account: Partial<ParsedAccount>): boolean {
  try {
    const allText = [
      account.accountType ?? '',
      account.status ?? '',
      account.creditorName ?? '',
      account.furnisherName ?? '',
      account.originalCreditor ?? '',
      ...(account.remarks ?? []),
      account.rawText ?? '',
    ].join(' ').toLowerCase();

    return (
      allText.includes('collection') ||
      allText.includes('debt buyer') ||
      allText.includes('placed for collection') ||
      allText.includes('medical collection') ||
      allText.includes('placed for collection') ||
      allText.includes('assigned to collection') ||
      allText.includes('transferred to collection') ||
      allText.includes('collection account') ||
      allText.includes('collection agency') ||
      COLLECTION_NAME_HINTS.some(hint => allText.includes(hint))
    );
  } catch {
    return false;
  }
}

function hasConfirmedCollectionEvidence(account: Partial<ParsedAccount>): boolean {
  const explicitFields = [
    account.accountType ?? '',
    account.status ?? '',
    ...(account.remarks ?? []),
  ].join(' ').toLowerCase();
  return /\b(?:collection account|placed for collection|assigned to collection|transferred to collection|medical collection|debt buyer)\b/.test(explicitFields)
    || /^(?:collection|collections)$/i.test(String(account.accountType ?? '').trim())
    || /^(?:collection|collections)$/i.test(String(account.status ?? '').trim());
}

function hasAccountSpecificNegativeEvidence(account: Partial<ParsedAccount>): boolean {
  const explicitFields = [
    account.accountType ?? '',
    account.status ?? '',
    ...(account.remarks ?? []),
    account.paymentHistory ?? '',
  ].join(' ');
  return hasConfirmedCollectionEvidence(account)
    || /charge.?off|charged off|late|delinquent|past due|derogatory|repossession|foreclosure|bankruptcy|settled for less|written off/i.test(explicitFields)
    || (account.pastDue ?? 0) > 0
    || (account.latePayments ?? []).some(item => item.count > 0);
}

// ─── Provider auto-detection ─────────────────────────────────────────────────

export function detectProvider(text: string): { provider: SupportedProvider; confidence: number } {
  try {
    const lower = text.toLowerCase();
    // OCR/PDF extraction often inserts extra spaces inside words (e.g. "S m a r t C r e d i t")
    // Collapse all whitespace runs to a single space for pattern matching
    const collapsed = lower.replace(/\s+/g, ' ');
    // Also create a version with all spaces removed for tight OCR matches
    const noSpace = lower.replace(/\s+/g, '');

    let scores: Record<SupportedProvider, number> = {
      smartcredit: 0,
      myscoreiq: 0,
      identityiq: 0,
      myfreescorenow: 0,
      privacyguard: 0,
      experian: 0,
      transunion: 0,
      equifax: 0,
      annualcreditreport: 0,
      creditkarma: 0,
      unknown: 0,
    };

    // ── SmartCredit ──────────────────────────────────────────────────────────
    if (collapsed.includes('smartcredit')) scores.smartcredit += 50;
    if (collapsed.includes('smart credit')) scores.smartcredit += 40;
    if (collapsed.includes('smartcredit.com')) scores.smartcredit += 30;
    if (noSpace.includes('smartcredit')) scores.smartcredit += 20;
    if (collapsed.includes('pid=35662') || /pid=\d+/.test(collapsed)) scores.smartcredit += 20;
    if (collapsed.includes('score tracker') && collapsed.includes('3 bureau')) scores.smartcredit += 15;
    // OCR artifact: "s m a r t c r e d i t" or "smart c r e d i t"
    if (/s\s*m\s*a\s*r\s*t\s*c\s*r\s*e\s*d\s*i\s*t/.test(lower)) scores.smartcredit += 35;

    // ── MyScoreIQ ────────────────────────────────────────────────────────────
    if (collapsed.includes('myscoreiq')) scores.myscoreiq += 50;
    if (collapsed.includes('my score iq')) scores.myscoreiq += 40;
    if (collapsed.includes('myscoreiq.com')) scores.myscoreiq += 30;
    if (noSpace.includes('myscoreiq')) scores.myscoreiq += 20;
    if (collapsed.includes('fico max')) scores.myscoreiq += 25;
    if (collapsed.includes('offercode=432143rb')) scores.myscoreiq += 20;
    if (collapsed.includes('scoreiq')) scores.myscoreiq += 20;
    if (collapsed.includes('score iq')) scores.myscoreiq += 15;
    if (collapsed.includes('3b report') || collapsed.includes('3-bureau report')) scores.myscoreiq += 10;
    if (collapsed.includes('fico® score') && collapsed.includes('equifax') && collapsed.includes('experian') && collapsed.includes('transunion')) scores.myscoreiq += 15;
    if (collapsed.includes('fico') && collapsed.includes('equifax') && collapsed.includes('experian') && collapsed.includes('transunion')) scores.myscoreiq += 10;
    // OCR artifact
    if (/m\s*y\s*s\s*c\s*o\s*r\s*e\s*i\s*q/.test(lower)) scores.myscoreiq += 35;
    // IDIQ is the parent company of MyScoreIQ — boost myscoreiq when IDIQ is detected
    if (collapsed.includes('idiq')) scores.myscoreiq += 40;
    if (collapsed.includes('id iq')) scores.myscoreiq += 30;
    if (noSpace.includes('idiq')) scores.myscoreiq += 20;
    if (/i\s*d\s*i\s*q/.test(lower)) scores.myscoreiq += 25;
    // Three Bureau Credit Report is a common MyScoreIQ/IDIQ report title
    if (collapsed.includes('three bureau credit report') || collapsed.includes('3 bureau credit report')) scores.myscoreiq += 20;
    if (collapsed.includes('tri-merge') || collapsed.includes('tri merge')) scores.myscoreiq += 10;

    // ── IdentityIQ ───────────────────────────────────────────────────────────
    if (collapsed.includes('identityiq')) scores.identityiq += 50;
    if (collapsed.includes('identity iq')) scores.identityiq += 40;
    if (collapsed.includes('identityiq.com')) scores.identityiq += 30;
    if (noSpace.includes('identityiq')) scores.identityiq += 20;
    if (collapsed.includes('identity theft protection') && collapsed.includes('credit monitoring')) scores.identityiq += 15;
    if (/i\s*d\s*e\s*n\s*t\s*i\s*t\s*y\s*i\s*q/.test(lower)) scores.identityiq += 35;

    // ── MyFreeScoreNow ───────────────────────────────────────────────────────
    if (collapsed.includes('myfreescorenow')) scores.myfreescorenow += 50;
    if (collapsed.includes('my free score now')) scores.myfreescorenow += 40;
    if (collapsed.includes('myfreescorenow.com')) scores.myfreescorenow += 30;
    if (noSpace.includes('myfreescorenow')) scores.myfreescorenow += 20;

    // ── PrivacyGuard ─────────────────────────────────────────────────────────
    if (collapsed.includes('privacyguard')) scores.privacyguard += 50;
    if (collapsed.includes('privacy guard')) scores.privacyguard += 40;
    if (collapsed.includes('privacyguard.com')) scores.privacyguard += 30;
    if (noSpace.includes('privacyguard')) scores.privacyguard += 20;
    if (/p\s*r\s*i\s*v\s*a\s*c\s*y\s*g\s*u\s*a\s*r\s*d/.test(lower)) scores.privacyguard += 35;

    // ── AnnualCreditReport ───────────────────────────────────────────────────
    if (collapsed.includes('annualcreditreport')) scores.annualcreditreport += 50;
    if (collapsed.includes('annual credit report')) scores.annualcreditreport += 40;
    if (collapsed.includes('annualcreditreport.com')) scores.annualcreditreport += 30;
    if (collapsed.includes('free annual credit report')) scores.annualcreditreport += 25;
    if (collapsed.includes('fair credit reporting act') && collapsed.includes('annual')) scores.annualcreditreport += 15;

    // ── Credit Karma ─────────────────────────────────────────────────────────
    if (collapsed.includes('credit karma')) scores.creditkarma += 50;
    if (collapsed.includes('creditkarma.com')) scores.creditkarma += 30;
    if (collapsed.includes('vantagescore 3.0') && collapsed.includes('transunion')) scores.creditkarma += 20;

    // ── Experian ─────────────────────────────────────────────────────────────
    if (collapsed.includes('experian') && (collapsed.includes('credit report') || collapsed.includes('your report') || collapsed.includes('experian.com'))) scores.experian += 40;
    if (collapsed.includes('experian') && collapsed.includes('fico')) scores.experian += 20;
    if (collapsed.includes('experian boost')) scores.experian += 25;
    if (collapsed.includes('experian creditworks')) scores.experian += 30;
    if (collapsed.includes('experian') && collapsed.includes('score model')) scores.experian += 15;
    // Experian-only report (only one bureau mentioned prominently)
    if (collapsed.includes('experian') && !collapsed.includes('transunion') && !collapsed.includes('equifax')) scores.experian += 20;

    // ── TransUnion ───────────────────────────────────────────────────────────
    if (collapsed.includes('transunion') && (collapsed.includes('credit report') || collapsed.includes('transunion.com'))) scores.transunion += 40;
    if (collapsed.includes('transunion') && collapsed.includes('fico')) scores.transunion += 20;
    if (collapsed.includes('transunion credit monitoring')) scores.transunion += 25;
    if (collapsed.includes('transunion') && !collapsed.includes('experian') && !collapsed.includes('equifax')) scores.transunion += 20;

    // ── Equifax ──────────────────────────────────────────────────────────────
    if (collapsed.includes('equifax') && (collapsed.includes('credit report') || collapsed.includes('equifax.com'))) scores.equifax += 40;
    if (collapsed.includes('equifax') && collapsed.includes('fico')) scores.equifax += 20;
    if (collapsed.includes('equifax complete') || collapsed.includes('equifax one score')) scores.equifax += 25;
    if (collapsed.includes('equifax') && !collapsed.includes('experian') && !collapsed.includes('transunion')) scores.equifax += 20;

    // ── Multi-bureau tri-merge fallback ──────────────────────────────────────
    const hasTri = collapsed.includes('equifax') && collapsed.includes('experian') && collapsed.includes('transunion');
    if (hasTri) {
      scores.annualcreditreport += 10;
      scores.smartcredit += 5;
      scores.identityiq += 5;
      scores.myscoreiq += 5;
    }

    // ── Generic credit report fallback signals ───────────────────────────────
    // If nothing else matched but text looks like a credit report, boost annualcreditreport
    const looksLikeCreditReport =
      (collapsed.includes('credit report') || collapsed.includes('credit file')) &&
      (collapsed.includes('account') || collapsed.includes('balance') || collapsed.includes('inquiry'));
    if (looksLikeCreditReport && Object.values(scores).every(s => s === 0)) {
      scores.annualcreditreport += 15;
    }

    let best: SupportedProvider = 'unknown';
    let bestScore = 0;
    for (const [provider, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        best = provider as SupportedProvider;
      }
    }

    if (bestScore === 0) return { provider: 'unknown', confidence: 0 };

    const confidence = Math.min(98, Math.round((bestScore / 50) * 70) + 10);
    return { provider: best, confidence };
  } catch {
    return { provider: 'unknown', confidence: 0 };
  }
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function parseAmount(str: string): number | null {
  if (!str) return null;
  try {
    const cleaned = str.replace(/[$,\s]/g, '').replace(/[()]/g, '-');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

function maskAccountNumber(num: string): string {
  if (!num) return '';
  try {
    const clean = num.replace(/\D/g, '');
    if (clean.length <= 4) return `****${clean}`;
    return `****${clean.slice(-4)}`;
  } catch {
    return '****';
  }
}

function extractDate(str: string): string {
  if (!str) return '';
  try {
    const isoMatch = str.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) return isoMatch[0];
    const usMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (usMatch) return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
    const monthDayYearMatch = str.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i);
    if (monthDayYearMatch) {
      const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
      return `${monthDayYearMatch[3]}-${months[monthDayYearMatch[1].toLowerCase().slice(0, 3)] ?? '01'}-${monthDayYearMatch[2].padStart(2, '0')}`;
    }
    const monthMatch = str.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})/i);
    if (monthMatch) {
      const months: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
      return `${monthMatch[2]}-${months[monthMatch[1].toLowerCase().slice(0, 3)] ?? '01'}-01`;
    }
    return str.trim();
  } catch {
    return '';
  }
}

function extractBureau(text: string): string {
  try {
    const lower = text.toLowerCase();
    if (lower.includes('equifax') || /\beq\b/.test(lower)) return 'Equifax';
    if (lower.includes('experian') || /\bex\b/.test(lower)) return 'Experian';
    if (lower.includes('transunion') || /\btu\b/.test(lower)) return 'TransUnion';
    return 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function extractBureaus(text: string): string[] {
  try {
    const bureaus: string[] = [];
    if (/equifax/i.test(text)) bureaus.push('Equifax');
    if (/experian/i.test(text)) bureaus.push('Experian');
    if (/transunion/i.test(text)) bureaus.push('TransUnion');
    return bureaus.length > 0 ? bureaus : ['Unknown'];
  } catch {
    return ['Unknown'];
  }
}

// ─── Section extractors ───────────────────────────────────────────────────────

function extractPersonalInfo(text: string): { info: ParsedPersonalInfo; confidence: number } {
  const info: ParsedPersonalInfo = {
    name: '',
    nameVariations: [],
    ssn: '',
    dob: '',
    currentAddress: null,
    previousAddresses: [],
    employers: [],
    phones: [],
  };

  try {
    let fieldsFound = 0;

    const namePatterns = [
      /(?:name|consumer name|full name|applicant)[:\s]+([A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+(?:\s[A-Z][a-zA-Z'-]+)?)/i,
      /^([A-Z][A-Z'-]+,\s*[A-Z][A-Z'-]+(?:\s[A-Z][A-Z'-]+)?)\s*$/m,
      /(?:prepared for|report for)[:\s]+([A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+)/i,
    ];
    for (const p of namePatterns) {
      const m = text.match(p);
      if (m) { info.name = m[1].trim(); fieldsFound++; break; }
    }

    const varSection = text.match(/(?:also known as|name variations?|other names?|aliases?)[:\s]+([\s\S]{0,400}?)(?:\n\n|\r\n\r\n|address|employer|date of birth)/i);
    if (varSection) {
      const vars = varSection[1].match(/[A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+(?:\s[A-Z][a-zA-Z'-]+)?/g);
      if (vars) { info.nameVariations = [...new Set(vars)]; fieldsFound++; }
    }

    const ssnMatch = text.match(/(?:ssn|social security|social security number)[:\s#]*([X*\d]{3}[-\s]?[X*\d]{2}[-\s]?\d{4})/i);
    if (ssnMatch) { info.ssn = ssnMatch[1]; fieldsFound++; }

    const dobMatch = text.match(/(?:date of birth|dob|born|birth date)[:\s]+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|[A-Z][a-z]+ \d{1,2},?\s+\d{4})/i);
    if (dobMatch) { info.dob = extractDate(dobMatch[1]); fieldsFound++; }

    const addrPatterns = [
      /(?:current address|present address|address)[:\s]+([^\n]+(?:\n[^\n]+)?)/i,
      /(?:reported address)[:\s]+([^\n]+)/i,
    ];
    for (const p of addrPatterns) {
      const m = text.match(p);
      if (m) {
        const raw = m[1].trim();
        const parts = raw.split(/,\s*/);
        info.currentAddress = {
          street: parts[0] ?? '',
          city: parts[1] ?? '',
          state: parts[2]?.split(/\s+/)[0] ?? '',
          zip: parts[2]?.match(/\d{5}/)?.[0] ?? '',
          raw,
        };
        fieldsFound++;
        break;
      }
    }

    const prevSection = text.match(/(?:previous addresses?|former addresses?|prior addresses?)[:\s]+([\s\S]{0,600}?)(?:\n\n|employer|phone|credit score|inquir)/i);
    if (prevSection) {
      const lines = prevSection[1].split('\n').filter(l => l.trim().length > 5);
      for (const line of lines.slice(0, 5)) {
        const parts = line.split(/,\s*/);
        info.previousAddresses.push({
          street: parts[0]?.trim() ?? '',
          city: parts[1]?.trim() ?? '',
          state: parts[2]?.split(/\s+/)[0]?.trim() ?? '',
          zip: parts[2]?.match(/\d{5}/)?.[0] ?? '',
          raw: line.trim(),
        });
      }
      if (info.previousAddresses.length > 0) fieldsFound++;
    }

    const empSection = text.match(/(?:employer|employment|place of employment)[:\s]+([\s\S]{0,400}?)(?:\n\n|address|phone|credit score|inquir)/i);
    if (empSection) {
      const emps = empSection[1].split('\n').filter(l => l.trim().length > 2).slice(0, 5);
      info.employers = emps.map(e => e.trim()).filter(Boolean);
      if (info.employers.length > 0) fieldsFound++;
    }

    const phones = text.match(/(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g);
    if (phones) { info.phones = [...new Set(phones)].slice(0, 5); fieldsFound++; }

    const confidence = Math.min(100, Math.round((fieldsFound / 5) * 100));
    return { info, confidence };
  } catch {
    return { info, confidence: 0 };
  }
}

function extractScores(text: string): { scores: ParsedScore[]; confidence: number } {
  let scores: ParsedScore[] = [];
  try {
    const triBureauScore = text.match(/transunion\s+experian\s+equifax\s*\n\s*(?:fico\s*®?\s*score\s*\d*|credit\s+score)\s*:\s*(\d{3})\s+(\d{3})\s+(\d{3})/i);
    if (triBureauScore) {
      scores = TRI_BUREAU_ORDER.map((bureau, index) => ({
        bureau,
        score: Number(triBureauScore[index + 1]),
        model: /fico/i.test(triBureauScore[0]) ? 'FICO' : 'Credit Score',
        date: '',
      })).filter(item => item.score >= 300 && item.score <= 850);
    }

    // Expanded score patterns for MyScoreIQ tri-bureau layout
    const scorePatterns = [
      { pattern: /(?:equifax|eq)[^\n]*?(?:score|fico|vantage)[^\n]*?(\d{3})/gi, bureau: 'Equifax' },
      { pattern: /(?:experian|ex)[^\n]*?(?:score|fico|vantage)[^\n]*?(\d{3})/gi, bureau: 'Experian' },
      { pattern: /(?:transunion|tu)[^\n]*?(?:score|fico|vantage)[^\n]*?(\d{3})/gi, bureau: 'TransUnion' },
      { pattern: /(?:score|fico|vantage)[^\n]*?(\d{3})[^\n]*?(?:equifax|eq)/gi, bureau: 'Equifax' },
      { pattern: /(?:score|fico|vantage)[^\n]*?(\d{3})[^\n]*?(?:experian|ex)/gi, bureau: 'Experian' },
      { pattern: /(?:score|fico|vantage)[^\n]*?(\d{3})[^\n]*?(?:transunion|tu)/gi, bureau: 'TransUnion' },
      { pattern: /creditxpert[^\n]*?(\d{3})/gi, bureau: 'CreditXpert' },
      // MyScoreIQ often shows scores as standalone 3-digit numbers near bureau names
      { pattern: /equifax[^\n]{0,30}(\d{3})/gi, bureau: 'Equifax' },
      { pattern: /experian[^\n]{0,30}(\d{3})/gi, bureau: 'Experian' },
      { pattern: /transunion[^\n]{0,30}(\d{3})/gi, bureau: 'TransUnion' },
      { pattern: /(\d{3})[^\n]{0,30}equifax/gi, bureau: 'Equifax' },
      { pattern: /(\d{3})[^\n]{0,30}experian/gi, bureau: 'Experian' },
      { pattern: /(\d{3})[^\n]{0,30}transunion/gi, bureau: 'TransUnion' },
    ];

    const seen = new Set(scores.map(score => score.bureau));
    for (const { pattern, bureau } of scorePatterns) {
      try {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          const score = parseInt(match[1]);
          if (score >= 300 && score <= 850 && !seen.has(bureau)) {
            seen.add(bureau);
            const context = match[0].toLowerCase();
            const model = context.includes('vantage') ? 'VantageScore' : 'FICO';
            scores.push({ bureau, score, model, date: '' });
          }
        }
      } catch {
        // skip this pattern on error
      }
    }
  } catch {
    // return empty scores
  }
  return { scores, confidence: scores.length > 0 ? 90 : 0 };
}

// ─── Validation gate helpers ──────────────────────────────────────────────────

export function isReadableText(str: string): boolean {
  if (!str || str.trim().length === 0) return false;
  const trimmed = str.trim();
  if (trimmed.length < 2) return false;
  const readable = (trimmed.match(/[A-Za-z0-9\s\-.,&'()\/]/g) ?? []).length;
  const ratio = readable / trimmed.length;
  if (ratio < 0.6) return false;
  const letters = (trimmed.match(/[A-Za-z]/g) ?? []).length;
  if (letters < 2) return false;
  return true;
}

/**
 * Returns true if the text block looks like it could contain real credit report content.
 * This gate is intentionally permissive — it only rejects clear PDF binary/stream objects.
 * Credit reports legitimately contain $, /, :, *, %, #, @, !, ?, +, =, _ characters.
 *
 * NOTE: This function is called on ASSEMBLED account blocks (multi-line), not individual lines.
 * Individual lines are assembled first by reassembleAccountBlocks() before validation.
 */
export function isValidCreditBlock(block: string): boolean {
  if (!block || block.trim().length < 10) {
    console.debug('[ValidCreditBlock] REJECT — too short or empty:', JSON.stringify((block ?? '').slice(0, 80)));
    return false;
  }
  const trimmed = block.trim();

  // Reject PDF object stream markers
  if (/^\/(?:Image|XObject|Font|Resources|ColorSpace|ExtGState|Pattern|Shading|Properties)\b/i.test(trimmed)) {
    console.debug('[ValidCreditBlock] REJECT — PDF object stream marker:', trimmed.slice(0, 80));
    return false;
  }
  if (/\bstream\b[\s\S]{0,20}\bendstream\b/i.test(trimmed)) {
    console.debug('[ValidCreditBlock] REJECT — stream/endstream marker:', trimmed.slice(0, 80));
    return false;
  }
  if (/^\d+\s+\d+\s+obj\b/m.test(trimmed)) {
    console.debug('[ValidCreditBlock] REJECT — PDF obj marker:', trimmed.slice(0, 80));
    return false;
  }
  if (/endobj\b/i.test(trimmed)) {
    console.debug('[ValidCreditBlock] REJECT — endobj marker:', trimmed.slice(0, 80));
    return false;
  }

  // Reject blocks that are mostly non-printable
  const printable = (trimmed.match(/[\x20-\x7E]/g) ?? []).length;
  const printableRatio = printable / trimmed.length;
  if (printableRatio < 0.4) {
    console.debug(`[ValidCreditBlock] REJECT — low printable ratio ${(printableRatio * 100).toFixed(1)}% (<40%):`, trimmed.slice(0, 80));
    return false;
  }

  // Reject blocks with very high symbol density (binary-looking)
  // Threshold: 0.65 — allows heavy credit report formatting chars ($, /, :, #, *, -)
  const symbols = (trimmed.match(/[^A-Za-z0-9\s\-.,&'()\/:$%#@!?+*=_\n]/g) ?? []).length;
  const symbolRatio = symbols / trimmed.length;
  if (symbolRatio > 0.65) {
    console.debug(`[ValidCreditBlock] REJECT — high symbol density ${(symbolRatio * 100).toFixed(1)}% (>65%), symbol count=${symbols}, block length=${trimmed.length}:`, trimmed.slice(0, 80));
    return false;
  }

  // Reject blocks that look like font encoding maps
  if (/\/uni[0-9A-F]{4}/i.test(trimmed) || /\/glyph\d+/i.test(trimmed)) {
    console.debug('[ValidCreditBlock] REJECT — font encoding map (uni/glyph):', trimmed.slice(0, 80));
    return false;
  }

  // Reject blocks that are pure hex strings (no letters at all)
  if (/^[0-9A-Fa-f\s]{20,}$/.test(trimmed) && !/[G-Zg-z]/.test(trimmed)) {
    console.debug('[ValidCreditBlock] REJECT — pure hex string:', trimmed.slice(0, 80));
    return false;
  }

  // Must contain at least one word with 2+ letters
  if (!/[A-Za-z]{2,}/.test(trimmed)) {
    console.debug('[ValidCreditBlock] REJECT — no word with 2+ letters:', trimmed.slice(0, 80));
    return false;
  }

  console.debug(`[ValidCreditBlock] PASS — printable=${(printableRatio * 100).toFixed(1)}%, symbols=${(symbolRatio * 100).toFixed(1)}%, len=${trimmed.length}:`, trimmed.slice(0, 60).replace(/\n/g, '↵'));
  return true;
}

export function isValidAccount(account: Partial<ParsedAccount>): boolean {
  const creditor = account.creditorName ?? '';
  const blockPreview = (account.rawText ?? creditor).slice(0, 100).replace(/\n/g, '↵');

  console.debug('[ValidAccount] Checking account block:', blockPreview);

  if (!isReadableText(creditor)) {
    console.debug('[ValidAccount] REJECT — creditor name not readable:', JSON.stringify(creditor));
    return false;
  }
  if (creditor === 'Unknown Creditor') {
    console.debug('[ValidAccount] REJECT — creditor is "Unknown Creditor"');
    return false;
  }
  if (/^\/[A-Z]/i.test(creditor)) {
    console.debug('[ValidAccount] REJECT — creditor starts with PDF path marker:', creditor);
    return false;
  }
  if (/\bImage\b|\bXObject\b|\bFont\b|\bstream\b/i.test(creditor)) {
    console.debug('[ValidAccount] REJECT — creditor contains PDF stream keyword:', creditor);
    return false;
  }
  if (!isPlausibleCreditorName(creditor)) {
    console.debug('[ValidAccount] REJECT — creditor looks like an account value, not a creditor:', creditor);
    return false;
  }

  const hasBalance = account.balance !== null && account.balance !== undefined;
  const hasAccountNumber = !!(account.accountNumber && account.accountNumber.trim().length > 0);
  const hasStatus = !!(account.status && account.status.trim().length > 2 && isReadableText(account.status));
  const hasDateOpened = !!(account.dateOpened && account.dateOpened.trim().length > 0);
  const hasAccountType = !!(account.accountType && account.accountType !== 'Unknown' && isReadableText(account.accountType));
  const hasPastDue = account.pastDue !== null && account.pastDue !== undefined;
  const hasRemarks = !!(account.remarks && account.remarks.length > 0 && account.remarks.some(r => isReadableText(r)));
  const hasPaymentHistory = !!(account.paymentHistory && account.paymentHistory.trim().length > 0);

  const creditFieldCount = [hasBalance, hasAccountNumber, hasStatus, hasDateOpened, hasAccountType, hasPastDue, hasRemarks, hasPaymentHistory]
    .filter(Boolean).length;

  console.debug(`[ValidAccount] Credit fields for "${creditor}": balance=${hasBalance}, accountNumber=${hasAccountNumber}, status=${hasStatus}, dateOpened=${hasDateOpened}, accountType=${hasAccountType}, pastDue=${hasPastDue}, remarks=${hasRemarks}, paymentHistory=${hasPaymentHistory} → total=${creditFieldCount}`);

  // Single labels and glossary rows are not enough evidence for an account.
  if (creditFieldCount < 2) {
    console.debug(`[ValidAccount] REJECT — "${creditor}" has fewer than 2 credit fields`);
    return false;
  }

  if (account.rawText && !isValidCreditBlock(account.rawText)) {
    console.debug(`[ValidAccount] REJECT — "${creditor}" rawText failed isValidCreditBlock`);
    return false;
  }

  console.debug(`[ValidAccount] PASS — "${creditor}" with ${creditFieldCount} credit field(s)`);
  return true;
}

// ─── Account block reassembler ────────────────────────────────────────────────
// MyScoreIQ and many other providers output credit report text where each field
// is on its own line (e.g. "Account Number\n****1234\nBalance\n$500\n...").
// The double-newline block splitter creates 118 tiny single-line blocks that each
// fail validation. This function reassembles those lines into proper account blocks
// by grouping consecutive field-label + value pairs under a creditor name header.

const ACCOUNT_FIELD_LABEL_RE = /^(?:account\s*(?:number|#|no\.?|type|status|name)|balance|current\s*balance|amount\s*owed|original\s*(?:balance|loan\s*amount|amount)|loan\s*amount|collection\s*amount|amount\s*placed\s*for\s*collection|charge[- ]?off\s*amount|charged\s*off\s*amount|high\s*(?:balance|credit)|credit\s*limit|past\s*due|date\s*(?:opened|closed|reported|updated|of\s*last)|collection(?:\s+account)?\s+activity\s+date|last\s*(?:reported|activity|payment)|(?:current|worst)\s+payment\s+status|payment\s*(?:status|history|pattern)|responsibility|account\s*owner|ecoa|kob|industry|creditor\s*(?:name|type)|furnisher|original\s*creditor|collection\s*agency|remarks?|comments?|dispute\s*status|terms?|months?\s*reviewed|subscriber|bureau|opened|type|open\s*date|close\s*date|charge\s*off|derogatory|status|type\s*of\s*account|pay\s*status|30[- ]days?|60[- ]days?|90[- ]days?|120[- ]days?)/i;

// Labels that indicate a new section (not an account)
const SECTION_HEADER_RE = /^(?:personal\s+information|inquiries|public\s+records?|credit\s+score|summary|table\s+of\s+contents|hard\s+inquiries|soft\s+inquiries|account\s+(?:history|information)|credit\s+history|credit\s+accounts?|tradelines?|open\s+accounts?|closed\s+accounts?|negative\s+accounts?|potentially\s+negative|equifax\s+accounts?|experian\s+accounts?|transunion\s+accounts?)/i;

const FIELD_LABEL_ALIASES: Array<[keyof SemanticFieldMap, RegExp, SemanticBlockType]> = [
  ['accountNumber', /^(?:account\s*(?:number|#|no\.?)|acct\s*(?:number|#|no\.?))$/i, 'account number'],
  ['accountType', /^(?:account\s+type|type|type\s+of\s+account|kob|industry)$/i, 'account type'],
  ['status', /^(?:account\s+status|current\s+payment\s+status|worst\s+payment\s+status|pay\s+status|payment\s+status|status)$/i, 'account status'],
  ['balance', /^(?:balance|current\s+balance|amount\s+owed)$/i, 'balance'],
  ['originalBalance', /^(?:original\s+balance|original\s+loan\s+amount|loan\s+amount|original\s+amount)$/i, 'balance'],
  ['collectionAmount', /^(?:collection\s+amount|amount\s+placed\s+for\s+collection)$/i, 'balance'],
  ['chargeOffAmount', /^(?:charge[- ]?off\s+amount|charged\s+off\s+amount)$/i, 'balance'],
  ['highBalance', /^(?:high\s+balance|highest\s+balance|high\s+credit)$/i, 'balance'],
  ['creditLimit', /^(?:credit\s+limit|limit|credit\s+line)$/i, 'credit limit'],
  ['pastDue', /^(?:past\s+due|amount\s+past\s+due|past-due)$/i, 'delinquency'],
  ['dateOpened', /^(?:date\s+opened|opened|open\s+date)$/i, 'opened date'],
  ['dateClosed', /^(?:date\s+closed|closed|closed\s+date|date\s+of\s+closure)$/i, 'closed date'],
  ['dateReported', /^(?:date\s+reported|reported|last\s+reported|date\s+updated)$/i, 'last reported date'],
  ['dateLastActivity', /^(?:date\s+of\s+last\s+activity|last\s+activity|last\s+payment|date\s+of\s+last\s+payment)$/i, 'last reported date'],
  ['collectionActivityDate', /^(?:collection\s+activity\s+date|collection\s+account\s+activity\s+date)$/i, 'last reported date'],
  ['responsibility', /^(?:responsibility|account\s+owner|ecoa|bureau\s+code)$/i, 'account field label'],
  ['remarks', /^(?:remarks?|comments?|consumer\s+statement)$/i, 'account field label'],
  ['paymentHistory', /^(?:payment\s+history|pay\s+history|payment\s+pattern|extended\s+payment\s+history)$/i, 'payment history'],
  ['bureau', /^bureau$/i, 'account field label'],
];

type SemanticFieldMap = {
  accountNumber?: string;
  accountType?: string;
  status?: string;
  balance?: string;
  originalBalance?: string;
  collectionAmount?: string;
  chargeOffAmount?: string;
  highBalance?: string;
  creditLimit?: string;
  pastDue?: string;
  dateOpened?: string;
  dateClosed?: string;
  dateReported?: string;
  dateLastActivity?: string;
  collectionActivityDate?: string;
  responsibility?: string;
  remarks?: string;
  paymentHistory?: string;
  bureau?: string;
};

type SemanticTextBlock = {
  blockId: string;
  page: number;
  blockIndex: number;
  rawText: string;
  normalizedText: string;
};

function normalizeSemanticLabel(value: string): string {
  return safeNormalizeText(value)
    .replace(/[:：]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function semanticLabelFor(line: string): [keyof SemanticFieldMap, SemanticBlockType] | null {
  const normalized = normalizeSemanticLabel(line);
  for (const [field, pattern, type] of FIELD_LABEL_ALIASES) {
    if (pattern.test(normalized)) return [field, type];
  }
  return null;
}

function splitInlineLabelValue(line: string): { field: keyof SemanticFieldMap; value: string; type: SemanticBlockType } | null {
  const match = line.match(/^([^:：\t]{2,40})(?:[:：]|\t+)\s*(.+)$/);
  if (!match) return null;
  const label = semanticLabelFor(match[1]);
  if (!label) return null;
  return { field: label[0], value: match[2].trim(), type: label[1] };
}

function isLikelyFieldValue(line: string): boolean {
  const value = line.trim();
  if (!value) return false;
  if (semanticLabelFor(value)) return false;
  if (/^\$?\(?[\d,]+(?:\.\d{2})?\)?$/i.test(value)) return true;
  if (extractDate(value) && /(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i.test(value)) return true;
  if (/^(?:current|open|closed|paid|unpaid|collection|charge-?off|charged off|secured|secured credit card|revolving|installment|individual|joint|authorized user)$/i.test(value)) return true;
  if (/^[A-Z0-9*X-]{4,}$/i.test(value)) return true;
  return false;
}

function parseSemanticFieldPairs(block: string): SemanticFieldMap {
  const fields: SemanticFieldMap = {};
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const inline = splitInlineLabelValue(line);
    if (inline && inline.value && !fields[inline.field]) {
      fields[inline.field] = inline.value;
      continue;
    }

    const label = semanticLabelFor(line);
    if (!label) continue;

    for (let j = i + 1; j < Math.min(lines.length, i + 5); j += 1) {
      const candidate = lines[j].trim();
      if (!candidate) continue;
      if (semanticLabelFor(candidate)) break;
      if (isLikelyFieldValue(candidate) || isReadableText(candidate)) {
        if (!fields[label[0]]) fields[label[0]] = candidate;
        break;
      }
    }

    if (!fields[label[0]]) {
      for (let j = i - 1; j >= Math.max(0, i - 3); j -= 1) {
        const candidate = lines[j].trim();
        if (!candidate) continue;
        if (semanticLabelFor(candidate)) break;
        if (isLikelyFieldValue(candidate)) {
          fields[label[0]] = candidate;
          break;
        }
      }
    }
  }

  return fields;
}

function findLinePairedValue(lines: string[], field: keyof SemanticFieldMap): string | undefined {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const inline = splitInlineLabelValue(line);
    if (inline?.field === field && inline.value) return inline.value;
    const label = semanticLabelFor(line);
    if (!label || label[0] !== field) continue;
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j += 1) {
      const candidate = lines[j].trim();
      if (!candidate) continue;
      if (semanticLabelFor(candidate)) break;
      return candidate;
    }
  }
  return undefined;
}

function createSemanticTextBlocks(text: string): SemanticTextBlock[] {
  const blocks: SemanticTextBlock[] = [];
  const pageParts = text.split(/^--- Page (\d+) ---\s*$/gim);
  const pages: Array<{ page: number; text: string }> = [];

  if (pageParts.length > 1) {
    for (let i = 1; i < pageParts.length; i += 2) {
      pages.push({ page: Number(pageParts[i]) || pages.length + 1, text: pageParts[i + 1] ?? '' });
    }
  } else {
    pages.push({ page: 1, text });
  }

  for (const page of pages) {
    const chunks = page.text
      .split('\n')
      .map(chunk => chunk.trim())
      .filter(chunk => isReadableText(chunk));

    chunks.forEach((rawText, index) => {
      blocks.push({
        blockId: `p${page.page}-b${index + 1}`,
        page: page.page,
        blockIndex: index + 1,
        rawText,
        normalizedText: safeNormalizeText(rawText).trim(),
      });
    });
  }

  return blocks;
}

function classifySemanticBlock(text: string): { type: SemanticBlockType; confidence: number; reason: string } {
  const trimmed = safeNormalizeText(text).trim();
  const singleLine = trimmed.replace(/\s+/g, ' ');
  if (!trimmed) return { type: 'unknown/unclassified', confidence: 0, reason: 'empty block' };
  if (/^(?:page\s+\d+|today\b.*\b(?:credit cards|loans|money)\b|credit cards\s+loans\s+money|table\s+of\s+contents)$/i.test(singleLine)) {
    return { type: 'footer/navigation/legal boilerplate', confidence: 90, reason: 'navigation, page, or boilerplate text' };
  }
  if (/^(?:transunion|experian|equifax|annualcreditreport|smartcredit|identityiq|myscoreiq|myfreescorenow|privacyguard)\b/i.test(singleLine)) {
    return { type: 'provider/header', confidence: 80, reason: 'provider or bureau header' };
  }
  const label = semanticLabelFor(singleLine);
  if (label) return { type: label[1], confidence: 90, reason: 'recognized credit-report field label' };
  const inline = splitInlineLabelValue(singleLine);
  if (inline) return { type: inline.type, confidence: 85, reason: 'recognized inline field/value pair' };
  if (/^(?:current|open|closed|paid|unpaid|secured|secured credit card|revolving|installment|individual|joint|authorized user)$/i.test(singleLine)) {
    return { type: 'account field value', confidence: 75, reason: 'recognized standalone account field value' };
  }
  if (/^\$?\(?[\d,]+(?:\.\d{2})?\)?$/i.test(singleLine)) return { type: 'balance', confidence: 80, reason: 'monetary value' };
  if (extractDate(singleLine) && /(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i.test(singleLine)) {
    return { type: 'account field value', confidence: 75, reason: 'date-like field value' };
  }
  if (/\bcollection(?:s| account)?\b/i.test(singleLine)) return { type: 'collection', confidence: 70, reason: 'collection-related text' };
  if (/\bcharge(?:d)?[ -]?off\b/i.test(singleLine)) return { type: 'charge-off', confidence: 70, reason: 'charge-off related text' };
  if (/inquir(?:y|ies)|hard pull|requested your credit/i.test(singleLine)) return { type: 'inquiry', confidence: 70, reason: 'inquiry-related text' };
  if (singleLine.split(/\s+/).length > 8) {
    return { type: 'unknown/unclassified', confidence: 45, reason: 'readable prose without enough tradeline structure' };
  }
  if (isPlausibleCreditorName(singleLine)) return { type: 'account creditor name', confidence: 55, reason: 'creditor-like text awaiting tradeline evidence' };
  return { type: 'unknown/unclassified', confidence: 35, reason: 'readable text did not match known semantic credit-report concepts' };
}

function isPlausibleCreditorName(value: string): boolean {
  const trimmed = safeNormalizeText(value).trim();
  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');
  const displayNormalized = normalized.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!trimmed || trimmed.length < 2) return false;
  if (/[\r\n]/.test(trimmed)) return false;
  if (!/[A-Za-z]{2,}/.test(trimmed)) return false;
  if (/\b(?:ssn|social security|current address|previous address|date of birth|dob|credit scores?)\b/i.test(trimmed)) return false;
  if (/\bscore\s*:?\s*\d{3}\b/i.test(trimmed)) return false;
  if (/\b(?:equifax|experian|transunion)\s+score\s*:?\s*\d{3}\b/i.test(trimmed)) return false;
  if (semanticLabelFor(trimmed)) return false;
  if (splitInlineLabelValue(trimmed)) return false;
  if (/^-{2,}\s*page\s+\d+\s*-{2,}$/i.test(trimmed) || /^page\s+\d+$/i.test(trimmed)) return false;
  if (/\b(?:transunion|experian|equifax)\b.*\b(?:credit report|account history|account information)\b/i.test(trimmed)) return false;
  if (/^today\b.*\b(?:credit cards|loans|money)\b/i.test(trimmed)) return false;
  if (/^(?:credit cards|loans|money)(?:\s+(?:credit cards|loans|money))*$/i.test(trimmed)) return false;
  if (/^(?:account details?|account history|account information|credit history|payment history|negative indicators|unclassified readable text|bureau specific values|tradelines|consumer information)$/i.test(trimmed)) return false;
  if (/^(?:public\s+records?|public\s+information|inquir(?:y|ies)|hard\s+inquiries|soft\s+inquiries)\b/i.test(trimmed)) return false;
  if (/^(?:type|opened|current\s+payment\s+status|worst\s+payment\s+status|account\s+status|payment\s+status|balance|credit\s+limit|past\s+due)\b/i.test(trimmed)) return false;
  if (/^date\s+last\s+active\b/i.test(trimmed)) return false;
  if (/^(?:opened|open date|date opened)\b.*(?:\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(trimmed)) return false;
  if (/^(?:current|worst)\s+payment\s+status\b/i.test(trimmed)) return false;
  if (/^\(?\s*to\s+account\s+closed\s+by\s+credit\b/i.test(trimmed)) return false;
  if (/\binformation\s+on\s+accounts\s+you\s+have\s+opened\b/i.test(trimmed)) return false;
  if (/\bFCR[AA]?\b|\bFCBA\b|\bdisputes?\b.*\bgrantor\b/i.test(trimmed)) return false;
  if (/\bto\s+be\s+used\s+for\s+grantor\b/i.test(trimmed)) return false;
  if (/^assigned\s+to\s+attorney\b/i.test(trimmed)) return false;
  if (/^(?:fair\s+credit\s+)?reporting\s+act$/i.test(trimmed)) return false;
  if (/\bfair\s+credit\s+reporting\s+act\b/i.test(trimmed)) return false;
  if (/^(?:transunion|experian|equifax)(?:\s+(?:transunion|experian|equifax))*$/i.test(trimmed)) return false;
  // Bureau portals frequently repeat their brand plus a navigation label in
  // OCR output (for example "experian/now"). Normalizing punctuation makes
  // whitespace, slash, dash, and breadcrumb variants equivalent without
  // weakening ordinary creditor names that happen to contain a bureau word.
  if (/^(?:experian|equifax|transunion)\s+(?:now|home|menu|navigation|report|reports|accounts?|overview|summary|dashboard)$/i.test(displayNormalized)) return false;
  if (/^(?:home|menu|navigation|report|reports|accounts?|overview|summary|dashboard)\s+(?:experian|equifax|transunion)$/i.test(displayNormalized)) return false;
  if (/^(?:department|account|balance|status|type|comments?|remarks?)$/i.test(trimmed)) return false;
  if (/^(?:current|open|closed|paid|unpaid|unknown|individual|joint|authorized user)$/i.test(trimmed)) return false;
  if (/^(?:revolving|revolving account|installment|installment account|individual account|mortgage|open account|collection|collection account)$/i.test(trimmed)) return false;
  if (/^(?:collection|collection account|revolving|revolving account|installment|installment account|open account)(?:\s+(?:multiple|experian|equifax|transunion))?$/i.test(displayNormalized)) return false;
  if (/^(?:charge-?off|charged off|past due balance|seriously past due|placed for collection)/i.test(trimmed)) return false;
  if (/^(?:(?:30|60|90|120|150|180)\s+days?\s+late|late payment|past due)$/i.test(displayNormalized)) return false;
  if (/^(?:collection|charge-?off|charged off|assigned to attorney|public records?|inquir(?:y|ies))\b.*(?:collection|charge-?off|inquir(?:y|ies)|public records?)\b/i.test(trimmed)) return false;
  if (/^paid or paying as agreed$/i.test(trimmed)) return false;
  if (/^(?:no\.?\s+of\s+months|months?\s+reviewed|terms?)\b/i.test(trimmed)) return false;
  if (/^(?:pay(?:ment)?|pavment)\s+s(?:ta|at|a)t?s?\b/i.test(trimmed)) return false;
  if (/^(?:year|month|extended payment history|\+?\s*expand history)/i.test(trimmed)) return false;
  if ((trimmed.match(/\b\d{2}\b/g) ?? []).length >= 4) return false;
  if (ACCOUNT_FIELD_LABEL_RE.test(trimmed) && (trimmed.includes(':') || !/\bagency\b/i.test(trimmed))) return false;
  return normalized.length > 1;
}

export function isLikelyCreditorName(value: string): boolean {
  return isPlausibleCreditorName(value);
}

function reassembleAccountBlocks(text: string): string[] {
  const lines = text.split('\n');
  const blocks: string[] = [];
  let currentLines: string[] = [];
  let hasFieldLabel = false;
  let hasCreditorCandidate = false;

  const flushCurrent = () => {
    if (currentLines.length >= 2 && (hasFieldLabel || hasCreditorCandidate)) {
      const joined = currentLines.join('\n').trim();
      if (joined.length > 10) blocks.push(joined);
    }
    currentLines = [];
    hasFieldLabel = false;
    hasCreditorCandidate = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      // Empty line — only flush if we have a meaningful block
      if (hasFieldLabel && currentLines.length >= 3) {
        flushCurrent();
      }
      continue;
    }

    // Section header — flush current and skip
    if (SECTION_HEADER_RE.test(trimmed)) {
      flushCurrent();
      continue;
    }

    // PDF garbage — skip
    if (!isValidCreditBlock(trimmed + ' placeholder')) {
      // Only skip if the line itself is clearly garbage (not just short)
      if (trimmed.length > 5 && !/[A-Za-z]{2,}/.test(trimmed)) {
        continue;
      }
    }

    if (ACCOUNT_FIELD_LABEL_RE.test(trimmed)) {
      // This line is a field label
      hasFieldLabel = true;
      currentLines.push(line);
    } else if (trimmed.length > 2 && trimmed.length < 80 && isReadableText(trimmed)) {
      // Could be a creditor name or a field value
      if (!hasFieldLabel && !hasCreditorCandidate) {
        // First readable non-label line — treat as potential creditor name
        // But first flush any existing block
        if (currentLines.length >= 2) flushCurrent();
        hasCreditorCandidate = true;
        currentLines.push(line);
      } else {
        currentLines.push(line);
      }
    } else {
      currentLines.push(line);
    }
  }

  // Flush final block
  flushCurrent();

  return blocks;
}

// MyScoreIQ tri-bureau exports repeat a column header for every tradeline:
// creditor name, "TransUnion Experian Equifax", then the account fields. The
// generic reassembler treats the entire Account History section as one block.
function normalizeLineForHeader(line: string): string {
  return line.trim().replace(/\s+/g, ' ').toLowerCase();
}

function nextNonEmptyNormalizedLines(lines: string[], start: number, count: number): string[] {
  const values: string[] = [];
  for (let i = start; i < lines.length && values.length < count; i += 1) {
    const normalized = normalizeLineForHeader(lines[i] ?? '');
    if (normalized) values.push(normalized);
  }
  return values;
}

function isTriBureauHeaderAt(lines: string[], index: number): boolean {
  const current = normalizeLineForHeader(lines[index] ?? '');
  if (current === 'transunion experian equifax') return true;
  const next = nextNonEmptyNormalizedLines(lines, index, 3);
  return next[0] === 'transunion'
    && next[1] === 'experian'
    && next[2] === 'equifax';
}

function triBureauHeaderLengthAt(lines: string[], index: number): number {
  if (normalizeLineForHeader(lines[index] ?? '') === 'transunion experian equifax') return 1;
  let consumed = 0;
  let found = 0;
  for (let i = index; i < lines.length && found < 3; i += 1) {
    consumed += 1;
    if (normalizeLineForHeader(lines[i] ?? '')) found += 1;
  }
  return consumed;
}

function isLikelyTriBureauCreditorLine(line: string): boolean {
  const trimmed = line.trim();
  const normalized = normalizeLineForHeader(trimmed);
  if (!trimmed || trimmed.length < 2 || trimmed.length > 120) return false;
  if (!isPlausibleCreditorName(trimmed)) return false;
  if (normalized === 'transunion experian equifax' || normalized === 'transunion' || normalized === 'experian' || normalized === 'equifax') return false;
  if (!isReadableText(trimmed)) return false;
  if (/^(?:year|month|extended payment history|\+?\s*expand history)/i.test(trimmed)) return false;
  if (/^(?:year|month)\b.*(?:\||\b\d{2}\b.*\b\d{2}\b)/i.test(trimmed)) return false;
  if ((trimmed.match(/\b\d{2}\b/g) ?? []).length >= 4) return false;
  if (ACCOUNT_FIELD_LABEL_RE.test(trimmed) && (trimmed.includes(':') || !/\bagency\b/i.test(trimmed))) return false;
  if (SECTION_HEADER_RE.test(trimmed)) return false;
  if (/^(?:current|open|closed|paid|unknown|individual|joint|authorized user|revolving|installment|mortgage|collection|account|balance)$/i.test(trimmed)) return false;
  if (/^(?:-|n\/?a|none|\$?[\d,]+(?:\.\d{2})?|\d{1,2}\/\d{1,2}\/\d{2,4})$/i.test(trimmed)) return false;
  return /[A-Za-z]{2,}/.test(trimmed);
}

function lineBeforeTriBureauHeader(lines: string[], headerIndex: number): number {
  for (let i = headerIndex - 1; i >= 0; i -= 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (!isLikelyTriBureauCreditorLine(trimmed)) continue;
    return i;
  }
  return Math.max(0, headerIndex - 1);
}

function splitTriBureauColumnAccounts(text: string): string[] {
  const lines = text.split('\n');
  const headers: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!isTriBureauHeaderAt(lines, i)) continue;

    // Personal-info and summary tables use the same header. An account header
    // is distinguished by an Account # field immediately below it.
    const lookaheadStart = i + triBureauHeaderLengthAt(lines, i);
    const lookahead = lines.slice(lookaheadStart, lookaheadStart + 80).join('\n');
    const creditorLineIndex = lineBeforeTriBureauHeader(lines, i);
    if (
      creditorLineIndex < i
      && isLikelyTriBureauCreditorLine(lines[creditorLineIndex] ?? '')
      && /^account\s*(?:#|number|no\.?)[\s:]/im.test(lookahead)
    ) headers.push(i);
  }

  return headers.map((headerIndex, position) => {
    const start = lineBeforeTriBureauHeader(lines, headerIndex);
    const nextHeader = headers[position + 1];
    const end = nextHeader === undefined ? lines.length : lineBeforeTriBureauHeader(lines, nextHeader);
    return lines.slice(start, end).join('\n').trim();
  }).filter(block => block.length > 10 && /account\s*(?:#|number|no\.?)/i.test(block));
}

const TRI_BUREAU_ORDER = ['TransUnion', 'Experian', 'Equifax'] as const;

function triBureauLine(block: string, label: RegExp): string | null {
  const line = block.split('\n').find(candidate => label.test(candidate.trim()));
  return line ? line.replace(label, '').trim() : null;
}

function triBureauTokens(value: string | null, pattern: RegExp): string[] {
  return value ? (value.match(pattern) ?? []).slice(0, 3) : [];
}

function triBureauCells(block: string, label: RegExp): string[] {
  const line = block.split('\n').find(candidate => label.test(candidate.trim()));
  if (!line) return [];
  const cells = line.replace(label, '').split(/\t+/).map(value => value.trim());
  return cells.length === 3 ? cells : [];
}

function triBureauValues(block: string, label: RegExp, tokenPattern?: RegExp): string[] {
  const lines = block.split('\n');
  const lineIndex = lines.findIndex(candidate => label.test(candidate.trim()));
  if (lineIndex < 0) return [];

  const sameLine = lines[lineIndex].replace(label, '').trim();
  if (sameLine) {
    const tabCells = sameLine.split(/\t+/).map(value => value.trim()).filter(Boolean);
    if (tabCells.length === 3) return tabCells;

    if (tokenPattern) {
      const tokens = sameLine.match(tokenPattern) ?? [];
      if (tokens.length >= 3) return tokens.slice(0, 3);
    }

    const spacedCells = sameLine.split(/\s{2,}/).map(value => value.trim()).filter(Boolean);
    if (spacedCells.length === 3) return spacedCells;

    const dashDelimitedCells = sameLine.split(/\s+-\s+/).map(value => value.trim()).filter(Boolean);
    if (dashDelimitedCells.length === 2 && sameLine.endsWith('-')) return [dashDelimitedCells[0], '-', '-'];
  }

  const stacked: string[] = [];
  for (let i = lineIndex + 1; i < lines.length && stacked.length < 3; i += 1) {
    const value = lines[i].trim();
    if (!value) continue;
    if (ACCOUNT_FIELD_LABEL_RE.test(value)) break;
    if (isTriBureauHeaderAt(lines, i)) break;
    stacked.push(value);
  }

  return stacked.length === 3 ? stacked : [];
}

function isTriBureauBlock(block: string): boolean {
  const lines = block.split('\n');
  return lines.some((_, index) => isTriBureauHeaderAt(lines, index))
    && /^account\s*(?:#|number|no\.?)\s*:/im.test(block);
}

function extractTriBureauBaseAccount(block: string, bureau: string): ParsedAccount | null {
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
  const headerIndex = lines.findIndex((_, index) => isTriBureauHeaderAt(lines, index));
  if (headerIndex <= 0) return null;

  let creditorName = '';
  for (let i = headerIndex - 1; i >= 0; i -= 1) {
    const candidate = lines[i];
    if (!candidate) continue;
    if (SECTION_HEADER_RE.test(candidate) || ACCOUNT_FIELD_LABEL_RE.test(candidate)) continue;
    if (isReadableText(candidate) && isPlausibleCreditorName(candidate)) {
      creditorName = candidate;
      break;
    }
  }

  const originalCreditorMatch = creditorName.match(/\(\s*original\s+creditor\s*:\s*([^)]+)\)/i)
    ?? block.match(/\(\s*original\s+creditor\s*:\s*([^)]+)\)/i);
  const originalCreditor = originalCreditorMatch?.[1]?.trim() ?? '';
  creditorName = creditorName.replace(/\s*\(\s*original\s+creditor\s*:.*\)\s*$/i, '').trim();

  if (!creditorName || !isReadableText(creditorName)) return null;

  const bureaus = extractBureaus(block);
  return {
    id: `${creditorName}-tri-bureau-${bureau || 'unknown'}`.replace(/\s+/g, '-').toLowerCase(),
    creditorName,
    originalCreditor,
    furnisherName: creditorName,
    accountNumber: '',
    accountNumberMasked: '',
    accountType: 'Unknown',
    responsibility: 'Individual',
    status: '',
    balance: null,
    originalBalance: null,
    collectionAmount: null,
    chargeOffAmount: null,
    highBalance: null,
    creditLimit: null,
    pastDue: null,
    dateOpened: '',
    dateOpenedField: /^\s*(?:date\s+opened|opened|open\s+date)\s*(?::|\t|$)/im.test(block)
      ? 'date_opened'
      : undefined,
    dateClosed: '',
    dateReported: '',
    dateLastActivity: '',
    lastActivityField: /^\s*(?:date\s+of\s+last\s+activity|last\s+activity)\s*(?::|\t|$)/im.test(block)
      ? 'date_of_last_activity'
      : undefined,
    collectionActivityDate: '',
    collectionActivityField: /^\s*(?:collection\s+activity\s+date|collection\s+account\s+activity\s+date)\s*(?::|\t|$)/im.test(block)
      ? 'collection_account_activity'
      : undefined,
    bureaus: bureaus.length > 0 ? bureaus : [bureau || 'Unknown'],
    bureau: bureaus[0] ?? bureau ?? 'Unknown',
    paymentHistory: '',
    remarks: [],
    isNegative: false,
    negativeReason: '',
    disputeStatus: '',
    isCollection: false,
    isChargeOff: false,
    isLate: false,
    latePayments: [],
    rawText: block,
    parserConfidence: 20,
  };
}

function expandTriBureauAccount(block: string, base: ParsedAccount): ParsedAccount[] {
  const lines = block.split('\n');
  if (!lines.some((_, index) => isTriBureauHeaderAt(lines, index))) return [base];

  const accountNumbers = triBureauValues(block, /^account\s*(?:#|number|no\.?)\s*:\s*/i, /-|[A-Z0-9*X]{2,}/gi);
  if (accountNumbers.length !== 3) return [base];

  const balances = triBureauValues(block, /^balance\s*:\s*/i, /-|\$[\d,]+(?:\.\d{2})?/g);
  const pastDue = triBureauValues(block, /^past\s+due\s*:\s*/i, /-|\$[\d,]+(?:\.\d{2})?/g);
  const highCredit = triBureauValues(block, /^high\s+credit\s*:\s*/i, /-|\$[\d,]+(?:\.\d{2})?/g);
  const creditLimit = triBureauValues(block, /^credit\s+limit\s*:\s*/i, /-|\$[\d,]+(?:\.\d{2})?/g);
  const opened = triBureauValues(block, /^date\s+opened\s*:\s*/i, /-|\d{1,2}\/\d{1,2}\/\d{4}/g);
  const reported = triBureauValues(block, /^(?:last\s+reported|date\s+reported)\s*:\s*/i, /-|\d{1,2}\/\d{1,2}\/\d{4}/g);
  const lastActive = triBureauValues(block, /^date\s+last\s+active\s*:\s*/i, /-|\d{1,2}\/\d{1,2}\/\d{4}/g);
  const collectionActivity = triBureauValues(block, /^(?:collection\s+activity\s+date|collection\s+account\s+activity\s+date)\s*:\s*/i, /-|\d{1,2}\/\d{1,2}\/\d{4}/g);
  const accountTypes = triBureauValues(block, /^account\s+type\s*:\s*/i);
  const accountStatuses = triBureauValues(block, /^account\s+status\s*:\s*/i);
  const paymentStatuses = triBureauValues(block, /^(?:payment|pay)\s+status\s*:\s*/i);
  const responsibilities = triBureauValues(block, /^(?:bureau\s+code|responsibility)\s*:\s*/i);
  const comments = triBureauValues(block, /^(?:comments?|remarks?)\s*:\s*/i);

  const valueAt = (values: string[], index: number) => values.length === 3 ? values[index] : undefined;
  const amountAt = (values: string[], index: number, fallback: number | null) => {
    const value = valueAt(values, index);
    return value === undefined ? fallback : value === '-' ? null : parseAmount(value);
  };
  const dateAt = (values: string[], index: number, fallback: string) => {
    const value = valueAt(values, index);
    return value === undefined ? fallback : value === '-' ? '' : extractDate(value);
  };
  const textAt = (values: string[], index: number, fallback: string) => {
    const value = valueAt(values, index);
    return value === undefined ? fallback : value === '-' ? '' : value;
  };

  return TRI_BUREAU_ORDER.flatMap((bureau, index) => {
    const accountNumber = accountNumbers[index];
    if (!accountNumber || accountNumber === '-') return [];
    const accountType = textAt(accountTypes, index, base.accountType);
    const cleanStatus = (value: string) => /satisfyingf20_trade/i.test(value) ? '' : value;
    const accountStatus = cleanStatus(textAt(accountStatuses, index, base.status));
    const rawPaymentStatus = textAt(paymentStatuses, index, '');
    const paymentStatus = cleanStatus(rawPaymentStatus);
    const status = paymentStatus || accountStatus;
    const responsibility = textAt(responsibilities, index, base.responsibility);
    const comment = textAt(comments, index, '');
    const remarks = comment ? [comment] : [];
    const balance = amountAt(balances, index, base.balance);
    const pastDueAmount = amountAt(pastDue, index, base.pastDue);
    const dateOpened = dateAt(opened, index, base.dateOpened);
    const dateReported = dateAt(reported, index, base.dateReported);
    const dateLastActivity = dateAt(lastActive, index, base.dateLastActivity);
    const collectionActivityDate = dateAt(collectionActivity, index, base.collectionActivityDate ?? '');
    const bureauRawText = [
      base.creditorName,
      base.originalCreditor ? `(Original Creditor: ${base.originalCreditor})` : '',
      `Bureau: ${bureau}`,
      `Account #: ${accountNumber}`,
      `Account Type: ${accountType}`,
      accountStatus ? `Account Status: ${accountStatus}` : '',
      paymentStatus ? `Payment Status: ${paymentStatus}` : '',
      balance !== null ? `Balance: ${balance}` : '',
      pastDueAmount && pastDueAmount > 0 ? `Past Due: ${pastDueAmount}` : '',
      dateOpened ? `Date Opened: ${dateOpened}` : '',
      dateReported ? `Last Reported: ${dateReported}` : '',
      dateLastActivity ? `Date Last Active: ${dateLastActivity}` : '',
      collectionActivityDate ? `Collection Activity Date: ${collectionActivityDate}` : '',
      comment ? `Comments: ${comment}` : '',
    ].filter(Boolean).join('\n');
    const partial: Partial<ParsedAccount> = {
      creditorName: base.creditorName,
      originalCreditor: base.originalCreditor,
      furnisherName: base.furnisherName,
      accountNumber,
      accountType,
      status,
      balance,
      pastDue: pastDueAmount,
      remarks,
      latePayments: [],
      paymentHistory: '',
      rawText: bureauRawText,
    };
    const collection = isCollectionAccount(partial);
    const negative = isNegativeAccount(partial) || collection;
    const negativeReason = negative ? (collection ? 'Collection account' : detectNegativeReason(partial)) : '';
    const parserConfidence = [
      20,
      accountNumber ? 20 : 0,
      accountType && accountType !== 'Unknown' ? 15 : 0,
      status ? 15 : 0,
      balance !== null ? 15 : 0,
      dateOpened ? 15 : 0,
    ].reduce((sum, value) => sum + value, 0);

    return [{
      ...base,
      id: `${base.creditorName}-${accountNumber}-${bureau}`.replace(/\s+/g, '-').toLowerCase(),
      accountNumber,
      accountNumberMasked: maskAccountNumber(accountNumber),
      accountType,
      status,
      responsibility,
      remarks,
      bureau,
      bureaus: [bureau],
      balance,
      pastDue: pastDueAmount,
      highBalance: amountAt(highCredit, index, base.highBalance),
      creditLimit: amountAt(creditLimit, index, base.creditLimit),
      dateOpened,
      dateOpenedField: base.dateOpenedField,
      dateReported,
      dateLastActivity,
      lastActivityField: base.lastActivityField,
      collectionActivityDate,
      collectionActivityField: base.collectionActivityField,
      isNegative: negative,
      negativeReason,
      isCollection: collection,
      isChargeOff: /charge.?off|charged off/i.test(`${accountType} ${status} ${remarks.join(' ')}`),
      isLate: /\blate\b|\bpast due\b|\bdelinquent\b/i.test(`${status} ${remarks.join(' ')}`),
      latePayments: [],
      paymentHistory: '',
      rawText: bureauRawText,
      parserConfidence,
    }];
  });
}

// ─── Account block parser ─────────────────────────────────────────────────────

function extractAccountBlock(block: string, bureau: string): ParsedAccount | null {
  try {
    if (!block || block.trim().length < 10) return null;

    const blockPreview = block.slice(0, 120).replace(/\n/g, '↵');
    console.debug('[ExtractAccountBlock] Processing block:', blockPreview);

    if (!isValidCreditBlock(block)) {
      console.debug('[ExtractAccountBlock] SKIP — failed isValidCreditBlock');
      return null;
    }

    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;
    const semanticFields = parseSemanticFieldPairs(block);
    const fieldValue = (field: keyof SemanticFieldMap): string | undefined =>
      semanticFields[field] ?? findLinePairedValue(lines, field);

    // Find creditor name — look for first line that looks like a name
    // (not a label like "Account Type:", "Balance:", etc.)
    let creditorName = '';
    const hasTriBureauHeader = lines.slice(1, 4).some(line => line.replace(/\s+/g, ' ').toLowerCase() === 'transunion experian equifax');

    if (
      !hasTriBureauHeader
      && lines.length > 2
      && isPlausibleCreditorName(lines[0])
      && isPlausibleCreditorName(`${lines[0]} ${lines[1]}`)
      && !semanticLabelFor(lines[1])
      && semanticLabelFor(lines[2])
    ) {
      lines[0] = `${lines[0]} ${lines[1]}`;
      lines.splice(1, 1);
    }

    if (hasTriBureauHeader && isReadableText(lines[0]) && isPlausibleCreditorName(lines[0])) {
      creditorName = lines[0];
    }

    if (
      !creditorName
      && lines.length > 1
      && isReadableText(lines[0])
      && isPlausibleCreditorName(lines[0])
      && !semanticLabelFor(lines[0])
      && (!isLikelyFieldValue(lines[0]) || /\/.+[A-Za-z]{2,}/.test(lines[0]))
      && lines.slice(1, 8).some(line => semanticLabelFor(line) || ACCOUNT_FIELD_LABEL_RE.test(line))
    ) {
      creditorName = stripInlineAccountSectionPrefix(lines[0]);
      console.debug('[ExtractAccountBlock] Creditor from semantic account header:', creditorName);
    }

    // First try explicit label extraction
    const creditorLabelMatch = creditorName ? null : block.match(/(?:creditor\s*name|account\s*name|furnisher)[:\s]+([^\n]+)/i);
    if (creditorLabelMatch && !creditorName) {
      const candidate = creditorLabelMatch[1].trim();
      if (isReadableText(candidate) && candidate.length > 1 && isPlausibleCreditorName(candidate)) {
        creditorName = candidate;
        console.debug('[ExtractAccountBlock] Creditor from label match:', creditorName);
      }
    }

    // If no label match, scan first few lines for a creditor name
    if (!creditorName) {
      for (const line of lines.slice(0, 6)) {
        // Skip lines that are pure labels or field headers
        if (ACCOUNT_FIELD_LABEL_RE.test(line)) continue;
        if (semanticLabelFor(line) || isLikelyFieldValue(line)) continue;
        if (/^(?:transunion|experian|equifax|account history|credit report)$/i.test(line)) continue;
        // Skip very short lines
        if (line.length < 2) continue;
        // Skip lines that are just numbers or dates
        if (/^\d+$/.test(line) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(line)) continue;
        // Skip lines that look like dollar amounts
        if (/^\$[\d,]+$/.test(line)) continue;
        const candidateName = stripInlineAccountSectionPrefix(line);
        if (isReadableText(candidateName) && isPlausibleCreditorName(candidateName)) {
          creditorName = candidateName;
          console.debug('[ExtractAccountBlock] Creditor from line scan:', creditorName);
          break;
        }
      }
    }

    const originalCreditorMatch = creditorName.match(/\(\s*original\s+creditor\s*:\s*([^)]+)\)/i)
      ?? block.match(/\(\s*original\s+creditor\s*:\s*([^)]+)\)/i);
    const originalCreditor = originalCreditorMatch?.[1]?.trim() ?? '';
    creditorName = creditorName.replace(/\s*\(\s*original\s+creditor\s*:.*\)\s*$/i, '').trim();

    if (!creditorName || !isReadableText(creditorName)) {
      console.debug('[ExtractAccountBlock] SKIP — no readable creditor name found. First 6 lines:', lines.slice(0, 6));
      return null;
    }
    if (/^\/[A-Z]/i.test(creditorName)) {
      console.debug('[ExtractAccountBlock] SKIP — creditor starts with PDF path:', creditorName);
      return null;
    }
    if (/\bImage\b|\bXObject\b|\bFont\b|\bstream\b/i.test(creditorName)) {
      console.debug('[ExtractAccountBlock] SKIP — creditor contains PDF keyword:', creditorName);
      return null;
    }

    const accountNumMatch = block.match(/(?:account\s*(?:number|#|no\.?)|account\s*:|acct\s*:)[\t ]*:?[ \t]*([A-Z0-9*X\-]{4,})/i);
    const accountNumber = fieldValue('accountNumber') ?? accountNumMatch?.[1] ?? '';

    const typeMatch = block.match(/(?:account type|type of account|type|kob|industry)[ \t]*:[ \t]*([^\n]+)/i);
    const accountType = fieldValue('accountType') ?? typeMatch?.[1]?.trim() ?? 'Unknown';

    const statusMatch = block.match(/(?:account status|pay status|payment status|status)[ \t]*:[ \t]*([^\n]+)/i);
    const status = fieldValue('status') ?? statusMatch?.[1]?.trim() ?? '';

    const balanceMatch = block.match(/(?:balance|current balance|amount owed)[ \t]*:[ \t]*\$?([\d,]+)/i);
    const balanceValue = fieldValue('balance');
    const balance = balanceValue ? parseAmount(balanceValue) : balanceMatch ? parseAmount(balanceMatch[1]) : null;

    const amountField = (key: keyof SemanticFieldMap, pattern: RegExp) => {
      const semanticValue = fieldValue(key);
      const match = block.match(pattern);
      return semanticValue ? parseAmount(semanticValue) : match ? parseAmount(match[1]) : null;
    };
    const originalBalance = amountField('originalBalance', /(?:original balance|original loan amount|loan amount|original amount)[ \t]*:[ \t]*\$?([\d,]+)/i);
    const collectionAmount = amountField('collectionAmount', /(?:collection amount|amount placed for collection)[ \t]*:[ \t]*\$?([\d,]+)/i);
    const chargeOffAmount = amountField('chargeOffAmount', /(?:charge[- ]?off amount|charged off amount)[ \t]*:[ \t]*\$?([\d,]+)/i);

    const highBalMatch = block.match(/(?:high balance|highest balance|high credit)[ \t]*:[ \t]*\$?([\d,]+)/i);
    const highBalanceValue = fieldValue('highBalance');
    const highBalance = highBalanceValue ? parseAmount(highBalanceValue) : highBalMatch ? parseAmount(highBalMatch[1]) : null;

    const limitMatch = block.match(/(?:credit limit|limit|credit line)[ \t]*:[ \t]*\$?([\d,]+)/i);
    const creditLimitValue = fieldValue('creditLimit');
    const creditLimit = creditLimitValue ? parseAmount(creditLimitValue) : limitMatch ? parseAmount(limitMatch[1]) : null;

    const pastDueMatch = block.match(/(?:past due|amount past due|past-due)[ \t]*:[ \t]*\$?([\d,]+)/i);
    const pastDueValue = fieldValue('pastDue');
    const pastDue = pastDueValue ? parseAmount(pastDueValue) : pastDueMatch ? parseAmount(pastDueMatch[1]) : null;

    const openedMatch = block.match(/(?:date opened|opened|open date|date of first delinquency)[ \t]*:[ \t]*([^\n]+)/i);
    const openedValue = fieldValue('dateOpened');
    const dateOpened = openedValue ? extractDate(openedValue) : openedMatch ? extractDate(openedMatch[1]) : '';
    const dateOpenedField = /^\s*(?:date\s+opened|opened|open\s+date)\s*(?::|\t|$)/im.test(block)
      ? 'date_opened' as const
      : undefined;

    const closedMatch = block.match(/(?:date closed|closed date|date of closure)[ \t]*:[ \t]*([^\n]+)/i);
    const closedValue = fieldValue('dateClosed');
    const dateClosed = closedValue ? extractDate(closedValue) : closedMatch ? extractDate(closedMatch[1]) : '';

    const reportedMatch = block.match(/(?:date reported|reported|last reported|date updated)[ \t]*:[ \t]*([^\n]+)/i);
    const reportedValue = fieldValue('dateReported');
    const dateReported = reportedValue ? extractDate(reportedValue) : reportedMatch ? extractDate(reportedMatch[1]) : '';

    const activityMatch = block.match(/(?:date of last activity|last activity|last payment|date of last payment)[ \t]*:[ \t]*([^\n]+)/i);
    const activityValue = fieldValue('dateLastActivity');
    const dateLastActivity = activityValue ? extractDate(activityValue) : activityMatch ? extractDate(activityMatch[1]) : '';
    const lastActivityField = /^\s*(?:date\s+of\s+last\s+activity|last\s+activity)\s*(?::|\t|$)/im.test(block)
      ? 'date_of_last_activity' as const
      : undefined;
    const collectionActivityValue = fieldValue('collectionActivityDate');
    const collectionActivityMatch = block.match(/(?:collection\s+activity\s+date|collection\s+account\s+activity\s+date)[ \t]*:[ \t]*([^\n]+)/i);
    const collectionActivityDate = collectionActivityValue
      ? extractDate(collectionActivityValue)
      : collectionActivityMatch ? extractDate(collectionActivityMatch[1]) : '';
    const collectionActivityField = /^\s*(?:collection\s+activity\s+date|collection\s+account\s+activity\s+date)\s*(?::|\t|$)/im.test(block)
      ? 'collection_account_activity' as const
      : undefined;

    const responsibilityMatch = block.match(/(?:responsibility|account owner|individual|joint|authorized|ecoa)[ \t]*:[ \t]*([^\n]+)/i);
    const responsibility = fieldValue('responsibility') ?? responsibilityMatch?.[1]?.trim() ?? 'Individual';

    const remarksMatch = block.match(/(?:remarks?|comments?|consumer statement)[:\s]+([^\n]+(?:\n[^\n]+)?)/i);
    const remarks: string[] = [];
    if (remarksMatch) {
      const remarkLines = remarksMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
      remarks.push(...remarkLines);
    }
    const remarksValue = fieldValue('remarks');
    if (remarksValue && remarks.length === 0) remarks.push(remarksValue);

    const latePayments: { days: number; count: number }[] = [];
    const late30 = block.match(/30[- ]days?[- ]late[:\s]+(\d+)/i);
    const late60 = block.match(/60[- ]days?[- ]late[:\s]+(\d+)/i);
    const late90 = block.match(/90[- ]days?[- ]late[:\s]+(\d+)/i);
    const late120 = block.match(/120[- ]days?[- ]late[:\s]+(\d+)/i);
    if (late30 && parseInt(late30[1]) > 0) latePayments.push({ days: 30, count: parseInt(late30[1]) });
    if (late60 && parseInt(late60[1]) > 0) latePayments.push({ days: 60, count: parseInt(late60[1]) });
    if (late90 && parseInt(late90[1]) > 0) latePayments.push({ days: 90, count: parseInt(late90[1]) });
    if (late120 && parseInt(late120[1]) > 0) latePayments.push({ days: 120, count: parseInt(late120[1]) });

    const historyMatch = block.match(/(?:payment history|pay history|payment pattern)[:\s]+([OK1-9*X\s\/\-]+)/i);
    const paymentHistory = fieldValue('paymentHistory') ?? historyMatch?.[1]?.trim() ?? '';

    const disputeMatch = block.match(/(?:dispute status|in dispute|consumer dispute)[:\s]+([^\n]+)/i);
    const disputeStatus = disputeMatch?.[1]?.trim() ?? '';

    const bureaus = extractBureaus(block);
    if (bureaus.length === 0 || (bureaus.length === 1 && bureaus[0] === 'Unknown')) {
      bureaus[0] = bureau || 'Unknown';
    }

    const partial: Partial<ParsedAccount> = {
      creditorName,
      accountNumber,
      accountType,
      originalCreditor,
      status,
      balance,
      originalBalance,
      collectionAmount,
      chargeOffAmount,
      pastDue,
      remarks,
      latePayments,
      paymentHistory,
      rawText: block,
    };

    if (!isValidAccount(partial)) return null;

    const negative = isNegativeAccount(partial);
    const collection = isCollectionAccount(partial);
    const negativeReason = negative ? detectNegativeReason(partial) : '';

    const confidence = [
      creditorName !== 'Unknown Creditor' ? 20 : 0,
      accountNumber ? 20 : 0,
      accountType !== 'Unknown' ? 15 : 0,
      status ? 15 : 0,
      balance !== null ? 15 : 0,
      dateOpened ? 15 : 0,
    ].reduce((a, b) => a + b, 0);

    return {
      id: `${creditorName}-${accountNumber}-${bureau}`.replace(/\s+/g, '-').toLowerCase(),
      creditorName,
      originalCreditor,
      furnisherName: creditorName,
      accountNumber,
      accountNumberMasked: maskAccountNumber(accountNumber),
      accountType,
      responsibility,
      status,
      balance,
      originalBalance,
      collectionAmount,
      chargeOffAmount,
      highBalance,
      creditLimit,
      pastDue,
      dateOpened,
      dateOpenedField,
      dateClosed,
      dateReported,
      dateLastActivity,
      lastActivityField,
      collectionActivityDate,
      collectionActivityField,
      bureaus,
      bureau: bureaus[0] ?? bureau,
      paymentHistory,
      remarks,
      isNegative: negative || collection,
      negativeReason: collection && !negative ? 'Collection account' : negativeReason,
      disputeStatus,
      isCollection: collection,
      isChargeOff: /charge.?off|charged off/i.test(accountType + ' ' + status + ' ' + remarks.join(' ')),
      isLate: latePayments.length > 0 || /\blate\b|\bdelinquent\b/i.test(status + ' ' + remarks.join(' ')),
      latePayments,
      rawText: block,
      parserConfidence: confidence,
    };
  } catch {
    return null;
  }
}

// ─── Multi-strategy block splitter ───────────────────────────────────────────
// MyScoreIQ and other providers use varying block separators.
// We try multiple strategies and use the one that yields the most valid blocks.
// Strategy 5 (reassemble) is specifically designed for line-per-field formats.

function splitIntoBlocks(text: string): string[] {
  const triBureauBlocks = splitTriBureauColumnAccounts(text);
  if (triBureauBlocks.length > 0) {
    if (typeof console !== 'undefined') {
      console.debug(`[CreditReportParser] Block split strategy selected: tri-bureau-column (${triBureauBlocks.length} account blocks)`);
    }
    return triBureauBlocks;
  }

  const strategies: Array<{ name: string; fn: () => string[] }> = [
    // Strategy 1: Reassemble line-per-field format (MyScoreIQ primary format)
    // This is the most important strategy for MyScoreIQ which outputs one field per line
    {
      name: 'reassemble-field-lines',
      fn: () => reassembleAccountBlocks(text),
    },
    // Strategy 2: Double newline (standard)
    {
      name: 'double-newline',
      fn: () => text.split(/\n{2,}/).filter(b => b.trim().length > 10),
    },
    // Strategy 3: Single newline with label detection
    // Split when a line starts with a known account-start label
    {
      name: 'label-boundary',
      fn: () => {
        const accountStartPattern = /^(?:[A-Z][A-Za-z\s&,.']{2,50})\s*$/m;
        const lines = text.split('\n');
        const blocks: string[] = [];
        let current: string[] = [];
        for (const line of lines) {
          const trimmed = line.trim();
          if (
            current.length > 3 &&
            accountStartPattern.test(trimmed) &&
            !/[:\d$]/.test(trimmed) &&
            trimmed.length > 3 &&
            trimmed.length < 60 &&
            !ACCOUNT_FIELD_LABEL_RE.test(trimmed) &&
            !semanticLabelFor(current[current.length - 1] ?? '')
          ) {
            blocks.push(current.join('\n'));
            current = [line];
          } else {
            current.push(line);
          }
        }
        if (current.length > 0) blocks.push(current.join('\n'));
        return blocks.filter(b => b.trim().length > 10);
      },
    },
    // Strategy 4: Section-based — split on bureau section headers
    {
      name: 'bureau-section',
      fn: () => {
        const parts = text.split(/(?=(?:equifax|experian|transunion)\s*(?:account|tradeline|credit|information)?)/i);
        return parts.filter(b => b.trim().length > 10);
      },
    },
    // Strategy 5: Horizontal rule / separator line
    {
      name: 'separator-line',
      fn: () => text.split(/\n[-=_]{5,}\n/).filter(b => b.trim().length > 10),
    },
  ];

  // Score each strategy by how many valid credit blocks it produces
  let bestBlocks: string[] = [];
  let bestScore = 0;
  let bestStrategyName = 'none';

  for (const strategy of strategies) {
    try {
      const blocks = strategy.fn();
      const validCount = blocks.filter(b => isValidCreditBlock(b)).length;
      if (validCount > bestScore) {
        bestScore = validCount;
        bestBlocks = blocks;
        bestStrategyName = strategy.name;
      }
    } catch {
      // skip failed strategy
    }
  }

  if (typeof console !== 'undefined') {
    console.debug(`[CreditReportParser] Block split strategy selected: ${bestStrategyName} (${bestScore} valid blocks from ${bestBlocks.length} total)`);
  }

  // If no strategy found valid blocks, fall back to double-newline
  if (bestBlocks.length === 0) {
    bestBlocks = text.split(/\n{2,}/).filter(b => b.trim().length > 10);
  }

  return bestBlocks;
}

type GenericSemanticParseResult = {
  accounts: ParsedAccount[];
  consumedBlocks: string[];
  rejectedCandidates: { block: string; reason: string }[];
  fragmentsMerged: number;
};

function countTradelineEvidence(fields: SemanticFieldMap): number {
  return [
    fields.accountNumber,
    fields.balance,
    fields.dateOpened,
    fields.accountType,
    fields.status,
    fields.creditLimit,
    fields.highBalance,
    fields.pastDue,
    fields.dateReported,
    fields.paymentHistory,
    fields.remarks,
  ].filter(value => value && value.trim().length > 0).length;
}

function isSemanticAccountBoundary(line: string, nextLines: string[]): boolean {
  const candidate = line.trim();
  if (!isPlausibleCreditorName(candidate)) return false;
  const evidenceWindow = nextLines.join('\n');
  const fields = parseSemanticFieldPairs(evidenceWindow);
  return countTradelineEvidence(fields) >= 1
    || /account\s*(?:#|number|type|status)|balance|current\s+payment\s+status|date\s+opened|opened/i.test(evidenceWindow);
}

function isSemanticCreditorIdentityLine(line: string): boolean {
  const candidate = line.trim();
  if (!isPlausibleCreditorName(candidate)) return false;
  if (semanticLabelFor(candidate)) return false;
  if (/^\$?\(?[\d,]+(?:\.\d{2})?\)?$/i.test(candidate)) return false;
  if (extractDate(candidate) && /(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i.test(candidate)) return false;
  if (/^(?:current|open|closed|paid|unpaid|collection|charge-?off|charged off|secured|secured credit card|revolving|installment|individual|joint|authorized user)$/i.test(candidate)) return false;
  if (/^[A-Z0-9*X-]{4,}$/i.test(candidate)) return false;
  return true;
}

function stripInlineAccountSectionPrefix(value: string): string {
  return value.trim().replace(/^accounts\s+(?=[A-Z0-9])/i, '');
}

function runGenericSemanticParser(text: string, bureau = 'Unknown'): GenericSemanticParseResult {
  const accounts: ParsedAccount[] = [];
  const consumedBlocks: string[] = [];
  const rejectedCandidates: { block: string; reason: string }[] = [];
  let fragmentsMerged = 0;

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const block = current.join('\n').trim();
    const fields = parseSemanticFieldPairs(block);
    const evidenceCount = countTradelineEvidence(fields);
    const creditor = current.find(line => isSemanticCreditorIdentityLine(line))
      ?? current.find(line =>
        isReadableText(line)
        && isPlausibleCreditorName(line)
        && !semanticLabelFor(line)
        && !/^(?:current|open|closed|paid|unpaid|secured|secured credit card|revolving|installment|individual|joint|authorized user|\$?\(?[\d,]+(?:\.\d{2})?\)?)$/i.test(line.trim())
      )
      ?? '';

    if (!creditor) {
      rejectedCandidates.push({ block: block.slice(0, 120), reason: 'no creditor-like identity found' });
    } else if (evidenceCount < 1) {
      rejectedCandidates.push({ block: block.slice(0, 120), reason: 'insufficient tradeline evidence after semantic field pairing' });
    } else {
      const account = extractAccountBlock(block, bureau);
      if (account) {
        accounts.push(account);
        consumedBlocks.push(block);
      } else {
        rejectedCandidates.push({ block: block.slice(0, 120), reason: 'semantic cluster failed account validation' });
      }
    }
    current = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const nextLines = lines.slice(i + 1, i + 10);
    const startsAccount = isSemanticAccountBoundary(line, nextLines);
    const previousLineWasLabel = current.length > 0 && Boolean(semanticLabelFor(current[current.length - 1]));

    if (startsAccount && previousLineWasLabel) {
      current.push(line);
      continue;
    }

    if (startsAccount) {
      if (current.length > 0) flush();

      const mergedHeader = [line];
      for (let j = i + 1; j < Math.min(lines.length, i + 3); j += 1) {
        const fragment = lines[j];
        if (semanticLabelFor(fragment) || ACCOUNT_FIELD_LABEL_RE.test(fragment)) break;
        const lookahead = lines.slice(j + 1, j + 8).join('\n');
        if (isPlausibleCreditorName(`${mergedHeader.join(' ')} ${fragment}`) && /account\s*(?:#|number|type|status)|balance|opened/i.test(lookahead)) {
          mergedHeader.push(fragment);
          fragmentsMerged += 1;
          i = j;
        }
      }
      current = [mergedHeader.join(' ')];
      continue;
    }

    if (current.length > 0) {
      if (SECTION_HEADER_RE.test(line) && current.length > 2) {
        flush();
      } else {
        current.push(line);
      }
    } else if (semanticLabelFor(line) || isLikelyFieldValue(line)) {
      current.push(line);
    }
  }

  flush();

  const seen = new Set<string>();
  return {
    accounts: accounts.filter(account => {
      if (seen.has(account.id)) return false;
      seen.add(account.id);
      return true;
    }),
    consumedBlocks,
    rejectedCandidates,
    fragmentsMerged,
  };
}

function enrichExperianAccountsFromAdjacentMetadata(text: string, accounts: ParsedAccount[]): ParsedAccount[] {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  return accounts.map(account => {
    const identifier = normalizeAccountNumberForKey(account.accountNumber || account.accountNumberMasked || '');
    if (!identifier) return account;
    const anchor = lines.findIndex(line => normalizeAccountNumberForKey(line).includes(identifier));
    if (anchor < 0) return account;

    let start = Math.max(0, anchor - 10);
    let end = Math.min(lines.length, anchor + 16);
    for (let i = anchor - 1; i >= start; i -= 1) {
      const otherIdentifier = normalizeAccountNumberForKey(lines[i]);
      if (otherIdentifier && otherIdentifier !== identifier && /account|acct/i.test(lines[i])) { start = i + 1; break; }
    }
    for (let i = anchor + 1; i < end; i += 1) {
      const otherIdentifier = normalizeAccountNumberForKey(lines[i]);
      if (otherIdentifier && otherIdentifier !== identifier && /account|acct/i.test(lines[i])) { end = i; break; }
    }

    const nearbyText = lines.slice(start, end).join('\n');
    const fields = parseSemanticFieldPairs(nearbyText);
    const accountType = account.accountType === 'Unknown' && fields.accountType ? fields.accountType : account.accountType;
    const status = account.status || fields.status || '';
    const balance = account.balance ?? (fields.balance ? parseAmount(fields.balance) : null);
    const originalBalance = account.originalBalance ?? (fields.originalBalance ? parseAmount(fields.originalBalance) : null);
    const collectionAmount = account.collectionAmount ?? (fields.collectionAmount ? parseAmount(fields.collectionAmount) : null);
    const chargeOffAmount = account.chargeOffAmount ?? (fields.chargeOffAmount ? parseAmount(fields.chargeOffAmount) : null);
    const highBalance = account.highBalance ?? (fields.highBalance ? parseAmount(fields.highBalance) : null);
    const creditLimit = account.creditLimit ?? (fields.creditLimit ? parseAmount(fields.creditLimit) : null);
    const pastDue = account.pastDue ?? (fields.pastDue ? parseAmount(fields.pastDue) : null);
    const dateOpened = account.dateOpened || (fields.dateOpened ? extractDate(fields.dateOpened) : '');
    const responsibility = account.responsibility || fields.responsibility || '';
    const remarks = account.remarks.length > 0 ? account.remarks : fields.remarks ? [fields.remarks] : [];
    return {
      ...account,
      accountType,
      status,
      balance,
      originalBalance,
      collectionAmount,
      chargeOffAmount,
      highBalance,
      creditLimit,
      pastDue,
      dateOpened,
      responsibility,
      remarks,
      rawText: `${account.rawText}\n${nearbyText}`,
    };
  });
}

function buildBlockDispositions(
  text: string,
  provider: SupportedProvider,
  accounts: ParsedAccount[],
  fallbackConsumedBlocks: string[],
  rejectedAccountCandidates: { block: string; reason: string }[],
): ParseBlockDisposition[] {
  const blocks = createSemanticTextBlocks(text);
  const seen = new Map<string, string>();
  const accountTexts = accounts.map(account => ({ id: account.id, text: account.rawText.toLowerCase() }));
  const fallbackConsumed = fallbackConsumedBlocks.map(block => block.toLowerCase());

  return blocks.map(block => {
    const classification = classifySemanticBlock(block.normalizedText);
    const normalizedKey = block.normalizedText.toLowerCase().replace(/\s+/g, ' ').trim();
    const duplicateOf = seen.get(normalizedKey);
    if (duplicateOf) {
      return {
        ...block,
        primaryParserDisposition: 'duplicate of earlier readable block',
        fallbackParserDisposition: 'not needed',
        semanticType: 'duplicate',
        confidence: 95,
        finalDisposition: 'duplicate',
        reason: `duplicate of ${duplicateOf}`,
        provider,
      };
    }
    seen.set(normalizedKey, block.blockId);

    const associatedAccount = accountTexts.find(account => account.text.includes(block.normalizedText.toLowerCase()));
    if (associatedAccount) {
      const fallbackMatched = fallbackConsumed.some(accountBlock => accountBlock.includes(block.normalizedText.toLowerCase()));
      return {
        ...block,
        primaryParserDisposition: fallbackMatched ? 'not consumed by provider parser' : 'consumed by account parser',
        fallbackParserDisposition: fallbackMatched ? 'consumed by generic semantic fallback' : 'not needed',
        semanticType: classification.type,
        associatedAccountId: associatedAccount.id,
        confidence: Math.max(classification.confidence, 80),
        finalDisposition: fallbackMatched ? 'fallback-account' : 'account',
        reason: fallbackMatched ? 'associated with validated fallback account' : 'associated with validated account',
        provider,
      };
    }

    const rejected = rejectedAccountCandidates.find(candidate => candidate.block.toLowerCase().includes(block.normalizedText.toLowerCase().slice(0, 40)));
    const isBoilerplate = classification.type === 'footer/navigation/legal boilerplate' || classification.type === 'provider/header' || classification.type === 'summary/statistics';

    return {
      ...block,
      primaryParserDisposition: rejected ? 'rejected account candidate' : 'not consumed by provider parser',
      fallbackParserDisposition: rejected ? 'evaluated and rejected by generic semantic fallback' : 'preserved for review',
      semanticType: classification.type,
      confidence: classification.confidence,
      finalDisposition: isBoilerplate ? 'boilerplate' : classification.type === 'unknown/unclassified' ? 'preserved-unclassified' : 'classified',
      reason: rejected?.reason ?? classification.reason,
      provider,
    };
  });
}

function summarizeBlockDispositions(blockDispositions: ParseBlockDisposition[]) {
  const duplicateBlocks = blockDispositions.filter(block => block.finalDisposition === 'duplicate').length;
  const boilerplateBlocks = blockDispositions.filter(block => block.finalDisposition === 'boilerplate').length;
  const preservedUnclassifiedBlocks = blockDispositions.filter(block => block.finalDisposition === 'preserved-unclassified').length;
  const classifiedBlocks = blockDispositions.length - duplicateBlocks - boilerplateBlocks - preservedUnclassifiedBlocks;
  return {
    readableBlocks: blockDispositions.length,
    classifiedBlocks,
    duplicateBlocks,
    boilerplateBlocks,
    preservedUnclassifiedBlocks,
    accountedFor: classifiedBlocks + duplicateBlocks + boilerplateBlocks + preservedUnclassifiedBlocks,
  };
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasHtmlStructure(rawText: string): boolean {
  return /<(?:!doctype|html|head|body|table|thead|tbody|tr|td|th|dl|dt|dd|section|div|span|p|br|script|style)\b/i.test(rawText ?? '');
}

function canonicalFieldLabel(field: keyof SemanticFieldMap): string {
  switch (field) {
    case 'accountNumber': return 'Account Number';
    case 'accountType': return 'Account Type';
    case 'status': return 'Account Status';
    case 'balance': return 'Balance';
    case 'originalBalance': return 'Original Balance';
    case 'collectionAmount': return 'Collection Amount';
    case 'chargeOffAmount': return 'Charge-off Amount';
    case 'highBalance': return 'High Balance';
    case 'creditLimit': return 'Credit Limit';
    case 'pastDue': return 'Past Due';
    case 'dateOpened': return 'Date Opened';
    case 'dateClosed': return 'Date Closed';
    case 'dateReported': return 'Date Reported';
    case 'dateLastActivity': return 'Date Last Activity';
    case 'collectionActivityDate': return 'Collection Activity Date';
    case 'responsibility': return 'Responsibility';
    case 'remarks': return 'Remarks';
    case 'paymentHistory': return 'Payment History';
    case 'bureau': return 'Bureau';
  }
}

function normalizeCanonicalFieldValue(field: keyof SemanticFieldMap, value: string): string {
  if (field === 'dateOpened' || field === 'dateClosed' || field === 'dateReported' || field === 'dateLastActivity' || field === 'collectionActivityDate') {
    return extractDate(value) || value.trim();
  }
  return value.trim();
}

function sourceMetaForAccount(account: ParsedAccount, dispositions: ParseBlockDisposition[]): string {
  const source = dispositions.find(block => block.associatedAccountId === account.id);
  const attrs: string[] = [];
  if (source) {
    attrs.push(`data-page="${source.page}"`);
    attrs.push(`data-source-block="${escapeHtml(source.blockId)}"`);
    attrs.push(`data-confidence="${Math.min(1, Math.max(0, source.confidence / 100)).toFixed(2)}"`);
  }
  const bureau = account.bureau || account.bureaus?.[0];
  if (bureau) attrs.push(`data-bureau="${escapeHtml(bureau)}"`);
  return attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
}

function renderCanonicalAccountSection(account: ParsedAccount, dispositions: ParseBlockDisposition[], className = 'credit-account'): string {
  const semanticFields = parseSemanticFieldPairs(account.rawText);
  const candidateRows: Array<[keyof SemanticFieldMap | 'furnisher', string | undefined]> = [
    ['furnisher', account.furnisherName || account.creditorName],
    ['accountNumber', account.accountNumber || semanticFields.accountNumber || account.accountNumberMasked],
    ['accountType', account.accountType || semanticFields.accountType],
    ['dateOpened', account.dateOpenedField === 'date_opened' ? account.dateOpened : semanticFields.dateOpened],
    ['dateClosed', account.dateClosed || semanticFields.dateClosed],
    ['dateReported', account.dateReported || semanticFields.dateReported],
    ['collectionActivityDate', account.collectionActivityDate || semanticFields.collectionActivityDate],
    ['status', account.status || semanticFields.status],
    ['balance', account.balance !== null && account.balance !== undefined ? `$${account.balance.toLocaleString('en-US')}` : semanticFields.balance],
    ['originalBalance', account.originalBalance !== null && account.originalBalance !== undefined ? `$${account.originalBalance.toLocaleString('en-US')}` : semanticFields.originalBalance],
    ['collectionAmount', account.collectionAmount !== null && account.collectionAmount !== undefined ? `$${account.collectionAmount.toLocaleString('en-US')}` : semanticFields.collectionAmount],
    ['chargeOffAmount', account.chargeOffAmount !== null && account.chargeOffAmount !== undefined ? `$${account.chargeOffAmount.toLocaleString('en-US')}` : semanticFields.chargeOffAmount],
    ['highBalance', account.highBalance !== null && account.highBalance !== undefined ? `$${account.highBalance.toLocaleString('en-US')}` : semanticFields.highBalance],
    ['creditLimit', account.creditLimit !== null && account.creditLimit !== undefined ? `$${account.creditLimit.toLocaleString('en-US')}` : semanticFields.creditLimit],
    ['pastDue', account.pastDue !== null && account.pastDue !== undefined ? `$${account.pastDue.toLocaleString('en-US')}` : semanticFields.pastDue],
    ['responsibility', account.responsibility || semanticFields.responsibility],
    ['paymentHistory', account.paymentHistory || semanticFields.paymentHistory],
    ['remarks', account.remarks?.join('; ') || semanticFields.remarks],
    ['bureau', account.bureau || semanticFields.bureau],
  ];
  const rows = candidateRows.filter((row): row is [keyof SemanticFieldMap | 'furnisher', string] =>
    typeof row[1] === 'string' && row[1].trim().length > 0
  );

  const fieldHtml = rows.map(([field, value]) => {
    const label = field === 'furnisher' ? 'Furnisher' : canonicalFieldLabel(field);
    const normalized = field === 'furnisher' ? value.trim() : normalizeCanonicalFieldValue(field, value);
    return [
      `    <dt>${escapeHtml(label)}</dt>`,
      `    <dd${sourceMetaForAccount(account, dispositions)}>${escapeHtml(normalized)}</dd>`,
    ].join('\n');
  }).join('\n');

  const flags = [
    account.isNegative ? 'data-negative="true"' : '',
    account.isCollection ? 'data-collection="true"' : '',
    account.isChargeOff ? 'data-charge-off="true"' : '',
  ].filter(Boolean).join(' ');
  const flagAttrs = flags ? ` ${flags}` : '';

  return [
    `<section class="${className}"${sourceMetaForAccount(account, dispositions)}${flagAttrs}>`,
    `  <h2>${escapeHtml(account.creditorName)}</h2>`,
    '  <dl>',
    fieldHtml,
    '  </dl>',
    '</section>',
  ].join('\n');
}

function renderUnclassifiedSections(dispositions: ParseBlockDisposition[]): string {
  const blocks = dispositions.filter(block => block.finalDisposition === 'preserved-unclassified');
  if (blocks.length === 0) return '';
  return [
    '<section class="unclassified">',
    '  <h2>Unclassified Readable Text</h2>',
    ...blocks.map(block => `  <p data-page="${block.page}" data-source-block="${escapeHtml(block.blockId)}" data-confidence="${Math.min(1, Math.max(0, block.confidence / 100)).toFixed(2)}">${escapeHtml(block.rawText)}</p>`),
    '</section>',
  ].join('\n');
}

function renderBureauValuesSection(accounts: ParsedAccount[]): string {
  const bureauAccounts = accounts.filter(account => account.bureau || account.bureaus?.length);
  if (bureauAccounts.length === 0) return '';
  return [
    '<section class="bureau-values">',
    '  <h2>Bureau Specific Values</h2>',
    ...bureauAccounts.map(account => `  <p data-bureau="${escapeHtml(account.bureau || 'Unknown')}" data-account="${escapeHtml(account.id)}">${escapeHtml(account.creditorName)}</p>`),
    '</section>',
  ].join('\n');
}

function renderInquirySections(text: string): string {
  const inquiries = extractInquiries(text).inquiries;
  if (inquiries.length === 0) return '';
  return [
    '<section class="hard-inquiries">',
    '  <h2>Hard Inquiries</h2>',
    ...inquiries.map(inquiry => [
      '  <dl>',
      `    <dt>Creditor Name</dt><dd>${escapeHtml(inquiry.creditor)}</dd>`,
      `    <dt>Bureau</dt><dd>${escapeHtml(inquiry.bureau)}</dd>`,
      `    <dt>Date of Inquiry</dt><dd>${escapeHtml(inquiry.date)}</dd>`,
      '  </dl>',
    ].join('\n')),
    '</section>',
  ].join('\n');
}

function renderPublicRecordsSection(text: string): string {
  const { detected, records } = extractPublicRecords(text);
  if (!detected) return '';
  if (records.length === 0) {
    return '<section class="public-records"><h2>Public Records</h2><p>None Reported</p></section>';
  }
  return [
    '<section class="public-records">',
    '  <h2>Public Records</h2>',
    ...records.map(record => [
      '  <dl>',
      `    <dt>Record Type</dt><dd>${escapeHtml(record.type)}</dd>`,
      `    <dt>Bureau</dt><dd>${escapeHtml(record.bureau)}</dd>`,
      `    <dt>Filing Date</dt><dd>${escapeHtml(record.dateFiled)}</dd>`,
      `    <dt>Status</dt><dd>${escapeHtml(record.status)}</dd>`,
      '  </dl>',
    ].join('\n')),
    '</section>',
  ].join('\n');
}

export function normalizeCreditReportToHtml(
  rawText: string,
  provider: SupportedProvider = 'unknown',
): CreditReportHtmlNormalizationResult {
  const sourceText = safeNormalizeText(rawText ?? '');
  const semanticFallback = runGenericSemanticParser(sourceText, provider);
  const accounts = semanticFallback.accounts
    .filter(account => isPlausibleCreditorName(account.creditorName ?? ''));
  const blockDispositions = buildBlockDispositions(
    sourceText,
    provider,
    accounts,
    semanticFallback.consumedBlocks,
    semanticFallback.rejectedCandidates,
  );
  const reconciliation = summarizeBlockDispositions(blockDispositions);
  const collections = accounts.filter(account => account.isCollection);

  const html = [
    '<article class="credit-report" data-normalized="canonical-html">',
    '  <section class="consumer-information">',
    '    <h2>Consumer Information</h2>',
    '  </section>',
    '  <section class="tradelines">',
    '    <h2>Tradelines</h2>',
    ...accounts.map(account => renderCanonicalAccountSection(account, blockDispositions, 'credit-account')),
    '  </section>',
    collections.length > 0 ? [
      '  <section class="collections">',
      '    <h2>Collections</h2>',
      ...collections.map(account => `    <p data-account="${escapeHtml(account.id)}" data-bureau="${escapeHtml(account.bureau || 'Unknown')}">${escapeHtml(account.creditorName)}</p>`),
      '  </section>',
    ].join('\n') : '',
    renderInquirySections(sourceText),
    renderPublicRecordsSection(sourceText),
    renderBureauValuesSection(accounts),
    accounts.some(account => account.paymentHistory) ? '<section class="payment-history"><h2>Payment History</h2></section>' : '',
    accounts.some(account => account.isNegative) ? '<section class="negative-indicators"><h2>Negative Indicators</h2></section>' : '',
    renderUnclassifiedSections(blockDispositions),
    '</article>',
  ].filter(Boolean).join('\n');

  return {
    html,
    diagnostics: {
      sourceBlocksReceived: blockDispositions.length,
      blocksClassified: reconciliation.classifiedBlocks,
      blocksPaired: accounts.reduce((sum, account) => sum + countTradelineEvidence(parseSemanticFieldPairs(account.rawText)), 0),
      accountSectionsProduced: accounts.length,
      collectionSectionsProduced: collections.length,
      inquirySectionsProduced: extractInquiries(sourceText).inquiries.length,
      publicRecordSectionsProduced: extractPublicRecords(sourceText).records.length,
      unclassifiedBlocksPreserved: reconciliation.preservedUnclassifiedBlocks,
      blocksRejected: semanticFallback.rejectedCandidates.length,
      rejectedAccountCandidates: semanticFallback.rejectedCandidates,
      accountFragmentsMerged: semanticFallback.fragmentsMerged,
      validationErrors: accounts
        .filter(account => !isValidAccount(account))
        .map(account => `Invalid normalized account: ${account.creditorName}`),
    },
    blockDispositions,
  };
}

// ─── Normalized fallback parser ───────────────────────────────────────────────
// Used when provider-specific parsing yields 0 accounts.
// Scans the full text for common credit report field labels and assembles
// account objects from whatever it can find.

function runFallbackParser(text: string): { accounts: ParsedAccount[]; unparsedBlocks: string[] } {
  let accounts: ParsedAccount[] = [];
  let unparsedBlocks: string[] = [];

  try {
    // First try the reassemble strategy on the full text
    const reassembled = reassembleAccountBlocks(text);
    if (reassembled.length > 0) {
      for (const block of reassembled) {
        try {
          if (!isValidCreditBlock(block)) continue;
          const account = extractAccountBlock(block, 'Unknown');
          if (account) {
            accounts.push(account);
          } else if (block.trim().length > 20) {
            unparsedBlocks.push(block.trim().slice(0, 200));
          }
        } catch {
          // skip
        }
      }
    }

    if (accounts.length > 0) {
      // Deduplicate
      const seen = new Set<string>();
      return {
        accounts: accounts.filter(a => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        }),
        unparsedBlocks,
      };
    }

    // Second fallback: field-label scanning
    const ACCOUNT_FIELD_LABELS = [
      'account name', 'account number', 'balance', 'status', 'payment status',
      'date opened', 'last reported', 'creditor type', 'account type',
      'high balance', 'credit limit', 'past due', 'payment history',
      'date of last activity', 'responsibility', 'remarks', 'bureau',
      'charge off amount', 'original creditor', 'collection agency',
      'account status', 'pay status', 'date reported', 'date closed',
      'open date', 'close date', 'high credit', 'credit line',
    ];

    const lines = text.split('\n');
    let currentBlock: string[] = [];
    let fieldCount = 0;

    const flushBlock = () => {
      // Lowered from 2 to 1 — some MyScoreIQ blocks have only 1 labeled field
      if (currentBlock.length > 1 && fieldCount >= 1) {
        const blockText = currentBlock.join('\n');
        const account = extractAccountBlock(blockText, 'Unknown');
        if (account) {
          accounts.push(account);
        } else if (blockText.trim().length > 20) {
          unparsedBlocks.push(blockText.trim().slice(0, 200));
        }
      }
      currentBlock = [];
      fieldCount = 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase().trim();

      const isFieldLine = ACCOUNT_FIELD_LABELS.some(label => lower.startsWith(label));

      if (isFieldLine) {
        fieldCount++;
        currentBlock.push(line);
      } else if (lower.length > 0) {
        if (fieldCount > 0) {
          currentBlock.push(line);
        } else if (isReadableText(line) && line.trim().length > 3 && line.trim().length < 80) {
          if (currentBlock.length > 0) flushBlock();
          currentBlock = [line];
        }
      } else {
        if (fieldCount >= 1) flushBlock();
      }
    }

    if (fieldCount >= 1) flushBlock();

    // Deduplicate
    const seen = new Set<string>();
    return {
      accounts: accounts.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      }),
      unparsedBlocks,
    };
  } catch {
    return { accounts, unparsedBlocks };
  }
}

function extractAccounts(
  text: string,
  exclusionLog: { block: string; reason: string }[]
): {
  accounts: ParsedAccount[];
  confidence: number;
  unparsedBlocks: string[];
  totalBlocks: number;
  fallbackUsed: boolean;
  binaryBlocksSkipped: number;
  readableBlocksAccepted: number;
  readableBlocksRejected: number;
  fallbackConsumedBlocks: string[];
  rejectedAccountCandidates: { block: string; reason: string }[];
  accountFragmentsMerged: number;
} {
  let accounts: ParsedAccount[] = [];
  let unparsedBlocks: string[] = [];
  let fallbackUsed = false;
  let binaryBlocksSkipped = 0;
  let readableBlocksAccepted = 0;
  let readableBlocksRejected = 0;
  let fallbackConsumedBlocks: string[] = [];
  let rejectedAccountCandidates: { block: string; reason: string }[] = [];
  let accountFragmentsMerged = 0;

  try {
    // Try to isolate account section — expanded patterns for MyScoreIQ and others
    const accountSectionPatterns = [
      /(?:accounts?|tradelines?|credit accounts?|account information|account details?|credit history)[:\s]*([\s\S]+?)(?:inquiries|public records|end of report|$)/i,
      /(?:open accounts?|closed accounts?|negative accounts?|potentially negative)[:\s]*([\s\S]+?)(?:inquiries|public records|end of report|$)/i,
      // MyScoreIQ often has "Equifax Accounts" / "Experian Accounts" / "TransUnion Accounts"
      /(?:equifax|experian|transunion)\s+(?:accounts?|tradelines?)[:\s]*([\s\S]+?)(?:inquiries|public records|end of report|(?:equifax|experian|transunion)\s+(?:accounts?|inquiries?)|$)/i,
    ];

    let accountText = text;
    // Prefer the explicit MyScoreIQ Account History boundary. The generic
    // "accounts?" pattern can otherwise latch onto explanatory FICO text near
    // the beginning of the report and never reach the actual tradelines.
    const triBureauHistory = text.match(/account\s+history\s*([\s\S]+?)(?=\ninquiries\b|$)/i);
    if (triBureauHistory?.[1] && triBureauHistory[1].trim().length > 50) {
      accountText = triBureauHistory[1];
    } else {
      for (const pattern of accountSectionPatterns) {
        try {
          const match = text.match(pattern);
          if (match && match[1].trim().length > 50) {
            accountText = match[1];
            break;
          }
        } catch {
          // try next pattern
        }
      }
    }

    // Use multi-strategy block splitter (includes reassemble-field-lines for MyScoreIQ)
    const blocks = splitIntoBlocks(accountText);
    let totalBlocks = blocks.length;

    const bureauSections = [
      { bureau: 'Equifax', pattern: /equifax/i },
      { bureau: 'Experian', pattern: /experian/i },
      { bureau: 'TransUnion', pattern: /transunion/i },
    ];

    let currentBureau = 'Unknown';

    for (const block of blocks) {
      try {
        // Detect bureau context
        for (const bs of bureauSections) {
          if (bs.pattern.test(block)) { currentBureau = bs.bureau; break; }
        }

        // Skip non-account section headers
        const firstLine = block.split('\n')[0]?.trim() ?? '';
        if (SECTION_HEADER_RE.test(firstLine)) {
          exclusionLog.push({ block: firstLine, reason: 'Section header — not an account block' });
          continue;
        }

        // Must have at least a letter sequence
        if (!/[A-Za-z]{2,}/.test(firstLine)) {
          exclusionLog.push({ block: firstLine || block.slice(0, 60), reason: 'First line has no readable text' });
          continue;
        }

        // Pre-screen: reject obvious PDF garbage / binary blocks
        // These are BINARY SKIPS — not counted as rejected readable text blocks
        if (!isValidCreditBlock(block)) {
          const printable = (block.match(/[A-Za-z0-9\s]/g) ?? []).length;
          const total = block.length;
          const printableRatio = total > 0 ? printable / total : 0;

          // Determine if this is a binary/image block or a readable-but-invalid block
          const isBinary = printableRatio < 0.4 ||
            /\bstream\b[\s\S]{0,20}\bendstream\b/i.test(block) ||
            /^\d+\s+\d+\s+obj\b/m.test(block) ||
            /\/DCTDecode|\/FlateDecode|JFIF|Exif/i.test(block) ||
            /\/uni[0-9A-F]{4}/i.test(block);

          if (isBinary) {
            // Binary/image stream — skip silently, count separately
            binaryBlocksSkipped++;
          } else if (printable > 5) {
            // Readable text that failed validation — count as rejected
            readableBlocksRejected++;
            exclusionLog.push({ block: block.trim().slice(0, 80), reason: 'Failed isValidCreditBlock (PDF stream / binary / symbol-heavy)' });
            unparsedBlocks.push(block.trim().slice(0, 200));
          } else {
            binaryBlocksSkipped++;
          }
          continue;
        }

        const account = extractAccountBlock(block, currentBureau)
          ?? (isTriBureauBlock(block) ? extractTriBureauBaseAccount(block, currentBureau) : null);
        if (account && account.parserConfidence >= 20) {
          const accountLines = block.split('\n').map(line => line.trim()).filter(Boolean);
          if (
            accountLines.length > 2
            && account.creditorName === `${accountLines[0]} ${accountLines[1]}`
            && semanticLabelFor(accountLines[2])
          ) {
            accountFragmentsMerged += 1;
          }
          const expandedAccounts = expandTriBureauAccount(block, account);
          for (const expanded of expandedAccounts) {
            if (!accounts.find(a => a.id === expanded.id)) accounts.push(expanded);
          }
          readableBlocksAccepted += expandedAccounts.length;
        } else if (!account) {
          const fl = firstLine.slice(0, 80);
          exclusionLog.push({ block: fl, reason: 'Passed isValidCreditBlock but failed account validation (no creditor name or no credit fields)' });
          if (firstLine.length > 3 && isReadableText(firstLine)) {
            readableBlocksRejected++;
            unparsedBlocks.push(block.trim().slice(0, 200));
          }
        }
      } catch {
        // skip this block
      }
    }

    // ── Generic semantic fallback ────────────────────────────────────────────
    // Primary section parsing can recover some accounts while still leaving
    // readable OCR regions unconsumed. Run a conservative semantic pass over
    // the full account text so unsupported regions are understood or preserved.
    const semanticFallbackInput = accounts.length > 0 ? unparsedBlocks.join('\n\n') : accountText;
    const semanticFallback = semanticFallbackInput.trim().length > 0
      ? runGenericSemanticParser(semanticFallbackInput, currentBureau)
      : { accounts: [], consumedBlocks: [], rejectedCandidates: [], fragmentsMerged: 0 };
    rejectedAccountCandidates = [...rejectedAccountCandidates, ...semanticFallback.rejectedCandidates];
    accountFragmentsMerged += semanticFallback.fragmentsMerged;
    if (semanticFallback.accounts.length > 0) {
      fallbackUsed = true;
      fallbackConsumedBlocks = semanticFallback.consumedBlocks;
      for (const fallbackAccount of semanticFallback.accounts) {
        if (!accounts.find(account => account.id === fallbackAccount.id)) {
          accounts.push(fallbackAccount);
          readableBlocksAccepted += 1;
        }
      }
    }

    // If primary and semantic parsing found 0 accounts, keep the legacy
    // normalized fallback as a last resort for older provider fixtures.
    if (accounts.length === 0) {
      fallbackUsed = true;
      const fallback = runFallbackParser(text);
      accounts = fallback.accounts;
      unparsedBlocks = [...unparsedBlocks, ...fallback.unparsedBlocks];
      if (accounts.length > 0) {
        readableBlocksAccepted += accounts.length;
        exclusionLog.push({
          block: '[FALLBACK PARSER]',
          reason: `Primary parser found 0 accounts. Fallback parser recovered ${accounts.length} account(s) using field-label scanning.`,
        });
      }
    }

    return { accounts, confidence: accounts.length > 0 ? Math.min(95, 50 + accounts.length * 2) : 0, unparsedBlocks, totalBlocks, fallbackUsed, binaryBlocksSkipped, readableBlocksAccepted, readableBlocksRejected, fallbackConsumedBlocks, rejectedAccountCandidates, accountFragmentsMerged };
  } catch {
    return { accounts, confidence: 0, unparsedBlocks, totalBlocks: 0, fallbackUsed, binaryBlocksSkipped, readableBlocksAccepted, readableBlocksRejected, fallbackConsumedBlocks, rejectedAccountCandidates, accountFragmentsMerged };
  }
}

function extractInquiries(text: string): { inquiries: ParsedInquiry[]; confidence: number } {
  let inquiries: ParsedInquiry[] = [];
  try {
    const reportLines = text.split('\n');
    const inquiryStart = reportLines.findIndex(line => /^(?:hard inquiries|regular inquiries|credit inquiries|inquiries)$/i.test(line.trim()));
    let inquiryText = '';
    if (inquiryStart >= 0) {
      const nextSection = reportLines.findIndex((line, index) => index > inquiryStart && /^(?:public information|public records?|creditor contacts?)$/i.test(line.trim()));
      inquiryText = reportLines.slice(inquiryStart + 1, nextSection >= 0 ? nextSection : undefined).join('\n');
    }

    const inquirySectionPatterns = [
      /(?:hard inquiries|regular inquiries|requests viewed by others|credit inquiries|inquiries shared with others|companies that requested your credit file|hard pulls|account review inquiries)[:\s]*([\s\S]+?)(?:\n{3,}|public records|end of report|personal information|$)/i,
      /(?:inquiries)[:\s]*([\s\S]+?)(?:\n{3,}|public records|end of report|$)/i,
    ];

    for (const pattern of inquiryText ? [] : inquirySectionPatterns) {
      try {
        const match = text.match(pattern);
        if (match) { inquiryText = match[1]; break; }
      } catch {
        // try next pattern
      }
    }

    if (!inquiryText) return { inquiries: [], confidence: 0 };

    const lines = inquiryText.split('\n').filter(l => l.trim().length > 5);

    for (const line of lines) {
      try {
        const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
        const bureau = extractBureau(line);
        const isHard = /hard/i.test(line) || !/soft/i.test(line);
        const cells = line.split(/\t+/).map(value => value.trim()).filter(Boolean);

        const creditorMatch = line.match(/^([A-Za-z][A-Za-z\s&,.']{2,40}?)(?:\s+\d|\s+(?:equifax|experian|transunion))/i);
        const creditor = cells.length >= 3 && dateMatch
          ? cells[0]
          : dateMatch
            ? line.replace(dateMatch[0], ' ').replace(/\b(?:equifax|experian|transunion|hard|soft)\b/gi, ' ').replace(/\s+/g, ' ').trim()
            : creditorMatch?.[1]?.trim() ?? line.split(/\s{2,}/)[0]?.trim() ?? '';

        const inquiry: ParsedInquiry = {
            creditor,
            date: dateMatch ? extractDate(dateMatch[1]) : '',
            bureau,
            type: isHard ? 'hard' : 'soft',
            purpose: '',
            rawText: line,
        };

        if (!/^(?:hard|soft|inquir|date|bureau|company)/i.test(creditor) && isReliableInquiry({
          creditor_name: inquiry.creditor,
          bureau: inquiry.bureau,
          date_reported: inquiry.date,
        })) {
          inquiries.push(inquiry);
        }
      } catch {
        // skip this line
      }
    }
  } catch {
    // return whatever was collected
  }

  const confidence = inquiries.length > 0 ? 80 : 0;
  return { inquiries, confidence };
}

function extractPublicRecords(text: string): { records: ParsedPublicRecord[]; detected: boolean; confidence: number } {
  const records: ParsedPublicRecord[] = [];
  try {
    const prSection = text.match(/(?:public records?)[:\s]*([\s\S]+?)(?:\n{3,}|inquiries|end of report|$)/i);

    if (prSection) {
      const sectionText = prSection[1].toLowerCase();
      if (
        sectionText.includes('no public records') ||
        sectionText.includes('none reported') ||
        sectionText.includes('no records found') ||
        sectionText.trim().length < 30
      ) {
        return { records: [], detected: true, confidence: 90 };
      }

      const blocks = prSection[1].split(/\n{2,}/).filter(b => b.trim().length > 10);
      for (const block of blocks) {
        try {
          const typeMatch = block.match(/(?:bankruptcy|judgment|lien|civil|tax lien)/i);
          if (!typeMatch) continue;

          const amountMatch = block.match(/\$?([\d,]+)/);
          const dateMatch = block.match(/(?:filed|date)[:\s]+([^\n]+)/i);
          const statusMatch = block.match(/(?:status)[:\s]+([^\n]+)/i);

          records.push({
            type: typeMatch[0],
            court: '',
            amount: amountMatch ? parseAmount(amountMatch[1]) : null,
            dateFiled: dateMatch ? extractDate(dateMatch[1]) : '',
            dateResolved: '',
            bureau: extractBureau(block),
            status: statusMatch?.[1]?.trim() ?? '',
            remarks: block.trim(),
          });
        } catch {
          // skip this block
        }
      }
      return { records, detected: true, confidence: records.length > 0 ? 85 : 90 };
    }
  } catch {
    // fall through to not-detected
  }

  return { records: [], detected: false, confidence: 0 };
}

// ─── Second-pass negative classifier ─────────────────────────────────────────

function runSecondPassNegativeClassification(accounts: ParsedAccount[]): ParsedAccount[] {
  return accounts.map(account => {
    try {
      if (account.isNegative) return account;

      const isNeg = isNegativeAccount(account);
      const isColl = isCollectionAccount(account);

      if (isNeg || isColl) {
        return {
          ...account,
          isNegative: true,
          isCollection: isColl || account.isCollection,
          isChargeOff: account.isChargeOff || /charge.?off|charged off/i.test(`${account.status} ${account.accountType} ${account.remarks.join(' ')}`),
          isLate: account.isLate || /\blate\b|\bdelinquent\b/i.test(`${account.status} ${account.remarks.join(' ')}`),
          negativeReason: isColl ? 'Collection account' : detectNegativeReason(account),
        };
      }

      return account;
    } catch {
      return account;
    }
  });
}

// ─── Main parser ──────────────────────────────────────────────────────────────

function normalizeCanonicalToken(value: string): string {
  return safeNormalizeText(value)
    .toLowerCase()
    .replace(/\b(?:original creditor|na|n a|inc|llc|ltd|corp|corporation|company|services|service|systems|system|associates|assoc)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b\d{1,3}\s+(?=[a-z0-9])/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAccountNumberForKey(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9x*]/g, '');
  const visible = cleaned.replace(/[x*]+/g, '');
  return visible.length >= 4 ? visible : '';
}

function accountFamily(accountType = 'unknown'): string {
  const type = accountType.toLowerCase();
  if (/collection|debt buyer/.test(type)) return 'collection';
  if (/revolving|credit card|open account/.test(type)) return 'revolving';
  if (/installment|auto|loan/.test(type)) return 'installment';
  return normalizeCanonicalToken(accountType || 'unknown');
}

function collectionAgencyFamily(account: ParsedAccount): string {
  const name = normalizeCanonicalToken(account.creditorName ?? '');
  if (/\b(?:credit collection|credit coll)\b/.test(name)) return 'credit collection';
  if (/\b(?:credence resource mana|credence rm|credence)\b/.test(name)) return 'credence';
  if (/\b(?:national credit system|natlcrsys)\b/.test(name)) return 'national credit system';
  if (/\b(?:synergetic communicati|syncom)\b/.test(name)) return 'synergetic';
  if (/\b(?:southwest credit|sw crdt)\b/.test(name)) return 'southwest credit';
  if (/\b(?:portfolio recovery|portfolio recov)\b/.test(name)) return 'portfolio recovery';
  if (/\b(?:jefferson capital syst|jefferson capital)\b/.test(name)) return 'jefferson capital';
  if (/\b(?:columbia debt recovery|columbia debt)\b/.test(name)) return 'columbia debt recovery';
  if (/\b(?:cdr genesis)\b/.test(name)) return 'cdr genesis';
  if (/\b(?:1st crd srvc|1st credit)\b/.test(name)) return '1st credit service';
  if (/\b(?:indebted usa|indebted)\b/.test(name)) return 'indebted';
  return name;
}

function canonicalAccountKey(account: ParsedAccount): string {
  const original = normalizeCanonicalToken(account.originalCreditor ?? '');
  const furnisher = normalizeCanonicalToken(account.creditorName ?? '');
  const accountNumber = normalizeAccountNumberForKey(account.accountNumber || account.accountNumberMasked || '');
  const balance = account.balance == null ? 'na' : String(Math.round(account.balance));
  const opened = account.dateOpened || 'na';
  const family = accountFamily(account.accountType || 'unknown');

  if (original && (account.isCollection || isCollectionAccount(account) || family === 'collection')) {
    return `collection:${collectionAgencyFamily(account)}|orig:${original}`;
  }
  if (accountNumber) return `acct:${furnisher}|${accountNumber}`;
  if (original) return `orig:${original}|furnisher:${furnisher}|bal:${balance}|open:${opened}|family:${family}`;
  return `name:${furnisher}|bal:${balance}|open:${opened}|family:${family}`;
}

function displayOriginalCreditor(value: string): string {
  return safeNormalizeText(value).replace(/^\d{1,3}\s+/, '').replace(/\s+/g, ' ').trim();
}

function mergeCanonicalAccounts(tradelines: ParsedAccount[]): ParsedAccount[] {
  const groups = new Map<string, ParsedAccount[]>();
  for (const tradeline of tradelines) {
    const key = canonicalAccountKey(tradeline);
    groups.set(key, [...(groups.get(key) ?? []), { ...tradeline, canonicalKey: key }]);
  }

  return Array.from(groups.entries()).map(([canonicalKey, group]) => {
    const ranked = [...group].sort((a, b) => {
      if (a.isNegative !== b.isNegative) return a.isNegative ? -1 : 1;
      if (a.isCollection !== b.isCollection) return a.isCollection ? -1 : 1;
      return b.parserConfidence - a.parserConfidence;
    });
    const best = ranked[0];
    const bureaus = Array.from(new Set(group.flatMap(account => account.bureaus?.length ? account.bureaus : [account.bureau]).filter(Boolean)));
    const original = displayOriginalCreditor(best.originalCreditor ?? '');
    const bestCreditorName = best.creditorName ?? '';
    const creditorName = original && !normalizeCanonicalToken(bestCreditorName).includes(normalizeCanonicalToken(original))
      ? `${best.creditorName} / ${original}`
      : bestCreditorName;
    const isCollection = group.some(account => account.isCollection || isCollectionAccount(account));
    const isChargeOff = group.some(account => account.isChargeOff);
    const isLate = group.some(account => account.isLate);
    const isNegative = group.some(account => account.isNegative) || isCollection || isChargeOff || isLate;
    const negativeReason = isCollection
      ? 'Collection account'
      : isChargeOff
        ? 'Charge-off'
        : (group.find(account => account.negativeReason)?.negativeReason ?? (isNegative ? detectNegativeReason(best) : ''));

    return {
      ...best,
      id: canonicalKey.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(),
      canonicalKey,
      tradelines: group,
      creditorName,
      furnisherName: best.furnisherName || bestCreditorName,
      bureau: bureaus.length === 1 ? bureaus[0] : 'Multiple',
      bureaus,
      isNegative,
      negativeReason,
      isCollection,
      isChargeOff,
      isLate,
      rawText: group.map(account => account.rawText).filter(Boolean).join('\n\n--- Bureau Tradeline ---\n\n'),
      parserConfidence: Math.round(group.reduce((sum, account) => sum + account.parserConfidence, 0) / group.length),
    };
  }).filter(account => isPlausibleCreditorName(account.creditorName));
}

export interface OcrMetadata {
  isImageBasedPdf: boolean;
  ocrWasUsed: boolean;
  totalPdfPages: number;
  pagesWithEmbeddedText: number;
  pagesRequiringOcr: number;
  ocrPagesSucceeded: number;
  ocrPagesFailed: number;
  binaryBlocksSkipped: number;
  fileHash?: string;
  nativeExtractionQuality?: number;
  meanOcrConfidence?: number | null;
  extractionQuality?: number;
  processingDurationMs?: number;
  openAiGenerationCount?: number;
  cacheHit?: boolean;
  pageResults?: Array<{
    pageNumber: number;
    finalStatus: 'native_text' | 'ocr_primary' | 'ocr_retry' | 'ocr_fallback' | 'unreadable';
    failureReason: string | null;
  }>;
  primaryOcrSuccesses?: number;
  primaryOcrFailures?: number;
  retryRecoveries?: number;
  fallbackRecoveries?: number;
}

function hasIncompleteExtraction(ocrMeta?: OcrMetadata): boolean {
  return Boolean(ocrMeta && ocrMeta.totalPdfPages > 0 && ocrMeta.ocrPagesFailed > 0);
}

function sectionStatus(params: {
  resultCount: number;
  sectionDetected: boolean;
  parserFailed: boolean;
  extractionIncomplete: boolean;
  noneReportedDetected?: boolean;
}): ReportSectionStatus {
  if (params.parserFailed) return 'parser_failed';
  if (params.resultCount > 0) return 'parsed_with_results';
  if (params.noneReportedDetected) return 'parsed_none_reported';
  if (params.extractionIncomplete && !params.sectionDetected) return 'section_unreadable';
  return params.sectionDetected ? 'parsed_none_reported' : 'section_not_found';
}

export function parseCreditReport(
  rawText: string,
  forceProvider?: SupportedProvider,
  ocrMeta?: OcrMetadata
): ParsedCreditReport {
  const rawTextLength = (rawText ?? '').length;
  const stageFailures: ParseStageError[] = [];

  // ── Stage: normalization ──────────────────────────────────────────────────
  let safeText = '';
  try {
    safeText = safeNormalizeText(rawText ?? '');
  } catch (normErr: any) {
    stageFailures.push({ stage: 'normalization', message: normErr?.message ?? 'unknown normalization error', fatal: false });
    // Last-resort: strip non-ASCII
    try { safeText = (rawText ?? '').replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' '); } catch { safeText = ''; }
  }
  const normalizedTextLength = safeText.length;
  const reportDate = extractCreditReportDate(safeText);
  const sourceTextForDiagnostics = safeText;
  const inputWasHtml = hasHtmlStructure(rawText ?? '');

  const warnings: ParserWarning[] = [];
  const sectionsParsed: string[] = [];
  const sectionsMissed: string[] = [];
  // sectionsNotFound = sections that were not detected at all (vs detected but empty)
  const sectionsNotFound: string[] = [];
  const extractionIncomplete = hasIncompleteExtraction(ocrMeta);

  // Exclusion log for developer diagnostics
  const exclusionLog: { block: string; reason: string }[] = [];

  // ── OCR metadata defaults ─────────────────────────────────────────────────
  const isImageBasedPdf = ocrMeta?.isImageBasedPdf ?? false;
  const ocrWasUsed = ocrMeta?.ocrWasUsed ?? false;

  // Add OCR-related warnings if applicable
  if (isImageBasedPdf && ocrWasUsed) {
    warnings.push({
      section: 'Text Extraction',
      message: `This is an image-based PDF. OCR was used to extract text from ${ocrMeta?.ocrPagesSucceeded ?? 0} of ${ocrMeta?.totalPdfPages ?? 0} pages. Results may be less precise than text-based PDFs.`,
      severity: 'info',
    });
    if ((ocrMeta?.ocrPagesFailed ?? 0) > 0) {
      warnings.push({
        section: 'Text Extraction',
        message: `OCR failed on ${ocrMeta?.ocrPagesFailed} page(s). Some content may be missing.`,
        severity: 'warning',
      });
    }
  } else if (isImageBasedPdf && !ocrWasUsed) {
    warnings.push({
      section: 'Text Extraction',
      message: 'This PDF appears to be scanned or image-based. Text could not be extracted. Please upload a text-based PDF or enable OCR.',
      severity: 'error',
    });
    stageFailures.push({ stage: 'text_extraction', message: 'Image-based PDF — no readable text extracted. OCR unavailable.', fatal: false });
  }

  if (normalizedTextLength < rawTextLength * 0.5 && rawTextLength > 100 && !isImageBasedPdf && !inputWasHtml) {
    warnings.push({
      section: 'Text Extraction',
      message: 'The uploaded file contained a large number of unreadable characters. The report was partially extracted. For best results, use a text-based PDF export or paste the report text manually.',
      severity: 'warning',
    });
    stageFailures.push({ stage: 'text_extraction', message: `Normalized text is ${Math.round((normalizedTextLength / rawTextLength) * 100)}% of raw — possible binary/image PDF`, fatal: false });
  }

  try {
    // ── Stage: provider detection ─────────────────────────────────────────
    let provider: SupportedProvider = 'unknown';
    let providerConfidence = 0;
    try {
      const detected = forceProvider
        ? { provider: forceProvider, confidence: 100 }
        : detectProvider(safeText);
      provider = detected.provider;
      providerConfidence = detected.confidence;
      if (provider === 'unknown') {
        stageFailures.push({ stage: 'provider_detection', message: `Provider not detected (confidence: ${providerConfidence}%). Will attempt generic tri-merge parsing.`, fatal: false });
      }
    } catch (pdErr: any) {
      stageFailures.push({ stage: 'provider_detection', message: pdErr?.message ?? 'provider detection threw', fatal: false });
    }

    let canonicalHtml: CreditReportHtmlNormalizationResult | undefined;
    if (!inputWasHtml && safeText.trim().length > 0) {
      try {
        canonicalHtml = normalizeCreditReportToHtml(safeText, provider);
        const canonicalText = safeNormalizeText(canonicalHtml.html);
        if (canonicalHtml.diagnostics.accountSectionsProduced > 0) {
          safeText = `${safeText.trim()}\n\n${canonicalText}`.trim();
          stageFailures.push({
            stage: 'normalization',
            message: `Canonical HTML normalization produced ${canonicalHtml.diagnostics.accountSectionsProduced} account section(s).`,
            fatal: false,
          });
        }
      } catch (normalizationErr: any) {
        stageFailures.push({
          stage: 'normalization',
          message: `Canonical HTML normalization failed: ${normalizationErr?.message ?? 'unknown error'}`,
          fatal: false,
        });
      }
    }

    // Personal info
    let personalInfo: ParsedPersonalInfo = { name: '', nameVariations: [], ssn: '', dob: '', currentAddress: null, previousAddresses: [], employers: [], phones: [] };
    let personalConfidence = 0;
    try {
      const result = extractPersonalInfo(safeText);
      personalInfo = result.info;
      personalConfidence = result.confidence;
    } catch (e: any) {
      stageFailures.push({ stage: 'personal_info', message: e?.message ?? 'personal info extraction threw', fatal: false });
      warnings.push({ section: 'Personal Information', message: `Personal info extraction failed: ${e?.message ?? 'unknown error'}`, severity: 'warning' });
    }

    if (personalInfo.name || personalInfo.currentAddress) {
      sectionsParsed.push('Personal Information');
    } else {
      // Check if a personal info section header exists in the text
      const hasPersonalSection = /personal\s+information/i.test(safeText);
      if (hasPersonalSection) {
        // Section header found but no data extracted
        sectionsMissed.push('Personal Information');
        warnings.push({ section: 'Personal Information', message: 'Personal information section was detected but no data could be extracted. The format may differ from expected patterns.', severity: 'info' });
      } else {
        // Section not present in this report at all
        sectionsNotFound.push('Personal Information');
      }
    }

    // Scores
    let scores: ParsedScore[] = [];
    let scoreConfidence = 0;
    let scoreParserFailed = false;
    try {
      const result = extractScores(safeText);
      scores = result.scores;
      scoreConfidence = result.confidence;
    } catch (e: any) {
      scoreParserFailed = true;
      stageFailures.push({ stage: 'scores', message: e?.message ?? 'score extraction threw', fatal: false });
      warnings.push({ section: 'Credit Scores', message: `Score extraction failed: ${e?.message ?? 'unknown error'}`, severity: 'warning' });
    }
    const hasScoreSection = /(?:credit score|fico score|fico®|vantagescore)/i.test(safeText);

    if (scores.length > 0) {
      sectionsParsed.push('Credit Scores');
    } else {
      if (hasScoreSection) {
        // Score section header found but no scores extracted
        sectionsMissed.push('Credit Scores');
      } else {
        // No score section in this report
        sectionsNotFound.push('Credit Scores');
        warnings.push({ section: 'Credit Scores', message: 'Credit scores were not included in this report.', severity: 'info' });
      }
    }

    // Accounts — initial extraction with exclusion logging
    let rawAccounts: ParsedAccount[] = [];
    let accountConfidence = 0;
    let unparsedBlocks: string[] = [];
    let totalBlocks = 0;
    let fallbackUsed = false;
    let binaryBlocksSkippedInAccounts = 0;
    let readableBlocksAccepted = 0;
    let readableBlocksRejected = 0;
    let fallbackConsumedBlocks: string[] = [];
    let rejectedAccountCandidates: { block: string; reason: string }[] = [];
    let accountFragmentsMerged = 0;
    let accountParserFailed = false;
    try {
      const result = extractAccounts(safeText, exclusionLog);
      rawAccounts = result.accounts;
      accountConfidence = result.confidence;
      unparsedBlocks = result.unparsedBlocks;
      totalBlocks = result.totalBlocks;
      fallbackUsed = result.fallbackUsed;
      binaryBlocksSkippedInAccounts = result.binaryBlocksSkipped;
      readableBlocksAccepted = result.readableBlocksAccepted;
      readableBlocksRejected = result.readableBlocksRejected;
      fallbackConsumedBlocks = result.fallbackConsumedBlocks;
      rejectedAccountCandidates = result.rejectedAccountCandidates;
      accountFragmentsMerged = result.accountFragmentsMerged;
    } catch (e: any) {
      accountParserFailed = true;
      stageFailures.push({ stage: 'account_parsing', message: e?.message ?? 'account extraction threw', fatal: false });
      warnings.push({ section: 'Accounts', message: `Account extraction failed: ${e?.message ?? 'unknown error'}`, severity: 'error' });
    }

    // Only show unparsed block warning for readable blocks, not binary skips
    if (readableBlocksRejected > 0) {
      warnings.push({
        section: 'Parser',
        message: `${readableBlocksRejected} readable text block(s) could not be matched to accounts. ${binaryBlocksSkippedInAccounts > 0 ? `${binaryBlocksSkippedInAccounts} binary/image stream block(s) were skipped (not counted as rejections). ` : ''}${fallbackUsed ? 'Fallback parser was used to recover accounts.' : ''} See developer console for details.`,
        severity: 'info',
      });
    } else if (binaryBlocksSkippedInAccounts > 0) {
      // Binary blocks were skipped — inform user without alarming them
      warnings.push({
        section: 'Parser',
        message: `${binaryBlocksSkippedInAccounts} binary/image stream block(s) were detected and skipped. This is normal for image-based PDFs.`,
        severity: 'info',
      });
    }

    if (fallbackUsed && rawAccounts.length > 0) {
      warnings.push({
        section: 'Parser',
        message: `Primary parser found 0 accounts. Fallback normalized parser recovered ${rawAccounts.length} account(s). Results may be less precise — review before saving.`,
        severity: 'warning',
      });
    }

    // Second-pass negative classification
    let bureauTradelines: ParsedAccount[] = rawAccounts;
    let accounts: ParsedAccount[] = rawAccounts;
    try {
      bureauTradelines = runSecondPassNegativeClassification(rawAccounts);
      accounts = mergeCanonicalAccounts(bureauTradelines);
    } catch (e: any) {
      stageFailures.push({ stage: 'negative_classification', message: e?.message ?? 'negative classification threw', fatal: false });
      warnings.push({ section: 'Negative Classification', message: `Second-pass classification failed: ${e?.message ?? 'unknown error'}`, severity: 'warning' });
    }
    if (provider === 'experian') {
      accounts = enrichExperianAccountsFromAdjacentMetadata(safeText, accounts).map(account => {
        const isCollection = hasConfirmedCollectionEvidence(account);
        const isChargeOff = /charge.?off|charged off/i.test(`${account.accountType} ${account.status} ${account.remarks.join(' ')}`);
        const isLate = (account.latePayments ?? []).some(item => item.count > 0)
          || /\b(?:30|60|90|120|150|180)\s+days?\s+late\b|\blate payment\b|\bdelinquent\b/i.test(`${account.status} ${account.remarks.join(' ')}`);
        const isNegative = hasAccountSpecificNegativeEvidence(account);
        return {
          ...account,
          isCollection,
          isChargeOff,
          isLate,
          isNegative,
          negativeReason: isNegative ? (isCollection ? 'Collection account' : detectNegativeReason(account)) : '',
        };
      });
    }
    const reconciledAccountCount = accounts.length;
    accounts = accounts.filter(account => isPlausibleCreditorName(account.creditorName ?? ''));
    // Confidence must describe the reconciled identities, not the number of
    // weak fragments encountered before semantic validation.
    if (reconciledAccountCount > 0) {
      const legitimateIdentityRatio = accounts.length / reconciledAccountCount;
      accountConfidence = Math.round(accountConfidence * legitimateIdentityRatio);
    }
    if (provider === 'experian' && accounts.length > 0) {
      const metadataCompleteness = accounts.reduce((sum, account) => sum + [
        account.accountType && account.accountType !== 'Unknown',
        Boolean(account.status),
        account.balance !== null,
        Boolean(account.dateOpened),
        Boolean(account.responsibility),
      ].filter(Boolean).length / 5, 0) / accounts.length;
      accountConfidence = Math.round(accountConfidence * (0.45 + metadataCompleteness * 0.55));
    }
    const blockDispositions = canonicalHtml?.blockDispositions
      ?? buildBlockDispositions(sourceTextForDiagnostics, provider, accounts, fallbackConsumedBlocks, rejectedAccountCandidates);
    const reconciliation = summarizeBlockDispositions(blockDispositions);
    const hasAccountSection = /(?:accounts?|tradelines?|credit accounts?|account information)/i.test(safeText);

    if (accounts.length > 0) {
      sectionsParsed.push('Accounts');
    } else {
      // Check if an account section header exists
      if (hasAccountSection) {
        // Section found but no accounts extracted
        sectionsMissed.push('Accounts');
        warnings.push({ section: 'Accounts', message: 'Account section was detected but no accounts could be extracted. The report may use an unsupported format. Try selecting the provider manually or paste the report text.', severity: 'warning' });
      } else {
        // No account section found at all
        sectionsNotFound.push('Accounts');
        warnings.push({ section: 'Accounts', message: 'No account section was found in this report. Try selecting the provider manually or paste the report text.', severity: 'warning' });
      }
    }

    const negativeAccounts = accounts.filter(a => a.isNegative);
    const negativeClassificationRan = accounts.length > 0;

    if (negativeClassificationRan && negativeAccounts.length === 0 && accounts.length > 0) {
      warnings.push({
        section: 'Negative Items',
        message: `${accounts.length} accounts were found, but no negative items were detected. Review account classifications before saving — use the Review Accounts button to manually classify.`,
        severity: 'warning',
      });
    }

    if (negativeAccounts.length > 0) sectionsParsed.push('Negative Items');

    // Inquiries
    let inquiries: ParsedInquiry[] = [];
    let inquiryConfidence = 0;
    let inquiryParserFailed = false;
    try {
      const result = extractInquiries(safeText);
      inquiries = result.inquiries;
      inquiryConfidence = result.confidence;
    } catch (e: any) {
      inquiryParserFailed = true;
      stageFailures.push({ stage: 'inquiries', message: e?.message ?? 'inquiry extraction threw', fatal: false });
      warnings.push({ section: 'Inquiries', message: `Inquiry extraction failed: ${e?.message ?? 'unknown error'}`, severity: 'warning' });
    }
    const hasInquirySection = /(?:hard inquiries|credit inquiries|inquiries|requests viewed by others)/i.test(safeText);

    if (inquiries.length > 0) {
      sectionsParsed.push('Inquiries');
    } else {
      if (hasInquirySection) {
        // Inquiry section found but no inquiries extracted
        sectionsMissed.push('Inquiries');
      } else {
        // No inquiry section in this report
        sectionsNotFound.push('Inquiries');
      }
    }

    // Public records
    let publicRecords: ParsedPublicRecord[] = [];
    let prDetected = false;
    let prConfidence = 0;
    let publicRecordsParserFailed = false;
    try {
      const result = extractPublicRecords(safeText);
      publicRecords = result.records;
      prDetected = result.detected;
      prConfidence = result.confidence;
    } catch (e: any) {
      publicRecordsParserFailed = true;
      stageFailures.push({ stage: 'public_records', message: e?.message ?? 'public records extraction threw', fatal: false });
      warnings.push({ section: 'Public Records', message: `Public records extraction failed: ${e?.message ?? 'unknown error'}`, severity: 'warning' });
    }

    const bankruptcies = publicRecords.filter(r => /bankruptcy/i.test(r.type));

    if (prDetected) {
      sectionsParsed.push('Public Records');
      if (publicRecords.length === 0) {
        warnings.push({ section: 'Public Records', message: 'Public records section detected; no public records were reported.', severity: 'info' });
      }
    } else {
      // Public records section not found in this report
      sectionsNotFound.push('Public Records');
    }

    // Categorize accounts
    const positiveAccounts = accounts.filter(a => !a.isNegative);
    const collections = accounts.filter(a => a.isCollection);
    const chargeOffs = accounts.filter(a => a.isChargeOff);
    const latePaymentsAccounts = accounts.filter(a => a.isLate);
    const closedAccounts = accounts.filter(a => a.dateClosed || /closed/i.test(a.status));
    const openAccounts = accounts.filter(a => !a.dateClosed && !/closed/i.test(a.status));

    if (collections.length > 0) sectionsParsed.push('Collections');
    if (chargeOffs.length > 0) sectionsParsed.push('Charge-offs');
    const publicRecordsNoneReported = prDetected && publicRecords.length === 0;
    const sectionStatuses: ReportSectionStatuses = {
      creditScores: sectionStatus({
        resultCount: scores.length,
        sectionDetected: hasScoreSection,
        parserFailed: scoreParserFailed,
        extractionIncomplete,
      }),
      inquiries: sectionStatus({
        resultCount: inquiries.length,
        sectionDetected: hasInquirySection,
        parserFailed: inquiryParserFailed,
        extractionIncomplete,
      }),
      collections: sectionStatus({
        resultCount: collections.length,
        sectionDetected: hasAccountSection || accounts.length > 0,
        parserFailed: accountParserFailed,
        extractionIncomplete,
      }),
      publicRecords: sectionStatus({
        resultCount: publicRecords.length,
        sectionDetected: prDetected,
        parserFailed: publicRecordsParserFailed,
        extractionIncomplete,
        noneReportedDetected: publicRecordsNoneReported,
      }),
      chargeOffs: sectionStatus({
        resultCount: chargeOffs.length,
        sectionDetected: hasAccountSection || accounts.length > 0,
        parserFailed: accountParserFailed,
        extractionIncomplete,
      }),
      accounts: sectionStatus({
        resultCount: accounts.length,
        sectionDetected: hasAccountSection,
        parserFailed: accountParserFailed,
        extractionIncomplete,
      }),
    };

    // Bureau differences
    const bureauDifferences: BureauDifference[] = [];
    try {
      const accountsByCreditor: Record<string, ParsedAccount[]> = {};
      for (const acc of accounts) {
        if (!accountsByCreditor[acc.creditorName]) accountsByCreditor[acc.creditorName] = [];
        accountsByCreditor[acc.creditorName].push(acc);
      }
      for (const [creditor, accs] of Object.entries(accountsByCreditor)) {
        if (accs.length > 1) {
          const balances = accs.map(a => String(a.balance ?? ''));
          if (new Set(balances).size > 1) {
            bureauDifferences.push({
              field: `${creditor} - Balance`,
              equifax: accs.find(a => a.bureau === 'Equifax')?.balance?.toString() ?? 'N/A',
              experian: accs.find(a => a.bureau === 'Experian')?.balance?.toString() ?? 'N/A',
              transunion: accs.find(a => a.bureau === 'TransUnion')?.balance?.toString() ?? 'N/A',
            });
          }
        }
      }
    } catch {
      // bureau differences are non-critical
    }

    if (bureauDifferences.length > 0) sectionsParsed.push('Bureau Differences');

    // Section-level confidence
    const sectionConfidence: SectionConfidence = {
      providerDetection: providerConfidence,
      personalInfo: personalConfidence,
      accounts: accountConfidence,
      negativeClassification: negativeClassificationRan ? (negativeAccounts.length > 0 ? 90 : 70) : 0,
      inquiries: inquiryConfidence,
      publicRecords: prConfidence,
      overall: 0,
    };

    const weights = {
      providerDetection: 0.20,
      personalInfo: 0.10,
      accounts: 0.35,
      negativeClassification: 0.20,
      inquiries: 0.10,
      publicRecords: 0.05,
    };

    sectionConfidence.overall = Math.round(
      sectionConfidence.providerDetection * weights.providerDetection +
      sectionConfidence.personalInfo * weights.personalInfo +
      sectionConfidence.accounts * weights.accounts +
      sectionConfidence.negativeClassification * weights.negativeClassification +
      sectionConfidence.inquiries * weights.inquiries +
      sectionConfidence.publicRecords * weights.publicRecords
    );

    if (provider === 'experian' && reconciliation.readableBlocks > 0) {
      const unresolvedRatio = reconciliation.preservedUnclassifiedBlocks / reconciliation.readableBlocks;
      sectionConfidence.overall = Math.round(sectionConfidence.overall * (1 - Math.min(0.35, unresolvedRatio * 0.5)));
    }

    // Boost: if accounts were found, overall confidence is at least 50
    if (accounts.length > 0 && sectionConfidence.overall < 50) {
      sectionConfidence.overall = 50;
    }

    const overallConfidence = sectionConfidence.overall;

    if (overallConfidence < 50) {
      warnings.push({
        section: 'Overall',
        message: 'Parser confidence is below 50%. Manual review required. Negative items will not be auto-created from this parse. Please select the correct provider or review accounts manually.',
        severity: 'warning',
      });
    }

    if (sectionsNotFound.length > 0) {
      warnings.push({
        section: 'Parser',
        message: `Sections not found in this report: ${sectionsNotFound.join(', ')}. This is normal if the report does not include these sections.`,
        severity: 'info',
      });
    }

    // Build diagnostics object for developer console
    const diagnostics: ParserDiagnostics = {
      providerSelected: provider,
      providerConfidence,
      totalTextBlocks: totalBlocks,
      excludedBlocks: exclusionLog.length,
      exclusionReasons: exclusionLog,
      blockDispositions,
      classifiedBlocks: reconciliation.classifiedBlocks,
      duplicateBlocks: reconciliation.duplicateBlocks,
      boilerplateBlocks: reconciliation.boilerplateBlocks,
      preservedUnclassifiedBlocks: reconciliation.preservedUnclassifiedBlocks,
      fallbackConsumedBlocks: blockDispositions.filter(block => block.finalDisposition === 'fallback-account').length,
      rejectedAccountCandidates,
      accountFragmentsMerged,
      canonicalHtml: canonicalHtml?.diagnostics,
      reconciliation,
      accountsDetected: accounts.length,
      inquiriesDetected: inquiries.length,
      scoresDetected: scores.length,
      finalConfidence: overallConfidence,
      sectionConfidence: {
        providerDetection: sectionConfidence.providerDetection,
        personalInfo: sectionConfidence.personalInfo,
        accounts: sectionConfidence.accounts,
        negativeClassification: sectionConfidence.negativeClassification,
        inquiries: sectionConfidence.inquiries,
        publicRecords: sectionConfidence.publicRecords,
      },
      sectionStatuses,
      fallbackUsed,
      rawTextLength,
      normalizedTextLength,
      stageFailures,
      // New image-based PDF counters
      totalPdfPages: ocrMeta?.totalPdfPages ?? 0,
      pagesWithEmbeddedText: ocrMeta?.pagesWithEmbeddedText ?? 0,
      pagesRequiringOcr: ocrMeta?.pagesRequiringOcr ?? 0,
      ocrPagesSucceeded: ocrMeta?.ocrPagesSucceeded ?? 0,
      ocrPagesFailed: ocrMeta?.ocrPagesFailed ?? 0,
      binaryBlocksSkipped: (ocrMeta?.binaryBlocksSkipped ?? 0) + binaryBlocksSkippedInAccounts,
      readableTextBlocksAccepted: readableBlocksAccepted,
      readableTextBlocksRejected: readableBlocksRejected,
      isImageBasedPdf,
      ocrWasUsed,
    };

    // Log diagnostics to developer console (never exposes raw consumer report data)
    logDiagnostics(diagnostics);

    return {
      provider,
      providerConfidence,
      parserVersion: '3.8.0',
      parsedAt: new Date().toISOString(),
      reportDate,
      rawText: safeText,
      personalInfo,
      scores,
      accounts,
      negativeAccounts,
      positiveAccounts,
      collections,
      chargeOffs,
      latePayments: latePaymentsAccounts,
      closedAccounts,
      openAccounts,
      inquiries,
      publicRecords,
      bankruptcies,
      bureauDifferences,
      warnings,
      sectionsParsed,
      sectionsMissed,
      sectionsNotFound,
      overallConfidence,
      sectionConfidence,
      sectionStatuses,
      negativeClassificationRan,
      unparsedBlocks,
      diagnostics,
      bureauTradelines,
      canonicalAccounts: accounts,
      blockDispositions,
    };
  } catch (fatalErr: any) {
    stageFailures.push({ stage: 'account_parsing', message: fatalErr?.message ?? 'fatal parser error', fatal: true });

    // Log minimal diagnostics even on fatal error
    try {
      console.debug('[CreditReportParser] FATAL ERROR ──────────────────────────');
      console.debug(`  Stage failures: ${stageFailures.map(f => `${f.stage}: ${f.message}`).join('; ')}`);
      console.debug(`  Raw text length: ${rawTextLength}, Normalized: ${normalizedTextLength}`);
      console.debug('[CreditReportParser] ────────────────────────────────────');
    } catch { /* logging must never crash */ }

    warnings.push({
      section: 'Parser',
      message: `Parser encountered a fatal error at stage: ${stageFailures[stageFailures.length - 1]?.stage ?? 'unknown'}. ${fatalErr?.message ?? 'unknown error'}. The report could not be fully parsed. Try pasting the report text manually or selecting a different provider.`,
      severity: 'error',
    });

    const emptySectionConfidence: SectionConfidence = {
      providerDetection: 0,
      personalInfo: 0,
      accounts: 0,
      negativeClassification: 0,
      inquiries: 0,
      publicRecords: 0,
      overall: 0,
    };
    const failedSectionStatuses: ReportSectionStatuses = {
      creditScores: 'parser_failed',
      inquiries: 'parser_failed',
      collections: 'parser_failed',
      publicRecords: 'parser_failed',
      chargeOffs: 'parser_failed',
      accounts: 'parser_failed',
    };

    return {
      provider: forceProvider ?? 'unknown',
      providerConfidence: 0,
      parserVersion: '3.8.0',
      parsedAt: new Date().toISOString(),
      reportDate,
      rawText: safeText,
      personalInfo: { name: '', nameVariations: [], ssn: '', dob: '', currentAddress: null, previousAddresses: [], employers: [], phones: [] },
      scores: [],
      accounts: [],
      negativeAccounts: [],
      positiveAccounts: [],
      collections: [],
      chargeOffs: [],
      latePayments: [],
      closedAccounts: [],
      openAccounts: [],
      inquiries: [],
      publicRecords: [],
      bankruptcies: [],
      bureauDifferences: [],
      warnings,
      sectionsParsed: [],
      sectionsMissed: [],
      sectionsNotFound: ['Personal Information', 'Credit Scores', 'Accounts', 'Inquiries', 'Public Records'],
      overallConfidence: 0,
      sectionConfidence: emptySectionConfidence,
      sectionStatuses: failedSectionStatuses,
      negativeClassificationRan: false,
      unparsedBlocks: [],
      diagnostics: {
        providerSelected: forceProvider ?? 'unknown',
        providerConfidence: 0,
        totalTextBlocks: 0,
        excludedBlocks: 0,
        exclusionReasons: [],
        blockDispositions: [],
        classifiedBlocks: 0,
        duplicateBlocks: 0,
        boilerplateBlocks: 0,
        preservedUnclassifiedBlocks: 0,
        fallbackConsumedBlocks: 0,
        rejectedAccountCandidates: [],
        accountFragmentsMerged: 0,
        reconciliation: {
          readableBlocks: 0,
          classifiedBlocks: 0,
          duplicateBlocks: 0,
          boilerplateBlocks: 0,
          preservedUnclassifiedBlocks: 0,
          accountedFor: 0,
        },
        accountsDetected: 0,
        inquiriesDetected: 0,
        scoresDetected: 0,
        finalConfidence: 0,
        sectionConfidence: {},
        sectionStatuses: failedSectionStatuses,
        fallbackUsed: false,
        rawTextLength,
        normalizedTextLength,
        stageFailures,
        totalPdfPages: ocrMeta?.totalPdfPages ?? 0,
        pagesWithEmbeddedText: ocrMeta?.pagesWithEmbeddedText ?? 0,
        pagesRequiringOcr: ocrMeta?.pagesRequiringOcr ?? 0,
        ocrPagesSucceeded: ocrMeta?.ocrPagesSucceeded ?? 0,
        ocrPagesFailed: ocrMeta?.ocrPagesFailed ?? 0,
        binaryBlocksSkipped: ocrMeta?.binaryBlocksSkipped ?? 0,
        readableTextBlocksAccepted: 0,
        readableTextBlocksRejected: 0,
        isImageBasedPdf: ocrMeta?.isImageBasedPdf ?? false,
        ocrWasUsed: ocrMeta?.ocrWasUsed ?? false,
      },
    };
  }
}

export { DISPUTE_REASONS } from '@/lib/disputes/reasonRanking';

export const DISPUTE_INSTRUCTIONS = [
  'Delete this account',
  'Correct the reporting',
  'Verify all information',
  'Update balance',
  'Update payment history',
  'Remove late payments',
  'Remove duplicate reporting',
  'Remove unauthorized inquiry',
  'Remove obsolete information',
  'Provide method of verification',
];

export const DISPUTE_STATUSES = [
  'draft',
  'ready',
  'generated',
  'sent',
  'waiting_for_response',
  'updated',
  'deleted',
  'verified',
  'escalated',
  'closed',
] as const;

export type DisputeStatus = typeof DISPUTE_STATUSES[number];

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  generated: 'Generated',
  sent: 'Sent/Mailed',
  waiting_for_response: 'Waiting for Response',
  updated: 'Updated',
  deleted: 'Deleted',
  verified: 'Verified',
  escalated: 'Escalated',
  closed: 'Closed',
};
