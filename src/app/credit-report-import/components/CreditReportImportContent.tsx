'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, Info, Loader2, X, ArrowRight, RefreshCw, Eye, AlertCircle, ChevronDown, ChevronUp, ScanLine, ShieldCheck, UsersRound, FileUp, ExternalLink, Building2, SearchCheck, Sparkles, ListChecks, LockKeyhole, Bell, WalletCards } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AffiliateDisclosure } from '@/components/AffiliateProviderCard';
import { DEFAULT_PROVIDERS, getProviders, ReportProvider, trackAffiliateClick } from '@/lib/affiliates/reportProviders';
import { parseCreditReport, type ParsedCreditReport, type SupportedProvider, type SectionConfidence, type ParseStageError, type OcrMetadata, safeNormalizeText } from '@/lib/creditReport/parser';
import { extractPdfText, validateCreditReportExtraction, type PdfExtractionResult } from '@/lib/creditReport/pdfUtils';
import { hashPdfFile, ocrPdfLocally } from '@/lib/creditReport/localOcr';
import {
  OCR_STORAGE_BUCKET,
  createOcrCachePath,
  isValidCachedOcrExtraction,
  type CachedOcrExtraction,
} from '@/lib/creditReport/ocrTransport';
import { currentIsoDate, isFalseFutureDateClaim, isUnsupportedMissingReportingDateClaim } from '@/lib/creditReport/dateValidation';
import { isReliableInquiry, selectReliableAuditItems } from '@/lib/creditReport/auditItems';
import { trackEvent, trackOrganicConversionStep } from '@/lib/analytics';

type SavedReportItem = {
  id: string;
  bureau: string | null;
  creditor_name: string | null;
  account_number_masked: string | null;
  negative_category: string | null;
  negative_reason: string | null;
  balance: number | null;
  date_opened?: string | null;
  date_reported: string | null;
  date_last_activity?: string | null;
  parser_confidence: number | null;
  is_negative?: boolean | null;
};

type AISelection = {
  candidate: number;
  rank: number;
  strength: 'Strong' | 'Moderate' | 'Review';
  why: string;
  disputeReason: string;
  requestedAction: string;
};

const BUREAU_ADDRESSES: Record<string, string> = {
  Equifax: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374-0256',
  Experian: 'Experian\nP.O. Box 4500\nAllen, TX 75013',
  TransUnion: 'TransUnion LLC Consumer Dispute Center\nP.O. Box 2000\nChester, PA 19016',
};
const CREDIT_BUREAUS = ['TransUnion', 'Experian', 'Equifax'];
type ParsedAccountItem = ParsedCreditReport['accounts'][number];

function expandCanonicalAccountByBureau(account: ParsedAccountItem): ParsedAccountItem[] {
  const bureaus = (account.bureaus ?? []).filter(bureau => CREDIT_BUREAUS.includes(bureau));
  if (account.bureau !== 'Multiple' || bureaus.length <= 1) return [account];
  return bureaus.map(bureau => ({
    ...account,
    id: `${account.id}-${bureau}`.replace(/\s+/g, '-').toLowerCase(),
    bureau,
    bureaus: [bureau],
  }));
}

function accountsForPersistence(report: ParsedCreditReport): ParsedAccountItem[] {
  if (report.bureauTradelines?.length) return report.bureauTradelines;
  return report.accounts.flatMap(account => account.tradelines?.length ? account.tradelines : expandCanonicalAccountByBureau(account));
}

function buildAutomaticDraft(params: {
  client: any;
  bureau: string;
  letterId: string;
  selections: Array<{ item: SavedReportItem; opinion: AISelection }>;
}) {
  const clean = (value: unknown, fallback = '') => safeNormalizeText(String(value ?? ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const address = params.client.address
    ? `${params.client.address}\n${params.client.city || ''}, ${params.client.state || ''} ${params.client.zip || ''}`
    : '[Client Address — add and verify before use]';
  const items = params.selections.map(({ item, opinion }, index) => {
    const dates = [
      item.date_opened && `Opened: ${clean(item.date_opened)}`,
      item.date_reported && `Reported: ${clean(item.date_reported)}`,
      item.date_last_activity && `Last activity: ${clean(item.date_last_activity)}`,
    ].filter(Boolean).join(' | ');
    return `Item ${index + 1}: ${clean(item.creditor_name, 'Reported account')}${item.account_number_masked ? ` (Account: ${clean(item.account_number_masked)})` : ''}
   Type: ${clean(item.negative_category, 'reported item').replaceAll('_', ' ')}
   ${dates ? `Report Dates: ${dates}\n   ` : ''}Dispute Reason: ${clean(opinion.disputeReason, 'Review the reported information for accuracy')}
   Requested Action: ${clean(opinion.requestedAction, 'Investigate and correct or delete if unverifiable')}`;
  }).join('\n\n');

  return `${params.client.name}
${address}

${today}

${BUREAU_ADDRESSES[params.bureau] || params.bureau}

Re: Formal Credit Dispute — AI-Assisted Draft
    Letter Reference: ${params.letterId}

To Whom It May Concern:

I am writing to dispute the specific information identified below pursuant to the Fair Credit Reporting Act, 15 U.S.C. § 1681i. Please conduct a reasonable reinvestigation and correct or delete information that is inaccurate, incomplete, or cannot be verified.

DISPUTED ITEM(S):

${items}

Please provide the written results of your investigation and an updated copy of my credit report. Please send all correspondence to the address above.

Sincerely,


_________________________________
${params.client.name}
Date: ${today}

---
LETTER NOTICE: This is an editable AI-assisted draft. The subscribing business must verify every fact, confirm the consumer authorized the dispute, add supporting documents, obtain any required signature, and decide whether to use or send it. FixMy.Money does not provide legal advice or guarantee outcomes.`;
}

const PROVIDERS_LIST: { value: SupportedProvider; label: string }[] = [
  { value: 'unknown', label: 'Auto-detect' },
  { value: 'smartcredit', label: 'SmartCredit' },
  { value: 'myscoreiq', label: 'MyScoreIQ' },
  { value: 'identityiq', label: 'IdentityIQ' },
  { value: 'myfreescorenow', label: 'MyFreeScoreNow' },
  { value: 'privacyguard', label: 'PrivacyGuard' },
  { value: 'experian', label: 'Experian' },
  { value: 'transunion', label: 'TransUnion' },
  { value: 'equifax', label: 'Equifax' },
  { value: 'annualcreditreport', label: 'AnnualCreditReport.com' },
  { value: 'creditkarma', label: 'Credit Karma (paste)' },
];

type ImportMode = 'get-report' | 'upload';

type ImportProviderCard = {
  key: string;
  name: string;
  description: string;
  reportType: string;
  provider: SupportedProvider;
  status: 'partner' | 'upload';
  partner?: ReportProvider;
  preferred?: boolean;
};

const UPLOAD_FORMATS = 'PDF, TXT, HTML, DOC, DOCX';

const PROVIDER_UPLOAD_GUIDANCE: ImportProviderCard[] = [
  {
    key: 'creditkarma',
    name: 'Credit Karma',
    description: 'Easy option if you already have a saved report or copied report text.',
    reportType: 'Upload a saved PDF/text export or paste copied text',
    provider: 'creditkarma',
    status: 'upload',
  },
  {
    key: 'experian',
    name: 'Experian',
    description: 'Use an Experian report you have already downloaded.',
    reportType: 'Upload an Experian PDF or readable export',
    provider: 'experian',
    status: 'upload',
  },
  {
    key: 'identityiq',
    name: 'IdentityIQ',
    description: 'Use your downloaded monitoring report when available.',
    reportType: 'Upload a PDF or readable report export',
    provider: 'identityiq',
    status: 'upload',
  },
  {
    key: 'annualcreditreport',
    name: 'AnnualCreditReport.com',
    description: 'Good source for official bureau report files you download yourself.',
    reportType: 'Upload an official bureau report PDF/text export',
    provider: 'annualcreditreport',
    status: 'upload',
  },
  {
    key: 'other',
    name: 'Other provider',
    description: 'Use this if your report source is not listed here.',
    reportType: `Upload one of the supported formats: ${UPLOAD_FORMATS}`,
    provider: 'unknown',
    status: 'upload',
  },
];

const SUPPORTED_PROVIDER_VALUES = new Set(PROVIDERS_LIST.map(provider => provider.value));

function toSupportedProvider(providerKey: string): SupportedProvider {
  return SUPPORTED_PROVIDER_VALUES.has(providerKey as SupportedProvider) ? providerKey as SupportedProvider : 'unknown';
}

// Provider selection modal shown when confidence < 60%
function ProviderSelectionModal({
  onSelect,
  onContinue,
  currentProvider,
  confidence,
}: {
  onSelect: (p: SupportedProvider) => void;
  onContinue: () => void;
  currentProvider: SupportedProvider;
  confidence: number;
}) {
  const [chosen, setChosen] = useState<SupportedProvider>(currentProvider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-warning" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Provider Not Detected</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Auto-detection confidence is <span className="font-semibold text-warning">{confidence}%</span>. Select your report provider for accurate parsing.
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Select Report Provider</label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS_LIST.filter(p => p.value !== 'unknown').map(p => (
              <button
                key={p.value}
                onClick={() => setChosen(p.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${chosen === p.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border hover:border-primary/50'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSelect(chosen)}
            disabled={!chosen || chosen === 'unknown'}
            className="btn-primary flex-1 text-sm"
          >
            Select &amp; Re-parse
          </button>
          <button
            onClick={onContinue}
            className="btn-secondary flex-1 text-sm"
          >
            Continue with Manual Review
          </button>
        </div>
      </div>
    </div>
  );
}

// Section confidence breakdown component
function SectionConfidenceBreakdown({ sc }: { sc: SectionConfidence }) {
  const [expanded, setExpanded] = useState(false);

  const rows = [
    { label: 'Provider detection', value: sc.providerDetection },
    { label: 'Personal info', value: sc.personalInfo },
    { label: 'Accounts', value: sc.accounts },
    { label: 'Negative classification', value: sc.negativeClassification },
    { label: 'Inquiries', value: sc.inquiries },
    { label: 'Public records', value: sc.publicRecords },
  ];

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-sm"
      >
        <span className="font-medium text-foreground">Section Confidence Breakdown</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div className="p-4 space-y-2">
          {rows.map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-44 shrink-0">{row.label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.value >= 70 ? 'bg-success' : row.value >= 40 ? 'bg-warning' : row.value > 0 ? 'bg-danger' : 'bg-muted-foreground/30'}`}
                  style={{ width: `${row.value}%` }}
                />
              </div>
              <span className={`text-xs font-medium w-10 text-right ${row.value >= 70 ? 'text-success' : row.value >= 40 ? 'text-warning' : row.value > 0 ? 'text-danger' : 'text-muted-foreground'}`}>
                {row.value > 0 ? `${row.value}%` : '—'}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-border flex items-center gap-3">
            <span className="text-xs font-semibold text-foreground w-44 shrink-0">Overall parser confidence</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${sc.overall >= 70 ? 'bg-success' : sc.overall >= 40 ? 'bg-warning' : 'bg-danger'}`}
                style={{ width: `${sc.overall}%` }}
              />
            </div>
            <span className={`text-xs font-bold w-10 text-right ${sc.overall >= 70 ? 'text-success' : sc.overall >= 40 ? 'text-warning' : 'text-danger'}`}>
              {sc.overall}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Debug component for unparsed blocks — shown in UI but NOT in dispute workflow
function UnparsedBlocksDebug({ blocks }: { blocks: string[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="card p-4 space-y-2 border border-muted-foreground/20">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <Info size={12} />
          {blocks.length} text block{blocks.length !== 1 ? 's' : ''} excluded from account parsing (check developer console for exclusion reasons)
        </span>
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {expanded && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <p className="text-xs text-muted-foreground">These blocks were rejected by the validation gate and are NOT included in the dispute workflow. Open browser DevTools → Console and look for <code className="bg-muted px-1 rounded">[CreditReportParser]</code> to see why each block was excluded.</p>
          {blocks.map((b, i) => (
            <pre key={i} className="text-xs font-mono bg-muted/40 rounded-lg p-2 whitespace-pre-wrap break-all text-muted-foreground border border-border">
              {b}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
}

// Stage failure display component — shows what failed during parsing
function ParseStageFailures({ failures }: { failures: ParseStageError[] }) {
  if (!failures || failures.length === 0) return null;
  const STAGE_LABELS: Record<string, string> = {
    upload: 'Upload',
    text_extraction: 'Text Extraction',
    normalization: 'Normalization',
    provider_detection: 'Provider Detection',
    account_parsing: 'Account Parsing',
    personal_info: 'Personal Info',
    scores: 'Credit Scores',
    inquiries: 'Inquiries',
    public_records: 'Public Records',
    negative_classification: 'Negative Classification',
  };
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Parser stage details:</p>
      {failures.map((f, i) => (
        <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${f.fatal ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
          <AlertCircle size={12} className="shrink-0 mt-0.5" />
          <span><span className="font-semibold">{STAGE_LABELS[f.stage] ?? f.stage}:</span> {f.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── OCR Status Panel ─────────────────────────────────────────────────────────
// Shows live OCR progress and final status after OCR completes.
interface OcrStatus {
  stage: 'detecting' | 'rendering' | 'ocr' | 'parsing' | 'done' | 'failed' | 'unavailable';
  totalPages: number;
  nativePages: number;
  pagesOcrProcessed: number;
  pagesOcrFailed: number;
  totalChars: number;
  nativeExtractionQuality?: number;
  meanOcrConfidence?: number | null;
  extractionQuality?: number;
  cacheHit?: boolean;
  providerDetected?: string;
  sectionsParsed?: string[];
  sectionsFailed?: string[];
  errorMessage?: string;
}

function OcrStatusPanel({ status }: { status: OcrStatus }) {
  const stageLabel: Record<OcrStatus['stage'], string> = {
    detecting: 'Reading your report…',
    rendering: 'Preparing report pages…',
    ocr: 'Reading scanned pages…',
    parsing: 'Identifying accounts and negative items…',
    done: 'Report ready to review',
    failed: 'We could not read enough of this report',
    unavailable: 'We could not read this file automatically',
  };

  const isActive = !['done', 'failed', 'unavailable'].includes(status.stage);

  return (
    <div className={`rounded-xl border p-4 space-y-3 text-sm ${status.stage === 'failed' || status.stage === 'unavailable' ? 'border-warning/30 bg-warning/5' : 'border-primary/20 bg-primary/5'}`}>
      <div className="flex items-center gap-2">
        {isActive ? (
          <Loader2 size={16} className="text-primary animate-spin shrink-0" />
        ) : status.stage === 'done' ? (
          <CheckCircle2 size={16} className="text-success shrink-0" />
        ) : (
          <AlertTriangle size={16} className="text-warning shrink-0" />
        )}
        <span className="font-medium text-foreground">{stageLabel[status.stage]}</span>
      </div>

      {status.stage === 'unavailable' && status.errorMessage && (
        <p className="text-xs text-warning">Try uploading the original PDF from your report provider, or paste readable report text below.</p>
      )}

      {status.stage === 'failed' && status.errorMessage && (
        <p className="text-xs text-warning">Try uploading the original PDF from your report provider, or paste readable report text below.</p>
      )}

      {status.totalPages > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-card rounded-lg p-2 border border-border">
            <p className="text-muted-foreground">Total pages</p>
            <p className="font-semibold text-foreground">{status.totalPages}</p>
          </div>
          <div className="bg-card rounded-lg p-2 border border-border">
            <p className="text-muted-foreground">Native pages</p>
            <p className="font-semibold text-foreground">{status.nativePages}</p>
          </div>
          <div className="bg-card rounded-lg p-2 border border-border">
            <p className="text-muted-foreground">OCR pages</p>
            <p className="font-semibold text-foreground">{status.pagesOcrProcessed}</p>
          </div>
          <div className="bg-card rounded-lg p-2 border border-border">
            <p className="text-muted-foreground">Failed pages</p>
            <p className="font-semibold text-foreground">{status.pagesOcrFailed}</p>
          </div>
          <div className="bg-card rounded-lg p-2 border border-border">
            <p className="text-muted-foreground">Extracted characters</p>
            <p className="font-semibold text-foreground">{status.totalChars.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-lg p-2 border border-border">
            <p className="text-muted-foreground">OCR confidence</p>
            <p className="font-semibold text-foreground">{status.meanOcrConfidence == null ? 'N/A' : `${status.meanOcrConfidence}%`}</p>
          </div>
          <div className="bg-card rounded-lg p-2 border border-border">
            <p className="text-muted-foreground">Extraction quality</p>
            <p className="font-semibold text-foreground">{status.extractionQuality == null ? 'N/A' : `${status.extractionQuality}%`}</p>
          </div>
          <div className="bg-card rounded-lg p-2 border border-border">
            <p className="text-muted-foreground">Native text quality</p>
            <p className="font-semibold text-foreground">{status.nativeExtractionQuality == null ? 'N/A' : `${status.nativeExtractionQuality}%`}</p>
          </div>
        </div>
      )}

      {status.cacheHit && (
        <p className="text-xs text-muted-foreground">Reused a verified extraction for this file.</p>
      )}

      {status.providerDetected && (
        <div className="text-xs text-muted-foreground">
          Provider detected: <span className="font-medium text-foreground capitalize">{status.providerDetected}</span>
        </div>
      )}

      {status.sectionsParsed && status.sectionsParsed.length > 0 && (
        <div className="text-xs space-y-0.5">
          <p className="text-muted-foreground font-medium">Sections parsed:</p>
          <div className="flex flex-wrap gap-1">
            {status.sectionsParsed.map(s => (
              <span key={s} className="text-success bg-success/10 px-1.5 py-0.5 rounded">✓ {s}</span>
            ))}
            {(status.sectionsFailed ?? []).map(s => (
              <span key={s} className="text-warning bg-warning/10 px-1.5 py-0.5 rounded">⚠ {s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreditReportImportContent() {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ current: number; total: number } | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus | null>(null);
  const [parsedReport, setParsedReport] = useState<ParsedCreditReport | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState('');
  const [providers, setProviders] = useState<ReportProvider[]>(DEFAULT_PROVIDERS.filter(p => p.isVisible));
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<SupportedProvider>('unknown');
  const [importMode, setImportMode] = useState<ImportMode>('get-report');
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [ocrMeta, setOcrMeta] = useState<OcrMetadata | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploaderRef = useRef<HTMLElement>(null);
  const supabase = createClient();

  const providerCards = useMemo(() => {
    const cards: ImportProviderCard[] = [];
    const seen = new Set<string>();

    providers.forEach(provider => {
      cards.push({
        key: provider.key,
        name: provider.name,
        description: provider.description || 'Use this provider to get a report, then return here to upload it.',
        reportType: 'Download your report, then upload it here',
        provider: toSupportedProvider(provider.key),
        status: provider.affiliateUrl ? 'partner' : 'upload',
        partner: provider,
        preferred: provider.isPreferred,
      });
      seen.add(provider.key);
    });

    PROVIDER_UPLOAD_GUIDANCE.forEach(provider => {
      if (!seen.has(provider.key)) cards.push(provider);
    });

    return cards;
  }, [providers]);

  useEffect(() => {
    loadProviders();
    trackEvent('credit_import_viewed', {
      page: 'credit-report-import',
    });
  }, []);

  const loadProviders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: ws } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).single();
      const wsId = ws?.id ?? null;
      setWorkspaceId(wsId);
      const loaded = await getProviders(wsId);
      setProviders(loaded);
    } catch {
      // fallback to defaults
    }
  };

  const loadClients = async () => {
    if (clientsLoaded) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('staff_clients').select('id, name').eq('owner_id', user.id).order('name');
    setClients(data ?? []);
    setClientsLoaded(true);
  };

  const selectProviderForUpload = (provider: SupportedProvider, source: string) => {
    setSelectedProvider(provider);
    setImportMode('upload');
    trackEvent('credit_import_provider_selected', {
      provider,
      source,
      provider_state: 'upload_guidance_only',
    });
  };

  const showUploader = () => {
    setImportMode('upload');
    window.requestAnimationFrame(() => {
      uploaderRef.current?.focus();
    });
  };

  const startProviderUpload = (card: ImportProviderCard) => {
    selectProviderForUpload(card.provider, card.key);
    fileRef.current?.click();
  };

  const openPartnerProvider = (card: ImportProviderCard) => {
    const partner = card.partner;
    if (!partner?.affiliateUrl) return;

    setSelectedProvider(card.provider);
    setImportMode('get-report');
    trackEvent('credit_import_provider_selected', {
      provider: card.key,
      source: 'provider_card',
      provider_state: 'partner_referral',
    });
    trackEvent('credit_import_partner_clicked', {
      provider: card.key,
      source: 'credit-report-import',
    });
    void trackAffiliateClick({
      provider: card.key,
      sourcePage: 'credit-report-import',
      agencyId: workspaceId,
      userId,
    });
    window.open(partner.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  const parseText = async (text: string, provider?: SupportedProvider, meta?: OcrMetadata): Promise<ParsedCreditReport | null> => {
    setParsing(true);
    try {
      const forceProvider = provider && provider !== 'unknown' ? provider : undefined;
      const result = parseCreditReport(text, forceProvider, meta ?? ocrMeta ?? undefined);
      const extractionMeta = meta ?? ocrMeta;
      if (extractionMeta?.fileHash) {
        console.info('[CreditReport/Extraction]', {
          documentId: extractionMeta.fileHash.slice(0, 16),
          sha256: extractionMeta.fileHash,
          totalPages: extractionMeta.totalPdfPages,
          nativePages: extractionMeta.pagesWithEmbeddedText,
          ocrPages: extractionMeta.ocrPagesSucceeded,
          failedPages: extractionMeta.ocrPagesFailed,
          extractedCharacters: text.length,
          ocrConfidence: extractionMeta.meanOcrConfidence ?? null,
          parserConfidence: result.overallConfidence,
          processingDurationMs: extractionMeta.processingDurationMs ?? null,
          openAiGenerationCount: extractionMeta.openAiGenerationCount ?? 0,
          finalStatus: 'parsed',
          cacheHit: extractionMeta.cacheHit ?? false,
        });
      }

      // Update OCR status panel with provider and sections info (if OCR was used)
      setOcrStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          providerDetected: result.provider !== 'unknown' ? result.provider : prev.providerDetected,
          sectionsParsed: result.sectionsParsed,
          sectionsFailed: result.sectionsMissed,
        };
      });

      // Show provider modal if confidence < 60% and provider is unknown
      if (result.providerConfidence < 60 && result.provider === 'unknown') {
        setShowProviderModal(true);
        setRawText(text);
        setParsedReport(result);
        toast.warning('Provider not detected. Please select your report provider for accurate parsing.');
        await loadClients();
        return result;
      }

      setParsedReport(result);

      if (result.overallConfidence < 60) {
        toast.warning(`Parsed with ${result.overallConfidence}% confidence. Review results carefully.`);
      } else {
        const negCount = result.negativeAccounts.length;
        const accCount = result.accounts.length;
        if (negCount === 0 && accCount > 0) {
          toast.warning(`${accCount} accounts found, but no negative items detected. Review account classifications before saving.`);
        } else {
          toast.success(`Report parsed — ${accCount} accounts, ${negCount} negative items detected`);
        }
      }

      await loadClients();
      return result;
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to parse report');
      return null;
    } finally {
      setParsing(false);
    }
  };

  const runOcrOnPdf = async (
    file: File,
    extraction: PdfExtractionResult,
  ): Promise<{ text: string; meta: OcrMetadata } | null> => {
    const startedAt = performance.now();
    setOcrRunning(true);
    setOcrStatus({
      stage: 'rendering',
      totalPages: extraction.pageCount,
      nativePages: extraction.pagesWithText,
      pagesOcrProcessed: 0,
      pagesOcrFailed: 0,
      totalChars: 0,
      nativeExtractionQuality: extraction.nativeExtractionQuality,
    });

    try {
      const fileHash = await hashPdfFile(file);
      const { data: { user } } = await supabase.auth.getUser();
      const cachePath = user ? createOcrCachePath(user.id, fileHash) : null;
      let cached: CachedOcrExtraction | null = null;

      if (cachePath) {
        const { data } = await supabase.storage.from(OCR_STORAGE_BUCKET).download(cachePath);
        if (data) {
          try {
            const parsed = JSON.parse(await data.text()) as unknown;
            if (isValidCachedOcrExtraction(parsed, fileHash)) cached = parsed;
          } catch {
            cached = null;
          }
        }
      }

      const result = cached ?? await ocrPdfLocally(file, progress => {
        setOcrProgress({ current: progress.currentPage, total: progress.totalPages });
        setOcrStatus(prev => prev ? {
          ...prev,
          stage: progress.status === 'rendering' ? 'rendering' : 'ocr',
          totalPages: progress.totalPages,
          nativePages: progress.nativePages,
          pagesOcrProcessed: progress.ocrPages,
          pagesOcrFailed: progress.failedPages,
        } : prev);
      }, extraction.pages);

      const validation = validateCreditReportExtraction(result.pages, result.totalPages);
      const nativePages = result.pages.filter(page => page.source === 'native').length;
      const ocrPages = result.pages.filter(page => page.source === 'ocr').length;
      const failedPages = result.pages.filter(page => page.source === 'failed').length;
      const meanOcrConfidence = result.meanOcrConfidence;
      const processingDurationMs = Math.round(performance.now() - startedAt);
      const pageResults = (result.pageResults ?? result.pages
        .map(page => page.extraction)
        .filter((page): page is NonNullable<typeof page> => Boolean(page)));
      const primaryOcrSuccesses = result.primaryOcrSuccesses ?? pageResults.filter(page => page.primaryOcrSucceeded).length;
      const primaryOcrFailures = result.primaryOcrFailures ?? pageResults.filter(page => page.primaryOcrAttempted && !page.primaryOcrSucceeded).length;
      const retryRecoveries = result.retryRecoveries ?? pageResults.filter(page => page.finalStatus === 'ocr_retry').length;
      const fallbackRecoveries = result.fallbackRecoveries ?? pageResults.filter(page => page.finalStatus === 'ocr_fallback').length;

      setOcrStatus({
        stage: validation.valid ? 'parsing' : 'failed',
        totalPages: result.totalPages,
        nativePages,
        pagesOcrProcessed: ocrPages,
        pagesOcrFailed: failedPages + validation.unaccountedPages,
        totalChars: validation.characters,
        nativeExtractionQuality: extraction.nativeExtractionQuality,
        meanOcrConfidence,
        extractionQuality: validation.quality,
        cacheHit: Boolean(cached),
        errorMessage: validation.valid
          ? undefined
          : 'OCR_FAILED: Readable credit-report text could not be verified before parsing.',
      });

      console.info('[CreditReport/Extraction]', {
        documentId: fileHash.slice(0, 16),
        sha256: fileHash,
        totalPages: result.totalPages,
        nativePages,
        ocrPages,
        failedPages: failedPages + validation.unaccountedPages,
        extractedCharacters: validation.characters,
        ocrConfidence: meanOcrConfidence,
        primaryOcrSuccesses,
        primaryOcrFailures,
        retryRecoveries,
        fallbackRecoveries,
        unreadablePages: pageResults
          .filter(page => page.finalStatus === 'unreadable')
          .map(page => ({ pageNumber: page.pageNumber, reason: page.failureReason })),
        parserConfidence: null,
        processingDurationMs,
        openAiGenerationCount: 0,
        finalStatus: validation.valid ? 'ready_for_parser' : 'OCR_FAILED',
        cacheHit: Boolean(cached),
      });

      if (!validation.valid) return null;

      if (!cached && cachePath) {
        const cacheValue: CachedOcrExtraction = {
          version: 1,
          sha256: fileHash,
          createdAt: new Date().toISOString(),
          text: result.text,
          totalPages: result.totalPages,
          nativePages,
          ocrPages,
          failedPages,
          meanOcrConfidence,
          nativeExtractionQuality: extraction.nativeExtractionQuality,
          extractionQuality: validation.quality,
          processingDurationMs: result.processingDurationMs,
          pages: result.pages,
          pageResults,
          primaryOcrSuccesses,
          primaryOcrFailures,
          retryRecoveries,
          fallbackRecoveries,
          capability: result.capability,
        };
        await supabase.storage.from(OCR_STORAGE_BUCKET).upload(
          cachePath,
          new Blob([JSON.stringify(cacheValue)], { type: 'application/json' }),
          { contentType: 'application/json', upsert: true },
        );
      }

      return {
        text: result.text,
        meta: {
          isImageBasedPdf: extraction.pagesWithText === 0,
          ocrWasUsed: ocrPages > 0,
          totalPdfPages: result.totalPages,
          pagesWithEmbeddedText: nativePages,
          pagesRequiringOcr: Math.max(0, result.totalPages - nativePages),
          ocrPagesSucceeded: ocrPages,
          ocrPagesFailed: failedPages,
          binaryBlocksSkipped: extraction.binaryBlocksSkipped,
          fileHash,
          nativeExtractionQuality: extraction.nativeExtractionQuality,
          meanOcrConfidence,
          extractionQuality: validation.quality,
          processingDurationMs,
          openAiGenerationCount: 0,
          cacheHit: Boolean(cached),
          pageResults: pageResults.map(page => ({
            pageNumber: page.pageNumber,
            finalStatus: page.finalStatus,
            failureReason: page.failureReason,
          })),
          primaryOcrSuccesses,
          primaryOcrFailures,
          retryRecoveries,
          fallbackRecoveries,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Local OCR failed';
      setOcrStatus(prev => prev ? {
        ...prev,
        stage: 'failed',
        errorMessage: `OCR_FAILED: ${message.slice(0, 220)}`,
      } : prev);
      console.warn('[CreditReport/Extraction]', {
        finalStatus: 'OCR_FAILED',
        openAiGenerationCount: 0,
      });
      return null;
    } finally {
      setOcrRunning(false);
      setOcrProgress(null);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    const allowed = ['application/pdf', 'text/plain', 'text/html', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const fileNameLower = file.name.toLowerCase();
    const allowedExtensions = ['.pdf', '.txt', '.html', '.doc', '.docx'];
    if (!allowed.includes(file.type) && !allowedExtensions.some(extension => fileNameLower.endsWith(extension))) {
      toast.error(`Please upload one of these supported formats: ${UPLOAD_FORMATS}`);
      trackEvent('credit_import_upload_failed', {
        provider: selectedProvider,
        reason: 'unsupported_file_type',
        file_type: file.type || 'unknown',
      });
      return;
    }

    setFileName(file.name);
    setOcrStatus(null);
    trackEvent('credit_import_upload_started', {
      provider: selectedProvider,
      file_type: file.type || 'unknown',
      file_name_extension: fileNameLower.split('.').pop() ?? 'unknown',
    });
    setUploading(true);
    await new Promise(r => setTimeout(r, 400));
    setUploading(false);

    try {
      const isPdf = file.type === 'application/pdf' || fileNameLower.endsWith('.pdf');

      if (isPdf) {
        // ── PDF handling: detect image-based vs text-based ──────────────────
        setOcrStatus({ stage: 'detecting', totalPages: 0, nativePages: 0, pagesOcrProcessed: 0, pagesOcrFailed: 0, totalChars: 0 });
        const extraction = await extractPdfText(file);

        if (extraction.isImageBased) {
          toast.info('Scanned report detected. We are reading each page now.');
        } else if (extraction.pagesRequiringOcr > 0) {
          toast.info('Some pages need extra reading. We are processing them now.');
        }

        const extractionResult = await runOcrOnPdf(file, extraction);
        if (!extractionResult) {
          toast.warning('We could not read enough of this report automatically. Try uploading the original PDF or a clearer text export.');
          trackEvent('credit_import_upload_failed', {
            provider: selectedProvider,
            reason: 'unreadable_pdf',
            file_type: file.type || 'unknown',
          });
          return;
        }

        const normalizedText = safeNormalizeText(extractionResult.text);
        setRawText(normalizedText);
        setOcrMeta(extractionResult.meta);
        toast.success('Report text is ready. Identifying accounts and negative items now.');
        setOcrStatus(prev => prev ? { ...prev, stage: 'parsing' } : prev);
        const parsed = await parseText(normalizedText, selectedProvider, extractionResult.meta);
        if (parsed) {
          trackEvent('credit_import_upload_succeeded', {
            provider: parsed.provider,
            accounts_count: parsed.accounts.length,
            negative_items_count: parsed.negativeAccounts.length,
          });
        }
        setOcrStatus(prev => prev ? { ...prev, stage: 'done' } : prev);
        return;

      } else {
        // Non-PDF file (TXT, HTML, DOC) — decode directly
        setOcrStatus(null);
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
        const rawDecoded = decoder.decode(arrayBuffer);
        const text = safeNormalizeText(rawDecoded);

        if (!text || text.trim().length < 20) {
          toast.info('File appears to be empty or unreadable.');
          toast.warning('For best results, use a text-based export from your credit report provider, or paste the report text below.');
          trackEvent('credit_import_upload_failed', {
            provider: selectedProvider,
            reason: 'empty_or_unreadable',
            file_type: file.type || 'unknown',
          });
          setParsing(false);
          return;
        }

        setRawText(text);
        const parsed = await parseText(text, selectedProvider);
        if (parsed) {
          trackEvent('credit_import_upload_succeeded', {
            provider: parsed.provider,
            accounts_count: parsed.accounts.length,
            negative_items_count: parsed.negativeAccounts.length,
          });
        }
      }
    } catch {
      toast.info('Could not read file directly.');
      toast.warning('For best results, use a text-based export from your credit report provider, or paste the report text below.');
      trackEvent('credit_import_upload_failed', {
        provider: selectedProvider,
        reason: 'read_failed',
        file_type: file.type || 'unknown',
      });
      setParsing(false);
    }
  };

  const handleReparse = async (provider: SupportedProvider) => {
    setShowProviderModal(false);
    setSelectedProvider(provider);
    if (!rawText) { toast.error('No text to reparse'); return; }
    await parseText(rawText, provider);
  };

  const handleContinueManual = () => {
    setShowProviderModal(false);
    // Keep the parsed report as-is, let user review manually
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSaveToClient = async () => {
    if (!selectedClientId) { toast.error('Select a client to save this report to'); return; }
    if (!parsedReport) return;
    trackEvent('credit_import_review_clicked', {
      provider: parsedReport.provider,
      parser_confidence: parsedReport.overallConfidence,
      accounts_count: parsedReport.accounts.length,
      negative_items_count: parsedReport.negativeAccounts.length,
      selected_client: true,
    });
    setSaving(true);
    setSaveStage('Saving report…');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Confidence is advisory only. Always persist the parsed report and its
      // accounts so a low-confidence parse never loses client data or blocks
      // the letter workflow.
      const lowConfidence = parsedReport.overallConfidence < 50;
      trackOrganicConversionStep('credit_report_upload_started', {
        provider: parsedReport.provider,
        parser_confidence: parsedReport.overallConfidence,
      });
      trackEvent('report_upload_started', {
        provider: parsedReport.provider,
        parser_confidence: parsedReport.overallConfidence,
      });

      const accountItemsForPersistence = accountsForPersistence(parsedReport);
      const { data: reportRecord, error: reportErr } = await supabase.from('parsed_credit_reports').insert({
        owner_id: user.id,
        client_id: selectedClientId,
        provider: parsedReport.provider,
        provider_confidence: parsedReport.providerConfidence,
        parser_version: parsedReport.parserVersion,
        report_date: parsedReport.reportDate,
        overall_confidence: parsedReport.overallConfidence,
        sections_parsed: parsedReport.sectionsParsed,
        sections_missed: parsedReport.sectionsMissed,
        warnings: parsedReport.warnings,
        personal_info: parsedReport.personalInfo,
        scores: parsedReport.scores,
        accounts_count: accountItemsForPersistence.length,
        negative_count: accountItemsForPersistence.filter(item => item.isNegative).length,
        collections_count: accountItemsForPersistence.filter(item => item.isCollection).length,
        inquiries_count: parsedReport.inquiries.length,
        public_records_count: parsedReport.publicRecords.length,
        raw_text: parsedReport.rawText.slice(0, 50000),
        file_name: fileName,
        status: 'pending_review',
        // Store ALL accounts (not just negative) as JSON for review screen
        all_accounts: parsedReport.accounts,
        all_inquiries: parsedReport.inquiries,
        public_records: parsedReport.publicRecords,
      }).select().single();

      if (reportErr) throw reportErr;

      // Save ALL accounts as negative_items (with is_negative flag).
      // `positive` is not a valid negative_item_category enum value in the
      // production schema; non-negative rows use `other` plus is_negative=false.
      const accountRows = accountItemsForPersistence.map(item => {
        return {
          owner_id: user.id,
          client_id: selectedClientId,
          report_id: reportRecord.id,
          bureau: item.bureau,
          creditor_name: item.creditorName,
          furnisher_name: item.furnisherName,
          account_number_masked: item.accountNumberMasked,
          account_type: item.accountType,
          status: item.status,
          balance: item.balance,
          past_due: item.pastDue,
          date_opened: item.dateOpened,
          date_reported: item.dateReported,
          date_last_activity: item.dateLastActivity,
          negative_reason: item.negativeReason,
          negative_category: item.isCollection ? 'collection' : item.isChargeOff ? 'charge_off' : item.isLate ? 'late_payment' : 'other',
          dispute_status: 'draft',
          bureaus_reporting: item.bureaus,
          remarks: item.remarks,
          parser_confidence: item.parserConfidence,
          raw_text_source: item.rawText.slice(0, 2000),
          is_negative: item.isNegative,
          is_collection: item.isCollection,
        };
      });
      const savedItems: SavedReportItem[] = [];
      if (accountRows.length > 0) {
        const { data: insertedAccounts, error: accountInsertError } = await supabase.from('negative_items').insert(accountRows).select('id, bureau, creditor_name, account_number_masked, negative_category, negative_reason, balance, date_opened, date_reported, date_last_activity, parser_confidence, is_negative');
        if (accountInsertError) throw new Error(`Report saved, but account items failed to save: ${accountInsertError.message}`);
        savedItems.push(...((insertedAccounts ?? []).filter((item: any) => item.is_negative === true) as SavedReportItem[]));
      }

      // Persist only inquiries backed by a creditor, date, and recognized bureau.
      {
        const inquiryRows = parsedReport.inquiries.filter(inq => inq.type === 'hard' && isReliableInquiry({
          creditor_name: inq.creditor,
          bureau: inq.bureau,
          date_reported: inq.date,
        })).map(inq => ({
            owner_id: user.id,
            client_id: selectedClientId,
            report_id: reportRecord.id,
            bureau: inq.bureau,
            creditor_name: inq.creditor,
            account_type: 'Hard Inquiry',
            negative_reason: 'Hard inquiry',
            negative_category: 'hard_inquiry',
            date_reported: inq.date,
            dispute_status: 'draft',
            bureaus_reporting: [inq.bureau],
            is_negative: false,
            is_collection: false,
          }));
        if (inquiryRows.length > 0) {
          const { data: insertedInquiries, error: inquiryInsertError } = await supabase.from('negative_items').insert(inquiryRows).select('id, bureau, creditor_name, account_number_masked, negative_category, negative_reason, balance, date_reported, parser_confidence');
          if (inquiryInsertError) throw new Error(`Accounts saved, but inquiries failed to save: ${inquiryInsertError.message}`);
          savedItems.push(...((insertedInquiries ?? []) as SavedReportItem[]));
        }
      }

      const personalAddress = parsedReport.personalInfo.currentAddress;
      const primaryScore = parsedReport.scores
        .map(score => Number(score.score))
        .filter(score => Number.isFinite(score) && score > 0)
        .sort((a, b) => b - a)[0];
      const clientUpdates: Record<string, unknown> = {
        report_analyzed: true,
        last_activity: 'Credit report saved',
      };
      if (personalAddress?.street) clientUpdates.address = personalAddress.street;
      if (personalAddress?.city) clientUpdates.city = personalAddress.city;
      if (personalAddress?.state) clientUpdates.state = personalAddress.state;
      if (personalAddress?.zip) clientUpdates.zip = personalAddress.zip;
      if (primaryScore) clientUpdates.credit_score = primaryScore;
      const { error: clientUpdateError } = await supabase
        .from('staff_clients')
        .update(clientUpdates)
        .eq('id', selectedClientId)
        .eq('owner_id', user.id);
      if (clientUpdateError) throw new Error(`Report items saved, but client information failed to save: ${clientUpdateError.message}`);

      try {
        setSaveStage('Building investigation cases...');
        const { data: sessionData } = await supabase.auth.getSession();
        const evidenceResponse = await fetch('/api/credit-report/evidence-engine', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
          },
          body: JSON.stringify({
            parsedReportId: reportRecord.id,
            clientId: selectedClientId,
          }),
        });
        if (!evidenceResponse.ok) {
          const payload = await evidenceResponse.json().catch(() => null);
          throw new Error(payload?.error ?? 'Evidence engine indexing failed');
        }
      } catch (engineError: any) {
        console.warn('[CreditReportImport] Evidence engine indexing skipped:', engineError?.message ?? engineError);
        toast.warning('Report saved, but investigation indexing needs to be retried from the report review.');
      }

      let generatedLetters = 0;
      const reliableSavedItems = selectReliableAuditItems(savedItems) as SavedReportItem[];
      const shouldCreateAutomaticDrafts = false;
      if (shouldCreateAutomaticDrafts && reliableSavedItems.length > 0) {
        setSaveStage('AI is ranking the strongest items…');
        const analysisDate = currentIsoDate();
        const candidates = reliableSavedItems.slice(0, 20).map((item, index) => ({
          candidate: index + 1,
          bureau: item.bureau,
          category: item.negative_category,
          balance: item.balance,
          dateOpened: item.date_opened,
          dateReported: item.date_reported,
          dateLastActivity: item.date_last_activity,
          reportedIssue: item.negative_reason,
          parserConfidence: item.parser_confidence,
        }));
        const aiResponse = await fetch('/api/ai/chat-completion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'OPEN_AI',
            model: 'gpt-4o',
            stream: false,
            parameters: { max_completion_tokens: 1000, temperature: 0.2 },
            messages: [
              {
                role: 'system',
                content: `You review parsed credit-report items for a credit-repair business. Today's date is ${analysisDate}. Select and rank at most 5 candidates that present the strongest specific, factual, and verifiable dispute opportunities. dateOpened, dateReported, and dateLastActivity are separate fields and must never be conflated. An empty dateReported field alone is not a dispute opportunity and must not be selected. A reporting date is in the future only when it is later than ${analysisDate}; never compare it with your training cutoff. Do not select an item merely because it is negative, and never invent an inaccuracy or promise an outcome. Return JSON only: {"summary":"2 concise sentences","selections":[{"candidate":1,"rank":1,"strength":"Strong|Moderate|Review","why":"why this item was selected","disputeReason":"a narrow factual reason using only supplied facts","requestedAction":"investigate and correct or delete if unverifiable"}]}.`,
              },
              {
                role: 'user',
                content: `Rank the strongest candidates and explain every selection. No client name or full account number is included:\n${JSON.stringify(candidates)}`,
              },
            ],
          }),
        });
        if (!aiResponse.ok) throw new Error('The report was saved, but AI draft generation is temporarily unavailable.');
        const completion = await aiResponse.json();
        const raw = completion?.choices?.[0]?.message?.content || '';
        const opinion = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim()) as { summary: string; selections: AISelection[] };
        const selections = (opinion.selections ?? [])
          .filter(selection => Number.isInteger(selection.candidate) && selection.candidate >= 1 && selection.candidate <= reliableSavedItems.length)
          .filter(selection => {
            const item = reliableSavedItems[selection.candidate - 1];
            const explanation = `${selection.why || ''} ${selection.disputeReason || ''}`;
            return !isUnsupportedMissingReportingDateClaim(explanation) && !isFalseFutureDateClaim(
              item?.date_reported,
              explanation,
              analysisDate,
            );
          })
          .slice(0, 5);

        if (selections.length > 0) {
          setSaveStage('Creating editable letter drafts…');
          const { data: clientRecord, error: clientError } = await supabase
            .from('staff_clients')
            .select('id, name, email, phone, address, city, state, zip')
            .eq('id', selectedClientId)
            .eq('owner_id', user.id)
            .single();
          if (clientError) throw clientError;

          const byBureau = new Map<string, Array<{ item: SavedReportItem; opinion: AISelection }>>();
          selections.forEach(selection => {
            const item = reliableSavedItems[selection.candidate - 1];
            const bureau = item.bureau || 'Equifax';
            byBureau.set(bureau, [...(byBureau.get(bureau) || []), { item, opinion: selection }]);
          });

          for (const [bureau, bureauSelections] of byBureau.entries()) {
            const short = ({ Equifax: 'EQ', Experian: 'EX', TransUnion: 'TU' } as Record<string, string>)[bureau] || 'DL';
            const letterId = `${short}-AI-${Math.floor(1000 + Math.random() * 9000)}`;
            const rationale = `${opinion.summary}\n\n${bureauSelections.map(({ item, opinion: selected }) => `#${selected.rank} ${item.creditor_name || 'Reported item'} (${selected.strength}): ${selected.why}`).join('\n')}`;
            const letterContent = buildAutomaticDraft({ client: clientRecord, bureau, letterId, selections: bureauSelections });
            const { error: letterError } = await supabase.from('dispute_letters').insert({
              owner_id: user.id,
              client_id: selectedClientId,
              workspace_id: workspaceId,
              letter_id: letterId,
              client_name: clientRecord.name,
              bureau,
              items_count: bureauSelections.length,
              round: 1,
              sent_date: null,
              response_due_date: null,
              days_remaining: 0,
              letter_status: 'draft',
              template: 'AI-ranked FCRA Section 611',
              auto_generated: true,
              dispute_reason: rationale,
              priority: bureauSelections.some(({ opinion: selected }) => selected.strength === 'Strong') ? 'high' : 'medium',
              letter_content: letterContent,
              generated_at: new Date().toISOString(),
              generation_error: null,
            });
            if (letterError) throw letterError;
            const selectedIds = bureauSelections.map(({ item }) => item.id);
            await supabase.from('negative_items').update({ dispute_status: 'generated', is_selected: true, tag_status: 'dispute' }).in('id', selectedIds).eq('owner_id', user.id);
            generatedLetters++;
          }
        }
      }

      if (lowConfidence) {
        toast.warning(`Report saved at ${parsedReport.overallConfidence}% confidence. All ${parsedReport.accounts.length} accounts were preserved and are available for selection.`);
      } else {
        const negCount = parsedReport.negativeAccounts.length;
        toast.success(`Report saved. ${parsedReport.accounts.length} accounts queued for review. ${negCount} flagged as negative.`);
      }
      trackOrganicConversionStep('credit_report_upload_saved', {
        provider: parsedReport.provider,
        parser_confidence: parsedReport.overallConfidence,
        accounts_count: parsedReport.accounts.length,
        negative_items_count: parsedReport.negativeAccounts.length,
        draft_letters_created: generatedLetters,
      });
      trackEvent('report_upload_completed', {
        provider: parsedReport.provider,
        parser_confidence: parsedReport.overallConfidence,
        accounts_count: parsedReport.accounts.length,
        negative_items_count: parsedReport.negativeAccounts.length,
        draft_letters_created: generatedLetters,
      });

      if (generatedLetters > 0) {
        toast.success(`${generatedLetters} AI-ranked letter draft${generatedLetters === 1 ? '' : 's'} created and ready for review.`);
        router.push(`/dispute-letter-management?autoGenerated=${generatedLetters}`);
        return;
      }

      router.push(`/clients/${selectedClientId}/reports/${reportRecord.id}/review`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save report');
    } finally {
      setSaving(false);
      setSaveStage('');
    }
  };

  // Determine save button state
  const getSaveWarning = (report: ParsedCreditReport): { type: 'ok' | 'warn' | 'block'; message: string } => {
    if (report.overallConfidence < 50) {
      return { type: 'warn', message: `Parser confidence is ${report.overallConfidence}%. The report and every detected account will still be saved; verify item details before using a letter.` };
    }
    if (report.overallConfidence < 60 && report.provider === 'unknown') {
      return { type: 'block', message: `Provider unknown at ${report.overallConfidence}% confidence. Select a provider before saving, or continue with manual review.` };
    }
    if (report.accounts.length > 0 && report.negativeAccounts.length === 0) {
      return { type: 'warn', message: `${report.accounts.length} accounts were found, but no negative items were detected. Review account classifications before saving.` };
    }
    return { type: 'ok', message: `Saving will create ${report.accounts.length} account records and ${report.negativeAccounts.length} negative item record${report.negativeAccounts.length !== 1 ? 's' : ''}.` };
  };

  return (
    <div className="min-h-screen bg-[#f8fbff] p-4 sm:p-6">
      {showProviderModal && parsedReport && (
        <ProviderSelectionModal
          onSelect={handleReparse}
          onContinue={handleContinueManual}
          currentProvider={parsedReport.provider}
          confidence={parsedReport.providerConfidence}
        />
      )}

      <div className="mx-auto max-w-screen-xl space-y-6">
        {!parsedReport && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-success">
                AI credit report import
              </div>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#071942] sm:text-5xl">
                Import Your Credit Report
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#23345f]">
                Tell us where your report is from, then upload the file. FixMy.Money will read the report, identify accounts, and prepare it for review.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-white px-4 py-3 text-sm shadow-sm">
              <ShieldCheck size={26} className="text-success" />
              <div>
                <p className="font-bold text-[#071942]">Private workspace import</p>
                <p className="text-xs text-[#52627f]">Your report is processed for your signed-in account.</p>
              </div>
            </div>
          </div>
        )}

        {!parsedReport ? (
          <div className="space-y-6">
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.txt,.doc,.docx,.html" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-5">
                <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#cfd8ea] bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setImportMode('get-report')}
                    className={`flex min-h-16 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${importMode === 'get-report' ? 'border border-[#0b2d65] bg-white text-[#071942] shadow-sm' : 'text-[#52627f] hover:bg-[#f4f7fb]'}`}
                  >
                    <UsersRound size={20} className="text-success" />
                    <span>Get a Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={showUploader}
                    className={`flex min-h-16 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition ${importMode === 'upload' ? 'border border-[#0b2d65] bg-white text-[#071942] shadow-sm' : 'text-[#52627f] hover:bg-[#f4f7fb]'}`}
                  >
                    <FileUp size={20} className="text-[#071942]" />
                    <span>Upload File</span>
                  </button>
                </div>

                <section className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-extrabold text-[#071942]">Where is your credit report from?</h2>
                      <p className="text-sm text-[#52627f]">Choose the closest source so the importer can use the best matching parser.</p>
                    </div>
                    <a href="/settings/report-providers" className="text-xs font-semibold text-primary hover:underline">Manage providers</a>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {providerCards.map(card => (
                      <div key={card.key} className="rounded-2xl border border-[#dbe3f0] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#b8c6dc] hover:shadow-md">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-[#071942]">
                              <Building2 size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-sm font-extrabold leading-tight text-[#071942]">{card.name}</p>
                              <p className="mt-0.5 text-xs font-medium text-[#52627f]">{card.status === 'partner' ? 'Partner/referral' : 'Upload guidance only'}</p>
                            </div>
                          </div>
                          {card.status === 'partner' && (
                            <span className="shrink-0 rounded-full bg-success/10 px-2 py-1 text-[11px] font-bold text-success">Partner</span>
                          )}
                        </div>
                        <p className="mt-3 min-h-10 text-sm leading-5 text-[#23345f]">{card.description}</p>
                        <p className="mt-2 text-xs leading-5 text-[#52627f]">{card.reportType}</p>
                        <div className="mt-4 flex gap-2">
                          {card.status === 'partner' ? (
                            <>
                              <button type="button" onClick={() => openPartnerProvider(card)} className="btn-primary flex min-h-11 flex-1 items-center justify-center gap-1.5 text-sm sm:min-h-0">
                                Get My Report
                                <ExternalLink size={14} />
                              </button>
                              <button type="button" onClick={() => startProviderUpload(card)} className="btn-secondary min-h-11 px-3 text-sm sm:min-h-0">Upload</button>
                            </>
                          ) : (
                            <button type="button" onClick={() => startProviderUpload(card)} className="btn-primary flex min-h-11 w-full items-center justify-center gap-1.5 text-sm sm:min-h-0">
                              Upload Report
                              <Upload size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <AffiliateDisclosure />
                </section>

                <section
                  ref={uploaderRef}
                  tabIndex={-1}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => {
                    setImportMode('upload');
                    fileRef.current?.click();
                  }}
                  className={`rounded-2xl border-2 border-dashed bg-white p-5 shadow-sm transition focus:outline-none sm:p-6 ${dragOver ? 'border-success bg-success/5' : 'border-[#b8c6dc] hover:border-success/60'}`}
                >
                  {uploading || parsing || ocrRunning ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <Loader2 size={34} className="animate-spin text-success" />
                      {ocrRunning ? (
                        <>
                          <p className="flex items-center gap-2 text-sm font-bold text-[#071942]">
                            <ScanLine size={16} className="text-success" />
                            Reading scanned pages…
                          </p>
                          {ocrProgress && (
                            <p className="text-xs font-semibold text-success">
                              Page {ocrProgress.current} of {ocrProgress.total}
                            </p>
                          )}
                          <p className="max-w-sm text-xs text-[#52627f]">This can take a moment for scanned reports. Keep this page open while we prepare the audit.</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-[#071942]">{uploading ? 'Uploading report…' : 'Finding accounts and negative items…'}</p>
                          <p className="text-xs text-[#52627f]">{parsing ? 'Preparing your report review.' : ''}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#eef4ff]">
                          <Upload size={28} className="text-[#071942]" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-[#071942]">Already have your report?</h3>
                          <p className="mt-1 text-sm text-[#23345f]">Drop it here or choose a file.</p>
                          <p className="mt-1 text-xs text-[#52627f]">Supported formats: {UPLOAD_FORMATS}. Scanned PDFs are read automatically when possible.</p>
                        </div>
                      </div>
                      <button type="button" className="btn-primary shrink-0 text-sm">Choose File</button>
                    </div>
                  )}
                </section>

                {ocrStatus && (
                  <OcrStatusPanel status={ocrStatus} />
                )}

                <section className="rounded-2xl border border-[#dbe3f0] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#071942]">Paste report text instead</p>
                      <p className="text-xs text-[#52627f]">Helpful for copied Credit Karma text or readable text exports.</p>
                    </div>
                    <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value as SupportedProvider)} className="rounded-lg border border-[#cfd8ea] bg-white px-3 py-2 text-xs text-[#071942]">
                      {PROVIDERS_LIST.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    rows={5}
                    className="mt-3 w-full resize-y rounded-xl border border-[#cfd8ea] bg-white px-3 py-2 font-mono text-xs text-[#071942]"
                    placeholder="Paste credit report text here…"
                  />
                  {rawText.trim() && (
                    <button onClick={() => parseText(rawText, selectedProvider)} disabled={parsing} className="btn-primary mt-3 flex items-center gap-2 text-sm">
                      {parsing ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                      Parse Pasted Text
                    </button>
                  )}
                </section>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-[#dbe3f0] bg-white p-5 shadow-sm">
                  <h2 className="text-base font-extrabold text-[#071942]">What happens next</h2>
                  <div className="mt-4 space-y-3">
                    {[
                      { icon: FileUp, title: 'Upload or get a report', detail: 'Use a partner link or upload the file you already have.' },
                      { icon: SearchCheck, title: 'AI reads the report', detail: 'Accounts, bureaus, and negative items are extracted.' },
                      { icon: ListChecks, title: 'Review the results', detail: 'You confirm classifications before moving forward.' },
                      { icon: Sparkles, title: 'Prepare disputes', detail: 'Qualified items can continue into the dispute workflow.' },
                    ].map(step => {
                      const Icon = step.icon;
                      return (
                        <div key={step.title} className="flex gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                            <Icon size={17} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#071942]">{step.title}</p>
                            <p className="text-xs leading-5 text-[#52627f]">{step.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#dbe3f0] bg-white p-5 shadow-sm">
                  <h2 className="text-base font-extrabold text-[#071942]">Import notes</h2>
                  <div className="mt-4 space-y-3 text-sm text-[#23345f]">
                    <div className="flex gap-3">
                      <LockKeyhole size={18} className="mt-0.5 shrink-0 text-[#071942]" />
                      <p>Use safe client data only and review all imported facts before saving.</p>
                    </div>
                    <div className="flex gap-3">
                      <WalletCards size={18} className="mt-0.5 shrink-0 text-[#071942]" />
                      <p>Partner buttons may open a third-party report source. Return here after downloading the report.</p>
                    </div>
                    <div className="flex gap-3">
                      <Bell size={18} className="mt-0.5 shrink-0 text-[#071942]" />
                      <p>If a report cannot be read, try the original PDF or paste readable report text.</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
      ) : (
        <div className="space-y-5">
          {ocrStatus && <OcrStatusPanel status={ocrStatus} />}
          {/* Parse result header */}
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Parse Results</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Provider: <span className="font-medium capitalize">{parsedReport.provider === 'unknown' ? 'Not detected' : parsedReport.provider}</span> ·
                  Parser confidence: <span className={`font-medium ${parsedReport.overallConfidence >= 70 ? 'text-success' : parsedReport.overallConfidence >= 40 ? 'text-warning' : 'text-danger'}`}>{parsedReport.overallConfidence}%</span>
                  {parsedReport.reportDate && <> · Report Date: <span className="font-medium">{parsedReport.reportDate}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setParsedReport(null); setShowProviderModal(false); }} className="btn-secondary text-xs flex items-center gap-1">
                  <X size={12} /> Reset
                </button>
                <div className="flex items-center gap-2">
                  <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value as SupportedProvider)} className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-foreground">
                    {PROVIDERS_LIST.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button onClick={() => parseText(rawText, selectedProvider)} disabled={parsing || !rawText} className="btn-primary text-xs flex items-center gap-1">
                    {parsing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Re-parse
                  </button>
                </div>
              </div>
            </div>

            {/* Section confidence breakdown */}
            <SectionConfidenceBreakdown sc={parsedReport.sectionConfidence} />

            {/* Sections parsed/missed */}
            <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
              {parsedReport.sectionsParsed.map(s => <span key={s} className="text-success">✓ {s}</span>)}
              {parsedReport.sectionsMissed.map(s => <span key={s} className="text-warning">⚠ {s}: Detected — none reported</span>)}
              {(parsedReport.sectionsNotFound ?? []).map(s => <span key={s} className="text-muted-foreground">— {s}: Not detected</span>)}
            </div>

            {/* Warnings */}
            {parsedReport.warnings.length > 0 && (
              <div className="space-y-1">
                {parsedReport.warnings.map((w, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${w.severity === 'error' ? 'bg-danger/10 text-danger' : w.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/5 text-primary'}`}>
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    {w.message}
                  </div>
                ))}
              </div>
            )}

            {/* Stage failures — shown when any parser stage had an issue */}
            {parsedReport.diagnostics?.stageFailures && parsedReport.diagnostics.stageFailures.length > 0 && (
              <ParseStageFailures failures={parsedReport.diagnostics.stageFailures} />
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Accounts', value: parsedReport.accounts.length },
                { label: 'Negative Items', value: parsedReport.negativeAccounts.length, danger: parsedReport.negativeAccounts.length > 0 },
                { label: 'Collections', value: parsedReport.collections.length, danger: parsedReport.collections.length > 0 },
                { label: 'Hard Inquiries', value: parsedReport.inquiries.filter(i => i.type === 'hard').length },
              ].map(s => (
                <div key={s.label} className="p-3 bg-muted/40 rounded-xl text-center">
                  <p className={`text-xl font-bold ${s.danger ? 'text-danger' : 'text-foreground'}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Negative classification status */}
            {parsedReport.negativeClassificationRan && parsedReport.negativeAccounts.length === 0 && parsedReport.accounts.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Negative item classification ran — no negatives auto-detected</p>
                  <p className="mt-0.5 opacity-80">All {parsedReport.accounts.length} accounts were classified as positive. Use &quot;Review {parsedReport.accounts.length} Accounts Manually&quot; to verify each account and mark negatives.</p>
                </div>
              </div>
            )}
          </div>

          {/* Negative items preview */}
          {parsedReport.negativeAccounts.length > 0 && (
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle size={15} className="text-danger" />
                Negative Items Detected ({parsedReport.negativeAccounts.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedReport.negativeAccounts.map((acc, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border text-xs">
                    <div>
                      <p className="font-medium text-foreground">{acc.creditorName}</p>
                      <p className="text-muted-foreground">{acc.accountType} · {acc.bureau}</p>
                    </div>
                    <span className="text-danger text-xs">{acc.negativeReason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unparsed blocks debug section — shown only when blocks were rejected */}
          {parsedReport.unparsedBlocks && parsedReport.unparsedBlocks.length > 0 && (
            <UnparsedBlocksDebug blocks={parsedReport.unparsedBlocks} />
          )}

          {/* Save to client */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Save Report to Client</h3>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Select Client</label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-card text-foreground"
              >
                <option value="">Select a client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Save warning based on parse quality */}
            {(() => {
              const warn = getSaveWarning(parsedReport);
              return (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-xs border ${warn.type === 'block' ? 'bg-danger/10 border-danger/20 text-danger' : warn.type === 'warn' ? 'bg-warning/10 border-warning/20 text-warning' : 'bg-primary/5 border-primary/20 text-primary'}`}>
                  {warn.type === 'ok' ? <Info size={13} className="shrink-0" /> : <AlertTriangle size={13} className="shrink-0" />}
                  <span>{warn.message}</span>
                </div>
              );
            })()}

            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => { setParsedReport(null); setShowProviderModal(false); }} className="btn-secondary text-sm">Cancel</button>

              {/* If provider unknown or low confidence — show alternative buttons */}
              {parsedReport.providerConfidence < 60 && parsedReport.provider === 'unknown' && (
                <button
                  onClick={() => setShowProviderModal(true)}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Select Provider &amp; Re-parse
                </button>
              )}

              {/* Review accounts manually button — always shown when accounts exist */}
              {parsedReport.accounts.length > 0 && selectedClientId && (
                <button
                  onClick={handleSaveToClient}
                  disabled={saving}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  {saving ? saveStage : `Review ${parsedReport.accounts.length} Accounts Manually`}
                </button>
              )}

              {/* Normal save — disabled if provider unknown + low confidence */}
              <button
                onClick={handleSaveToClient}
                disabled={saving || !selectedClientId || (parsedReport.providerConfidence < 60 && parsedReport.provider === 'unknown' && parsedReport.accounts.length === 0)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {saving ? saveStage : 'Save & Build Investigation Cases'}
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Note: review before sending */}
            <p className="text-xs text-muted-foreground text-right">The report is saved into investigation cases first. Dispute drafts should be generated only after facts and evidence are reviewed.</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
