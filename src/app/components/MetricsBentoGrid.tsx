'use client';
import React, { useEffect, useState } from 'react';
import { Users, FileText, AlertTriangle, DollarSign, BarChart2, Send, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


interface DashboardMetrics {
  activeClients: number;
  disputesInFlight: number;
  itemsDeletedMtd: number;
  overdueTasks: number;
  mrr: number;
  bureauResponseRate: number;
  lettersSentMtd: number;
  newClientsThisMonth: number;
  newClientsThisWeek: number;
  disputesDueThisWeek: number;
  criticalOverdueTasks: number;
}

const defaultMetrics: DashboardMetrics = {
  activeClients: 0,
  disputesInFlight: 0,
  itemsDeletedMtd: 0,
  overdueTasks: 0,
  mrr: 0,
  bureauResponseRate: 0,
  lettersSentMtd: 0,
  newClientsThisMonth: 0,
  newClientsThisWeek: 0,
  disputesDueThisWeek: 0,
  criticalOverdueTasks: 0,
};

const changeColorMap = {
  positive: 'text-success',
  negative: 'text-danger',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-muted-foreground',
};

const alertBg = 'bg-danger/5 border-danger/20';
const normalBg = 'bg-card border-border';

export default function MetricsBentoGrid() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data, error } = await supabase
          .from('dashboard_metrics')
          .select('*')
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setMetrics({
            activeClients: data.active_clients ?? 0,
            disputesInFlight: data.disputes_in_flight ?? 0,
            itemsDeletedMtd: data.items_deleted_mtd ?? 0,
            overdueTasks: data.overdue_tasks ?? 0,
            mrr: data.mrr ?? 0,
            bureauResponseRate: data.bureau_response_rate ?? 0,
            lettersSentMtd: data.letters_sent_mtd ?? 0,
            newClientsThisMonth: data.new_clients_this_month ?? 0,
            newClientsThisWeek: data.new_clients_this_week ?? 0,
            disputesDueThisWeek: data.disputes_due_this_week ?? 0,
            criticalOverdueTasks: data.critical_overdue_tasks ?? 0,
          });
        }
      } catch {
        // silently fall back to defaults
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const metricCards = [
    {
      id: 'metric-active-clients',
      label: 'Active Clients',
      value: loading ? '—' : String(metrics.activeClients),
      change: loading ? '' : `+${metrics.newClientsThisMonth} this month`,
      changeType: 'positive' as const,
      icon: Users,
      colSpan: 'lg:col-span-2',
      hero: true,
      sub: loading ? '' : `${metrics.newClientsThisWeek} enrolled this week`,
      alert: false,
    },
    {
      id: 'metric-disputes-inflight',
      label: 'Disputes In Flight',
      value: loading ? '—' : String(metrics.disputesInFlight),
      change: loading ? '' : `${metrics.disputesDueThisWeek} due this week`,
      changeType: 'warning' as const,
      icon: Send,
      colSpan: '',
      hero: false,
      alert: false,
    },
    {
      id: 'metric-items-deleted',
      label: 'Items Deleted (MTD)',
      value: loading ? '—' : String(metrics.itemsDeletedMtd),
      change: loading ? '' : 'From saved client outcomes',
      changeType: 'positive' as const,
      icon: CheckCircle,
      colSpan: '',
      hero: false,
      alert: false,
    },
    {
      id: 'metric-overdue-tasks',
      label: 'Overdue Tasks',
      value: loading ? '—' : String(metrics.overdueTasks),
      change: loading ? '' : `${metrics.criticalOverdueTasks} critical priority`,
      changeType: 'danger' as const,
      icon: AlertTriangle,
      colSpan: '',
      hero: false,
      alert: true,
    },
    {
      id: 'metric-mrr',
      label: 'Monthly Recurring Revenue',
      value: loading ? '—' : `$${metrics.mrr.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      change: loading ? '' : 'From recorded billing',
      changeType: 'positive' as const,
      icon: DollarSign,
      colSpan: '',
      hero: false,
      alert: false,
    },
    {
      id: 'metric-response-rate',
      label: 'Bureau Response Rate',
      value: loading ? '—' : `${metrics.bureauResponseRate}%`,
      change: loading ? '' : 'From recorded responses',
      changeType: 'negative' as const,
      icon: BarChart2,
      colSpan: '',
      hero: false,
      alert: false,
    },
    {
      id: 'metric-letters-sent',
      label: 'Letters Sent (MTD)',
      value: loading ? '—' : String(metrics.lettersSentMtd),
      change: 'Across 3 bureaus',
      changeType: 'neutral' as const,
      icon: FileText,
      colSpan: '',
      hero: false,
      alert: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {metricCards.map((m) => {
        const Icon = m.icon;
        const bg = m.alert ? alertBg : normalBg;
        return (
          <div
            key={m.id}
            className={`card ${bg} p-5 flex flex-col gap-3 ${m.colSpan}`}
          >
            <div className="flex items-start justify-between">
              <p className="metric-label">{m.label}</p>
              <div className={`p-2 rounded-lg ${m.alert ? 'bg-danger/10' : 'bg-muted'}`}>
                <Icon size={16} className={m.alert ? 'text-danger' : 'text-muted-foreground'} />
              </div>
            </div>
            <div>
              <p className={`metric-value ${m.alert ? 'text-danger' : ''} ${m.hero ? 'text-4xl' : ''}`}>
                {m.value}
              </p>
              {m.hero && m.sub && (
                <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
              )}
            </div>
            <p className={`text-xs font-medium ${changeColorMap[m.changeType]}`}>
              {m.change}
            </p>
          </div>
        );
      })}
    </div>
  );
}
