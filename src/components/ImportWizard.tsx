'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, Loader2, X, Eye, Tag, Save, ArrowRight, AlertCircle, Edit2, Plus, Minus, RefreshCw, FileSearch,  } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { type SupportedProvider } from '@/lib/creditReport/parser';
import { type NormalizedReport, type NormalizedAccount, type ImportComparison } from '@/lib/creditReport/adapters';
import { needsAccountReview } from '@/lib/creditReport/reviewFlow';
import { extractPdfText } from '@/lib/creditReport/pdfUtils';
import DisputeReasonSelect from '@/components/DisputeReasonSelect';
import { DISPUTE_REASONS } from '@/lib/disputes/reasonRanking';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportMethod = 'upload' | 'paste' | 'manual';
type TagStatus = 'dispute' | 'not_disputing' | 'needs_review' | 'exclude' | 'unreviewed';

interface TaggedAccount extends NormalizedAccount {
  tagStatus: TagStatus;
  disputeReason: string;
  disputeInstruction: string;
  notes: string;
  _editing: boolean;
}

interface ImportWizardProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
  onComplete: (reportId: string) => void;
  existingProvider?: SupportedProvider;
  isReImport?: boolean;
}

const PROVIDERS: Array<{ value: SupportedProvider; label: string }> = [
  { value: 'unknown', label: 'Auto-detect' },
  { value: 'smartcredit', label: 'SmartCredit' },
  { value: 'myscoreiq', label: 'MyScoreIQ' },
  { value: 'identityiq', label: 'IdentityIQ' },
  { value: 'myfreescorenow', label: 'MyFreeScoreNow' },
  { value: 'privacyguard', label: 'PrivacyGuard' },
  { value: 'annualcreditreport', label: 'AnnualCreditReport.com' },
  { value: 'experian', label: 'Experian' },
  { value: 'equifax', label: 'Equifax' },
  { value: 'transunion', label: 'TransUnion' },
];

const DISPUTE_INSTRUCTIONS = [
  'Delete this item from my credit report',
  'Correct the inaccurate information',
  'Provide method of verification',
  'Validate this debt',
  'Remove unauthorized inquiry',
  'Update account status to paid/closed',
];

const STEP_LABELS = [
  'Import Method',
  'Select Provider',
  'Upload Report',
  'Parse Report',
  'Review Results',
  'Tag Items',
  'Save Report',
  'Credit Audit',
  'Dispute Wizard',
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEP_LABELS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <React.Fragment key={stepNum}>
            <div className={`flex items-center gap-1.5 shrink-0 ${active ? 'text-primary' : done ? 'text-success' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${active ? 'border-primary bg-primary text-primary-foreground' : done ? 'border-success bg-success text-white' : 'border-border bg-muted'}`}>
                {done ? <CheckCircle2 size={12} /> : stepNum}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-primary' : done ? 'text-success' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`h-px w-4 shrink-0 ${done ? 'bg-success' : 'bg-border'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Tag badge ────────────────────────────────────────────────────────────────

function TagBadge({ status }: { status: TagStatus }) {
  const map: Record<TagStatus, { label: string; cls: string }> = {
    dispute: { label: 'Tag for Dispute', cls: 'bg-danger/10 text-danger border-danger/30' },
    not_disputing: { label: 'Not Disputing', cls: 'bg-muted text-muted-foreground border-border' },
    needs_review: { label: 'Needs Review', cls: 'bg-warning/10 text-warning border-warning/30' },
    exclude: { label: 'Excluded', cls: 'bg-muted text-muted-foreground/50 border-border' },
    unreviewed: { label: 'Unreviewed', cls: 'bg-muted/50 text-muted-foreground border-border' },
  };
  const { label, cls } = map[status] ?? map.unreviewed;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Account card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  onTag,
  onEdit,
}: {
  account: TaggedAccount;
  onTag: (id: string, status: TagStatus) => void;
  onEdit: (id: string, field: string, value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const bureauColor = (b: string) => {
    if (b.toLowerCase().includes('equifax')) return 'bureau-eq';
    if (b.toLowerCase().includes('experian')) return 'bureau-ex';
    if (b.toLowerCase().includes('transunion')) return 'bureau-tu';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <div className={`card p-4 space-y-3 border transition-all ${account.isNegative ? 'border-danger/30 bg-danger/5' : 'border-border'} ${account.tagStatus === 'exclude' ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">{account.creditorName || 'Unknown Creditor'}</span>
            {account.isNegative && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-danger/10 text-danger">
                <AlertTriangle size={10} /> Negative
              </span>
            )}
            {account.isCollection && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Collection</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`badge text-xs ${bureauColor(account.bureau)}`}>{account.bureau}</span>
            {account.accountNumberMasked && (
              <span className="text-xs text-muted-foreground font-mono">{account.accountNumberMasked}</span>
            )}
            {account.accountType && (
              <span className="text-xs text-muted-foreground">{account.accountType}</span>
            )}
            {account.accountStatus && (
              <span className="text-xs text-muted-foreground">{account.accountStatus}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <TagBadge status={account.tagStatus} />
          <button onClick={() => setExpanded(e => !e)} className="p-1 hover:bg-muted rounded transition-colors">
            {expanded ? <Minus size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {/* Balance row */}
      {(account.balance !== null || account.pastDue !== null) && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          {account.balance !== null && <span>Balance: <strong className="text-foreground">${account.balance.toLocaleString()}</strong></span>}
          {account.pastDue !== null && account.pastDue > 0 && <span>Past Due: <strong className="text-danger">${account.pastDue.toLocaleString()}</strong></span>}
          {account.dateOpened && <span>Opened: {account.dateOpened}</span>}
        </div>
      )}

      {/* Remarks */}
      {account.remarks.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {account.remarks.slice(0, 3).map((r, i) => (
            <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">{r}</span>
          ))}
        </div>
      )}

      {/* Expanded: tagging controls */}
      {expanded && (
        <div className="pt-3 border-t border-border space-y-3">
          {/* Tag action buttons */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Action</p>
            <div className="flex flex-wrap gap-2">
              {(['dispute', 'not_disputing', 'needs_review', 'exclude'] as TagStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => onTag(account.id, s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${account.tagStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border hover:border-primary/50'}`}
                >
                  {s === 'dispute' ? 'Tag for Dispute' : s === 'not_disputing' ? 'Not Disputing' : s === 'needs_review' ? 'Needs Review' : 'Exclude'}
                </button>
              ))}
            </div>
          </div>

          {/* Dispute reason (only when tagged for dispute) */}
          {account.tagStatus === 'dispute' && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Dispute Reason</label>
                <DisputeReasonSelect
                  value={account.disputeReason}
                  onChange={value => onEdit(account.id, 'disputeReason', value)}
                  className="input text-xs w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Instruction</label>
                <select
                  value={account.disputeInstruction}
                  onChange={e => onEdit(account.id, 'disputeInstruction', e.target.value)}
                  className="input text-xs w-full"
                >
                  <option value="">Select instruction…</option>
                  {DISPUTE_INSTRUCTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Notes (optional)</label>
            <textarea
              value={account.notes}
              onChange={e => onEdit(account.id, 'notes', e.target.value)}
              rows={2}
              className="input text-xs w-full resize-none"
              placeholder="Internal notes…"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function ImportWizard({
  clientId,
  clientName,
  onClose,
  onComplete,
  existingProvider,
  isReImport = false,
}: ImportWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [importMethod, setImportMethod] = useState<ImportMethod>('upload');

  // Step 2
  const [provider, setProvider] = useState<SupportedProvider>(existingProvider ?? 'unknown');
  const [providerWarning, setProviderWarning] = useState('');

  // Step 3
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [importId, setImportId] = useState('');
  const [rawTextContent, setRawTextContent] = useState('');

  // Step 4
  const [parsing, setParsing] = useState(false);
  const [parsedReport, setParsedReport] = useState<NormalizedReport | null>(null);
  const [parsedReportId, setParsedReportId] = useState('');
  const [comparison, setComparison] = useState<ImportComparison | null>(null);
  const [isLowConfidence, setIsLowConfidence] = useState(false);

  // Step 5 / 6
  const [accounts, setAccounts] = useState<TaggedAccount[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'negative' | 'collections' | 'inquiries'>('all');

  // Step 7
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ savedCount: number; taggedCount: number; disputeItemIds: string[] } | null>(null);

  // Manual entry
  const [manualItems, setManualItems] = useState<Array<{
    creditorName: string; bureau: string; accountType: string;
    accountStatus: string; balance: string; disputeReason: string;
    disputeInstruction: string; notes: string;
  }>>([]);

  // ── Provider change warning for re-import ────────────────────────────────
  useEffect(() => {
    if (isReImport && existingProvider && provider !== existingProvider && provider !== 'unknown') {
      setProviderWarning(
        `Warning: Changing from ${existingProvider} to ${provider} may cause duplicate accounts because different providers format account data differently. A migration comparison will be shown before saving.`
      );
    } else {
      setProviderWarning('');
    }
  }, [provider, existingProvider, isReImport]);

  // ── Step 3: Upload file ───────────────────────────────────────────────────
  const handleFileUpload = async () => {
    if (!selectedFile && importMethod === 'upload') {
      setError('Please select a file to upload.');
      return;
    }
    if (!pastedText.trim() && importMethod === 'paste') {
      setError('Please paste report content.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      let textContent = '';

      if (importMethod === 'upload' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('clientId', clientId);
        formData.append('provider', provider);
        formData.append('importMethod', importMethod);

        const res = await fetch('/api/credit-report/import-upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        setImportId(data.importId);

        if (data.isPdf) {
          // Extract text from PDF client-side
          const extracted = await extractPdfText(selectedFile);
          if (extracted.isImageBased || !extracted.text.trim()) {
            throw new Error('This PDF does not contain readable embedded text. Please use the credit report import page to run OCR.');
          }
          textContent = extracted.text;
        } else {
          textContent = data.textContent;
        }
      } else if (importMethod === 'paste') {
        textContent = pastedText;
        // Create a minimal import record for paste
        const { data: importRec } = await supabase
          .from('credit_report_imports')
          .insert({
            owner_id: (await supabase.auth.getUser()).data.user?.id,
            client_id: clientId,
            import_method: 'paste',
            provider,
            import_status: 'uploaded',
            file_name: 'pasted_report.txt',
            file_type: 'text/plain',
          })
          .select()
          .single();
        if (importRec) setImportId(importRec.id);
      } else if (importMethod === 'manual') {
        setStep(6); // Skip to tagging with manual entry
        setLoading(false);
        return;
      }

      setRawTextContent(textContent);
      setStep(4);
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Parse report ──────────────────────────────────────────────────
  const handleParse = useCallback(async (overrideProvider?: SupportedProvider) => {
    if (!rawTextContent) { setError('No report content to parse.'); return; }

    setParsing(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/credit-report/parse-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          importId,
          clientId,
          provider: overrideProvider ?? provider,
          textContent: rawTextContent,
          importMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parse failed');

      setParsedReport(data.parsed);
      setParsedReportId(data.parsedReportId);
      setComparison(data.comparison);
      setIsLowConfidence(data.isLowConfidence);

      // Initialize accounts with tag status
      const tagged: TaggedAccount[] = (data.parsed.accounts ?? []).map((a: NormalizedAccount) => ({
        ...a,
        tagStatus: (needsAccountReview(a) ? 'needs_review' : 'unreviewed') as TagStatus,
        disputeReason: '',
        disputeInstruction: '',
        notes: '',
        _editing: false,
      }));
      setAccounts(tagged);

      setStep(5);
    } catch (err: any) {
      setError(err?.message ?? 'Parse failed');
    } finally {
      setParsing(false);
    }
  }, [rawTextContent, importId, clientId, provider, importMethod]);

  useEffect(() => {
    if (step === 4 && rawTextContent && !parsedReport) {
      handleParse();
    }
  }, [step]);

  // ── Tag account ───────────────────────────────────────────────────────────
  const handleTag = (id: string, status: TagStatus) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, tagStatus: status } : a));
  };

  const handleEditField = (id: string, field: string, value: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // ── Step 7: Tag and save ──────────────────────────────────────────────────
  const handleTagAndSave = async () => {
    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const taggedItems = accounts.filter(a => a.tagStatus === 'dispute');

      const res = await fetch('/api/credit-report/tag-and-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          parsedReportId,
          importId,
          clientId,
          taggedItems: taggedItems.map(a => ({ ...a })),
          allAccounts: accounts.map(a => ({ ...a })),
          parsed: parsedReport,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setSaveResult(data);
      setStep(8);
      toast.success(`Report saved. ${data.taggedCount} items tagged for dispute.`);
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Add manual item ───────────────────────────────────────────────────────
  const addManualItem = () => {
    setManualItems(prev => [...prev, {
      creditorName: '', bureau: 'TransUnion', accountType: '',
      accountStatus: '', balance: '', disputeReason: '', disputeInstruction: '', notes: '',
    }]);
  };

  const updateManualItem = (i: number, field: string, value: string) => {
    setManualItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const removeManualItem = (i: number) => {
    setManualItems(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Save manual items ─────────────────────────────────────────────────────
  const handleSaveManual = async () => {
    if (manualItems.length === 0) { setError('Add at least one item.'); return; }
    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const rows = manualItems.map(item => ({
        owner_id: user.id,
        client_id: clientId,
        bureau: item.bureau,
        creditor_name: item.creditorName,
        account_type: item.accountType,
        status: item.accountStatus,
        balance: item.balance ? parseFloat(item.balance) : null,
        dispute_reason: item.disputeReason,
        dispute_instruction: item.disputeInstruction,
        dispute_status: item.disputeReason ? 'ready' : 'draft',
        is_selected: !!item.disputeReason,
        is_negative: true,
        tag_status: item.disputeReason ? 'dispute' : 'unreviewed',
        notes: item.notes,
        negative_category: 'other',
      }));

      const { error: insertError } = await supabase.from('negative_items').insert(rows);
      if (insertError) throw insertError;

      toast.success(`${rows.length} items saved manually.`);
      onComplete('manual');
    } catch (err: any) {
      setError(err?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered accounts ─────────────────────────────────────────────────────
  const filteredAccounts = accounts.filter(a => {
    if (activeFilter === 'negative') return a.isNegative;
    if (activeFilter === 'collections') return a.isCollection;
    if (activeFilter === 'inquiries') return a.accountType?.toLowerCase().includes('inquiry');
    return true;
  });

  const taggedCount = accounts.filter(a => a.tagStatus === 'dispute').length;
  const negativeCount = accounts.filter(a => a.isNegative).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {isReImport ? 'Re-import Updated Report' : 'Import / Audit Credit Report'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{clientName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-border shrink-0 overflow-x-auto">
          <StepIndicator current={step} total={9} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30">
              <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* ── STEP 1: Import Method ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Select Import Method</h3>
                <p className="text-xs text-muted-foreground">How would you like to import the credit report?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { value: 'upload', icon: Upload, label: 'Upload Report File', desc: 'PDF, HTML, TXT, or JSON' },
                  { value: 'paste', icon: FileText, label: 'Paste Report Data', desc: 'HTML source, JSON, or plain text' },
                  { value: 'manual', icon: Edit2, label: 'Manual Entry', desc: 'Enter dispute items directly' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setImportMethod(opt.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all space-y-2 ${importMethod === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                  >
                    <opt.icon size={20} className={importMethod === opt.value ? 'text-primary' : 'text-muted-foreground'} />
                    <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Select Provider ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Select Report Provider</h3>
                <p className="text-xs text-muted-foreground">Identifying the provider ensures the correct parser is used. You can correct this after parsing.</p>
              </div>
              {providerWarning && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/10 border border-warning/30">
                  <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">{providerWarning}</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROVIDERS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setProvider(p.value)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${provider === p.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border hover:border-primary/50'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>SmartCredit</strong> and <strong>MyScoreIQ</strong> are FixMy.Money affiliate partners. You can obtain your report through these links if needed:
                </p>
                <div className="flex gap-3 mt-2">
                  <a href="https://www.smartcredit.com/?PID=35662" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">SmartCredit</a>
                  <a href="https://www.myscoreiq.com/get-fico-max.aspx?offercode=432143RB" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">MyScoreIQ</a>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Upload / Paste ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                {importMethod === 'upload' ? 'Upload Report File' : importMethod === 'paste' ? 'Paste Report Data' : 'Manual Entry'}
              </h3>

              {importMethod === 'upload' && (
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) setSelectedFile(f);
                  }}
                >
                  <Upload size={32} className="text-muted-foreground mx-auto mb-3" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, HTML, TXT, JSON — max 25 MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.html,.htm,.txt,.json"
                    className="hidden"
                    onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              {importMethod === 'paste' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Paste HTML source, JSON, or plain text report content</label>
                  <textarea
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    rows={12}
                    className="input w-full font-mono text-xs resize-none"
                    placeholder="Paste your credit report content here…"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{pastedText.length.toLocaleString()} characters</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Parsing ── */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {parsing ? (
                <>
                  <Loader2 size={40} className="text-primary animate-spin" />
                  <p className="text-sm font-medium text-foreground">Parsing credit report…</p>
                  <p className="text-xs text-muted-foreground">Running {provider === 'unknown' ? 'auto-detect' : provider} adapter</p>
                </>
              ) : (
                <>
                  <AlertCircle size={40} className="text-warning" />
                  <p className="text-sm font-medium text-foreground">Ready to parse</p>
                  <button onClick={() => handleParse()} className="btn-primary">Start Parsing</button>
                </>
              )}
            </div>
          )}

          {/* ── STEP 5: Parse Preview ── */}
          {step === 5 && parsedReport && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Parse Results</h3>
                {isLowConfidence && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-warning/10 text-warning border border-warning/30">
                    <AlertTriangle size={12} /> Low Confidence — Review Required
                  </span>
                )}
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Accounts', value: parsedReport.accounts.length, color: 'text-foreground' },
                  { label: 'Negative', value: parsedReport.accounts.filter(a => a.isNegative).length, color: 'text-danger' },
                  { label: 'Inquiries', value: parsedReport.inquiries.length, color: 'text-warning' },
                  { label: 'Collections', value: parsedReport.collections.length, color: 'text-orange-600' },
                ].map(card => (
                  <div key={card.label} className="card p-3 text-center">
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Scores */}
              {parsedReport.scores.length > 0 && (
                <div className="card p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credit Scores</p>
                  <div className="flex gap-4 flex-wrap">
                    {parsedReport.scores.map((s, i) => (
                      <div key={i} className="text-center">
                        <p className="text-xl font-bold text-foreground">{s.score}</p>
                        <p className="text-xs text-muted-foreground">{s.bureau}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Provider detection */}
              <div className="card p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detection</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-foreground">Provider: <strong>{parsedReport.detectedProvider}</strong></span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${parsedReport.providerConfidence >= 70 ? 'bg-success/10 text-success' : parsedReport.providerConfidence >= 40 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
                    {parsedReport.providerConfidence}% confidence
                  </span>
                  <span className="text-xs text-muted-foreground">Adapter: {parsedReport.adapterUsed}</span>
                  <span className={`text-xs font-bold uppercase ${parsedReport.analysisOutcome?.state === 'success' ? 'text-success' : 'text-warning'}`}>
                    {parsedReport.analysisOutcome?.state === 'success' ? 'Parse successful' : 'Needs review'}
                  </span>
                </div>
                {/* Correct provider */}
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs text-muted-foreground">Correct provider:</label>
                  <select
                    value={provider}
                    onChange={e => setProvider(e.target.value as SupportedProvider)}
                    className="input text-xs"
                  >
                    {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button
                    onClick={() => handleParse(provider)}
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Re-parse
                  </button>
                </div>
              </div>

              {/* Confidence breakdown */}
              <div className="card p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Section Confidence</p>
                {Object.entries(parsedReport.sectionConfidence).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-40 shrink-0 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${val >= 70 ? 'bg-success' : val >= 40 ? 'bg-warning' : val > 0 ? 'bg-danger' : 'bg-muted-foreground/20'}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right text-muted-foreground">{val}%</span>
                  </div>
                ))}
              </div>

              {/* Warnings */}
              {parsedReport.warnings.length > 0 && (
                <div className="card p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parser Warnings</p>
                  {parsedReport.warnings.map((w, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${w.severity === 'error' ? 'bg-danger/10 text-danger' : w.severity === 'warning' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span><strong>{w.section}:</strong> {w.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Re-import comparison */}
              {comparison && (
                <div className="card p-4 space-y-2 border-primary/20">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Re-import Comparison</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { label: 'Newly Added', value: comparison.newlyAdded.length, color: 'text-success' },
                      { label: 'Updated', value: comparison.updatedAccounts.length, color: 'text-warning' },
                      { label: 'Verified', value: comparison.verifiedAccounts.length, color: 'text-muted-foreground' },
                      { label: 'Newly Negative', value: comparison.newlyNegative.length, color: 'text-danger' },
                      { label: 'Possibly Removed', value: comparison.deletedAccounts.length, color: 'text-muted-foreground' },
                      { label: 'Balance Changes', value: comparison.balanceChanges.length, color: 'text-foreground' },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={`font-bold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parsedReport.accounts.length === 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
                  <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-warning">No accounts detected</p>
                    <p className="text-xs text-warning/80 mt-0.5">The parser could not extract account data. Try selecting a different provider or use Manual Entry.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 6: Tag Items ── */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Review & Tag Dispute Items</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {taggedCount} of {accounts.length} accounts tagged for dispute
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAccounts(prev => prev.map(a => a.isNegative ? { ...a, tagStatus: 'dispute' } : a))}
                    className="btn-secondary text-xs"
                  >
                    Tag All Negative
                  </button>
                  <button
                    onClick={() => setAccounts(prev => prev.map(a => ({ ...a, tagStatus: 'unreviewed' })))}
                    className="btn-secondary text-xs"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 border-b border-border">
                {([
                  { id: 'all', label: `All (${accounts.length})` },
                  { id: 'negative', label: `Negative (${negativeCount})` },
                  { id: 'collections', label: `Collections (${accounts.filter(a => a.isCollection).length})` },
                  { id: 'inquiries', label: `Inquiries (${accounts.filter(a => a.accountType?.toLowerCase().includes('inquiry')).length})` },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${activeFilter === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Manual entry mode */}
              {importMethod === 'manual' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Manual Dispute Items</p>
                    <button onClick={addManualItem} className="btn-secondary text-xs flex items-center gap-1">
                      <Plus size={12} /> Add Item
                    </button>
                  </div>
                  {manualItems.map((item, i) => (
                    <div key={i} className="card p-4 space-y-3 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">Item {i + 1}</span>
                        <button onClick={() => removeManualItem(i)} className="p-1 hover:bg-muted rounded">
                          <X size={12} className="text-muted-foreground" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Creditor Name *</label>
                          <input value={item.creditorName} onChange={e => updateManualItem(i, 'creditorName', e.target.value)} className="input text-xs w-full" placeholder="Creditor name" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Bureau *</label>
                          <select value={item.bureau} onChange={e => updateManualItem(i, 'bureau', e.target.value)} className="input text-xs w-full">
                            <option>TransUnion</option><option>Equifax</option><option>Experian</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Account Type</label>
                          <input value={item.accountType} onChange={e => updateManualItem(i, 'accountType', e.target.value)} className="input text-xs w-full" placeholder="e.g. Credit Card" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Status</label>
                          <input value={item.accountStatus} onChange={e => updateManualItem(i, 'accountStatus', e.target.value)} className="input text-xs w-full" placeholder="e.g. Collection" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Balance</label>
                          <input value={item.balance} onChange={e => updateManualItem(i, 'balance', e.target.value)} className="input text-xs w-full" placeholder="0.00" type="number" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Dispute Reason</label>
                          <DisputeReasonSelect value={item.disputeReason} onChange={value => updateManualItem(i, 'disputeReason', value)} className="input text-xs w-full" placeholder="Select…" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {manualItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Edit2 size={24} className="mx-auto mb-2 opacity-40" />
                      <p>No items added yet. Click "Add Item" to begin.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Parsed accounts */}
              {importMethod !== 'manual' && (
                <div className="space-y-3">
                  {filteredAccounts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <FileSearch size={24} className="mx-auto mb-2 opacity-40" />
                      <p>No accounts in this category.</p>
                    </div>
                  ) : (
                    filteredAccounts.map(account => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onTag={handleTag}
                        onEdit={handleEditField}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 7: Save confirmation ── */}
          {step === 7 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Tag and Save Report</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Review your selections before saving permanently.</p>
              </div>

              <div className="card p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Accounts</p>
                    <p className="font-bold text-foreground">{accounts.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Negative Accounts</p>
                    <p className="font-bold text-danger">{negativeCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tagged for Dispute</p>
                    <p className="font-bold text-primary">{taggedCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Provider</p>
                    <p className="font-bold text-foreground capitalize">{parsedReport?.detectedProvider ?? provider}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-xs text-primary">
                  Clicking <strong>Tag and Save Report</strong> will permanently save all {accounts.length} accounts and create {taggedCount} dispute items. This action cannot be undone.
                </p>
              </div>

              {taggedCount === 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/10 border border-warning/30">
                  <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">No items are tagged for dispute. You can still save the report and tag items later from the client's Dispute Items page.</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 8: Credit Audit ── */}
          {step === 8 && parsedReport && saveResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-success" />
                <h3 className="text-sm font-semibold text-foreground">Credit Audit Summary</h3>
              </div>

              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Report Overview</p>
                  {parsedReport.reportDate && <p className="text-xs text-muted-foreground">Report Date: {parsedReport.reportDate}</p>}
                </div>

                {/* Scores */}
                {parsedReport.scores.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Bureau Scores</p>
                    <div className="flex gap-4 flex-wrap">
                      {parsedReport.scores.map((s, i) => (
                        <div key={i} className="text-center p-3 bg-muted/50 rounded-xl">
                          <p className="text-2xl font-bold text-foreground">{s.score}</p>
                          <p className="text-xs text-muted-foreground">{s.bureau}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account summary */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Account Summary</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { label: 'Total Accounts', value: accounts.length },
                      { label: 'Negative', value: negativeCount, cls: 'text-danger' },
                      { label: 'Collections', value: accounts.filter(a => a.isCollection).length, cls: 'text-orange-600' },
                      { label: 'Inquiries', value: parsedReport.inquiries.length, cls: 'text-warning' },
                    ].map(item => (
                      <div key={item.label} className="p-2 bg-muted/50 rounded-lg text-center">
                        <p className={`text-lg font-bold ${item.cls ?? 'text-foreground'}`}>{item.value}</p>
                        <p className="text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dispute items */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Dispute Items</p>
                  <div className="space-y-1">
                    {accounts.filter(a => a.tagStatus === 'dispute').slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 bg-danger/5 rounded-lg border border-danger/20">
                        <span className="font-medium text-foreground">{a.creditorName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{a.bureau}</span>
                          {a.disputeReason && <span className="text-danger">{a.disputeReason}</span>}
                        </div>
                      </div>
                    ))}
                    {saveResult.taggedCount > 5 && (
                      <p className="text-xs text-muted-foreground text-center">+{saveResult.taggedCount - 5} more items</p>
                    )}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> This audit reflects factual report data and software-detected observations. Items marked for dispute were selected by staff. A negative account is not automatically inaccurate or unlawful.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 9: Continue to Dispute Wizard ── */}
          {step === 9 && (
            <div className="space-y-4 text-center py-6">
              <CheckCircle2 size={48} className="text-success mx-auto" />
              <h3 className="text-base font-bold text-foreground">Report Saved Successfully</h3>
              <p className="text-sm text-muted-foreground">
                {saveResult?.taggedCount ?? 0} dispute items are ready in the Dispute Wizard.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    onComplete(parsedReportId);
                    router.push(`/dispute-wizard?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}&reportId=${parsedReportId}&fromReport=true`);
                  }}
                  className="btn-primary flex items-center gap-2 justify-center"
                >
                  Continue to Dispute Wizard <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => router.push(`/clients/${clientId}/negative-items`)}
                  className="btn-secondary flex items-center gap-2 justify-center"
                >
                  <Eye size={16} /> View Dispute Items
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={() => {
              if (step > 1 && step < 8) setStep(s => s - 1);
              else if (step >= 8) onClose();
            }}
            className="btn-secondary flex items-center gap-2"
            disabled={loading || parsing || saving}
          >
            {step >= 8 ? <><X size={14} /> Close</> : <><ChevronLeft size={14} /> Back</>}
          </button>

          <div className="flex items-center gap-3">
            {/* Step-specific primary actions */}
            {step === 1 && (
              <button onClick={() => setStep(2)} className="btn-primary flex items-center gap-2">
                Next <ChevronRight size={14} />
              </button>
            )}
            {step === 2 && (
              <button onClick={() => setStep(3)} className="btn-primary flex items-center gap-2">
                Next <ChevronRight size={14} />
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleFileUpload}
                disabled={loading || (importMethod === 'upload' && !selectedFile) || (importMethod === 'paste' && !pastedText.trim())}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <>Upload & Parse <ChevronRight size={14} /></>}
              </button>
            )}
            {step === 5 && (
              <button onClick={() => setStep(6)} className="btn-primary flex items-center gap-2">
                Review Items <ChevronRight size={14} />
              </button>
            )}
            {step === 6 && importMethod === 'manual' && (
              <button onClick={handleSaveManual} disabled={saving || manualItems.length === 0} className="btn-primary flex items-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Items</>}
              </button>
            )}
            {step === 6 && importMethod !== 'manual' && (
              <button onClick={() => setStep(7)} className="btn-primary flex items-center gap-2">
                Review & Save <ChevronRight size={14} />
              </button>
            )}
            {step === 7 && (
              <button
                onClick={handleTagAndSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Tag size={14} /> Tag and Save Report</>}
              </button>
            )}
            {step === 8 && (
              <button onClick={() => setStep(9)} className="btn-primary flex items-center gap-2">
                Continue <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
