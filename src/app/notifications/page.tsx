'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Bell, CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

type Alert = { id: string; title: string; detail: string; href: string; level: 'info' | 'warning' | 'danger' };

export default function NotificationsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [clientsResult, lettersResult, profileResult] = await Promise.all([
        supabase.from('staff_clients').select('id, name, subscription_status, next_task_due, next_task_label'),
        supabase.from('generated_dispute_letters').select('id, bureau, response_due_date, status'),
        supabase.from('user_profiles').select('subscription_status').eq('id', user.id).single(),
      ]);
      const next: Alert[] = [];
      for (const client of clientsResult.data ?? []) {
        if (client.subscription_status === 'overdue') next.push({ id: `billing-${client.id}`, title: `${client.name} is marked overdue`, detail: 'Review this client’s billing status.', href: '/billing-subscriptions', level: 'danger' });
        if (client.next_task_due || client.next_task_label) next.push({ id: `task-${client.id}`, title: client.next_task_label || `Follow up with ${client.name}`, detail: `${client.name}${client.next_task_due ? ` · due ${client.next_task_due}` : ''}`, href: '/client-management', level: 'info' });
      }
      const today = new Date();
      for (const letter of lettersResult.data ?? []) {
        if (!letter.response_due_date || ['updated', 'closed'].includes(letter.status)) continue;
        const days = Math.ceil((new Date(letter.response_due_date).getTime() - today.getTime()) / 86400000);
        if (days <= 7) next.push({ id: `letter-${letter.id}`, title: `${letter.bureau} response ${days < 0 ? 'is overdue' : `due in ${days} day${days === 1 ? '' : 's'}`}`, detail: 'Review the dispute response window.', href: '/disputes', level: days < 0 ? 'danger' : 'warning' });
      }
      if (!['active', 'trialing', 'trial_active'].includes(profileResult.data?.subscription_status || '')) next.unshift({ id: 'platform-billing', title: 'FixMy.Money subscription needs attention', detail: 'Choose a plan or update your payment method.', href: '/billing-subscriptions', level: 'warning' });
      setAlerts(next);
      setLoading(false);
    })();
  }, [supabase, user]);

  return <AppLayout><div className="app-page page-stack max-w-4xl"><div className="page-header"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Bell size={21}/></div><div><h1 className="page-title">Notifications</h1><p className="page-description">Live alerts generated from this workspace.</p></div></div></div>{loading ? <div className="state-panel min-h-64 gap-2 text-muted-foreground"><Loader2 className="animate-spin"/>Loading alerts…</div> : alerts.length ? <div className="space-y-3">{alerts.map(alert => { const Icon = alert.id.startsWith('billing') || alert.id === 'platform-billing' ? CreditCard : alert.level === 'info' ? CheckCircle2 : AlertTriangle; return <Link key={alert.id} href={alert.href} className="card block p-4 transition-colors hover:border-primary/30"><div className="flex gap-3"><Icon className={alert.level === 'danger' ? 'text-danger' : alert.level === 'warning' ? 'text-warning' : 'text-info'} size={19}/><div><p className="text-sm font-bold text-foreground">{alert.title}</p><p className="text-xs text-muted-foreground mt-1">{alert.detail}</p></div></div></Link>; })}</div> : <div className="state-panel min-h-64"><CheckCircle2 className="mx-auto text-success" size={30}/><h2 className="font-bold text-foreground mt-3">You’re all caught up</h2><p className="text-sm text-muted-foreground mt-1">No workspace records currently require attention.</p></div>}</div></AppLayout>;
}
