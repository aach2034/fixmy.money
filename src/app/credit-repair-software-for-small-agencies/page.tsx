import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Zap, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { PLANS } from '@/lib/stripe/plans';

export const metadata: Metadata = {
  title: 'Credit Repair Software for Small Agencies | FixMy.Money',
  description: 'Affordable credit repair software for small agencies and solo operators. Manage clients, disputes, and billing. 14-day trial for $1.',
  keywords: ['small agency software', 'solo operator software', 'affordable credit repair software', 'small business software'],
  openGraph: {
    title: 'Credit Repair Software for Small Agencies | FixMy.Money',
    description: 'Affordable credit repair software for small agencies and solo operators.',
    type: 'website',
    url: 'https://fixmy.money/credit-repair-software-for-small-agencies',
    siteName: 'FixMy.Money',
    images: [{ url: "https://img.rocket.new/generatedImages/rocket_gen_img_1fe9e3f89-1766939132002.png", width: 1200, height: 630, alt: 'Small Agency Software' }]
  },
  alternates: { canonical: 'https://fixmy.money/credit-repair-software-for-small-agencies' }
};

const faqs = [
{ q: 'What plan is best for small agencies?', a: `Starter ($${PLANS.starter.monthlyPrice}/mo) for individual workflows and Pro ($${PLANS.professional.monthlyPrice}/mo) for growing agencies.` },
{ q: 'Can I upgrade later?', a: 'Yes. Upgrade anytime. You\'ll only pay the difference for the remainder of your billing cycle.' },
{ q: 'What if I outgrow my plan?', a: 'Upgrade to Professional or Agency plan as you grow. No penalties or long-term contracts.' },
{ q: 'Is there a discount for annual billing?', a: 'Yes. Save 20% with annual billing on all plans.' }];


export default function SmallAgencySoftwarePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">FixMy.Money</Link>
          <div className="flex gap-3">
            <Link href="/pricing" className="text-sm font-medium text-slate-700 hover:text-slate-900">Pricing</Link>
            <Link href="/demo-mode" className="text-sm font-medium text-slate-700 hover:text-slate-900">Demo</Link>
          </div>
        </div>
      </header>

      <div>
        {/* Hero */}
        <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-2 rounded-full mb-6">
              <Zap size={14} />
              Affordable Pricing
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
              Credit Repair Software for Small Agencies
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Affordable, scalable software for solo operators and small agencies. Start at {PLANS.starter.monthlyPrice === null ? 'custom pricing' : `$${PLANS.starter.monthlyPrice}/month`}. No long-term contracts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup?plan=starter" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-colors">
                Start $1 Trial
              </Link>
              <Link href="/pricing" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl border border-white/20 transition-colors">
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Plans for Every Stage</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
              { name: PLANS.starter.name, id: PLANS.starter.id, price: `$${PLANS.starter.monthlyPrice}/mo`, clients: `Up to ${PLANS.starter.maxClients} profiles`, team: `${PLANS.starter.maxTeamMembers} user`, features: PLANS.starter.features.slice(3, 8) },
              { name: PLANS.professional.name, id: PLANS.professional.id, price: `$${PLANS.professional.monthlyPrice}/mo`, clients: `Up to ${PLANS.professional.maxClients} active clients`, team: `Up to ${PLANS.professional.maxTeamMembers} team members`, features: PLANS.professional.features.slice(3, 8) }].
              map((plan, i) =>
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-3xl font-extrabold text-blue-600 mb-4">{plan.price}</p>
                  <p className="text-sm text-slate-600 mb-4">{plan.clients} • {plan.team}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) =>
                  <li key={j} className="flex items-center gap-2 text-sm text-slate-700">
                        <Check size={16} className="text-emerald-600" />
                        {f}
                      </li>
                  )}
                  </ul>
                  <Link href={`/signup?plan=${plan.id}`} className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg transition-colors">
                    Start $1 Trial
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqs.map((faq, i) =>
              <div key={i} className="border-b border-slate-200 pb-6 last:border-0">
                  <h3 className="font-bold text-slate-900 mb-2">{faq.q}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="py-12 bg-amber-50 border-t border-amber-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 mb-2">Legal Disclaimer</p>
                <p className="text-sm text-amber-700 leading-relaxed">
                  FixMy.Money provides business software for credit repair professionals. We do not provide consumer credit repair services, legal advice, or guarantee credit outcomes. Users are responsible for complying with CROA, FCRA, TSR, and applicable state laws.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-blue-600">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Start your agency today</h2>
            <p className="text-lg text-blue-50 mb-8">14-day trial for $1. Payment method required. Cancel anytime.</p>
            <Link href="/signup?plan=starter" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-blue-600 font-bold px-8 py-4 rounded-xl transition-colors">
              Start $1 Trial <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>);

}
