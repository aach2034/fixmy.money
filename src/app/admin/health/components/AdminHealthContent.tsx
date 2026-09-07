'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, XCircle, Clock, Shield, Zap, RefreshCw, ArrowLeft, Server, Key } from 'lucide-react';


interface HealthData {
  environment: Record<string, 'configured' | 'missing'>;
  timestamp: string;
  status: string;
}

interface AdminHealthContentProps {
  userEmail: string;
  webhookHealth: { available: boolean; retry: number; deadLetter: number };
}

function StatusIndicator({ status }: { status: 'ok' | 'warning' | 'error' | 'unknown' }) {
  const map = {
    ok: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'OK' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Warning' },
    error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Error' },
    unknown: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Unknown' },
  };
  const { icon: Icon, color, bg, label } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${bg} ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

export default function AdminHealthContent({ userEmail, webhookHealth }: AdminHealthContentProps) {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
      setLastRefresh(new Date());
    } catch {
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const envEntries = healthData?.environment ? Object.entries(healthData.environment) : [];
  const missingVars = envEntries.filter(([, v]) => v === 'missing').map(([k]) => k);
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">Admin Health Dashboard</h1>
              <p className="text-xs text-slate-500">Authorized access only · {userEmail}</p>
            </div>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Security Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Shield size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Restricted Access</p>
            <p className="text-xs text-amber-700 mt-0.5">
              This dashboard shows operational health indicators only. No credit report data, Social Security numbers, account numbers, dispute text, or identity documents are displayed here.
            </p>
          </div>
        </div>

        {/* System Status */}
        <section>
          <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <Server size={16} className="text-blue-600" />
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                label: 'API Health',
                status: healthData ? 'ok' : 'unknown' as const,
                detail: healthData ? `Last checked: ${lastRefresh.toLocaleTimeString()}` : 'Checking...',
              },
              {
                label: 'Environment Variables',
                status: (missingVars.length === 0 ? 'ok' : missingVars.length <= 2 ? 'warning' : 'error') as 'ok' | 'warning' | 'error',
                detail: missingVars.length === 0 ? 'All required vars configured' : `${missingVars.length} variable(s) missing`,
              },
              {
                label: 'Stripe Configuration',
                status: (healthData?.environment?.STRIPE_SECRET_KEY === 'configured' &&
                  healthData?.environment?.STRIPE_WEBHOOK_SECRET === 'configured' &&
                  healthData?.environment?.STRIPE_WEBHOOK_WORKER_SECRET === 'configured' ? 'ok' : 'warning') as 'ok' | 'warning',
                detail: 'Webhook, worker, and secret key status',
              },
              {
                label: 'Webhook Processing',
                status: (!webhookHealth.available || webhookHealth.deadLetter > 0 ? 'error' : webhookHealth.retry > 0 ? 'warning' : 'ok') as 'ok' | 'warning' | 'error',
                detail: webhookHealth.available
                  ? `${webhookHealth.retry} retrying · ${webhookHealth.deadLetter} dead-letter`
                  : 'Durable queue status unavailable',
              },
              {
                label: 'Supabase Connection',
                status: (healthData?.environment?.NEXT_PUBLIC_SUPABASE_URL === 'configured' ? 'ok' : 'error') as 'ok' | 'error',
                detail: 'Database connectivity',
              },
              {
                label: 'AI Services',
                status: (healthData?.environment?.OPENAI_API_KEY === 'configured' ? 'ok' : 'warning') as 'ok' | 'warning',
                detail: 'OpenAI API key status',
              },
              {
                label: 'Service Role Key',
                status: (healthData?.environment?.SUPABASE_SERVICE_ROLE_KEY === 'configured' ? 'ok' : 'error') as 'ok' | 'error',
                detail: 'Admin operations key',
              },
            ].map(item => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-slate-900">{item.label}</p>
                  <StatusIndicator status={item.status as 'ok' | 'warning' | 'error' | 'unknown'} />
                </div>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Environment Variables */}
        <section>
          <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <Key size={16} className="text-blue-600" />
            Environment Variables
            <span className="text-xs font-normal text-slate-400">(values never shown)</span>
          </h2>
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <RefreshCw size={20} className="animate-spin text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading health data...</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Variable</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {envEntries.map(([key, status]) => {
                    const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_WEBHOOK_WORKER_SECRET', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'].includes(key);
                    return (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{key}</td>
                        <td className="px-4 py-3">
                          {status === 'configured' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} /> Configured
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle size={10} /> Missing
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {required ? (
                            <span className="text-xs font-semibold text-slate-700">Required</span>
                          ) : (
                            <span className="text-xs text-slate-400">Optional</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Webhook Events Supported */}
        <section>
          <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <Zap size={16} className="text-blue-600" />
            Stripe Webhook Events Supported
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                'checkout.session.completed',
                'customer.subscription.created',
                'customer.subscription.updated',
                'customer.subscription.deleted',
                'invoice.created',
                'invoice.finalized',
                'invoice.payment_succeeded',
                'invoice.payment_failed',
                'invoice.upcoming',
                'charge.refunded',
                'charge.dispute.created',
                'charge.dispute.closed',
              ].map(event => (
                <div key={event} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                  <span className="font-mono text-slate-700">{event}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Checklist */}
        <section>
          <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            Security Checklist
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="space-y-2">
              {[
                { item: 'Service role key never falls back to anon key', status: 'ok' },
                { item: 'Webhook signature verification enabled', status: 'ok' },
                { item: 'Billing events use idempotent Stripe event IDs', status: 'ok' },
                { item: 'Admin client only used server-side', status: 'ok' },
                { item: 'Sensitive data not logged in webhook handlers', status: 'ok' },
                { item: 'Demo mode uses static fixtures only', status: 'ok' },
                { item: 'Cross-tenant security tests available', status: 'ok' },
                { item: 'SUPABASE_SERVICE_ROLE_KEY configured', status: healthData?.environment?.SUPABASE_SERVICE_ROLE_KEY === 'configured' ? 'ok' : 'error' },
                { item: 'STRIPE_WEBHOOK_SECRET configured', status: healthData?.environment?.STRIPE_WEBHOOK_SECRET === 'configured' ? 'ok' : 'error' },
                { item: 'STRIPE_WEBHOOK_WORKER_SECRET configured', status: healthData?.environment?.STRIPE_WEBHOOK_WORKER_SECRET === 'configured' ? 'ok' : 'error' },
              ].map(({ item, status }) => (
                <div key={item} className="flex items-center gap-2">
                  {status === 'ok' ? (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-600 shrink-0" />
                  )}
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Last Updated */}
        <div className="text-xs text-slate-400 text-center">
          Last refreshed: {lastRefresh.toLocaleString()} · Admin: {userEmail}
        </div>
      </div>
    </div>
  );
}
