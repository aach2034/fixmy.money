'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileSearch, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { selectReliableAuditItems, type SavedAuditItem } from '@/lib/creditReport/auditItems';
import { isLegacySeedClient, purgeLegacyProductionSeeds } from '@/lib/demo/purgeLegacyProductionSeeds';

type ClientRow = { id: string; name: string; case_stage: string | null; updated_at: string | null };
type InvestigationCase = {
  id: string;
  case_number: string | null;
  issue_summary: string | null;
  evidence_strength: string | null;
  case_status: string | null;
  recommended_next_action: string | null;
};
type InvestigationState = {
  potentialIssues: number;
  strongEvidence: number;
  evidenceNeeded: number;
  activeInvestigations: number;
  responsesDue: number;
  unresolvedCases: number;
  potentialReinsertions: number;
  strongestCases: InvestigationCase[];
};
type DashboardState = {
  name: string;
  company: string;
  clients: ClientRow[];
  reports: number;
  verifiedItems: number;
  readyItems: number;
  investigations: InvestigationState;
};
const EMPTY_INVESTIGATIONS: InvestigationState = {
  potentialIssues: 0,
  strongEvidence: 0,
  evidenceNeeded: 0,
  activeInvestigations: 0,
  responsesDue: 0,
  unresolvedCases: 0,
  potentialReinsertions: 0,
  strongestCases: [],
};
const EMPTY: DashboardState = { name: '', company: '', clients: [], reports: 0, verifiedItems: 0, readyItems: 0, investigations: EMPTY_INVESTIGATIONS };

export default function DashboardContent() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      await purgeLegacyProductionSeeds(supabase, user.id);
      const [profile, clients, reports, items] = await Promise.all([
        supabase.from('user_profiles').select('full_name, company_name').eq('id', user.id).single(),
        supabase.from('staff_clients').select('id, name, case_stage, updated_at').order('updated_at', { ascending: false }),
        supabase.from('parsed_credit_reports').select('id', { count: 'exact', head: true }),
        supabase.from('negative_items').select('creditor_name, negative_category, bureau, balance, dispute_reason, negative_reason, dispute_status, is_negative, parser_confidence, account_number_masked, date_reported, tag_status, is_selected'),
      ]);
      if (profile.error) throw profile.error;
      if (clients.error) throw clients.error;
      const realClients = (clients.data ?? []).filter(client => !isLegacySeedClient(client as any));
      const reliable = selectReliableAuditItems((items.data ?? []) as SavedAuditItem[]);
      const [issues, strongIssues, evidenceNeededIssues, cases, dueRecipients, comparisons, strongestCases] = await Promise.allSettled([
        supabase.from('detected_issues').select('id', { count: 'exact', head: true }).eq('status', 'potential_issue'),
        supabase.from('detected_issues').select('id', { count: 'exact', head: true }).eq('evidence_strength', 'strong'),
        supabase.from('detected_issues').select('id', { count: 'exact', head: true }).eq('evidence_strength', 'insufficient'),
        supabase.from('credit_cases').select('id, case_status', { count: 'exact' }),
        supabase.from('dispute_recipients').select('id', { count: 'exact', head: true }).not('response_deadline_estimate', 'is', null).lte('response_deadline_estimate', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
        supabase.from('report_comparisons').select('id', { count: 'exact', head: true }).eq('potential_reinsertion_detected', true),
        supabase.from('credit_cases').select('id, case_number, issue_summary, evidence_strength, case_status, recommended_next_action, created_at').limit(12),
      ]);
      const allCases = cases.status === 'fulfilled' && !cases.value.error ? (cases.value.data ?? []) : [];
      const strengthRank: Record<string, number> = { strong: 0, moderate: 1, insufficient: 2 };
      const rankedCases = strongestCases.status === 'fulfilled' && !strongestCases.value.error
        ? [...(strongestCases.value.data ?? [])].sort((a: any, b: any) => {
          const strengthDelta = (strengthRank[String(a.evidence_strength)] ?? 3) - (strengthRank[String(b.evidence_strength)] ?? 3);
          if (strengthDelta !== 0) return strengthDelta;
          return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''));
        }).slice(0, 4) as InvestigationCase[]
        : [];
      const investigations: InvestigationState = {
        potentialIssues: issues.status === 'fulfilled' && !issues.value.error ? issues.value.count ?? 0 : 0,
        strongEvidence: strongIssues.status === 'fulfilled' && !strongIssues.value.error ? strongIssues.value.count ?? 0 : 0,
        evidenceNeeded: evidenceNeededIssues.status === 'fulfilled' && !evidenceNeededIssues.value.error ? evidenceNeededIssues.value.count ?? 0 : 0,
        activeInvestigations: allCases.filter((row: any) => ['investigation_pending', 'dispute_submitted', 'investigation_review'].includes(String(row.case_status))).length,
        responsesDue: dueRecipients.status === 'fulfilled' && !dueRecipients.value.error ? dueRecipients.value.count ?? 0 : 0,
        unresolvedCases: allCases.filter((row: any) => !['closed', 'resolved'].includes(String(row.case_status))).length,
        potentialReinsertions: comparisons.status === 'fulfilled' && !comparisons.value.error ? comparisons.value.count ?? 0 : 0,
        strongestCases: rankedCases,
      };
      setState({
        name: profile.data?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        company: profile.data?.company_name || '',
        clients: realClients,
        reports: reports.count ?? 0,
        verifiedItems: reliable.length,
        readyItems: reliable.filter((item: any) => item.tag_status === 'dispute' && item.is_selected === true).length,
        investigations,
      });
    } catch (cause) {
      console.error('[Dashboard] load failed', cause);
      setError('Your secure workspace could not be loaded. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => { void load(); }, [load]);
  if (loading) return <div className="min-h-[70vh] flex items-center justify-center gap-3 text-slate-600"><Loader2 className="animate-spin" size={22} />Loading your secure workspace…</div>;

  const firstName = state.name.split(' ')[0] || 'there';
  const nextAction = state.investigations.strongEvidence > 0
    ? { title: `Review ${state.investigations.strongEvidence} strong finding${state.investigations.strongEvidence === 1 ? '' : 's'}`, copy: 'These findings have the clearest supporting evidence.', href: '/credit-audit', label: 'Review high-priority findings' }
    : state.reports === 0
      ? { title: 'Upload your first credit report', copy: 'We will organize the report and show you what deserves attention.', href: '/credit-report-import', label: 'Upload credit report' }
      : { title: 'Continue your credit audit', copy: 'Review what we found and choose the next item to address.', href: '/credit-audit', label: 'Continue credit audit' };
  return (
    <div className="app-page page-stack max-w-5xl">
      <header className="py-2">
        <p className="text-sm font-semibold text-green-700">Your Credit</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Welcome back, {firstName}</h1>
        <p className="mt-2 max-w-2xl text-base text-slate-600">Here is what matters most and what to do next.</p>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8" aria-labelledby="found-title">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-green-700"><FileSearch size={20} /></span><div><p className="text-sm font-semibold text-green-700">What FixMy.Money found</p><h2 id="found-title" className="text-xl font-bold text-slate-950">Your report summary</h2></div></div>
        <div className="mt-7 grid gap-6 sm:grid-cols-3">
          <div><p className="text-3xl font-bold text-slate-950">{state.investigations.potentialIssues}</p><p className="mt-1 text-sm text-slate-600">Differences worth reviewing</p></div>
          <div><p className="text-3xl font-bold text-slate-950">{state.verifiedItems}</p><p className="mt-1 text-sm text-slate-600">Negative accounts found</p></div>
          <div><p className="text-3xl font-bold text-green-700">{state.investigations.strongEvidence}</p><p className="mt-1 text-sm text-slate-600">Strong findings</p></div>
        </div>
      </section>

      <section className="rounded-2xl bg-[#061b48] p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-300">What to do next</p>
        <h2 className="mt-2 text-2xl font-bold">{nextAction.title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{nextAction.copy}</p>
        <Link href={nextAction.href} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-bold text-white hover:bg-green-400">{nextAction.label}<ArrowRight size={16} /></Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">More information</p><h2 className="mt-1 text-xl font-bold text-slate-950">Your workspace</h2></div><button onClick={() => void load()} className="btn-secondary"><RefreshCw size={15} />Refresh</button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link href="/credit-report-import" className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-800 hover:bg-slate-100">{state.reports} reports uploaded<ArrowRight size={14} className="mt-3 text-slate-400" /></Link>
          <Link href="/client-management" className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-800 hover:bg-slate-100">{state.clients.length} clients<ArrowRight size={14} className="mt-3 text-slate-400" /></Link>
          <Link href="/dispute-wizard" className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-800 hover:bg-slate-100">{state.readyItems} items selected<ArrowRight size={14} className="mt-3 text-slate-400" /></Link>
        </div>
      </section>
    </div>
  );
}
