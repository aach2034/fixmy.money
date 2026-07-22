'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileSearch,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { selectReliableAuditItems, type SavedAuditItem } from '@/lib/creditReport/auditItems';
import { isLegacySeedClient, purgeLegacyProductionSeeds } from '@/lib/demo/purgeLegacyProductionSeeds';

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  case_stage: string | null;
  subscription_status: string | null;
  active_disputes: number | null;
  items_deleted: number | null;
  next_task_due: string | null;
  next_task_label: string | null;
  updated_at: string | null;
};

type DashboardState = {
  name: string;
  company: string;
  plan: string;
  subscriptionStatus: string;
  clients: ClientRow[];
  negativeItems: number;
  disputesInProgress: number;
  completedItems: number;
};

type RankedOpportunity = {
  candidate: number;
  rank: number;
  strength: 'Strong' | 'Moderate' | 'Review';
  reason: string;
};

type AIOpinion = {
  summary: string;
  ranked: RankedOpportunity[];
};

type OpportunityCandidate = SavedAuditItem & { client_id?: string | null };

const EMPTY: DashboardState = {
  name: '', company: '', plan: '', subscriptionStatus: '', clients: [],
  negativeItems: 0, disputesInProgress: 0, completedItems: 0,
};

export default function DashboardContent() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<DashboardState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [aiOpinion, setAiOpinion] = useState<AIOpinion | null>(null);
  const [aiCandidates, setAiCandidates] = useState<OpportunityCandidate[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const generateAIOpinion = useCallback(async (items: OpportunityCandidate[]) => {
    if (items.length === 0) {
      setAiOpinion(null);
      setAiCandidates([]);
      return;
    }

    const candidates = items.slice(0, 12);
    setAiCandidates(candidates);
    setAiLoading(true);
    setAiError('');
    try {
      const sanitized = candidates.map((item, index) => ({
        candidate: index + 1,
        category: item.negative_category || 'negative item',
        bureau: item.bureau || 'Unknown bureau',
        balance: item.balance == null ? null : Number(item.balance),
        reportedReason: item.dispute_reason || item.negative_reason || 'No reason recorded',
        parserConfidence: item.parser_confidence ?? null,
        dateReported: item.date_reported || null,
      }));

      const response = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'OPEN_AI',
          model: 'gpt-4o',
          stream: false,
          messages: [
            {
              role: 'system',
              content: 'You are an AI review assistant for a credit-repair business. Rank only the supplied candidates by apparent dispute strength. Favor specific, factual, verifiable inaccuracies and supporting detail. Never promise deletion, score improvement, or a legal outcome. Return valid JSON only: {"summary":"2 concise sentences","ranked":[{"candidate":1,"rank":1,"strength":"Strong|Moderate|Review","reason":"one concise sentence"}]}. Include at most 5 ranked candidates.',
            },
            {
              role: 'user',
              content: `Give your professional opinion of the strongest review opportunities and rank them. Candidate data contains no client names or full account numbers:\n${JSON.stringify(sanitized)}`,
            },
          ],
          parameters: { max_completion_tokens: 700, temperature: 0.2 },
        }),
      });
      if (!response.ok) throw new Error('AI review is temporarily unavailable.');
      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim()) as AIOpinion;
      const validRanked = Array.isArray(parsed.ranked)
        ? parsed.ranked.filter(item => Number.isInteger(item.candidate) && item.candidate >= 1 && item.candidate <= candidates.length).slice(0, 5)
        : [];
      if (!parsed.summary || validRanked.length === 0) throw new Error('AI review returned an incomplete result.');
      setAiOpinion({ summary: parsed.summary, ranked: validRanked });
    } catch (err) {
      console.error('[Dashboard] AI opinion failed', err);
      setAiError('The AI opinion could not be generated right now. Your saved workspace data is still available.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      // An early production migration attached fictional seed rows to the first
      // real account. Purge those exact fixtures before every read; the cleanup
      // is idempotent, and the local filter below is a second line of defense.
      await purgeLegacyProductionSeeds(supabase, user.id);

      const [profileResult, clientsResult, itemsResult] = await Promise.all([
        supabase.from('user_profiles')
          .select('full_name, company_name, subscription_plan, subscription_status')
          .eq('id', user.id).single(),
        supabase.from('staff_clients')
          .select('id, name, email, case_stage, subscription_status, active_disputes, items_deleted, next_task_due, next_task_label, updated_at')
          .eq('owner_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('negative_items')
          .select('client_id, creditor_name, negative_category, bureau, balance, dispute_reason, negative_reason, dispute_status, tag_status, is_negative, is_selected, parser_confidence, account_number_masked, date_reported')
          .eq('owner_id', user.id),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (clientsResult.error) throw clientsResult.error;

      const clients = (clientsResult.data ?? []).filter(client => !isLegacySeedClient(client)) as ClientRow[];
      const items = itemsResult.error ? [] : (itemsResult.data ?? []);
      const activeStatuses = new Set(['ready', 'generated', 'sent', 'waiting_for_response', 'escalated']);
      const completedStatuses = new Set(['updated', 'deleted', 'closed']);
      // Use the exact same finalized item set as Credit Audit so raw saved rows
      // and parser duplicates cannot inflate or diverge from the audit total.
      const actualNegativeItems = selectReliableAuditItems(items as SavedAuditItem[]);
      const taggedDisputes = actualNegativeItems.filter((item: any) =>
        (item.tag_status === 'dispute' || item.is_selected === true) && activeStatuses.has(item.dispute_status)
      );

      setState({
        name: profileResult.data?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        company: profileResult.data?.company_name || user.user_metadata?.company_name || '',
        plan: profileResult.data?.subscription_plan || '',
        subscriptionStatus: profileResult.data?.subscription_status || '',
        clients,
        negativeItems: actualNegativeItems.length,
        disputesInProgress: taggedDisputes.length,
        completedItems: actualNegativeItems.filter((item: any) => completedStatuses.has(item.dispute_status)).length,
      });
      void generateAIOpinion(actualNegativeItems as OpportunityCandidate[]);
      setUpdatedAt(new Date());
    } catch (err) {
      console.error('[Dashboard] load failed', err);
      setError('We could not load your workspace data. Refresh to try again.');
    } finally {
      setLoading(false);
    }
  }, [generateAIOpinion, supabase, user]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const activeClients = state.clients.filter(c => ['enrolled', 'active'].includes(c.case_stage || '')).length;
  const overdueBilling = state.clients.filter(c => c.subscription_status === 'overdue');
  const tasks = state.clients.filter(c => c.next_task_due || c.next_task_label).slice(0, 5);
  const recentClients = state.clients.slice(0, 5);
  const firstName = state.name.split(' ')[0] || 'there';
  const subscriptionNeedsAttention = !['active', 'trialing', 'trial_active'].includes(state.subscriptionStatus);

  if (loading) {
    return <div className="min-h-[70vh] flex items-center justify-center gap-3 text-slate-600"><Loader2 className="animate-spin" size={22} /><span>Loading your workspace…</span></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-blue-600">{state.company || 'Your credit repair business'}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Welcome back, {firstName}</h1>
          <p className="text-sm text-slate-500 mt-1">Live information from your private business workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && <span className="hidden sm:inline text-xs text-slate-400">Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
          <button onClick={loadDashboard} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={14} />Refresh</button>
          <Link href="/client-management" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={15} />Add client</Link>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total clients', value: state.clients.length, icon: Users, href: '/client-management', note: `${activeClients} active` },
          { label: 'Disputes in progress', value: state.disputesInProgress, icon: Shield, href: '/disputes', note: 'From saved credit items' },
          { label: 'Negative items', value: state.negativeItems, icon: FileSearch, href: '/credit-audit', note: `${state.completedItems} completed` },
          { label: 'Billing follow-ups', value: overdueBilling.length, icon: CreditCard, href: '/billing-subscriptions', note: 'Client accounts overdue' },
        ].map(({ label, value, icon: Icon, href, note }) => (
          <Link key={label} href={href} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-blue-200 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4"><Icon size={18} /></div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
            <p className="text-sm font-semibold text-slate-700">{label}</p>
            <p className="text-xs text-slate-400 mt-1">{note}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 sm:p-6" aria-labelledby="ai-opinion-title">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0"><Sparkles size={19} /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-violet-600">AI case opinion</p>
              <h2 id="ai-opinion-title" className="text-lg font-bold text-slate-900 mt-1">Strongest dispute opportunities</h2>
              <p className="text-xs text-slate-500 mt-1">Ranked from saved credit items in this private workspace. Review every fact before acting.</p>
            </div>
          </div>
          {!aiLoading && aiCandidates.length > 0 && (
            <button onClick={() => generateAIOpinion(aiCandidates)} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50"><RefreshCw size={13} />Refresh opinion</button>
          )}
        </div>

        {aiLoading ? (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-violet-100 bg-white/80 p-5 text-sm text-slate-600"><Loader2 className="animate-spin text-violet-600" size={18} />AI is reviewing and ranking the strongest opportunities…</div>
        ) : aiError ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{aiError}</div>
        ) : aiOpinion ? (
          <div className="mt-5 grid lg:grid-cols-[0.9fr_1.6fr] gap-4">
            <div className="rounded-xl border border-violet-100 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">AI summary</p>
              <p className="text-sm leading-6 text-slate-600 mt-2">{aiOpinion.summary}</p>
              <p className="text-xs text-slate-400 mt-4">AI output is an opinion, not legal advice or a guarantee of any outcome.</p>
            </div>
            <div className="space-y-2">
              {aiOpinion.ranked.map(ranked => {
                const item = aiCandidates[ranked.candidate - 1];
                const client = state.clients.find(clientRow => clientRow.id === item?.client_id);
                if (!item) return null;
                return (
                  <div key={`${ranked.rank}-${ranked.candidate}`} className="rounded-xl border border-slate-200 bg-white p-4 flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-extrabold text-sm shrink-0">{ranked.rank}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ranked.rank === 1 && <Trophy size={14} className="text-amber-500" />}
                        <p className="text-sm font-bold text-slate-900 truncate">{item.creditor_name || 'Saved negative item'}</p>
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">{ranked.strength}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{client?.name || 'Client'} · {(item.negative_category || 'item').replaceAll('_', ' ')} · {item.bureau || 'Unknown bureau'}</p>
                      <p className="text-sm text-slate-600 mt-2">{ranked.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-slate-600">Import and review a client credit report to receive an AI-ranked opinion here.</div>
        )}
      </section>

      {subscriptionNeedsAttention && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
          <AlertTriangle className="text-amber-600 shrink-0" size={21} />
          <div className="flex-1"><p className="font-bold text-slate-900">Your FixMy.Money billing needs attention</p><p className="text-sm text-slate-600 mt-1">Choose a plan or update your payment method to keep this business workspace active.</p></div>
          <Link href="/billing-subscriptions" className="text-sm font-bold text-amber-800 hover:underline">Manage billing</Link>
        </div>
      )}

      {state.clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={23} /></div>
          <h2 className="text-lg font-bold text-slate-900 mt-4">Your workspace is ready for its first client</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">No sample records are shown. Add a real client, import their report, and the dashboard will populate from your data.</p>
          <Link href="/client-management" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus size={15} />Add your first client</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Recent clients</h2><p className="text-xs text-slate-500 mt-1">Latest records in this workspace</p></div><Link href="/client-management" className="text-xs font-bold text-blue-600">View all</Link></div>
            <div className="mt-4 divide-y divide-slate-100">
              {recentClients.map(client => <Link href="/client-management" key={client.id} className="flex items-center justify-between py-3 group"><div><p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600">{client.name}</p><p className="text-xs text-slate-400 capitalize">{(client.case_stage || 'lead').replace('_', ' ')}</p></div><span className="text-xs text-slate-500">{client.active_disputes || 0} disputes</span></Link>)}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Next actions</h2><p className="text-xs text-slate-500 mt-1">Real follow-ups saved on client records</p></div><Link href="/notifications" className="text-xs font-bold text-blue-600">All alerts</Link></div>
            <div className="mt-4 space-y-3">
              {tasks.length ? tasks.map(client => <div key={client.id} className="rounded-xl bg-slate-50 p-3 flex items-start gap-3"><CheckCircle2 className="text-blue-600 shrink-0 mt-0.5" size={16}/><div><p className="text-sm font-semibold text-slate-800">{client.next_task_label || 'Client follow-up'}</p><p className="text-xs text-slate-500 mt-0.5">{client.name}{client.next_task_due ? ` · ${client.next_task_due}` : ''}</p></div></div>) : <p className="text-sm text-slate-500 py-6 text-center">No follow-ups are scheduled.</p>}
            </div>
          </section>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <Link href="/credit-audit" className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:border-blue-200"><FileSearch className="text-blue-600" size={20}/><div><p className="text-sm font-bold text-slate-900">Run a credit audit</p><p className="text-xs text-slate-500">Review saved report items</p></div><ArrowRight className="ml-auto text-slate-300" size={16}/></Link>
        <Link href="/knowledge-base" className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:border-blue-200"><BookOpen className="text-blue-600" size={20}/><div><p className="text-sm font-bold text-slate-900">Knowledge base</p><p className="text-xs text-slate-500">Guides for your workflow</p></div><ArrowRight className="ml-auto text-slate-300" size={16}/></Link>
        <Link href="/billing-subscriptions" className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3 hover:border-blue-200"><CreditCard className="text-blue-600" size={20}/><div><p className="text-sm font-bold text-slate-900">Billing center</p><p className="text-xs text-slate-500">Your plan and client billing</p></div><ArrowRight className="ml-auto text-slate-300" size={16}/></Link>
      </div>
    </div>
  );
}
