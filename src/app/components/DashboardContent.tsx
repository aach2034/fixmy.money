'use client';
import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, AlertTriangle, TrendingUp, DollarSign, ArrowRight, Users, CreditCard, Zap, CheckCircle2, Activity, Calendar, ChevronRight, ArrowUpRight, Shield, Brain, Plus } from 'lucide-react';
import MetricsBentoGrid from './MetricsBentoGrid';
import DisputesByBureauChart from './DisputesByBureauChart';
import ItemsDeletedChart from './ItemsDeletedChart';
import UrgentActionFeed from './UrgentActionFeed';
import RecentActivity from './RecentActivity';
import BusinessHealthWidget from './BusinessHealthWidget';
import ChatbotWidget from '@/components/ChatbotWidget';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

const AI_INSIGHTS = [
  { id: 'i1', icon: AlertTriangle, iconColor: 'text-amber-600', iconBg: 'bg-amber-50', text: '7 clients need updates', detail: 'No contact in 14+ days — risk of churn.', action: '/client-management', actionLabel: 'View Clients' },
  { id: 'i2', icon: TrendingUp, iconColor: 'text-red-600', iconBg: 'bg-red-50', text: '3 disputes closing soon', detail: 'Bureau response windows closing this week.', action: '/disputes', actionLabel: 'View Disputes' },
  { id: 'i3', icon: DollarSign, iconColor: 'text-amber-600', iconBg: 'bg-amber-50', text: '$1,420 revenue at risk', detail: 'Resolve billing to prevent service interruption.', action: '/billing-subscriptions', actionLabel: 'View Billing' },
  { id: 'i4', icon: Sparkles, iconColor: 'text-violet-600', iconBg: 'bg-violet-50', text: 'Est. next month MRR: $27,300', detail: 'Based on current growth trajectory and pipeline.', action: '/revenue-forecasting', actionLabel: 'View Forecast' },
];

const QUICK_ACTIONS = [
  { href: '/client-management', icon: Users, label: 'Add Client', color: 'text-blue-600', bg: 'bg-blue-50', border: 'hover:border-blue-200' },
  { href: '/ai-dispute-analyzer', icon: Brain, label: 'Analyze Report', color: 'text-violet-600', bg: 'bg-violet-50', border: 'hover:border-violet-200' },
  { href: '/dispute-letter-management', icon: Zap, label: 'Generate Disputes', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'hover:border-emerald-200' },
  { href: '/billing-subscriptions', icon: CreditCard, label: 'View Billing', color: 'text-orange-600', bg: 'bg-orange-50', border: 'hover:border-orange-200' },
];

const PIPELINE_STAGES = [
  { label: 'Leads', count: 12, color: 'bg-slate-200', textColor: 'text-slate-600', change: '+3' },
  { label: 'Enrolled', count: 28, color: 'bg-blue-200', textColor: 'text-blue-700', change: '+5' },
  { label: 'Active', count: 147, color: 'bg-emerald-200', textColor: 'text-emerald-700', change: '+12' },
  { label: 'On Hold', count: 8, color: 'bg-amber-200', textColor: 'text-amber-700', change: '-2' },
  { label: 'Completed', count: 94, color: 'bg-violet-200', textColor: 'text-violet-700', change: '+7' },
];

const TASKS_TODAY = [
  { id: 't1', title: 'Follow up with Sarah M. — dispute response due', priority: 'high', client: 'Sarah Mitchell', time: '10:00 AM' },
  { id: 't2', title: 'Send onboarding docs to new client', priority: 'medium', client: 'James Rodriguez', time: '2:00 PM' },
  { id: 't3', title: 'Review Equifax response for 3 clients', priority: 'high', client: 'Multiple', time: '4:00 PM' },
  { id: 't4', title: 'Monthly billing review', priority: 'low', client: 'Admin', time: '5:00 PM' },
];

const UPCOMING_FOLLOWUPS = [
  { id: 'f1', client: 'Marcus T.', action: 'Bureau response due', date: 'Today', avatar: 'MT', color: 'bg-blue-600', urgent: true },
  { id: 'f2', client: 'Priya S.', action: 'Credit report upload needed', date: 'Tomorrow', avatar: 'PS', color: 'bg-violet-600', urgent: false },
  { id: 'f3', client: 'James R.', action: 'Dispute letter review', date: 'Jun 8', avatar: 'JR', color: 'bg-emerald-600', urgent: false },
  { id: 'f4', client: 'Keisha W.', action: 'Monthly check-in call', date: 'Jun 9', avatar: 'KW', color: 'bg-rose-600', urgent: false },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export default function DashboardContent() {
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [stats, setStats] = useState({ clients: 0, revenue: 0, disputes: 0, itemsRemoved: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('full_name, company_name')
          .eq('id', user.id)
          .single();
        if (data) {
          setDisplayName(data.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'there');
          setCompanyName(data.company_name || user.user_metadata?.company_name || '');
        }
      } catch {
        setDisplayName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'there');
      }
    };
    const fetchStats = async () => {
      try {
        const { count: clientCount } = await supabase.from('staff_clients').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
        const { count: disputeCount } = await supabase.from('client_disputes').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
        setStats(prev => ({ ...prev, clients: clientCount || 0, disputes: disputeCount || 0, revenue: 24780, itemsRemoved: 312 }));
      } catch { /* non-blocking */ }
    };
    fetchProfile();
    fetchStats();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const firstName = displayName.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {companyName ? `${companyName} · ` : ''}
            Your business generated{' '}
            <span className="font-semibold text-emerald-600">$24,780</span> this month and helped clients remove{' '}
            <span className="font-semibold text-slate-900">312 negative items</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400">Last updated 4 min ago</span>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
            disabled={refreshing}
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link href="/client-management" className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors">
            <Plus size={13} />
            Add Client
          </Link>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: stats.clients || 147, change: '+12', trend: 'up', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/client-management' },
          { label: 'Monthly Revenue', value: `$${(stats.revenue || 24780).toLocaleString()}`, change: '+8%', trend: 'up', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/billing-subscriptions' },
          { label: 'Disputes Sent', value: stats.disputes || 89, change: '+5', trend: 'up', icon: Shield, color: 'text-violet-600', bg: 'bg-violet-50', href: '/disputes' },
          { label: 'Score Improvements', value: stats.itemsRemoved || 312, change: '+24', trend: 'up', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', href: '/client-management' },
        ].map(kpi => {
          const KpiIcon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <KpiIcon size={18} className={kpi.color} />
                </div>
                <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs font-semibold text-emerald-600">{kpi.change}</span>
                <span className="text-xs text-slate-400">this month</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(action => {
          const ActionIcon = action.icon;
          return (
            <Link key={action.label} href={action.href} className={`flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 ${action.border} hover:shadow-sm transition-all group`}>
              <div className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center shrink-0`}>
                <ActionIcon size={16} className={action.color} />
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{action.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── AI INSIGHTS ── */}
      <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl border border-violet-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Brain size={18} className="text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">FixMy AI Insights</p>
              <p className="text-xs text-slate-500">4 items require your attention</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">AI</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {AI_INSIGHTS.map(insight => {
            const IIcon = insight.icon;
            return (
              <Link key={insight.id} href={insight.action} className="bg-white rounded-xl p-4 border border-slate-100 flex items-start gap-3 hover:border-violet-200 hover:shadow-sm transition-all group">
                <div className={`w-8 h-8 rounded-lg ${insight.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <IIcon size={15} className={insight.iconColor} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 leading-snug mb-1">{insight.text}</p>
                  <p className="text-xs text-slate-500 leading-snug mb-2">{insight.detail}</p>
                  <span className="text-xs font-semibold text-violet-600 group-hover:underline">{insight.actionLabel} →</span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-end">
          <Link href="/ai-financial-coach" className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:underline">
            Open FixMy AI <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* ── PIPELINE STATUS ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Activity size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Pipeline Status</p>
              <p className="text-xs text-slate-500">Client distribution across stages</p>
            </div>
          </div>
          <Link href="/client-pipeline" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
            View Pipeline <ChevronRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {PIPELINE_STAGES.map(stage => (
            <div key={stage.label} className="text-center">
              <div className={`${stage.color} rounded-xl p-3 mb-2`}>
                <p className={`text-2xl font-bold ${stage.textColor}`}>{stage.count}</p>
              </div>
              <p className="text-xs font-semibold text-slate-700">{stage.label}</p>
              <p className={`text-xs font-medium mt-0.5 ${stage.change.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{stage.change}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TASKS + FOLLOW-UPS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tasks Due Today */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Tasks Due Today</p>
                <p className="text-xs text-slate-500">{TASKS_TODAY.length} tasks pending</p>
              </div>
            </div>
            <Link href="/workflow-task-management" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
              All Tasks <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {TASKS_TODAY.map(task => (
              <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 leading-snug">{task.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{task.client} · {task.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Follow-Ups */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Calendar size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Upcoming Follow-Ups</p>
                <p className="text-xs text-slate-500">{UPCOMING_FOLLOWUPS.length} scheduled</p>
              </div>
            </div>
            <Link href="/appointments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {UPCOMING_FOLLOWUPS.map(fu => (
              <div key={fu.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${fu.urgent ? 'bg-red-50 border border-red-100' : 'bg-slate-50 hover:bg-slate-100'}`}>
                <div className={`w-8 h-8 rounded-full ${fu.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {fu.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900">{fu.client}</p>
                  <p className="text-xs text-slate-500">{fu.action}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${fu.urgent ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                  {fu.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BUSINESS HEALTH ── */}
      <BusinessHealthWidget />

      {/* ── KPI BENTO ── */}
      <MetricsBentoGrid />

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DisputesByBureauChart />
        <ItemsDeletedChart />
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UrgentActionFeed />
        <RecentActivity />
      </div>

      <ChatbotWidget context="dashboard" />
    </div>
  );
}