import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/admin/authorization';
import { getSeoHealthReport } from '@/lib/seo/health';
import { PRIVATE_ROUTE_PREFIXES, PUBLIC_SEO_PAGES, canonicalUrl } from '@/lib/seo/config';
import { analyzeSearchPerformance } from '@/lib/seo/searchPerformance';
import sourceAudit from '../../../../reports/seo-health.json';

export const metadata: Metadata = { title: 'SEO Status | FixMy.Money', description: 'Private SEO health report.', robots: { index: false, follow: false } };

export default async function AdminSeoPage() {
  await requirePlatformAdmin();
  const registryReport = getSeoHealthReport();
  const report = { ...registryReport, errorCount: sourceAudit.errorCount, warningCount: sourceAudit.warningCount, issues: sourceAudit.issues };
  const searchPerformance = analyzeSearchPerformance([]);

  return <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
    <div className="mx-auto max-w-7xl">
      <h1 className="text-3xl font-bold">SEO status</h1>
      <p className="mt-2 text-slate-400">Central metadata, canonical, indexing, and content health for public pages.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[['Public pages', report.publicPageCount], ['Errors', report.errorCount], ['Warnings', report.warningCount], ['Private prefixes', PRIVATE_ROUTE_PREFIXES.length]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5"><div className="text-sm text-slate-400">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>)}
      </div>
      <section className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <h2 className="border-b border-slate-800 px-5 py-4 text-lg font-semibold">Validation issues</h2>
        {report.issues.length === 0 ? <p className="p-5 text-emerald-400">No registry errors or duplicate metadata found.</p> : <ul>{report.issues.map((issue, index) => <li key={`${issue.code}-${issue.path}-${index}`} className="border-b border-slate-800 px-5 py-4"><span className={issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}>{issue.severity.toUpperCase()}</span> <code className="ml-2 text-slate-300">{issue.path}</code><p className="mt-1 text-sm text-slate-400">{issue.message}</p></li>)}</ul>}
      </section>
      <section className="mt-8 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        <h2 className="border-b border-slate-800 px-5 py-4 text-lg font-semibold">Indexed pages</h2>
        <table className="w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="p-4">Route</th><th className="p-4">Title</th><th className="p-4">Primary keyword</th><th className="p-4">Canonical</th></tr></thead><tbody>{PUBLIC_SEO_PAGES.map(page => <tr key={page.path} className="border-t border-slate-800"><td className="p-4"><code>{page.path}</code></td><td className="p-4">{page.title}</td><td className="p-4">{page.primaryKeyword}</td><td className="p-4 text-slate-400">{canonicalUrl(page.path)}</td></tr>)}</tbody></table>
      </section>
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900">
        <h2 className="border-b border-slate-800 px-5 py-4 text-lg font-semibold">Organic growth</h2>
        <div className="grid gap-4 p-5 sm:grid-cols-4">
          {[['Clicks', searchPerformance.clicks], ['Impressions', searchPerformance.impressions], ['CTR', `${(searchPerformance.ctr * 100).toFixed(1)}%`], ['Avg. position', searchPerformance.averagePosition.toFixed(1)]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>)}
        </div>
        {!searchPerformance.configured ? <div className="border-t border-slate-800 p-5 text-sm text-slate-400"><p className="font-semibold text-amber-300">Search Console data is not connected yet.</p><ul className="mt-2 list-disc space-y-1 pl-5">{searchPerformance.setupRequired.map(item => <li key={item}>{item}</li>)}</ul></div> : null}
      </section>
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900">
        <h2 className="border-b border-slate-800 px-5 py-4 text-lg font-semibold">Top opportunities</h2>
        {searchPerformance.opportunities.length === 0 ? <p className="p-5 text-sm text-slate-400">No Search Console opportunities are available yet.</p> : <ul>{searchPerformance.opportunities.map(opportunity => <li key={`${opportunity.page}-${opportunity.query}`} className="border-b border-slate-800 px-5 py-4"><p className="font-semibold">{opportunity.query}</p><p className="text-sm text-slate-400">{opportunity.page} · position {opportunity.position.toFixed(1)} · {opportunity.impressions} impressions · {(opportunity.ctr * 100).toFixed(1)}% CTR</p><p className="mt-1 text-sm text-blue-300">{opportunity.recommendedAction}</p></li>)}</ul>}
      </section>
    </div>
  </div>;
}
