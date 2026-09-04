import Link from 'next/link';
import type { Metadata } from 'next';
import { customerSearch } from '@/app/admin/actions';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
import { filterCustomers, getAdminCustomerSummaries } from '@/lib/admin/customerManagement';

export const metadata: Metadata = {
  title: 'Customer Directory | FixMy.Money Admin',
  robots: { index: false, follow: false },
};

const filters = [
  ['all', 'All'],
  ['active', 'Active'],
  ['trial', 'Trial'],
  ['canceled', 'Canceled'],
  ['needs_attention', 'Needs attention'],
  ['win_back', 'Win-back'],
  ['test_internal', 'Test/Internal'],
  ['do_not_contact', 'Do not contact'],
  ['no_report', 'No report'],
  ['no_dispute', 'No dispute'],
] as const;

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; include_test_internal?: string }> }) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const includeTestInternal = params.include_test_internal === 'true';
  const { customers } = await getAdminCustomerSummaries();
  const filtered = filterCustomers(customers, params);

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-bold text-blue-600">← Admin dashboard</Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Customer directory</h1>
            <p className="mt-2 text-sm text-slate-500">Search and filter existing FixMy.Money customer accounts.</p>
          </div>
          <form action={customerSearch} className="flex flex-wrap gap-2">
            <input name="q" defaultValue={params.q ?? ''} placeholder="Search name or email" className="w-64 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
            <select name="status" defaultValue={params.status ?? 'all'} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200">
              {filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600">
              <input name="include_test_internal" type="checkbox" defaultChecked={includeTestInternal} className="h-4 w-4 rounded border-slate-300" />
              Include test/internal
            </label>
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Apply</button>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Type</th>
                <th className="p-4">Subscription</th>
                <th className="p-4">Reports</th>
                <th className="p-4">Negative items</th>
                <th className="p-4">Disputes</th>
                <th className="p-4">Letters</th>
                <th className="p-4">Queue / action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <Link href={`/admin/customers/${customer.id}`} className="font-black text-slate-900 hover:text-blue-600">
                      {customer.fullName || customer.companyName || customer.email}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">{customer.email}</p>
                    {customer.doNotContact ? <p className="mt-1 text-xs font-bold uppercase text-red-600">Do not contact</p> : null}
                  </td>
                  <td className="p-4">
                    <span className={customer.customerType === 'real' ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold uppercase text-emerald-700' : 'rounded-full bg-purple-50 px-2 py-1 text-xs font-bold uppercase text-purple-700'}>
                      {customer.customerType}
                    </span>
                  </td>
                  <td className="p-4">{customer.subscriptionStatus}</td>
                  <td className="p-4">{customer.reportsImported}</td>
                  <td className="p-4">{customer.negativeItems}</td>
                  <td className="p-4">{customer.disputeRounds}</td>
                  <td className="p-4">{customer.lettersGenerated}</td>
                  <td className="p-4">
                    <p className="font-bold capitalize text-slate-700">{customer.queue.replace('_', ' ')}</p>
                    <p className={customer.attentionLevel === 'red' ? 'mt-1 text-xs text-red-700' : customer.attentionLevel === 'yellow' ? 'mt-1 text-xs text-amber-700' : 'mt-1 text-xs text-emerald-700'}>
                      {customer.topIssue ? `${customer.topIssue.label} → ${customer.topIssue.recommendedAction}` : 'Green'}
                    </p>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">No customers match those filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
