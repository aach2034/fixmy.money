'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Trash2, Save, ArrowRight, Info, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ParsedCreditReport, ParsedAccount, SectionConfidence } from '@/lib/creditReport/parser';
import { DISPUTE_INSTRUCTIONS } from '@/lib/creditReport/parser';
import DisputeReasonSelect from '@/components/DisputeReasonSelect';

interface ReportReviewContentProps {
  clientId: string;
  reportId: string;
}

interface EditableAccount extends ParsedAccount {
  _editing: boolean;
  _markedNegative: boolean;
  _markedCollection: boolean;
  _disputeReason: string;
  _disputeInstruction: string;
  _note: string;
  _deleted: boolean;
  _dbId: string; // the negative_items row id
}

interface InvestigationIssue {
  id: string;
  issue_type: string | null;
  issue_label: string | null;
  affected_bureaus: string[] | null;
  affected_furnisher: string | null;
  why_flagged: string | null;
  confidence_level: number | null;
  evidence_strength: string | null;
  evidence_still_needed: string[] | null;
}

export default function ReportReviewContent({ clientId, reportId }: ReportReviewContentProps) {
  const router = useRouter();
  const supabase = createClient();

  const [report, setReport] = useState<ParsedCreditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [accounts, setAccounts] = useState<EditableAccount[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [sectionConf, setSectionConf] = useState<SectionConfidence | null>(null);
  const [investigationIssues, setInvestigationIssues] = useState<InvestigationIssue[]>([]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: reportData } = await supabase
        .from('parsed_credit_reports')
        .select('*')
        .eq('id', reportId)
        .eq('owner_id', user.id)
        .single();

      if (!reportData) { toast.error('Report not found'); router.back(); return; }

      const { data: clientData } = await supabase
        .from('staff_clients')
        .select('name')
        .eq('id', clientId)
        .eq('owner_id', user.id)
        .single();

      setClientName(clientData?.name ?? 'Client');

      // Load ALL items for this report (accounts + inquiries saved as rows)
      const { data: allItems } = await supabase
        .from('negative_items')
        .select('*')
        .eq('report_id', reportId)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });

      // Map DB rows to EditableAccount
      const parsedAccounts: EditableAccount[] = (allItems ?? []).map((item: any) => ({
        id: item.id,
        _dbId: item.id,
        creditorName: item.creditor_name ?? '',
        furnisherName: item.furnisher_name ?? item.creditor_name ?? '',
        accountNumber: item.account_number_masked?.replace(/\*/g, '') ?? '',
        accountNumberMasked: item.account_number_masked ?? '',
        accountType: item.account_type ?? '',
        responsibility: 'Individual',
        status: item.status ?? '',
        balance: item.balance ?? null,
        highBalance: null,
        creditLimit: null,
        pastDue: item.past_due ?? null,
        dateOpened: item.date_opened ?? '',
        dateClosed: '',
        dateReported: item.date_reported ?? '',
        dateLastActivity: item.date_last_activity ?? '',
        bureaus: item.bureaus_reporting ?? [item.bureau ?? 'Unknown'],
        bureau: item.bureau ?? 'Unknown',
        paymentHistory: '',
        remarks: item.remarks ?? [],
        isNegative: item.is_negative ?? (item.negative_category !== 'positive'),
        negativeReason: item.negative_reason ?? '',
        disputeStatus: item.dispute_status ?? 'draft',
        isCollection: item.is_collection ?? item.negative_category === 'collection',
        isChargeOff: item.negative_category === 'charge_off',
        isLate: item.negative_category === 'late_payment',
        latePayments: [],
        rawText: item.raw_text_source ?? '',
        parserConfidence: item.parser_confidence ?? 0,
        _editing: false,
        _markedNegative: item.is_negative ?? (item.negative_category !== 'positive' && item.negative_category !== 'hard_inquiry'),
        _markedCollection: item.is_collection ?? item.negative_category === 'collection',
        _disputeReason: item.dispute_reason ?? '',
        _disputeInstruction: item.dispute_instruction ?? '',
        _note: item.notes ?? '',
        _deleted: false,
      }));

      setAccounts(parsedAccounts);

      // Reconstruct report shape for display
      const parsed: ParsedCreditReport = {
        provider: reportData.provider ?? 'unknown',
        providerConfidence: reportData.provider_confidence ?? 0,
        parserVersion: reportData.parser_version ?? '3.0.0',
        parsedAt: reportData.created_at,
        reportDate: reportData.report_date ?? '',
        rawText: reportData.raw_text ?? '',
        personalInfo: reportData.personal_info ?? { name: '', nameVariations: [], ssn: '', dob: '', currentAddress: null, previousAddresses: [], employers: [], phones: [] },
        scores: reportData.scores ?? [],
        accounts: parsedAccounts,
        negativeAccounts: parsedAccounts.filter(a => a.isNegative),
        positiveAccounts: parsedAccounts.filter(a => !a.isNegative),
        collections: parsedAccounts.filter(a => a.isCollection),
        chargeOffs: parsedAccounts.filter(a => a.isChargeOff),
        latePayments: parsedAccounts.filter(a => a.isLate),
        closedAccounts: [],
        openAccounts: [],
        inquiries: (reportData.all_inquiries ?? []),
        publicRecords: (reportData.public_records ?? []),
        bankruptcies: [],
        bureauDifferences: [],
        warnings: reportData.warnings ?? [],
        sectionsParsed: reportData.sections_parsed ?? [],
        sectionsMissed: reportData.sections_missed ?? [],
        sectionsNotFound: reportData.sections_missed ?? [],
        unparsedBlocks: [],
        overallConfidence: reportData.overall_confidence ?? 0,
        sectionConfidence: reportData.section_confidence ?? {
          providerDetection: reportData.provider_confidence ?? 0,
          personalInfo: 0,
          accounts: parsedAccounts.length > 0 ? 80 : 0,
          negativeClassification: parsedAccounts.filter(a => a.isNegative).length > 0 ? 90 : 50,
          inquiries: 0,
          publicRecords: 0,
          overall: reportData.overall_confidence ?? 0,
        },
        sectionStatuses: {
          creditScores: (reportData.scores ?? []).length > 0 ? 'parsed_with_results' : 'section_not_found',
          inquiries: (reportData.all_inquiries ?? []).length > 0 ? 'parsed_with_results' : 'section_not_found',
          collections: parsedAccounts.some(a => a.isCollection) ? 'parsed_with_results' : 'parsed_none_reported',
          publicRecords: (reportData.public_records ?? []).length > 0 ? 'parsed_with_results' : 'section_not_found',
          chargeOffs: parsedAccounts.some(a => a.isChargeOff) ? 'parsed_with_results' : 'parsed_none_reported',
          accounts: parsedAccounts.length > 0 ? 'parsed_with_results' : 'section_not_found',
        },
        negativeClassificationRan: true,
      };

      setSectionConf(parsed.sectionConfidence);
      setReport(parsed);

      try {
        const { data: snapshots } = await supabase
          .from('report_snapshots')
          .select('id')
          .eq('parsed_report_id', reportId)
          .eq('owner_id', user.id);
        const snapshotIds = (snapshots ?? []).map((snapshot: any) => snapshot.id);
        if (snapshotIds.length > 0) {
          const { data: issues } = await supabase
            .from('detected_issues')
            .select('id, issue_type, issue_label, affected_bureaus, affected_furnisher, why_flagged, confidence_level, evidence_strength, evidence_still_needed')
            .eq('owner_id', user.id)
            .in('report_snapshot_id', snapshotIds)
            .order('confidence_level', { ascending: false })
            .limit(8);
          setInvestigationIssues((issues ?? []) as InvestigationIssue[]);
        } else {
          setInvestigationIssues([]);
        }
      } catch (issueError) {
        console.warn('[ReportReview] Investigation issues unavailable:', issueError);
        setInvestigationIssues([]);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportId, clientId]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const updateAccount = (id: string, updates: Partial<EditableAccount>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const toSave = accounts.filter(a => !a._deleted);
      const toDelete = accounts.filter(a => a._deleted);

      for (const acc of toSave) {
        const { error: updateError } = await supabase.from('negative_items').update({
          bureau: acc.bureau,
          creditor_name: acc.creditorName,
          furnisher_name: acc.furnisherName,
          account_number_masked: acc.accountNumberMasked,
          account_type: acc.accountType,
          status: acc.status,
          balance: acc.balance,
          past_due: acc.pastDue,
          date_opened: acc.dateOpened,
          date_reported: acc.dateReported,
          date_last_activity: acc.dateLastActivity,
          negative_reason: acc.negativeReason,
          negative_category: acc._markedCollection ? 'collection' : acc.isChargeOff ? 'charge_off' : acc.isLate ? 'late_payment' : acc._markedNegative ? 'other' : 'positive',
          dispute_reason: acc._disputeReason,
          dispute_instruction: acc._disputeInstruction,
          notes: acc._note,
          bureaus_reporting: acc.bureaus,
          remarks: acc.remarks,
          is_negative: acc._markedNegative,
          is_collection: acc._markedCollection,
          updated_at: new Date().toISOString(),
        }).eq('id', acc._dbId).eq('owner_id', user.id);
        if (updateError) throw new Error(`Could not save ${acc.creditorName || 'account'}: ${updateError.message}`);
      }

      for (const acc of toDelete) {
        const { error: deleteError } = await supabase.from('negative_items').delete().eq('id', acc._dbId).eq('owner_id', user.id);
        if (deleteError) throw new Error(`Could not remove ${acc.creditorName || 'account'}: ${deleteError.message}`);
      }

      const { error: reportUpdateError } = await supabase.from('parsed_credit_reports').update({
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
      }).eq('id', reportId).eq('owner_id', user.id);
      if (reportUpdateError) throw new Error(`Could not finalize report review: ${reportUpdateError.message}`);

      const negCount = toSave.filter(a => a._markedNegative).length;
      const disputableCount = toSave.filter(a => a._markedNegative || a.accountType === 'Hard Inquiry').length;
      toast.success(`Report saved. ${negCount} negative items ready for dispute.`);
      if (disputableCount > 0) {
        router.push(`/dispute-wizard?clientId=${clientId}&clientName=${encodeURIComponent(clientName)}&reportId=${reportId}&fromReport=true`);
      } else {
        router.push(`/clients/${clientId}/negative-items`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save report');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'All Accounts', count: accounts.filter(a => !a._deleted && a.accountType !== 'Hard Inquiry').length },
    { id: 'negative', label: 'Possible Negative Items', count: accounts.filter(a => !a._deleted && a._markedNegative).length },
    { id: 'collections', label: 'Collections', count: accounts.filter(a => !a._deleted && a._markedCollection).length },
    { id: 'inquiries', label: 'Inquiries', count: accounts.filter(a => !a._deleted && a.accountType === 'Hard Inquiry').length + (report?.inquiries?.length ?? 0) },
    { id: 'personal', label: 'Personal Info', count: null },
    { id: 'warnings', label: 'Parser Warnings', count: report?.warnings?.length ?? 0 },
  ];

  const getTabAccounts = () => {
    const active = accounts.filter(a => !a._deleted);
    switch (activeTab) {
      case 'all': return active.filter(a => a.accountType !== 'Hard Inquiry');
      case 'negative': return active.filter(a => a._markedNegative);
      case 'collections': return active.filter(a => a._markedCollection);
      case 'inquiries': return active.filter(a => a.accountType === 'Hard Inquiry');
      default: return active;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading parsed report…</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const allActive = accounts.filter(a => !a._deleted);
  const negativeItems = allActive.filter(a => a._markedNegative);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Review Parsed Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientName} · Provider: <span className="font-medium capitalize">{report.provider === 'unknown' ? 'Not detected' : report.provider}</span> · Confidence: <span className={`font-medium ${report.overallConfidence >= 70 ? 'text-success' : report.overallConfidence >= 40 ? 'text-warning' : 'text-danger'}`}>{report.overallConfidence}%</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => router.push(`/clients/${clientId}/negative-items`)}
            className="btn-secondary text-sm"
          >
            Skip to Negative Items
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save &amp; Continue
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Parser Confidence</span>
          <span className={`text-sm font-bold ${report.overallConfidence >= 70 ? 'text-success' : report.overallConfidence >= 40 ? 'text-warning' : 'text-danger'}`}>
            {report.overallConfidence}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${report.overallConfidence >= 70 ? 'bg-success' : report.overallConfidence >= 40 ? 'bg-warning' : 'bg-danger'}`}
            style={{ width: `${report.overallConfidence}%` }}
          />
        </div>
        {sectionConf && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {[
              { label: 'Provider', value: sectionConf.providerDetection },
              { label: 'Personal Info', value: sectionConf.personalInfo },
              { label: 'Accounts', value: sectionConf.accounts },
              { label: 'Negative Classification', value: sectionConf.negativeClassification },
              { label: 'Inquiries', value: sectionConf.inquiries },
              { label: 'Public Records', value: sectionConf.publicRecords },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-36 shrink-0">{row.label}</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${row.value >= 70 ? 'bg-success' : row.value >= 40 ? 'bg-warning' : row.value > 0 ? 'bg-danger' : 'bg-muted-foreground/20'}`} style={{ width: `${row.value}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{row.value > 0 ? `${row.value}%` : '—'}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
          {report.sectionsParsed.map(s => <span key={s} className="text-success">✓ {s}</span>)}
          {report.sectionsMissed.map(s => <span key={s} className="text-muted-foreground">— {s}: Detected — none reported</span>)}
        </div>
      </div>

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <div className="space-y-2">
          {report.warnings.map((w, i) => (
            <div key={`warn-${i}`} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${w.severity === 'error' ? 'bg-danger/10 border-danger/20 text-danger' : w.severity === 'warning' ? 'bg-warning/10 border-warning/20 text-warning' : 'bg-primary/5 border-primary/20 text-primary'}`}>
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Accounts', value: allActive.filter(a => a.accountType !== 'Hard Inquiry').length, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Negative Items', value: negativeItems.length, color: negativeItems.length > 0 ? 'text-danger' : 'text-muted-foreground', bg: 'bg-danger/10' },
          { label: 'Collections', value: allActive.filter(a => a._markedCollection).length, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Inquiries', value: allActive.filter(a => a.accountType === 'Hard Inquiry').length + (report.inquiries?.length ?? 0), color: 'text-muted-foreground', bg: 'bg-muted' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Investigation issues */}
      {investigationIssues.length > 0 && (
        <div className="card p-5 space-y-4 border border-amber-200 bg-amber-50/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Potential Reporting Issues</h2>
              <p className="text-xs text-muted-foreground mt-0.5">These are investigation prompts, not legal conclusions. Confirm evidence before generating factual claims.</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{investigationIssues.length} flagged</span>
          </div>
          <div className="space-y-2">
            {investigationIssues.map(issue => (
              <div key={issue.id} className="rounded-xl border border-amber-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{issue.issue_label || 'Potential reporting discrepancy'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{issue.why_flagged || 'Review the reported data and supporting evidence.'}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{issue.evidence_strength || 'insufficient'} evidence</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>Type: {(issue.issue_type || 'potential_issue').replaceAll('_', ' ')}</span>
                  <span>Bureaus: {(issue.affected_bureaus ?? []).join(', ') || 'Unknown'}</span>
                  <span>Furnisher: {issue.affected_furnisher || 'Unknown'}</span>
                  <span>Confidence: {issue.confidence_level ?? 0}%</span>
                </div>
                {(issue.evidence_still_needed ?? []).length > 0 && (
                  <p className="mt-2 text-xs text-amber-900">
                    Evidence needed: {(issue.evidence_still_needed ?? []).slice(0, 2).join('; ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negative classification notice */}
      {negativeItems.length === 0 && allActive.filter(a => a.accountType !== 'Hard Inquiry').length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20 text-warning text-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">No negative items detected — review required</p>
            <p className="text-xs mt-1 opacity-80">
              {allActive.filter(a => a.accountType !== 'Hard Inquiry').length} accounts were parsed but none were auto-classified as negative. Use the &quot;Mark Negative&quot; toggle on each account to classify them manually, then save.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted border border-border'}`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-muted'}`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Personal Info tab */}
      {activeTab === 'personal' && (
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">Personal Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{report.personalInfo.name || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">SSN</p><p className="font-medium font-mono">{report.personalInfo.ssn || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Date of Birth</p><p className="font-medium">{report.personalInfo.dob || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Current Address</p><p className="font-medium">{report.personalInfo.currentAddress?.raw || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Employers</p><p className="font-medium">{report.personalInfo.employers.join(', ') || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Name Variations</p><p className="font-medium">{report.personalInfo.nameVariations.join(', ') || '—'}</p></div>
          </div>
          {report.personalInfo.previousAddresses.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Previous Addresses</p>
              {report.personalInfo.previousAddresses.map((a, i) => (
                <p key={`addr-${i}`} className="text-sm">{a.raw}</p>
              ))}
            </div>
          )}
          {report.scores && report.scores.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Credit Scores</p>
              <div className="flex gap-3 flex-wrap">
                {report.scores.map((s, i) => (
                  <div key={`score-${i}`} className="px-3 py-2 bg-muted rounded-lg text-center">
                    <p className="text-lg font-bold text-foreground">{s.score}</p>
                    <p className="text-xs text-muted-foreground">{s.bureau}</p>
                    <p className="text-xs text-muted-foreground">{s.model}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Credit scores were not included in this report.</p>
          )}
        </div>
      )}

      {/* Accounts tabs (all, negative, collections, inquiries) */}
      {(activeTab === 'all' || activeTab === 'negative' || activeTab === 'collections' || activeTab === 'inquiries') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              {activeTab === 'all' && `All Accounts (${getTabAccounts().length})`}
              {activeTab === 'negative' && `Possible Negative Items (${getTabAccounts().length})`}
              {activeTab === 'collections' && `Collections (${getTabAccounts().length})`}
              {activeTab === 'inquiries' && `Inquiries (${getTabAccounts().length})`}
            </h2>
            <p className="text-xs text-muted-foreground">Review before sending — confirm details before mailing</p>
          </div>

          {getTabAccounts().length === 0 ? (
            <div className="card p-8 text-center">
              <CheckCircle2 size={32} className="text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {activeTab === 'negative' ? 'No negative items marked yet. Use "Mark Negative" on accounts in the All Accounts tab.' : 'No items in this category.'}
              </p>
            </div>
          ) : (
            getTabAccounts().map(acc => (
              <div key={acc.id} className={`card border ${acc._markedNegative ? 'border-danger/30 bg-danger/5' : acc._markedCollection ? 'border-warning/30 bg-warning/5' : 'border-border'}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{acc.creditorName}</span>
                        {acc.accountNumberMasked && <span className="text-xs font-mono text-muted-foreground">{acc.accountNumberMasked}</span>}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{acc.accountType || 'Unknown'}</span>
                        {acc._markedNegative && <span className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">Negative</span>}
                        {acc._markedCollection && <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">Collection</span>}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>Bureau: {acc.bureau}</span>
                        {acc.balance !== null && <span>Balance: ${acc.balance.toLocaleString()}</span>}
                        {acc.status && <span>Status: {acc.status}</span>}
                        {acc.negativeReason && <span className="text-danger">{acc.negativeReason}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      {/* Negative toggle */}
                      <button
                        onClick={() => updateAccount(acc.id, { _markedNegative: !acc._markedNegative })}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${acc._markedNegative ? 'bg-danger/10 text-danger border-danger/20' : 'bg-muted text-muted-foreground border-border hover:bg-danger/10 hover:text-danger'}`}
                      >
                        {acc._markedNegative ? 'Negative ✓' : 'Mark Negative'}
                      </button>
                      {/* Collection toggle */}
                      <button
                        onClick={() => updateAccount(acc.id, { _markedCollection: !acc._markedCollection, _markedNegative: !acc._markedCollection ? true : acc._markedNegative })}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${acc._markedCollection ? 'bg-warning/10 text-warning border-warning/20' : 'bg-muted text-muted-foreground border-border hover:bg-warning/10 hover:text-warning'}`}
                      >
                        {acc._markedCollection ? 'Collection ✓' : 'Collection?'}
                      </button>
                      <button
                        onClick={() => setExpandedAccounts(prev => { const n = new Set(prev); n.has(acc.id) ? n.delete(acc.id) : n.add(acc.id); return n; })}
                        className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                      >
                        {expandedAccounts.has(acc.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => updateAccount(acc.id, { _deleted: true })} className="p-1.5 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {expandedAccounts.has(acc.id) && (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><p className="text-muted-foreground">Date Opened</p><p className="font-medium">{acc.dateOpened || '—'}</p></div>
                        <div><p className="text-muted-foreground">Date Reported</p><p className="font-medium">{acc.dateReported || '—'}</p></div>
                        <div><p className="text-muted-foreground">Last Activity</p><p className="font-medium">{acc.dateLastActivity || '—'}</p></div>
                        <div><p className="text-muted-foreground">Past Due</p><p className={`font-medium ${acc.pastDue ? 'text-danger' : ''}`}>{acc.pastDue ? `$${acc.pastDue.toLocaleString()}` : '—'}</p></div>
                      </div>

                      {acc.remarks && acc.remarks.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                          {acc.remarks.map((r, i) => <p key={`rem-${i}`} className="text-xs text-foreground">{r}</p>)}
                        </div>
                      )}

                      {acc.rawText && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Raw Text (parser source)</p>
                          <pre className="text-xs bg-muted/50 rounded-lg p-2 overflow-x-auto max-h-32 whitespace-pre-wrap">{acc.rawText.slice(0, 500)}</pre>
                        </div>
                      )}

                      {/* Dispute fields — shown for all accounts, not just negative */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Dispute Reason</label>
                          <DisputeReasonSelect
                            value={acc._disputeReason}
                            onChange={value => updateAccount(acc.id, { _disputeReason: value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Dispute Instruction</label>
                          <select
                            value={acc._disputeInstruction}
                            onChange={e => updateAccount(acc.id, { _disputeInstruction: e.target.value })}
                            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground"
                          >
                            <option value="">Select instruction…</option>
                            {DISPUTE_INSTRUCTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Note</label>
                          <input
                            type="text"
                            value={acc._note}
                            onChange={e => updateAccount(acc.id, { _note: e.target.value })}
                            placeholder="Add a note…"
                            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground"
                          />
                        </div>
                      </div>

                      {/* Negative reason override */}
                      {acc._markedNegative && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Negative Reason</label>
                          <input
                            type="text"
                            value={acc.negativeReason}
                            onChange={e => updateAccount(acc.id, { negativeReason: e.target.value })}
                            placeholder="e.g. Collection account, Charge-off, Late payment…"
                            className="w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Parser Warnings tab */}
      {activeTab === 'warnings' && (
        <div className="card p-5 space-y-3">
          <h2 className="text-base font-semibold text-foreground">Parser Warnings ({report.warnings.length})</h2>
          {report.warnings.length === 0 ? (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 size={16} /> No warnings
            </div>
          ) : (
            <div className="space-y-2">
              {report.warnings.map((w, i) => (
                <div key={`w-${i}`} className={`p-3 rounded-xl border text-sm ${w.severity === 'error' ? 'bg-danger/10 border-danger/20' : w.severity === 'warning' ? 'bg-warning/10 border-warning/20' : 'bg-primary/5 border-primary/20'}`}>
                  <p className="font-medium">{w.section}</p>
                  <p className="text-xs mt-0.5 opacity-80">{w.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom save */}
      <div className="flex justify-between items-center gap-3 pt-4 border-t border-border flex-wrap">
        <p className="text-xs text-muted-foreground">Review before sending — confirm details before mailing</p>
        <div className="flex gap-2">
          <button onClick={() => router.push(`/clients/${clientId}/negative-items`)} className="btn-secondary text-sm">
            Skip to Negative Items
          </button>
          <button onClick={handleSaveAll} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Report &amp; Go to Negative Items
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
