'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ClientRow = { plan: string | null; subscription_status: string | null };

const planMonthlyValue: Record<string, number> = {
  starter: 49,
  professional: 129,
  agency: 249,
};

export default function RevenueForecastingContent() {
  const supabase = useMemo(() => createClient(), []);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { if (active) setLoading(false); return; }
      const { data, error: queryError } = await supabase
        .from('staff_clients')
        .select('plan, subscription_status')
        ;
      if (!active) return;
      if (queryError) setError('Revenue data could not be loaded.');
      else setClients((data ?? []) as ClientRow[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [supabase]);

  const activeClients = clients.filter(client => ['active', 'trialing'].includes((client.subscription_status ?? '').toLowerCase()));
  const currentMrr = activeClients.reduce((sum, client) => sum + (planMonthlyValue[(client.plan ?? '').toLowerCase()] ?? 0), 0);
  const unknownPlans = activeClients.filter(client => !planMonthlyValue[(client.plan ?? '').toLowerCase()]).length;

  const metrics = [
    { label: 'Current MRR', value: `$${currentMrr.toLocaleString()}`, note: 'Calculated from active client plans', icon: DollarSign },
    { label: 'Active paying clients', value: activeClients.length.toLocaleString(), note: 'Active and trialing subscriptions', icon: Users },
    { label: 'Forecast', value: 'Not available', note: 'A forecast needs sufficient billing history', icon: TrendingUp },
    { label: 'Unpriced plans', value: unknownPlans.toLocaleString(), note: 'Active clients without a recognized plan price', icon: AlertTriangle },
  ];

  return (
    <div className="app-page page-stack">
      <div className="page-header"><div>
        <h1 className="page-title">Revenue</h1>
        <p className="page-description">Account data only — no sample revenue or invented projections</p>
      </div>
      </div>
      {error && <div className="card p-4 text-sm text-danger">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="metric-label">{label}</p>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Icon size={16} className="text-primary" /></div>
            </div>
            <p className="text-2xl font-black text-foreground tabular-nums mb-1">{loading ? '—' : value}</p>
            <p className="text-xs text-muted-foreground">{note}</p>
          </div>
        ))}
      </div>
      {!loading && clients.length === 0 && (
        <div className="state-panel min-h-64">
          <DollarSign size={28} className="mx-auto text-muted-foreground mb-3" />
          <h2 className="text-base font-semibold text-foreground">No revenue data yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Revenue will appear after real clients and subscription plans are added.</p>
        </div>
      )}
    </div>
  );
}
