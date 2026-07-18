import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Credit Repair Business Startup Cost Calculator | Free Tool | FixMy.Money',
  description: 'Calculate the startup costs for your credit repair business. Free tool to estimate licensing, software, marketing, and operational expenses.',
  alternates: { canonical: 'https://fixmy.money/tools/credit-repair-business-startup-cost-calculator' },
  openGraph: {
    title: 'Credit Repair Business Startup Cost Calculator | Free Tool | FixMy.Money',
    description: 'Calculate startup costs for your credit repair business with our free calculator.',
    url: 'https://fixmy.money/tools/credit-repair-business-startup-cost-calculator',
    type: 'website',
  },
};

export default function StartupCostCalculatorPage() {
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
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Credit repair business startup cost calculator
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Estimate the costs to launch your credit repair agency.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-3 mb-8 max-w-2xl mx-auto">
            <p className="text-xs text-slate-400">
              This is an educational tool. Actual costs will vary based on your location and business model.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Startup Cost Breakdown</h2>
            <div className="space-y-4">
              {[
                { label: 'Business Registration & Licensing', range: '$500 - $2,000' },
                { label: 'Credit Repair Software (Annual)', range: '$1,200 - $5,000' },
                { label: 'Website & Domain', range: '$200 - $1,000' },
                { label: 'Marketing & Advertising', range: '$1,000 - $5,000' },
                { label: 'Office Setup (if needed)', range: '$0 - $3,000' },
                { label: 'Legal Consultation', range: '$500 - $2,000' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center pb-4 border-b border-slate-100 last:border-0">
                  <span className="text-slate-700 font-medium">{item.label}</span>
                  <span className="text-slate-600 text-sm">{item.range}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t-2 border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-slate-900">Total Estimated Range</span>
                <span className="text-2xl font-bold text-blue-600">$3,400 - $18,000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Disclaimer</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                This calculator provides estimates for educational purposes. Actual startup costs will vary based on your location, business model, and specific circumstances. Consult with a business advisor for accurate financial planning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to launch your credit repair business?</h2>
          <p className="text-slate-400 mb-8">FixMy.Money provides the software to manage your agency efficiently.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all">
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link href="/resources" className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors">
              View Resources
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
              { label: 'Resources', href: '/resources' },
              { label: 'How to Start', href: '/how-to-start-a-credit-repair-business' },
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