import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getSeoHealthReport } from '@/lib/seo/health';
import { PRIVATE_ROUTE_PREFIXES, PUBLIC_SEO_PAGES, canonicalUrl } from '@/lib/seo/config';
import sourceAudit from '../../../../reports/seo-health.json';

export const metadata: Metadata = { title: 'SEO Status | FixMy.Money', description: 'Private SEO health report.', robots: { index: false, follow: false } };

async function isPlatformAdmin(userId: string, email: string) {
  try {
    const { data } = await getAdminClient().from('platform_admins').select('id').eq('user_id', userId).eq('active', true).maybeSingle();
    if (data) return true;
  } catch { /* Bootstrap fallback below. */ }
  return (process.env.ADMIN_EMAILS ?? '').split(',').map(value => value.trim()).filter(Boolean).includes(email);
}

export default async function AdminSeoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!(await isPlatformAdmin(user.id, user.email ?? ''))) redirect('/dashboard');
  const registryReport = getSeoHealthReport();
  const report = { ...registryReport, errorCount: sourceAudit.errorCount, warningCount: sourceAudit.warningCount, issues: sourceAudit.issues };

  return <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
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
    </div>
  </main>;
}
