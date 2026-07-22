'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, FileCheck2, FileSearch, Loader2, RefreshCw, ShieldCheck, Upload, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { selectReliableAuditItems, type SavedAuditItem } from '@/lib/creditReport/auditItems';
import { isLegacySeedClient, purgeLegacyProductionSeeds } from '@/lib/demo/purgeLegacyProductionSeeds';

type ClientRow = { id: string; name: string; case_stage: string | null; updated_at: string | null };
type DashboardState = { name: string; company: string; clients: ClientRow[]; reports: number; verifiedItems: number; readyItems: number };
const EMPTY: DashboardState = { name: '', company: '', clients: [], reports: 0, verifiedItems: 0, readyItems: 0 };

const workflow = [
  { label: 'Upload', detail: 'Add a bureau report and supporting documents.', href: '/credit-report-import', icon: Upload },
  { label: 'Verify', detail: 'Confirm every extracted account and reported fact.', href: '/credit-report-import', icon: FileCheck2 },
  { label: 'Score', detail: 'Apply transparent evidence-readiness rules.', href: '/credit-audit', icon: ShieldCheck },
  { label: 'Draft', detail: 'Create an item-specific explanation for review.', href: '/dispute-wizard', icon: FileSearch },
  { label: 'Approve', detail: 'Consumer reviews and certifies every statement.', href: '/dispute-letter-management', icon: Check },
];

const summaryCards: Array<{ label: string; value: keyof Pick<DashboardState, 'reports' | 'verifiedItems' | 'readyItems'> | 'clients'; icon: LucideIcon; href: string }> = [
  { label: 'Clients', value: 'clients', icon: Users, href: '/client-management' },
  { label: 'Reports uploaded', value: 'reports', icon: Upload, href: '/credit-report-import' },
  { label: 'Verified negative items', value: 'verifiedItems', icon: FileCheck2, href: '/credit-audit' },
  { label: 'Selected for dispute', value: 'readyItems', icon: ShieldCheck, href: '/dispute-wizard' },
];

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
        supabase.from('staff_clients').select('id, name, case_stage, updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('parsed_credit_reports').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('negative_items').select('creditor_name, negative_category, bureau, balance, dispute_reason, negative_reason, dispute_status, is_negative, parser_confidence, account_number_masked, date_reported, tag_status, is_selected').eq('owner_id', user.id),
      ]);
      if (profile.error) throw profile.error;
      if (clients.error) throw clients.error;
      const realClients = (clients.data ?? []).filter(client => !isLegacySeedClient(client as any));
      const reliable = selectReliableAuditItems((items.data ?? []) as SavedAuditItem[]);
      setState({
        name: profile.data?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        company: profile.data?.company_name || '',
        clients: realClients,
        reports: reports.count ?? 0,
        verifiedItems: reliable.length,
        readyItems: reliable.filter((item: any) => item.tag_status === 'dispute' && item.is_selected === true).length,
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
  return (
    <div className="mx-auto max-w-screen-2xl space-y-7 p-4 sm:p-6">
      <header className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-200 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Evidence-first dispute workspace</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Welcome back, {firstName}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Turn verified report facts and supporting documents into clear, auditable dispute packages—without predictions or promises.</p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"><RefreshCw size={15} />Refresh</button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workspace summary">
        {summaryCards.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md">
            <div className="flex items-center justify-between"><span className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700"><Icon size={19} /></span><ArrowRight size={16} className="text-slate-300 group-hover:text-cyan-600" /></div>
            <p className="mt-5 text-3xl font-black tabular-nums text-slate-950">{value === 'clients' ? state.clients.length : state[value]}</p><p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-700">Case workflow</p><h2 className="mt-2 text-2xl font-black text-slate-950">From report to review-ready package</h2></div><Link href="/credit-report-import" className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-800"><Upload size={15} />Start with a report</Link></div>
        <div className="mt-6 grid gap-3 lg:grid-cols-5">
          {workflow.map((step, index) => <Link key={step.label} href={step.href} className="group rounded-2xl border border-slate-200 p-4 hover:border-cyan-300 hover:bg-cyan-50/40"><div className="flex items-center justify-between"><span className="text-xs font-black text-slate-400">0{index + 1}</span><step.icon size={18} className="text-cyan-700" /></div><h3 className="mt-5 font-black text-slate-900">{step.label}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{step.detail}</p></Link>)}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-black text-slate-950">Active cases</h2><p className="mt-1 text-sm text-slate-500">Only records saved in this private workspace appear here.</p>{state.clients.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><Users className="mx-auto text-slate-400" /><h3 className="mt-3 font-bold text-slate-900">No client records</h3><p className="mt-2 text-sm text-slate-500">Add a real client when you are ready. No sample cases will be inserted.</p><Link href="/client-management" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Add first client<ArrowRight size={14} /></Link></div> : <div className="mt-5 divide-y divide-slate-100">{state.clients.slice(0, 5).map(client => <Link key={client.id} href="/client-management" className="flex items-center justify-between py-4"><div><p className="font-bold text-slate-900">{client.name}</p><p className="text-xs capitalize text-slate-500">{(client.case_stage || 'lead').replaceAll('_', ' ')}</p></div><ArrowRight size={15} className="text-slate-400" /></Link>)}</div>}</div>
        <aside className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><ShieldCheck className="text-amber-700" /><h2 className="mt-4 text-lg font-black text-amber-950">Readiness, not probability</h2><p className="mt-3 text-sm leading-6 text-amber-900/80">Every recommendation must identify a factual inconsistency, show the evidence used, and explain the deterministic score. Accurate negative information is never marked eligible.</p><Link href="/credit-audit" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-amber-900">Open evidence review<ArrowRight size={14} /></Link></aside>
      </section>
    </div>
  );
}
