'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, CreditCard, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isLegacySeedClient, purgeLegacyProductionSeeds } from '@/lib/demo/purgeLegacyProductionSeeds';

type RiskLevel = 'green' | 'yellow' | 'red';
type ClientRecord = {
  id: string;
  name: string | null;
  email: string | null;
  plan: string | null;
  credit_score: number | null;
  subscription_status: string | null;
  active_disputes: number | null;
  next_task_due: string | null;
  updated_at: string | null;
};
const riskConfig = { green: { label: 'Low Risk', bg: 'bg-success/10', text: 'text-success' }, yellow: { label: 'Medium Risk', bg: 'bg-warning/10', text: 'text-warning' }, red: { label: 'High Risk', bg: 'bg-danger/10', text: 'text-danger' } };

export default function ClientRiskContent() {
  const supabase = useMemo(() => createClient(), []);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; (async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) { if (active) setLoading(false); return; } await purgeLegacyProductionSeeds(supabase, user.id); const { data } = await supabase.from('staff_clients').select('id, name, email, plan, credit_score, subscription_status, active_disputes, next_task_due, updated_at').eq('owner_id', user.id).order('updated_at', { ascending: true }); if (active) { setClients((data ?? []).filter(row => !isLegacySeedClient(row))); setLoading(false); } })(); return () => { active = false; }; }, [supabase]);
  const scored = clients.map(client => { const updatedAt = client.updated_at || ''; const staleDays = updatedAt ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000) : 0; const score = Math.min(100, (client.subscription_status === 'overdue' ? 45 : 0) + (staleDays >= 14 ? 30 : staleDays >= 7 ? 15 : 0) + (!client.active_disputes ? 10 : 0)); const level: RiskLevel = score >= 60 ? 'red' : score >= 25 ? 'yellow' : 'green'; return { ...client, riskScore: score, riskLevel: level, staleDays }; });
  const counts = (level: RiskLevel) => scored.filter(client => client.riskLevel === level).length;
  if (loading) return <div className="app-page state-panel min-h-64"><Loader2 className="animate-spin text-primary"/></div>;
  return <div className="app-page page-stack"><div className="page-header"><div><h1 className="page-title">Client Risk Scoring</h1><p className="page-description">Calculated only from real billing, activity, and dispute records.</p></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{([['red', AlertTriangle], ['yellow', Clock], ['green', CheckCircle2]] as const).map(([level, Icon]) => { const config = riskConfig[level]; return <div key={level} className="card p-5 flex items-center gap-3"><Icon className={config.text}/><div><p className={`text-2xl font-black ${config.text}`}>{counts(level)}</p><p className="text-xs text-muted-foreground">{config.label}</p></div></div>; })}</div>{scored.length === 0 ? <div className="state-panel min-h-64 text-sm text-muted-foreground">No client records yet. No sample risk scores are shown.</div> : <div className="space-y-3">{scored.map(client => { const config = riskConfig[client.riskLevel]; return <div key={String(client.id)} className="card p-5 flex items-center gap-4"><div className={`w-10 h-10 rounded-full ${config.bg} ${config.text} flex items-center justify-center font-bold`}>{String(client.name).split(' ').map((part: string) => part[0]).join('').slice(0, 2)}</div><div className="flex-1"><p className="text-sm font-bold">{String(client.name || '')}</p><p className="text-xs text-muted-foreground">{String(client.plan || 'Client')}{client.credit_score ? ` · Score ${String(client.credit_score)}` : ''}</p></div><div className="text-right"><span className={`badge ${config.bg} ${config.text}`}>{config.label}</span><p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-end"><CreditCard size={11}/>{String(client.subscription_status || 'pending')} · {client.riskScore}/100</p></div></div>; })}</div>}</div>;
}
