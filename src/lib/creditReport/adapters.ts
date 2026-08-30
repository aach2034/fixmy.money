'use client';
// ─── Provider Adapter Architecture ───────────────────────────────────────────
// Each adapter converts a provider-specific report into the NormalizedReport schema.
// No adapter is allowed to crash on malformed input — all errors are captured as warnings.

import { normalizeCreditReportToHtml, safeNormalizeText, type SupportedProvider } from './parser';
import { extractCreditReportDate } from './dateValidation';
import { isReliableInquiry } from './auditItems';

// ─── Normalized Schema ────────────────────────────────────────────────────────

export interface NormalizedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  raw: string;
}

export interface NormalizedClientInfo {
  name: string;
  currentAddress: NormalizedAddress | null;
  previousAddresses: NormalizedAddress[];
  dobMasked: string;
  ssnMasked: string;
  employers: string[];
}

export interface NormalizedScore {
  bureau: 'TransUnion' | 'Equifax' | 'Experian' | string;
  score: number;
  model: string;
  date: string;
}

export interface NormalizedAccount {
  id: string;
  creditorName: string;
  furnisherName: string;
  bureau: string;
  bureaus: string[];
  accountNumberMasked: string;
  accountType: string;
  responsibility: string;
  dateOpened: string;
  accountStatus: string;
  paymentStatus: string;
  balance: number | null;
  originalBalance?: number | null;
  collectionAmount?: number | null;
  chargeOffAmount?: number | null;
  highBalance?: number | null;
  creditLimit: number | null;
  pastDue: number | null;
  monthlyPayment: number | null;
  lastPaymentDate: string;
  dateReported: string;
  paymentHistory: string;
  remarks: string[];
  originalCreditor: string;
  collectionAgency: string;
  isNegative: boolean;
  negativeReason: string;
  isCollection: boolean;
  isChargeOff: boolean;
  isLate: boolean;
  rawText: string;
  parserConfidence: number;
}

export interface NormalizedInquiry {
  creditor: string;
  bureau: string;
  date: string;
  type: 'hard' | 'soft';
  purpose: string;
}

export interface NormalizedPublicRecord {
  recordType: string;
  bureau: string;
  filingDate: string;
  status: string;
  courtOrSource: string;
  referenceNumber: string;
}

export interface NormalizedCollection {
  collectionAgency: string;
  originalCreditor: string;
  bureau: string;
  balance: number | null;
  accountNumber: string;
  openedDate: string;
  reportedDate: string;
  status: string;
}

export interface AdapterWarning {
  section: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface SectionConfidenceMap {
  providerDetection: number;
  personalInfo: number;
  accounts: number;
  negativeClassification: number;
  inquiries: number;
  publicRecords: number;
  overall: number;
}

export interface NormalizedReport {
  // Adapter metadata
  detectedProvider: SupportedProvider;
  providerConfidence: number;
  adapterUsed: string;
  parserVersion: string;
  parsedAt: string;
  warnings: AdapterWarning[];
  unsupportedSections: string[];
  accountsParsed: number;
  accountsRejected: number;
  rejectionReasons: string[];
  sectionConfidence: SectionConfidenceMap;

  // Report data
  reportDate: string;
  clientInfo: NormalizedClientInfo;
  scores: NormalizedScore[];
  accounts: NormalizedAccount[];
  inquiries: NormalizedInquiry[];
  publicRecords: NormalizedPublicRecord[];
  collections: NormalizedCollection[];
}

// ─── Negative classification helpers ─────────────────────────────────────────

const NEGATIVE_STATUSES = [
  'collection', 'charge off', 'charge-off', 'chargeoff',
  'late', 'delinquent', 'derogatory', 'repossession', 'foreclosure',
  'bankruptcy', 'written off', 'past due', 'default', 'settled',
  'transferred', 'profit and loss', 'bad debt',
];

const NEGATIVE_REMARKS = [
  'account charged off', 'placed for collection', 'past due',
  'seriously past due', 'collection account', 'paid charge off',
  'unpaid', 'derogatory', 'adverse',
];

export function classifyNegative(status: string, remarks: string[], paymentStatus: string): {
  isNegative: boolean;
  isCollection: boolean;
  isChargeOff: boolean;
  isLate: boolean;
  negativeReason: string;
} {
  const s = (status + ' ' + paymentStatus).toLowerCase();
  const r = remarks.join(' ').toLowerCase();

  const isChargeOff = s.includes('charge') || r.includes('charged off');
  const isCollection = s.includes('collection') || r.includes('collection');
  const isLate = /\b(30|60|90|120|150|180)\s*day/i.test(s + ' ' + r) || s.includes('late') || s.includes('delinquent');
  const isNegative = isChargeOff || isCollection || isLate ||
    NEGATIVE_STATUSES.some(n => s.includes(n)) ||
    NEGATIVE_REMARKS.some(n => r.includes(n));

  let negativeReason = '';
  if (isChargeOff) negativeReason = 'Charge-off';
  else if (isCollection) negativeReason = 'Collection account';
  else if (isLate) negativeReason = 'Late payment history';
  else if (isNegative) negativeReason = 'Derogatory status';

  return { isNegative, isCollection, isChargeOff, isLate, negativeReason };
}

// ─── Base adapter ─────────────────────────────────────────────────────────────

abstract class BaseAdapter {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly supportedProviders: SupportedProvider[];

  protected warnings: AdapterWarning[] = [];
  protected rejectionReasons: string[] = [];
  protected accountsRejected = 0;

  protected warn(section: string, message: string, severity: AdapterWarning['severity'] = 'warning') {
    this.warnings.push({ section, message, severity });
  }

  protected makeId(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  protected parseAmount(raw: string): number | null {
    if (!raw) return null;
    const cleaned = raw.replace(/[$,\s]/g, '').replace(/[()]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }

  protected maskAccount(raw: string): string {
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) return '****' + digits.slice(-4);
    return raw.replace(/./g, '*').slice(0, -2) + raw.slice(-2);
  }

  abstract parse(text: string, hint?: SupportedProvider): NormalizedReport;
}

// ─── Generic / Fallback Adapter ───────────────────────────────────────────────

class GenericAdapter extends BaseAdapter {
  readonly name = 'generic';
  readonly version = '1.0.0';
  readonly supportedProviders: SupportedProvider[] = ['unknown'];

  parse(text: string, hint?: SupportedProvider): NormalizedReport {
    this.warnings = [];
    this.rejectionReasons = [];
    this.accountsRejected = 0;

    const normalized = safeNormalizeText(text);
    const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

    const scores = this.extractScores(normalized);
    const accounts = this.extractAccounts(normalized, lines);
    const inquiries = this.extractInquiries(normalized, lines);
    const clientInfo = this.extractClientInfo(normalized, lines);
    const reportDate = this.extractReportDate(normalized);

    const providerConfidence = this.detectProvider(normalized);

    const sectionConfidence: SectionConfidenceMap = {
      providerDetection: providerConfidence.confidence,
      personalInfo: clientInfo.name ? 60 : 20,
      accounts: accounts.length > 0 ? 65 : 10,
      negativeClassification: accounts.filter(a => a.isNegative).length > 0 ? 70 : 40,
      inquiries: inquiries.length > 0 ? 70 : 20,
      publicRecords: 0,
      overall: 0,
    };
    sectionConfidence.overall = Math.round(
      Object.values(sectionConfidence).reduce((a, b) => a + b, 0) / 6
    );

    if (accounts.length === 0) {
      this.warn('accounts', 'No accounts detected. Report may be image-based or use an unsupported format.', 'error');
    }

    return {
      detectedProvider: providerConfidence.provider,
      providerConfidence: providerConfidence.confidence,
      adapterUsed: this.name,
      parserVersion: this.version,
      parsedAt: new Date().toISOString(),
      warnings: this.warnings,
      unsupportedSections: [],
      accountsParsed: accounts.length,
      accountsRejected: this.accountsRejected,
      rejectionReasons: this.rejectionReasons,
      sectionConfidence,
      reportDate,
      clientInfo,
      scores,
      accounts,
      inquiries,
      publicRecords: [],
      collections: accounts.filter(a => a.isCollection).map(a => ({
        collectionAgency: a.collectionAgency || a.creditorName,
        originalCreditor: a.originalCreditor || '',
        bureau: a.bureau,
        balance: a.balance,
        accountNumber: a.accountNumberMasked,
        openedDate: a.dateOpened,
        reportedDate: a.dateReported,
        status: a.accountStatus,
      })),
    };
  }

  private detectProvider(text: string): { provider: SupportedProvider; confidence: number } {
    const t = text.toLowerCase();
    const checks: Array<{ provider: SupportedProvider; patterns: string[]; weight: number }> = [
      { provider: 'smartcredit', patterns: ['smartcredit', 'smart credit'], weight: 90 },
      { provider: 'myscoreiq', patterns: ['myscoreiq', 'my score iq', 'fico max'], weight: 90 },
      { provider: 'identityiq', patterns: ['identityiq', 'identity iq'], weight: 90 },
      { provider: 'myfreescorenow', patterns: ['myfreescorenow', 'my free score now'], weight: 90 },
      { provider: 'privacyguard', patterns: ['privacyguard', 'privacy guard'], weight: 90 },
      { provider: 'annualcreditreport', patterns: ['annualcreditreport', 'annual credit report'], weight: 85 },
      { provider: 'experian', patterns: ['experian'], weight: 80 },
      { provider: 'equifax', patterns: ['equifax'], weight: 80 },
      { provider: 'transunion', patterns: ['transunion', 'trans union'], weight: 80 },
    ];

    for (const check of checks) {
      if (check.patterns.some(p => t.includes(p))) {
        return { provider: check.provider, confidence: check.weight };
      }
    }
    return { provider: 'unknown', confidence: 20 };
  }

  private extractReportDate(text: string): string {
    return extractCreditReportDate(text);
  }

  private extractClientInfo(text: string, lines: string[]): NormalizedClientInfo {
    let name = '';
    const namePatterns = [
      /(?:name|consumer)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
      /^([A-Z][A-Z\s]+)$/m,
    ];
    for (const p of namePatterns) {
      const m = text.match(p);
      if (m && m[1].length > 3 && m[1].length < 60) {
        name = m[1].trim();
        break;
      }
    }

    const ssnMatch = text.match(/(?:ssn|social)[:\s#*]+([*\dX]{3}[-\s]?[*\dX]{2}[-\s]?\d{4})/i);
    const dobMatch = text.match(/(?:dob|date of birth|born)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

    return {
      name,
      currentAddress: null,
      previousAddresses: [],
      dobMasked: dobMatch ? dobMatch[1].replace(/\d(?=\d{2}$)/, '*') : '',
      ssnMasked: ssnMatch ? ssnMatch[1] : '',
      employers: [],
    };
  }

  private extractScores(text: string): NormalizedScore[] {
    const scores: NormalizedScore[] = [];
    const bureauPatterns: Array<{ bureau: string; patterns: RegExp[] }> = [
      {
        bureau: 'TransUnion',
        patterns: [
          /transunion[^0-9]*(\d{3})/i,
          /tu[:\s]+(\d{3})/i,
        ],
      },
      {
        bureau: 'Equifax',
        patterns: [
          /equifax[^0-9]*(\d{3})/i,
          /eq[:\s]+(\d{3})/i,
        ],
      },
      {
        bureau: 'Experian',
        patterns: [
          /experian[^0-9]*(\d{3})/i,
          /ex[:\s]+(\d{3})/i,
        ],
      },
    ];

    for (const { bureau, patterns } of bureauPatterns) {
      for (const p of patterns) {
        const m = text.match(p);
        if (m) {
          const score = parseInt(m[1], 10);
          if (score >= 300 && score <= 850) {
            scores.push({ bureau, score, model: '', date: '' });
            break;
          }
        }
      }
    }

    // Fallback: find any 3-digit score in range
    if (scores.length === 0) {
      const allScores = [...text.matchAll(/\b([3-8]\d{2})\b/g)];
      for (const m of allScores.slice(0, 3)) {
        const score = parseInt(m[1], 10);
        if (score >= 300 && score <= 850) {
          scores.push({ bureau: 'Unknown', score, model: '', date: '' });
        }
      }
    }

    return scores;
  }

  private extractAccounts(text: string, lines: string[]): NormalizedAccount[] {
    const accounts: NormalizedAccount[] = [];

    // Split text into account blocks by common separators
    const blocks = text.split(/(?:\n\s*\n|\-{10,}|={10,})/);

    for (const block of blocks) {
      if (block.length < 30) continue;

      const creditorMatch = block.match(/(?:creditor|account\s+name|furnisher)[:\s]+([^\n]+)/i);
      const accountNumMatch = block.match(/(?:account\s*(?:number|#|no)[:\s]+)([*\dX\-\s]{4,20})/i);
      const balanceMatch = block.match(/(?:balance|amount)[:\s]+\$?([\d,]+(?:\.\d{2})?)/i);
      const statusMatch = block.match(/(?:account\s+status|status)[:\s]+([^\n]+)/i);
      const typeMatch = block.match(/(?:account\s+type|type)[:\s]+([^\n]+)/i);
      const dateOpenedMatch = block.match(/(?:date\s+opened|opened)[:\s]+([^\n]+)/i);
      const bureauMatch = block.match(/\b(TransUnion|Equifax|Experian)\b/i);

      if (!creditorMatch && !accountNumMatch) {
        this.accountsRejected++;
        this.rejectionReasons.push('Block missing creditor name and account number');
        continue;
      }

      const creditorName = creditorMatch ? creditorMatch[1].trim().slice(0, 80) : 'Unknown Creditor';
      const accountStatus = statusMatch ? statusMatch[1].trim() : '';
      const remarks: string[] = [];
      const remarkMatches = block.matchAll(/(?:remark|comment)[:\s]+([^\n]+)/gi);
      for (const rm of remarkMatches) remarks.push(rm[1].trim());

      const { isNegative, isCollection, isChargeOff, isLate, negativeReason } =
        classifyNegative(accountStatus, remarks, '');

      accounts.push({
        id: this.makeId(),
        creditorName,
        furnisherName: creditorName,
        bureau: bureauMatch ? bureauMatch[1] : 'Unknown',
        bureaus: bureauMatch ? [bureauMatch[1]] : ['Unknown'],
        accountNumberMasked: accountNumMatch ? this.maskAccount(accountNumMatch[1]) : '',
        accountType: typeMatch ? typeMatch[1].trim() : '',
        responsibility: 'Individual',
        dateOpened: dateOpenedMatch ? dateOpenedMatch[1].trim() : '',
        accountStatus,
        paymentStatus: '',
        balance: balanceMatch ? this.parseAmount(balanceMatch[1]) : null,
        creditLimit: null,
        pastDue: null,
        monthlyPayment: null,
        lastPaymentDate: '',
        dateReported: '',
        paymentHistory: '',
        remarks,
        originalCreditor: '',
        collectionAgency: '',
        isNegative,
        negativeReason,
        isCollection,
        isChargeOff,
        isLate,
        rawText: block.slice(0, 500),
        parserConfidence: creditorMatch ? 70 : 40,
      });
    }

    return accounts;
  }

  private extractInquiries(text: string, lines: string[]): NormalizedInquiry[] {
    const inquiries: NormalizedInquiry[] = [];
    const inquirySection = text.match(/(?:inquir(?:y|ies)|hard\s+pull)[^\n]*\n([\s\S]{0,3000}?)(?:\n\n|\Z)/i);
    if (!inquirySection) return inquiries;

    const section = inquirySection[1];
    const rows = section.split('\n').filter(l => l.trim().length > 5);

    for (const row of rows) {
      const dateMatch = row.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
      const bureauMatch = row.match(/\b(TransUnion|Equifax|Experian)\b/i);
      if (dateMatch && bureauMatch) {
        const inquiry: NormalizedInquiry = {
          creditor: row.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/, '').replace(/TransUnion|Equifax|Experian/i, '').trim().slice(0, 80),
          bureau: bureauMatch ? bureauMatch[1] : 'Unknown',
          date: dateMatch ? dateMatch[1] : '',
          type: 'hard',
          purpose: '',
        };
        if (isReliableInquiry({
          creditor_name: inquiry.creditor,
          bureau: inquiry.bureau,
          date_reported: inquiry.date,
        })) inquiries.push(inquiry);
      }
    }

    return inquiries;
  }
}

// ─── SmartCredit Adapter ──────────────────────────────────────────────────────

class SmartCreditAdapter extends BaseAdapter {
  readonly name = 'smartcredit';
  readonly version = '1.0.0';
  readonly supportedProviders: SupportedProvider[] = ['smartcredit'];

  parse(text: string): NormalizedReport {
    this.warnings = [];
    this.rejectionReasons = [];
    this.accountsRejected = 0;

    // SmartCredit uses a structured HTML/text format with clear section headers
    const normalized = safeNormalizeText(text);
    const generic = new GenericAdapter();
    const base = generic.parse(normalized, 'smartcredit');

    return {
      ...base,
      detectedProvider: 'smartcredit',
      providerConfidence: normalized.toLowerCase().includes('smartcredit') ? 92 : 60,
      adapterUsed: this.name,
      parserVersion: this.version,
    };
  }
}

// ─── MyScoreIQ Adapter ────────────────────────────────────────────────────────

class MyScoreIQAdapter extends BaseAdapter {
  readonly name = 'myscoreiq';
  readonly version = '1.0.0';
  readonly supportedProviders: SupportedProvider[] = ['myscoreiq'];

  parse(text: string): NormalizedReport {
    this.warnings = [];
    this.rejectionReasons = [];
    this.accountsRejected = 0;

    const normalized = safeNormalizeText(text);
    const generic = new GenericAdapter();
    const base = generic.parse(normalized, 'myscoreiq');

    return {
      ...base,
      detectedProvider: 'myscoreiq',
      providerConfidence: normalized.toLowerCase().includes('myscoreiq') || normalized.toLowerCase().includes('fico max') ? 92 : 60,
      adapterUsed: this.name,
      parserVersion: this.version,
    };
  }
}

// ─── IdentityIQ Adapter ───────────────────────────────────────────────────────

class IdentityIQAdapter extends BaseAdapter {
  readonly name = 'identityiq';
  readonly version = '1.0.0';
  readonly supportedProviders: SupportedProvider[] = ['identityiq'];

  parse(text: string): NormalizedReport {
    this.warnings = [];
    const normalized = safeNormalizeText(text);
    const generic = new GenericAdapter();
    const base = generic.parse(normalized, 'identityiq');
    return {
      ...base,
      detectedProvider: 'identityiq',
      providerConfidence: normalized.toLowerCase().includes('identityiq') ? 92 : 55,
      adapterUsed: this.name,
      parserVersion: this.version,
    };
  }
}

// ─── Adapter Registry ─────────────────────────────────────────────────────────

const ADAPTERS: Record<string, BaseAdapter> = {
  smartcredit: new SmartCreditAdapter(),
  myscoreiq: new MyScoreIQAdapter(),
  identityiq: new IdentityIQAdapter(),
  generic: new GenericAdapter(),
};

export function getAdapter(provider: SupportedProvider): BaseAdapter {
  return ADAPTERS[provider] ?? ADAPTERS.generic;
}

export function parseWithAdapter(
  text: string,
  provider: SupportedProvider = 'unknown'
): NormalizedReport {
  try {
    const adapter = getAdapter(provider);
    const normalized = safeNormalizeText(text ?? '');
    const isHtml = /<(?:!doctype|html|head|body|table|thead|tbody|tr|td|th|dl|dt|dd|section|div|span|p|br|script|style)\b/i.test(text ?? '');
    if (isHtml || normalized.trim().length === 0) {
      return adapter.parse(normalized, provider);
    }

    const canonical = normalizeCreditReportToHtml(normalized, provider);
    const parserInput = canonical.diagnostics.accountSectionsProduced > 0
      ? `${normalized.trim()}\n\n${safeNormalizeText(canonical.html)}`.trim()
      : normalized;
    const parsed = adapter.parse(parserInput, provider);
    if (canonical.diagnostics.accountSectionsProduced > 0) {
      parsed.warnings.push({
        section: 'normalization',
        message: `Canonical HTML normalization produced ${canonical.diagnostics.accountSectionsProduced} account section(s) before adapter parsing.`,
        severity: 'info',
      });
    }
    return parsed;
  } catch (err: any) {
    // Never crash — return a minimal failed result
    const generic = new GenericAdapter();
    const result = generic.parse(safeNormalizeText(text ?? ''), provider);
    result.warnings.push({
      section: 'adapter',
      message: `Adapter error: ${err?.message ?? 'Unknown error'}`,
      severity: 'error',
    });
    return result;
  }
}

// ─── Re-import comparison ─────────────────────────────────────────────────────

export interface ImportComparison {
  deletedAccounts: NormalizedAccount[];
  correctedAccounts: NormalizedAccount[];
  updatedAccounts: NormalizedAccount[];
  verifiedAccounts: NormalizedAccount[];
  newlyNegative: NormalizedAccount[];
  newlyAdded: NormalizedAccount[];
  balanceChanges: Array<{ account: NormalizedAccount; oldBalance: number | null; newBalance: number | null }>;
  statusChanges: Array<{ account: NormalizedAccount; oldStatus: string; newStatus: string }>;
  scoreChanges: Record<string, { old: number; new: number; delta: number }>;
  newInquiries: NormalizedInquiry[];
  removedInquiries: NormalizedInquiry[];
}

export function compareReports(
  previous: NormalizedReport,
  current: NormalizedReport,
  previousParsedSuccessfully: boolean
): ImportComparison {
  const result: ImportComparison = {
    deletedAccounts: [],
    correctedAccounts: [],
    updatedAccounts: [],
    verifiedAccounts: [],
    newlyNegative: [],
    newlyAdded: [],
    balanceChanges: [],
    statusChanges: [],
    scoreChanges: {},
    newInquiries: [],
    removedInquiries: [],
  };

  // Match accounts by creditor name + masked account number
  const matchKey = (a: NormalizedAccount) =>
    `${a.creditorName.toLowerCase().trim()}|${a.accountNumberMasked}`;

  const prevMap = new Map(previous.accounts.map(a => [matchKey(a), a]));
  const currMap = new Map(current.accounts.map(a => [matchKey(a), a]));

  for (const [key, prev] of prevMap) {
    const curr = currMap.get(key);
    if (!curr) {
      // Only mark deleted if the new report parsed successfully and the bureau section was present
      if (previousParsedSuccessfully && current.sectionConfidence.accounts > 50) {
        result.deletedAccounts.push({ ...prev, negativeReason: 'Unable to verify from this import' });
      }
    } else {
      if (prev.accountStatus !== curr.accountStatus) {
        result.statusChanges.push({ account: curr, oldStatus: prev.accountStatus, newStatus: curr.accountStatus });
      }
      if (prev.balance !== curr.balance) {
        result.balanceChanges.push({ account: curr, oldBalance: prev.balance, newBalance: curr.balance });
      }
      if (!prev.isNegative && curr.isNegative) {
        result.newlyNegative.push(curr);
      }
      if (prev.accountStatus === curr.accountStatus && prev.balance === curr.balance) {
        result.verifiedAccounts.push(curr);
      } else {
        result.updatedAccounts.push(curr);
      }
    }
  }

  for (const [key, curr] of currMap) {
    if (!prevMap.has(key)) {
      result.newlyAdded.push(curr);
    }
  }

  // Score changes
  for (const currScore of current.scores) {
    const prevScore = previous.scores.find(s => s.bureau === currScore.bureau);
    if (prevScore && prevScore.score !== currScore.score) {
      result.scoreChanges[currScore.bureau] = {
        old: prevScore.score,
        new: currScore.score,
        delta: currScore.score - prevScore.score,
      };
    }
  }

  return result;
}
