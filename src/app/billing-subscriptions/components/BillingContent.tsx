'use client';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Filter, Download, Send, Eye, MoreHorizontal,
  ChevronUp, ChevronDown, DollarSign, TrendingUp, AlertTriangle,
  CreditCard, X, CheckCircle2, ExternalLink, Loader2, Zap, Clock, Crown
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import PlanDistributionChart from './PlanDistributionChart';
import { toast } from 'sonner';

import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface Invoice {
  id: string;
  invoiceNum: string;
  clientName: string;
  plan: string;
  amount: number;
  billingCycle: string;
  lastPayment: string;
  nextDue: string;
  status: 'paid' | 'overdue' | 'pending' | 'draft';
  paymentMethod: string;
  daysOverdue?: number;
}

const invoices: Invoice[] = [
  { id: 'inv-001', invoiceNum: 'CF-2026-0441', clientName: 'Darnell Washington', plan: 'Growth', amount: 99, billingCycle: 'Monthly', lastPayment: '05/01/2026', nextDue: '07/01/2026', status: 'paid', paymentMethod: 'Visa ···4821' },
  { id: 'inv-002', invoiceNum: 'CF-2026-0440', clientName: 'Priya Nambiar', plan: 'Growth', amount: 99, billingCycle: 'Monthly', lastPayment: '05/01/2026', nextDue: '07/01/2026', status: 'paid', paymentMethod: 'Mastercard ···3392' },
  { id: 'inv-003', invoiceNum: 'CF-2026-0439', clientName: 'Marcus Holloway', plan: 'Agency', amount: 199, billingCycle: 'Monthly', lastPayment: '05/01/2026', nextDue: '07/01/2026', status: 'paid', paymentMethod: 'Visa ···7714' },
  { id: 'inv-004', invoiceNum: 'CF-2026-0438', clientName: 'Shaniqua Davis', plan: 'Starter', amount: 49, billingCycle: 'Monthly', lastPayment: '04/24/2026', nextDue: '05/24/2026', status: 'overdue', paymentMethod: 'Visa ···2209', daysOverdue: 9 },
  { id: 'inv-005', invoiceNum: 'CF-2026-0437', clientName: 'Roberto Fuentes', plan: 'Growth', amount: 99, billingCycle: 'Monthly', lastPayment: '05/01/2026', nextDue: '07/01/2026', status: 'paid', paymentMethod: 'ACH ···8871' },
  { id: 'inv-006', invoiceNum: 'CF-2026-0436', clientName: 'Adriana Morales', plan: 'Growth', amount: 99, billingCycle: 'Monthly', lastPayment: '05/01/2026', nextDue: '07/01/2026', status: 'paid', paymentMethod: 'Mastercard ···5541' },
  { id: 'inv-007', invoiceNum: 'CF-2026-0435', clientName: 'Tanisha Brooks', plan: 'Starter', amount: 49, billingCycle: 'Monthly', lastPayment: '—', nextDue: '06/03/2026', status: 'pending', paymentMethod: '— Not on file' },
  { id: 'inv-008', invoiceNum: 'CF-2026-0434', clientName: 'Devon Clarke', plan: 'Agency', amount: 199, billingCycle: 'Monthly', lastPayment: '05/01/2026', nextDue: '07/01/2026', status: 'paid', paymentMethod: 'Visa ···9930' },
  { id: 'inv-009', invoiceNum: 'CF-2026-0433', clientName: 'Tyler Nguyen', plan: 'Starter', amount: 49, billingCycle: 'Monthly', lastPayment: '04/10/2026', nextDue: '05/10/2026', status: 'overdue', paymentMethod: 'Discover ···1127', daysOverdue: 23 },
  { id: 'inv-010', invoiceNum: 'CF-2026-0432', clientName: 'Monique Simmons', plan: 'Growth', amount: 99, billingCycle: 'Monthly', lastPayment: '05/01/2026', nextDue: '07/01/2026', status: 'paid', paymentMethod: 'Visa ···6612' },
  { id: 'inv-011', invoiceNum: 'CF-2026-0431', clientName: 'Jermaine Patterson', plan: 'Starter', amount: 49, billingCycle: 'Monthly', lastPayment: '—', nextDue: '06/07/2026', status: 'draft', paymentMethod: '— Not on file' },
  { id: 'inv-012', invoiceNum: 'CF-2026-0430', clientName: 'Keisha Thornton', plan: 'Growth', amount: 99, billingCycle: 'Monthly', lastPayment: '05/01/2026', nextDue: '07/01/2026', status: 'paid', paymentMethod: 'ACH ···4490' },
];

type SortField = 'clientName' | 'amount' | 'nextDue' | 'plan';

interface UserSubscription {
  stripe_customer_id: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  trial_end: string | null;
}

export default function BillingContent() {
  const { user } = useAuth();
  const supabase = createClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('nextDue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sendInvoiceOpen, setSendInvoiceOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const perPage = 10;

  // Fetch subscription status from Supabase
  useEffect(() => {
    if (!user) {
      setSubLoading(false);
      return;
    }
    const fetchSubscription = async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('stripe_customer_id, subscription_status, subscription_plan, trial_end')
          .eq('id', user.id)
          .single();
        setSubscription(data as UserSubscription | null);
      } catch {
        // non-blocking
      } finally {
        setSubLoading(false);
      }
    };
    fetchSubscription();
  }, [user]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') === 'success') {
        setCheckoutSuccess(true);
      }
    }
  }, []);

  // Check if trial has ended (status is none/canceled/past_due and no active subscription)
  const isTrialEnded = !subLoading && (
    !subscription ||
    subscription.subscription_status === 'none' ||
    subscription.subscription_status === 'canceled' ||
    (subscription.subscription_status === 'trialing' &&
      subscription.trial_end &&
      new Date(subscription.trial_end) < new Date())
  );

  const isTrialing = !subLoading && subscription?.subscription_status === 'trialing' &&
    subscription.trial_end &&
    new Date(subscription.trial_end) >= new Date();

  const isActive = !subLoading && subscription?.subscription_status === 'active';
  const isPastDue = !subLoading && subscription?.subscription_status === 'past_due';

  const trialDaysLeft = isTrialing && subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const mrr = invoices.filter(i => i.status !== 'draft').reduce((a, i) => a + i.amount, 0);
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const collectionRate = Math.round((paidCount / invoices.filter(i => i.status !== 'draft').length) * 100);

  const handleManageBilling = async () => {
    const customerId = subscription?.stripe_customer_id;
    if (!customerId) {
      toast.error('No billing account found. Please subscribe to a plan first.');
      return;
    }
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      let data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error(data.error || 'Could not open billing portal');
      }
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    setUpgradeLoading(plan);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          email: user?.email,
          name: user?.user_metadata?.full_name,
          userId: user?.id,
        }),
      });
      let data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Could not start checkout');
      }
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setUpgradeLoading(null);
    }
  };

  const filtered = useMemo(() => {
    let data = [...invoices];
    if (search) data = data.filter(i => i.clientName.toLowerCase().includes(search.toLowerCase()) || i.invoiceNum.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'All') data = data.filter(i => i.status === statusFilter);
    data.sort((a, b) => {
      const av = a[sortField] as string | number;
      const bv = b[sortField] as string | number;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return data;
  }, [search, statusFilter, sortField, sortDir]);

  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paginated.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginated.map(i => i.id)));
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-flex flex-col">
      <ChevronUp size={10} className={sortField === field && sortDir === 'asc' ? 'text-primary' : 'text-muted-foreground/40'} />
      <ChevronDown size={10} className={sortField === field && sortDir === 'desc' ? 'text-primary' : 'text-muted-foreground/40'} />
    </span>
  );

  const kpiCards = [
    { id: 'kpi-mrr', label: 'Monthly Recurring Revenue', value: `$${mrr.toLocaleString()}`, change: '+8.3% vs last month', changeType: 'positive', icon: DollarSign, alert: false },
    { id: 'kpi-collection', label: 'Collection Rate', value: `${collectionRate}%`, change: 'Of active invoices paid', changeType: 'positive', icon: TrendingUp, alert: false },
    { id: 'kpi-overdue', label: 'Overdue Invoices', value: overdueCount.toString(), change: `$${invoices.filter(i => i.status === 'overdue').reduce((a, i) => a + i.amount, 0)} outstanding`, changeType: 'danger', icon: AlertTriangle, alert: true },
    { id: 'kpi-active-subs', label: 'Active Subscriptions', value: invoices.filter(i => i.status === 'paid' || i.status === 'overdue').length.toString(), change: `${invoices.filter(i => i.status === 'paid').length} current · ${overdueCount} overdue`, changeType: 'neutral', icon: CreditCard, alert: false },
  ];

  const PLANS = [
    { key: 'starter', name: 'Starter', price: 99, desc: 'Up to 50 clients', popular: false },
    { key: 'growth', name: 'Growth', price: 199, desc: 'Up to 250 clients + AI', popular: true },
    { key: 'agency', name: 'Agency', price: 399, desc: 'Unlimited clients + White Label', popular: false },
  ];

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Billing & Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage client invoices and subscription plans</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManageBilling}
            disabled={portalLoading || !subscription?.stripe_customer_id}
            className="btn-secondary flex items-center gap-1.5 disabled:opacity-50"
            title={!subscription?.stripe_customer_id ? 'Subscribe to a plan to access billing portal' : 'Manage your billing'}
          >
            {portalLoading ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
            Manage Billing
          </button>
          <button className="btn-secondary flex items-center gap-1.5">
            <Download size={15} /> Export
          </button>
          <button onClick={() => setSendInvoiceOpen(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> Create Invoice
          </button>
        </div>
      </div>

      {/* Trial Ended Banner */}
      {!subLoading && isTrialEnded && (
        <div className="rounded-xl border-2 border-danger/30 bg-danger/5 p-5">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-danger/15 shrink-0">
              <AlertTriangle size={20} className="text-danger" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-base">Your trial has ended</h3>
              <p className="text-sm text-muted-foreground mt-0.5 mb-4">
                Subscribe to a plan to continue using FixMy.Money and keep your clients, disputes, and data.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLANS.map(p => (
                  <div key={`trial-end-${p.key}`} className={`relative rounded-xl border-2 p-4 flex flex-col gap-3 bg-card ${p.popular ? 'border-primary' : 'border-border'}`}>
                    {p.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground">Most Popular</span>
                    )}
                    <div>
                      <p className="font-bold text-foreground text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    <div className="flex items-end gap-1">
                      <span className="text-xl font-black text-foreground">${p.price}</span>
                      <span className="text-xs text-muted-foreground mb-0.5">/mo</span>
                    </div>
                    <button
                      onClick={() => handleUpgrade(p.key)}
                      disabled={upgradeLoading === p.key}
                      className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${p.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'btn-secondary'}`}
                    >
                      {upgradeLoading === p.key ? <Loader2 size={13} className="animate-spin" /> : <Crown size={13} />}
                      Subscribe Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trial Active Banner */}
      {!subLoading && isTrialing && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-warning/15 shrink-0">
            <Clock size={16} className="text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Trial active — <span className="text-warning">{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Your {subscription?.subscription_plan ? `${subscription.subscription_plan.charAt(0).toUpperCase() + subscription.subscription_plan.slice(1)} plan` : 'plan'} trial ends on {subscription?.trial_end ? new Date(subscription.trial_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}. Your card will be charged automatically.
            </p>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="btn-secondary text-xs flex items-center gap-1.5 shrink-0"
          >
            {portalLoading ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
            Manage
          </button>
        </div>
      )}

      {/* Active Subscription Banner */}
      {!subLoading && isActive && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/15 shrink-0">
            <CheckCircle2 size={16} className="text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Active subscription — <span className="text-success capitalize">{subscription?.subscription_plan || 'Plan'}</span>
            </p>
            <p className="text-xs text-muted-foreground">Your subscription is active and renewing automatically.</p>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="btn-secondary text-xs flex items-center gap-1.5 shrink-0"
          >
            {portalLoading ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
            Manage
          </button>
        </div>
      )}

      {/* Past Due Banner */}
      {!subLoading && isPastDue && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-danger/15 shrink-0">
            <AlertTriangle size={16} className="text-danger" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground text-danger">Payment failed — action required</p>
            <p className="text-xs text-muted-foreground">Your last payment failed. Update your payment method to keep your account active.</p>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="bg-danger text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shrink-0 hover:bg-danger/90"
          >
            {portalLoading ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
            Update Payment
          </button>
        </div>
      )}

      {/* Checkout Success Banner */}
      {checkoutSuccess && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-success shrink-0" />
          <p className="text-sm font-semibold text-foreground">
            🎉 Welcome! Your trial has started. Check your email for confirmation.
          </p>
        </div>
      )}

      {/* Stripe Plans Panel */}
      {!isActive && !isTrialing && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-header flex items-center gap-2"><Zap size={15} className="text-primary" /> Subscription Plans</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Start a 7-day $1 trial or subscribe directly</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map(p => (
              <div key={p.key} className={`relative rounded-xl border-2 p-4 flex flex-col gap-3 ${p.popular ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground">Most Popular</span>
                )}
                <div>
                  <p className="font-bold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black text-foreground">${p.price}</span>
                  <span className="text-xs text-muted-foreground mb-1">/mo</span>
                </div>
                <button
                  onClick={() => handleUpgrade(p.key)}
                  disabled={upgradeLoading === p.key}
                  className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${p.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'btn-secondary'}`}
                >
                  {upgradeLoading === p.key ? <Loader2 size={13} className="animate-spin" /> : null}
                  Start $1 Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {kpiCards.map(k => {
          const KpiIcon = k.icon;
          return (
            <div key={k.id} className={`card p-5 flex flex-col gap-3 ${k.alert ? 'bg-danger/5 border-danger/20' : ''}`}>
              <div className="flex items-start justify-between">
                <p className="metric-label">{k.label}</p>
                <div className={`p-2 rounded-lg ${k.alert ? 'bg-danger/10' : 'bg-muted'}`}>
                  <KpiIcon size={16} className={k.alert ? 'text-danger' : 'text-muted-foreground'} />
                </div>
              </div>
              <p className={`metric-value ${k.alert ? 'text-danger' : ''}`}>{k.value}</p>
              <p className={`text-xs font-medium ${k.changeType === 'positive' ? 'text-success' : k.changeType === 'danger' ? 'text-danger' : 'text-muted-foreground'}`}>
                {k.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chart + Overdue Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <PlanDistributionChart />
        </div>
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-header">Overdue Invoices</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Clients requiring immediate billing follow-up</p>
            </div>
            <span className="badge bg-danger/10 text-danger border-danger/20">{overdueCount} overdue</span>
          </div>
          <div className="space-y-3">
            {invoices.filter(i => i.status === 'overdue').map(inv => (
              <div key={`od-${inv.id}`} className="flex items-center gap-3 p-3 bg-danger/5 border border-danger/15 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-danger/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={14} className="text-danger" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{inv.clientName}</p>
                  <p className="text-xs text-muted-foreground">{inv.plan} · ${inv.amount}/mo · {inv.daysOverdue} days overdue</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toast.success(`Reminder sent to ${inv.clientName}`)}
                    className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
                  >
                    <Send size={12} /> Remind
                  </button>
                </div>
              </div>
            ))}
            {invoices.filter(i => i.status === 'pending').map(inv => (
              <div key={`pend-${inv.id}`} className="flex items-center gap-3 p-3 bg-warning/5 border border-warning/15 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                  <CreditCard size={14} className="text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{inv.clientName}</p>
                  <p className="text-xs text-muted-foreground">{inv.plan} · ${inv.amount}/mo · No payment method on file</p>
                </div>
                <button
                  onClick={() => toast.info(`Payment setup link sent to ${inv.clientName}`)}
                  className="btn-secondary text-xs px-2 py-1 flex items-center gap-1"
                >
                  <Send size={12} /> Setup Link
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by client name or invoice number..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="input-field pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {['All', 'paid', 'overdue', 'pending', 'draft'].map(s => (
              <button
                key={`bstatus-${s}`}
                onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 border ${
                  statusFilter === s
                    ? s === 'overdue' ? 'bg-danger/10 text-danger border-danger/30' : s === 'paid' ? 'bg-success/10 text-success border-success/30' : 'bg-primary/10 text-primary border-primary/30' :'bg-card text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-foreground text-background rounded-xl px-5 py-3 shadow-xl slide-up">
          <span className="text-sm font-semibold">{selectedRows.size} selected</span>
          <div className="w-px h-4 bg-white/20" />
          <button className="text-sm font-medium hover:text-white/80" onClick={() => toast.success(`Sent ${selectedRows.size} invoices`)}>Send Invoices</button>
          <button className="text-sm font-medium hover:text-white/80" onClick={() => toast.success(`Exported ${selectedRows.size} invoices`)}>Export</button>
          <button onClick={() => setSelectedRows(new Set())} className="ml-2 p-1 hover:bg-white/10 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Invoice Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="table-header w-10">
                  <input type="checkbox" checked={selectedRows.size === paginated.length && paginated.length > 0} onChange={toggleAll} className="w-4 h-4 rounded border-input accent-primary" aria-label="Select all" />
                </th>
                <th className="table-header">Invoice #</th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('clientName')}>
                  <span className="flex items-center">Client <SortIcon field="clientName" /></span>
                </th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('plan')}>
                  <span className="flex items-center">Plan <SortIcon field="plan" /></span>
                </th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <span className="flex items-center">Amount <SortIcon field="amount" /></span>
                </th>
                <th className="table-header">Billing Cycle</th>
                <th className="table-header">Last Payment</th>
                <th className="table-header cursor-pointer select-none" onClick={() => toggleSort('nextDue')}>
                  <span className="flex items-center">Next Due <SortIcon field="nextDue" /></span>
                </th>
                <th className="table-header">Status</th>
                <th className="table-header">Payment Method</th>
                <th className="table-header w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <EmptyState
                      icon={CreditCard}
                      title="No invoices found"
                      description="No invoices match your search. Create a new invoice to bill a client."
                      action={{ label: 'Create Invoice', onClick: () => setSendInvoiceOpen(true) }}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(inv => (
                  <tr key={inv.id} className={`border-b border-border row-hover ${selectedRows.has(inv.id) ? 'bg-primary/5' : ''} ${inv.status === 'overdue' ? 'bg-danger/[0.02]' : ''}`}>
                    <td className="table-cell">
                      <input type="checkbox" checked={selectedRows.has(inv.id)} onChange={() => toggleRow(inv.id)} className="w-4 h-4 rounded border-input accent-primary" aria-label={`Select ${inv.invoiceNum}`} />
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-xs font-semibold text-foreground bg-muted px-2 py-1 rounded">{inv.invoiceNum}</span>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-sm text-foreground">{inv.clientName}</p>
                    </td>
                    <td className="table-cell">
                      <span className="badge bg-muted text-muted-foreground border-border">{inv.plan}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-foreground tabular-nums">${inv.amount.toFixed(2)}</span>
                    </td>
                    <td className="table-cell text-muted-foreground text-sm">{inv.billingCycle}</td>
                    <td className="table-cell text-muted-foreground text-sm">{inv.lastPayment}</td>
                    <td className="table-cell">
                      {inv.status === 'overdue' ? (
                        <span className="text-sm font-semibold text-danger">{inv.nextDue}</span>
                      ) : (
                        <span className="text-sm text-foreground">{inv.nextDue}</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={inv.status} />
                      {inv.daysOverdue && (
                        <p className="text-xs text-danger mt-0.5">{inv.daysOverdue}d overdue</p>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className="text-xs text-muted-foreground">{inv.paymentMethod}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="View invoice">
                          <Eye size={14} className="text-muted-foreground" />
                        </button>
                        {(inv.status === 'overdue' || inv.status === 'pending' || inv.status === 'draft') && (
                          <button
                            onClick={() => toast.success(`Invoice sent to ${inv.clientName}`)}
                            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
                            title="Send invoice"
                          >
                            <Send size={14} className="text-primary" />
                          </button>
                        )}
                        {inv.status === 'overdue' && (
                          <button
                            onClick={() => toast.success(`Payment marked as received for ${inv.clientName}`)}
                            className="p-1.5 hover:bg-success/10 rounded-lg transition-colors"
                            title="Mark as paid"
                          >
                            <CheckCircle2 size={14} className="text-success" />
                          </button>
                        )}
                        <button className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="More options">
                          <MoreHorizontal size={14} className="text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length} invoices
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40">Previous</button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={`billingpage-${i + 1}`} onClick={() => setCurrentPage(i + 1)} className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${currentPage === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      <Modal open={sendInvoiceOpen} onClose={() => setSendInvoiceOpen(false)} title="Create Invoice" subtitle="Generate a new invoice for a client" size="md">
        <CreateInvoiceForm onClose={() => setSendInvoiceOpen(false)} />
      </Modal>
    </div>
  );
}

function CreateInvoiceForm({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { clientId: '', plan: 'Growth', amount: '99', dueDate: '', notes: '' },
  });

  const onSubmit = (data: Record<string, string>) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Invoice created and sent to client');
      onClose();
    }, 900);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label-text">Client</label>
        <select className="input-field" {...register('clientId', { required: 'Select a client' })}>
          <option value="">— Select client —</option>
          {['Darnell Washington', 'Priya Nambiar', 'Marcus Holloway', 'Tanisha Brooks', 'Roberto Fuentes'].map(n => (
            <option key={`ci-${n}`} value={n}>{n}</option>
          ))}
        </select>
        {errors.clientId && <p className="error-text">{String(errors.clientId.message)}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text">Plan</label>
          <select className="input-field" {...register('plan')}>
            <option>Starter — $99/mo</option>
            <option>Growth — $199/mo</option>
            <option>Agency — $399/mo</option>
          </select>
        </div>
        <div>
          <label className="label-text">Amount ($)</label>
          <input type="number" className="input-field" {...register('amount', { required: true })} />
        </div>
      </div>
      <div>
        <label className="label-text">Due date</label>
        <input type="date" className="input-field" {...register('dueDate', { required: 'Due date required' })} />
        {errors.dueDate && <p className="error-text">{String(errors.dueDate.message)}</p>}
      </div>
      <div>
        <label className="label-text">Invoice notes (optional)</label>
        <textarea className="input-field resize-none" rows={2} placeholder="First-work fee, dispute round 2, etc." {...register('notes')} />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 min-w-[130px] justify-center">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
}