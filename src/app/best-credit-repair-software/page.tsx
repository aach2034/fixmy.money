import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Shield, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Best Credit Repair Software for Agencies | FixMy.Money',
  description: 'Compare the best credit repair software for agencies. FixMy.Money offers AI analysis, dispute automation, CRM, billing, and client portals. Built for modern credit repair professionals.',
  alternates: { canonical: 'https://fixmy.money/best-credit-repair-software' },
  openGraph: {
    title: 'Best Credit Repair Software for Agencies | FixMy.Money',
    description: 'Compare the best credit repair software for agencies. FixMy.Money offers AI analysis, dispute automation, CRM, billing, and client portals.',
    url: 'https://fixmy.money/best-credit-repair-software',
    type: 'website',
  },
};

const comparison = [
  { feature: 'AI Credit Analysis', fixmy: true, others: false },
  { feature: 'Dispute Automation', fixmy: true, others: true },
  { feature: 'Client CRM', fixmy: true, others: true },
  { feature: 'Stripe Billing', fixmy: true, others: false },
  { feature: 'Client Portal', fixmy: true, others: true },
  { feature: 'Document Storage', fixmy: true, others: true },
  { feature: 'Task Automation', fixmy: true, others: false },
  { feature: 'Modern UI/UX', fixmy: true, others: false },
];

export default function BestCreditRepairSoftwarePage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/demo" className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-xl">Book Demo</Link>
            <Link href="/sign-up-login-screen?tab=register" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">Start Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 to-[#0d1f3c] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Shield size={13} />
            Business Software for Agencies
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Best credit repair software for agencies
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Compare features and find the right platform for your credit repair business.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-3 mb-8 max-w-2xl mx-auto">
            <p className="text-xs text-slate-400">
              FixMy.Money provides business software for credit repair professionals. We do not provide consumer credit repair services or guarantee credit outcomes.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5">
              Start $1 Trial <ArrowRight size={16} />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors">
              Book Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Feature Comparison</h2>
            <p className="text-lg text-slate-600">See how FixMy.Money compares to other credit repair software.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-6 py-4 font-bold text-slate-900">Feature</th>
                  <th className="text-center px-6 py-4 font-bold text-slate-900">FixMy.Money</th>
                  <th className="text-center px-6 py-4 font-bold text-slate-600">Other Platforms</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-6 py-4 text-slate-900 font-medium">{row.feature}</td>
                    <td className="text-center px-6 py-4">
                      {row.fixmy ? <Check size={20} className="text-green-600 mx-auto" /> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="text-center px-6 py-4">
                      {row.others ? <Check size={20} className="text-slate-400 mx-auto" /> : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Legal Disclaimer</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                FixMy.Money provides business software for credit repair professionals. We do not provide consumer credit repair services or guarantee credit outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to upgrade your credit repair software?</h2>
          <p className="text-slate-400 mb-8">Start your 14-day trial for $1. Full platform access. Cancel anytime.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all">
              Start $1 Trial <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="py-10 px-4 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 text-center">Explore FixMy.Money</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Credit Repair Software', href: '/credit-repair-software' },
              { label: 'Credit Repair Cloud Alternative', href: '/credit-repair-cloud-alternative' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Demo', href: '/demo' },
            ].map(link => (
              <Link key={link.href} href={link.href} className="text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
