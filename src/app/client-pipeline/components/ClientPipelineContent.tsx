'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Mail, Phone, Clock, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isLegacySeedClient, purgeLegacyProductionSeeds } from '@/lib/demo/purgeLegacyProductionSeeds';

type PipelineStage = 'Lead' | 'Consultation' | 'Signed' | 'Onboarding' | 'Round 1' | 'Round 2' | 'Monitoring' | 'Graduated';
type PipelineClient = { id: string; name: string; email: string; phone: string; score: number; daysInStage: number; plan: string; priority: 'high' | 'medium' | 'low' };

const STAGES: Array<{ stage: PipelineStage; color: string; headerBg: string }> = [
  { stage: 'Lead', color: 'text-muted-foreground', headerBg: 'bg-muted' },
  { stage: 'Consultation', color: 'text-info', headerBg: 'bg-info/10' },
  { stage: 'Signed', color: 'text-primary', headerBg: 'bg-primary/10' },
  { stage: 'Onboarding', color: 'text-warning', headerBg: 'bg-warning/10' },
  { stage: 'Round 1', color: 'text-warning', headerBg: 'bg-warning/10' },
  { stage: 'Round 2', color: 'text-success', headerBg: 'bg-success/10' },
  { stage: 'Monitoring', color: 'text-success', headerBg: 'bg-success/10' },
  { stage: 'Graduated', color: 'text-primary', headerBg: 'bg-primary/10' },
];

function mapStage(row: any): PipelineStage {
  const stage = String(row.case_stage || 'lead').toLowerCase();
  if (stage === 'lead') return 'Lead';
  if (stage === 'enrolled') return row.report_analyzed ? 'Signed' : 'Onboarding';
  if (stage === 'completed' || stage === 'churned') return 'Graduated';
  if (stage === 'onhold') return 'Monitoring';
  const disputes = Number(row.active_disputes || 0);
  return disputes > 3 ? 'Round 2' : disputes > 0 ? 'Round 1' : 'Consultation';
}

export default function ClientPipelineContent() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setLoading(false); return; }
      await purgeLegacyProductionSeeds(supabase, user.id);
      const { data, error: queryError } = await supabase.from('staff_clients').select('id, name, email, phone, credit_score, plan, case_stage, active_disputes, report_analyzed, enrolled_date, created_at, subscription_status').eq('owner_id', user.id).order('created_at', { ascending: false });
      if (!active) return;
      if (queryError) setError('Client pipeline could not be loaded.');
      else setRows((data ?? []).filter(row => !isLegacySeedClient(row)));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase]);

  const columns = STAGES.map(config => ({ ...config, clients: rows.filter(row => mapStage(row) === config.stage).map((row): PipelineClient => {
    const start = new Date(row.enrolled_date || row.created_at || Date.now()).getTime();
    return { id: row.id, name: row.name || '', email: row.email || '', phone: row.phone || '', score: Number(row.credit_score || 0), plan: row.plan || 'Starter', daysInStage: Math.max(0, Math.floor((Date.now() - start) / 86400000)), priority: row.subscription_status === 'overdue' ? 'high' : Number(row.active_disputes || 0) > 0 ? 'medium' : 'low' };
  }) }));

  return <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold text-foreground">Client Pipeline</h1><p className="text-sm text-muted-foreground mt-0.5">{loading ? 'Loading real client records…' : `${rows.length} clients across ${STAGES.length} stages`}</p></div><Link href="/client-management" className="btn-primary flex items-center gap-1.5"><Plus size={15}/>Add Client</Link></div>
    {error && <div className="card p-4 text-sm text-danger">{error}</div>}
    {loading ? <div className="card p-10 flex justify-center"><Loader2 className="animate-spin text-primary"/></div> : <>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">{columns.map((column, index) => <React.Fragment key={column.stage}><div className="flex items-center gap-1.5 shrink-0"><span className="text-xs font-semibold text-muted-foreground">{column.stage}</span><span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${column.headerBg} ${column.color}`}>{column.clients.length}</span></div>{index < columns.length - 1 && <ArrowRight size={12} className="text-muted-foreground/40 shrink-0"/>}</React.Fragment>)}</div>
      <div className="flex gap-3 overflow-x-auto pb-4">{columns.map(column => <div key={column.stage} className="flex-shrink-0 w-56"><div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${column.headerBg} border border-border border-b-0`}><span className={`text-xs font-bold ${column.color}`}>{column.stage}</span><span className="text-xs font-bold">{column.clients.length}</span></div><div className="bg-muted/30 border border-border border-t-0 rounded-b-xl p-2 space-y-2 min-h-[120px]">{column.clients.length === 0 ? <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">No clients</div> : column.clients.map(client => <div key={client.id} className="bg-card border border-border rounded-xl p-3"><p className="text-xs font-semibold text-foreground">{client.name}</p><p className="text-2xs text-muted-foreground mt-0.5">{client.plan}{client.score ? ` · Score ${client.score}` : ''}</p><div className="mt-2 flex justify-between text-2xs text-muted-foreground"><span className="flex items-center gap-1"><Clock size={10}/>{client.daysInStage}d</span><span className="flex gap-2">{client.email && <a href={`mailto:${client.email}`} aria-label={`Email ${client.name}`}><Mail size={11}/></a>}{client.phone && <a href={`tel:${client.phone}`} aria-label={`Call ${client.name}`}><Phone size={11}/></a>}</span></div></div>)}</div></div>)}</div>
    </>}
  </div>;
}
