import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, CheckCircle2, CircleAlert } from 'lucide-react';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
import { getAcquisitionAnalytics } from '@/lib/admin/acquisitionAnalytics';

export const metadata: Metadata = {
  title: 'Acquisition Funnel | FixMy.Money',
  description: 'Private acquisition and activation funnel.',
  robots: { index: false, follow: false },
};

const percent = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;

export default async function AdminAcquisitionPage() {
  await requirePlatformAdmin();
  const analytics = await getAcquisitionAnalytics();

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-800">
          <ArrowLeft size={16} /> Customer management
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-600">Internal admin</p>
            <h1 className="mt-2 text-3xl font-black">Acquisition and activation</h1>
            <p className="mt-2 text-sm text-slate-500">Real customers only. The 30-day column uses persisted server events and excludes test, demo, QA, and internal accounts.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
            {analytics.serverEventCount} persisted funnel events
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ['GA4 reporting', analytics.configured.ga4Reporting],
            ['Google Search Console', analytics.configured.searchConsole],
          ].map(([label, configured]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                {configured ? <CheckCircle2 className="text-emerald-600" size={20} /> : <CircleAlert className="text-amber-600" size={20} />}
                <div>
                  <p className="font-black">{label}</p>
                  <p className="text-sm text-slate-500">{configured ? 'Credentials configured' : 'Credentials required for traffic and search-query reporting'}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black">Customer funnel</h2>
            <p className="mt-1 text-sm text-slate-500">Current customers at each value milestone, plus users who reached the milestone in the last 30 days.</p>
          </div>
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-4">Stage</th><th className="p-4">Total users</th><th className="p-4">Last 30 days</th><th className="p-4">From previous stage</th></tr>
            </thead>
            <tbody>
              {analytics.stages.map(stage => (
                <tr key={stage.key} className="border-t border-slate-100">
                  <td className="p-4 font-bold">{stage.label}</td>
                  <td className="p-4 text-2xl font-black">{stage.total}</td>
                  <td className="p-4">{stage.last30Days}</td>
                  <td className="p-4 font-bold text-blue-700">{percent(stage.conversionFromPrevious)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black">Attribution by source</h2>
            <p className="mt-1 text-sm text-slate-500">Persisted first-touch source and medium reconciled with trial and subscription status.</p>
          </div>
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="p-4">Source</th><th className="p-4">Medium</th><th className="p-4">Signups</th><th className="p-4">Trials</th><th className="p-4">Paid</th></tr>
            </thead>
            <tbody>
              {analytics.sources.map(row => (
                <tr key={`${row.source}-${row.medium}`} className="border-t border-slate-100">
                  <td className="p-4 font-bold">{row.source}</td><td className="p-4 text-slate-500">{row.medium}</td><td className="p-4">{row.signups}</td><td className="p-4">{row.trials}</td><td className="p-4">{row.paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}
