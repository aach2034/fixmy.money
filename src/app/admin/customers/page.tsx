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
  ['no_report', 'No report'],
  ['no_dispute', 'No dispute'],
] as const;

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const { customers } = await getAdminCustomerSummaries();
  const filtered = filterCustomers(customers, params);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
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
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Apply</button>
          </form>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Subscription</th>
                <th className="p-4">Reports</th>
                <th className="p-4">Negative items</th>
                <th className="p-4">Disputes</th>
                <th className="p-4">Letters</th>
                <th className="p-4">Attention</th>
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
                  </td>
                  <td className="p-4">{customer.subscriptionStatus}</td>
                  <td className="p-4">{customer.reportsImported}</td>
                  <td className="p-4">{customer.negativeItems}</td>
                  <td className="p-4">{customer.disputeRounds}</td>
                  <td className="p-4">{customer.lettersGenerated}</td>
                  <td className="p-4">
                    <span className={customer.attentionLevel === 'red' ? 'text-red-700' : customer.attentionLevel === 'yellow' ? 'text-amber-700' : 'text-emerald-700'}>
                      {customer.attentionReasons[0] || 'Green'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No customers match those filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
