import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, CheckCircle2, Circle, Clock, FileText, Search, ShieldCheck, Users } from 'lucide-react';
import { updateRetentionAlert } from '@/app/admin/actions';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
import type { AdminCustomerSummary } from '@/lib/admin/customerManagement';
import { getAdminCustomerSummaries } from '@/lib/admin/customerManagement';

export const metadata: Metadata = {
  title: 'Admin Dashboard | FixMy.Money',
  description: 'Internal customer-management dashboard.',
  robots: { index: false, follow: false },
};

const levelStyles = {
  red: 'bg-red-50 text-red-700 border-red-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function RetentionActions({ customer }: { customer: AdminCustomerSummary }) {
  if (!customer.topIssue) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {[
        ['contacted', 'Contacted', 'Customer contacted from retention queue.'],
        ['dismissed', 'Dismiss', 'Not actionable.'],
        ['snoozed', 'Snooze 3d', 'Follow up later.'],
      ].map(([status, label, reason]) => (
        <form key={status} action={updateRetentionAlert}>
          <input type="hidden" name="customerId" value={customer.id} />
          <input type="hidden" name="alertKey" value={customer.topIssue?.key} />
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="reason" value={reason} />
          <input type="hidden" name="snoozeDays" value="3" />
          <button className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700">
            {label}
          </button>
        </form>
      ))}
    </div>
  );
}

function QueueList({
  title,
  description,
  customers,
  directoryHref,
  empty,
}: {
  title: string;
  description: string;
  customers: AdminCustomerSummary[];
  directoryHref: string;
  empty: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <Link href={directoryHref} className="text-sm font-bold text-blue-600 hover:text-blue-700">View all</Link>
      </div>
      <div className="divide-y divide-slate-100">
        {customers.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">{empty}</p>
        ) : (
          customers.map((customer) => (
            <div key={customer.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/customers/${customer.id}`} className="font-black text-slate-900 hover:text-blue-600">
                      {customer.fullName || customer.companyName || customer.email}
                    </Link>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-500">{customer.subscriptionStatus}</span>
                    {customer.customerType !== 'real' ? <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-bold uppercase text-purple-700">{customer.customerType}</span> : null}
                    {customer.doNotContact ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold uppercase text-red-700">Do not contact</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{customer.email}</p>
                  {customer.topIssue ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <p className="text-sm font-bold text-slate-800">{customer.topIssue.label}</p>
                      <p className="mt-1 text-sm text-blue-700">Recommended action: {customer.topIssue.recommendedAction}</p>
                      {customer.attentionReasons.length > 1 ? <p className="mt-1 text-xs text-slate-500">Also: {customer.attentionReasons.slice(1).join(' · ')}</p> : null}
                    </div>
                  ) : null}
                  <RetentionActions customer={customer} />
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${levelStyles[customer.attentionLevel]}`}>
                  {customer.attentionLevel}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ include_test_internal?: string }> }) {
  const { user, role } = await requirePlatformAdmin();
  const params = await searchParams;
  const includeTestInternal = params.include_test_internal === 'true';
  const { totals, needsAttention, winBack, testInternal } = await getAdminCustomerSummaries();

  const cards = [
    ['Real customers', totals.totalCustomers, Users],
    ['Active subscriptions', totals.activeSubscriptions, CheckCircle2],
    ['Active trials', totals.activeTrials, Clock],
    ['Win-back', totals.canceledSubscriptions, AlertTriangle],
    ['No report imported', totals.noReport, FileText],
    ['Report, no dispute', totals.reportNoDispute, Circle],
    ['Do not contact', totals.doNotContact, ShieldCheck],
    ['Test/internal excluded', totals.testInternal, AlertTriangle],
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">Internal admin</p>
            <h1 className="mt-2 text-3xl font-black">Customer management</h1>
            <p className="mt-2 text-sm text-slate-500">
              Signed in as {user.email} · {role.replace('_', ' ')} · Retention metrics exclude QA/demo/internal/test accounts by default.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={includeTestInternal ? '/admin' : '/admin?include_test_internal=true'} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700">
              {includeTestInternal ? 'Hide test/internal' : 'Include test/internal'}
            </Link>
            <Link href="/admin/customers" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800">
              <Search size={16} />
              Customer directory
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value, Icon]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon size={20} className="text-blue-600" />
              <p className="mt-4 text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 space-y-6">
          <QueueList
            title="Needs Attention"
            description="Active and trial customers who can still be retained, sorted by urgency."
            customers={needsAttention.slice(0, 12)}
            directoryHref="/admin/customers?status=needs_attention"
            empty="No active or trial customer currently needs attention."
          />
          <QueueList
            title="Win-back"
            description="Canceled or expired real customers separated from active retention opportunities."
            customers={winBack.slice(0, 8)}
            directoryHref="/admin/customers?status=win_back"
            empty="No canceled or expired real customers are currently flagged."
          />
          {includeTestInternal ? (
            <QueueList
              title="Test/Internal"
              description="QA, demo, staff, and development accounts kept out of default retention metrics."
              customers={testInternal.slice(0, 12)}
              directoryHref="/admin/customers?status=test_internal&include_test_internal=true"
              empty="No test/internal accounts detected."
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
