'use client';
import React from 'react';
import { Bot, TrendingUp, Users, Zap, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

const scores = [
  {
    id: 'revenue-score',
    label: 'Revenue Score',
    value: 82,
    color: 'text-success',
    bg: 'bg-success/10',
    bar: 'bg-success',
    icon: TrendingUp,
    desc: 'Strong MRR growth',
  },
  {
    id: 'client-growth',
    label: 'Client Growth',
    value: 74,
    color: 'text-warning',
    bg: 'bg-warning/10',
    bar: 'bg-warning',
    icon: Users,
    desc: '12 new this month',
  },
  {
    id: 'dispute-efficiency',
    label: 'Dispute Efficiency',
    value: 68,
    color: 'text-warning',
    bg: 'bg-warning/10',
    bar: 'bg-warning',
    icon: Zap,
    desc: '73% bureau response',
  },
];

const aiRecommendations = [
  {
    id: 'rec-1',
    type: 'warning',
    icon: AlertTriangle,
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
    title: '7 clients have not received updates in 14+ days',
    detail: 'Contacting them may reduce churn by 12%.',
    action: 'View At-Risk Clients',
    href: '/client-management',
  },
  {
    id: 'rec-2',
    type: 'ai',
    icon: Sparkles,
    iconColor: 'text-ai',
    iconBg: 'bg-ai/10',
    title: 'Round 2 dispute window opens for 11 clients this week',
    detail: 'Sending letters now maximizes deletion probability.',
    action: 'Generate Letters',
    href: '/dispute-letter-management',
  },
  {
    id: 'rec-3',
    type: 'danger',
    icon: AlertTriangle,
    iconColor: 'text-danger',
    iconBg: 'bg-danger/10',
    title: '3 clients have overdue payments',
    detail: 'Resolving billing issues prevents service interruption.',
    action: 'Review Billing',
    href: '/billing-subscriptions',
  },
];

export default function BusinessHealthWidget() {
  const overallScore = Math.round(scores?.reduce((a, s) => a + s?.value, 0) / scores?.length);
  const scoreColor = overallScore >= 80 ? 'text-success' : overallScore >= 60 ? 'text-warning' : 'text-danger';
  const scoreRing = overallScore >= 80 ? 'border-success' : overallScore >= 60 ? 'border-warning' : 'border-danger';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Business Health Card */}
      <div className="xl:col-span-2 card p-5 bg-gradient-to-br from-card to-muted/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Business Health</p>
            <h2 className="text-lg font-bold text-foreground">Your Business at a Glance</h2>
          </div>
          <div className={`w-16 h-16 rounded-full border-4 ${scoreRing} flex items-center justify-center shrink-0`}>
            <span className={`text-xl font-black ${scoreColor}`}>{overallScore}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {scores?.map((s) => {
            const SIcon = s?.icon;
            return (
              <div key={s?.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-7 h-7 rounded-lg ${s?.bg} flex items-center justify-center`}>
                    <SIcon size={14} className={s?.color} />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{s?.label}</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className={`text-2xl font-black ${s?.color}`}>{s?.value}</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mb-1.5">
                  <div className={`h-1.5 rounded-full ${s?.bar} transition-all duration-700`} style={{ width: `${s?.value}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{s?.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      {/* AI Coach Recommendations */}
      <div className="card p-5 border-ai/20 bg-gradient-to-br from-ai/5 to-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-ai/10 flex items-center justify-center">
            <Bot size={16} className="text-ai" />
          </div>
          <div>
            <p className="text-xs font-bold text-ai uppercase tracking-widest">AI Coach</p>
            <p className="text-xs text-muted-foreground">3 recommendations</p>
          </div>
        </div>
        <div className="space-y-3">
          {aiRecommendations?.map((rec) => {
            const RIcon = rec?.icon;
            return (
              <div key={rec?.id} className="bg-card rounded-xl p-3 border border-border">
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg ${rec?.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <RIcon size={13} className={rec?.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-snug mb-0.5">{rec?.title}</p>
                    <p className="text-xs text-muted-foreground leading-snug mb-2">{rec?.detail}</p>
                    <Link href={rec?.href} className="inline-flex items-center gap-1 text-xs font-semibold text-ai hover:underline">
                      {rec?.action} <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Link href="/ai-financial-coach" className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-ai/10 text-ai text-xs font-bold hover:bg-ai/20 transition-colors">
          <Sparkles size={13} /> Open Full AI Coach
        </Link>
      </div>
    </div>
  );
}
