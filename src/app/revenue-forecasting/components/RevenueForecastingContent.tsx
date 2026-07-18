'use client';
import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, AlertTriangle } from 'lucide-react';

const mrrHistory = [
  { month: 'Jan', actual: 18200, predicted: null },
  { month: 'Feb', actual: 19400, predicted: null },
  { month: 'Mar', actual: 20100, predicted: null },
  { month: 'Apr', actual: 21800, predicted: null },
  { month: 'May', actual: 23500, predicted: null },
  { month: 'Jun', actual: 24780, predicted: 24780 },
  { month: 'Jul', actual: null, predicted: 26400 },
  { month: 'Aug', actual: null, predicted: 28100 },
  { month: 'Sep', actual: null, predicted: 29800 },
];

const churnData = [
  { month: 'Jan', churn: 2, growth: 8 },
  { month: 'Feb', churn: 3, growth: 11 },
  { month: 'Mar', churn: 1, growth: 9 },
  { month: 'Apr', churn: 4, growth: 14 },
  { month: 'May', churn: 2, growth: 12 },
  { month: 'Jun', churn: 3, growth: 15 },
];

const forecastMetrics = [
  {
    id: 'current-mrr',
    label: 'Current MRR',
    value: '$24,780',
    change: '+8.3% vs last month',
    changeType: 'positive',
    icon: DollarSign,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
  {
    id: 'predicted-mrr',
    label: 'Predicted MRR (90 days)',
    value: '$29,800',
    change: '+20.3% projected',
    changeType: 'positive',
    icon: TrendingUp,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    id: 'expected-churn',
    label: 'Expected Churn',
    value: '3 clients',
    change: '~$1,470 MRR at risk',
    changeType: 'warning',
    icon: TrendingDown,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
  },
  {
    id: 'expected-growth',
    label: 'Expected New Clients',
    value: '+15 clients',
    change: '+$7,350 projected MRR',
    changeType: 'positive',
    icon: Users,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
  },
];

const atRiskClients = [
  { id: 'r-001', name: 'Shaniqua Davis', plan: 'Starter', mrr: '$49', risk: 'Overdue payment · 7 days inactive', riskLevel: 'high' },
  { id: 'r-002', name: 'Tyler Nguyen', plan: 'Starter', mrr: '$49', risk: 'Churned · No response', riskLevel: 'critical' },
  { id: 'r-003', name: 'Jermaine Patterson', plan: 'Starter', mrr: '$49', risk: 'Lead · No follow-up in 5 days', riskLevel: 'medium' },
];

const riskColors = {
  high: 'text-warning bg-warning/10',
  critical: 'text-danger bg-danger/10',
  medium: 'text-info bg-info/10',
};

const changeColors = {
  positive: 'text-success',
  warning: 'text-warning',
  negative: 'text-danger',
};

export default function RevenueForecastingContent() {
  const [period, setPeriod] = useState<'90d' | '6m' | '1y'>('90d');

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Revenue Forecasting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">MRR trends, churn analysis, and growth projections</p>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['90d', '6m', '1y'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Forecast Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {forecastMetrics.map((m) => {
          const MIcon = m.icon;
          return (
            <div key={m.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="metric-label">{m.label}</p>
                <div className={`w-9 h-9 rounded-lg ${m.iconBg} flex items-center justify-center`}>
                  <MIcon size={16} className={m.iconColor} />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground tabular-nums mb-1">{m.value}</p>
              <p className={`text-xs font-semibold ${changeColors[m.changeType as keyof typeof changeColors]}`}>{m.change}</p>
            </div>
          );
        })}
      </div>

      {/* MRR Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">MRR Trend & Forecast</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Actual vs. AI-predicted revenue</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary inline-block rounded" /> Actual</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-ai inline-block rounded border-dashed border border-ai" /> Predicted</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={mrrHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`$${value?.toLocaleString()}`, '']}
            />
            <Area type="monotone" dataKey="actual" stroke="#059669" strokeWidth={2} fill="url(#actualGrad)" connectNulls={false} dot={false} />
            <Area type="monotone" dataKey="predicted" stroke="#7C3AED" strokeWidth={2} strokeDasharray="5 3" fill="url(#predictedGrad)" connectNulls={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Churn vs Growth + At-Risk Clients */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Churn vs Growth Chart */}
        <div className="card p-5">
          <h3 className="text-base font-bold text-foreground mb-1">Churn vs. New Client Growth</h3>
          <p className="text-xs text-muted-foreground mb-4">Monthly client movement</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={churnData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="growth" name="New Clients" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="churn" name="Churned" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* At-Risk Revenue */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-warning" />
            <h3 className="text-base font-bold text-foreground">At-Risk Revenue</h3>
          </div>
          <div className="space-y-3">
            {atRiskClients.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                    {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.risk}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${riskColors[c.riskLevel as keyof typeof riskColors]}`}>
                    {c.riskLevel}
                  </span>
                  <span className="text-sm font-bold text-foreground">{c.mrr}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-warning/5 border border-warning/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-warning">Total MRR at risk</span>
              <span className="text-sm font-black text-warning">$1,470 / mo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
