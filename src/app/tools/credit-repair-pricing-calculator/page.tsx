import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Credit Repair Pricing Calculator | Free Tool | FixMy.Money',
  description: 'Calculate competitive pricing for your credit repair services. Free tool to help you set pricing based on service type and market conditions.',
  alternates: { canonical: 'https://fixmy.money/tools/credit-repair-pricing-calculator' },
  openGraph: {
    title: 'Credit Repair Pricing Calculator | Free Tool | FixMy.Money',
    description: 'Calculate competitive pricing for your credit repair services with our free tool.',
    url: 'https://fixmy.money/tools/credit-repair-pricing-calculator',
    type: 'website',
  },
};

export default function PricingCalculatorPage() {
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
            Credit repair pricing calculator
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Set competitive pricing for your credit repair services.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-3 mb-8 max-w-2xl mx-auto">
            <p className="text-xs text-slate-400">
              This is an educational tool. Pricing should comply with CROA and reflect your market conditions.
            </p>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Service Pricing Guide</h2>
            <div className="space-y-4">
              {[
                { service: 'Initial Consultation', range: '$0 - $100' },
                { service: 'Monthly Service Fee', range: '$50 - $200' },
                { service: 'Dispute Package (3 bureaus)', range: '$100 - $300' },
                { service: 'Credit Report Analysis', range: '$50 - $150' },
                { service: 'Full Agency Package', range: '$150 - $500/month' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center pb-4 border-b border-slate-100 last:border-0">
                  <span className="text-slate-700 font-medium">{item.service}</span>
                  <span className="text-slate-600 text-sm">{item.range}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t-2 border-slate-200">
              <p className="text-sm text-slate-600 leading-relaxed">
                Pricing varies based on your market, competition, service quality, and business model. Consider your operating costs, desired profit margin, and client acquisition costs when setting prices.
              </p>
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
              <p className="text-sm font-bold text-amber-800 mb-1">Legal Disclaimer</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                This calculator provides educational estimates. Pricing must comply with CROA regulations. Consult with a qualified attorney regarding CROA pricing requirements and restrictions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Manage your pricing with FixMy.Money</h2>
          <p className="text-slate-400 mb-8">Software to automate billing and track revenue from your credit repair business.</p>
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
              { label: 'Resources', href: '/resources' },
              { label: 'Billing Software', href: '/credit-repair-billing-software' },
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