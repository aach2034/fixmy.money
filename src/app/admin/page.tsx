import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, CheckCircle2, Circle, Clock, FileText, Search, Users } from 'lucide-react';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
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

export default async function AdminDashboardPage() {
  const { user, role } = await requirePlatformAdmin();
  const { totals, needsAttention } = await getAdminCustomerSummaries();
  const topAttention = needsAttention.slice(0, 12);

  const cards = [
    ['Total customers', totals.totalCustomers, Users],
    ['Active subscriptions', totals.activeSubscriptions, CheckCircle2],
    ['Active trials', totals.activeTrials, Clock],
    ['Canceled', totals.canceledSubscriptions, AlertTriangle],
    ['No report imported', totals.noReport, FileText],
    ['Report, no dispute', totals.reportNoDispute, Circle],
    ['Inactive users', totals.inactive, Clock],
    ['Failed workflows', totals.failedWorkflows, AlertTriangle],
  ] as const;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">Internal admin</p>
            <h1 className="mt-2 text-3xl font-black">Customer management</h1>
            <p className="mt-2 text-sm text-slate-500">
              Signed in as {user.email} · {role.replace('_', ' ')}
            </p>
          </div>
          <Link href="/admin/customers" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-800">
            <Search size={16} />
            Customer directory
          </Link>
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

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="text-xl font-black">Needs attention</h2>
              <p className="mt-1 text-sm text-slate-500">Transparent retention flags from existing customer, billing, report, dispute, and follow-up data.</p>
            </div>
            <Link href="/admin/customers?status=needs_attention" className="text-sm font-bold text-blue-600 hover:text-blue-700">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {topAttention.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No customer currently needs attention.</p>
            ) : (
              topAttention.map((customer) => (
                <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="block p-5 hover:bg-slate-50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{customer.fullName || customer.companyName || customer.email}</p>
                      <p className="mt-1 text-sm text-slate-500">{customer.email}</p>
                      <p className="mt-2 text-sm text-slate-700">{customer.attentionReasons.join(' — ')}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${levelStyles[customer.attentionLevel]}`}>
                      {customer.attentionLevel}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
