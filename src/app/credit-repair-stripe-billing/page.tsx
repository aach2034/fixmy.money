import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, ArrowRight, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Credit Repair Stripe Billing Software | FixMy.Money',
  description: 'Automate billing for credit repair agencies with Stripe integration. Charge clients, manage subscriptions, and track revenue from one platform. 14-day trial for $1.',
  keywords: ['credit repair billing', 'stripe billing', 'credit repair software', 'automated billing'],
  openGraph: {
    title: 'Credit Repair Stripe Billing Software | FixMy.Money',
    description: 'Automate billing for credit repair agencies with Stripe integration.',
    type: 'website',
    url: 'https://fixmy.money/credit-repair-stripe-billing',
    siteName: 'FixMy.Money',
    images: [{ url: "https://img.rocket.new/generatedImages/rocket_gen_img_115a00760-1780769564564.png", width: 1200, height: 630, alt: 'Credit Repair Stripe Billing' }]
  },
  alternates: { canonical: 'https://fixmy.money/credit-repair-stripe-billing' }
};

const faqs = [
{ q: 'How does Stripe billing work in FixMy.Money?', a: 'FixMy.Money integrates with Stripe to charge clients automatically. Set up recurring billing, send invoices, and track payments without leaving the platform.' },
{ q: 'Can I charge different amounts to different clients?', a: 'Yes. Set custom pricing per client or use plan-based pricing. Stripe handles all payment processing securely.' },
{ q: 'What payment methods does Stripe support?', a: 'Stripe supports credit cards, debit cards, and other payment methods. All payments are PCI-compliant and secure.' },
{ q: 'Can I export billing records?', a: 'Yes. Agency plan includes data export. Export invoices, payments, and revenue reports for accounting and compliance.' }];


export default function CreditRepairStripeBillingPage() {
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
              <CreditCard size={14} />
              Stripe Billing Integration
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
              Credit Repair Billing Software with Stripe
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Automate client billing, manage subscriptions, and track revenue without manual invoicing or payment chasing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-colors">
                Start $1 Trial
              </Link>
              <Link href="/demo-mode" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl border border-white/20 transition-colors">
                View Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Stripe Billing Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
              { title: 'Automated Recurring Billing', desc: 'Charge clients automatically on a schedule. No manual invoicing.' },
              { title: 'Subscription Management', desc: 'Create, modify, and cancel subscriptions from the platform.' },
              { title: 'Payment Tracking', desc: 'See all payments, failed charges, and refunds in one dashboard.' },
              { title: 'Revenue Reports', desc: 'Track MRR, churn, and revenue trends with built-in analytics.' },
              { title: 'Invoice Management', desc: 'Send custom invoices and track payment status per client.' },
              { title: 'Secure Payments', desc: 'PCI-compliant, encrypted payment processing via Stripe.' }].
              map((f, i) =>
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-600">{f.desc}</p>
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
            <h2 className="text-3xl font-bold text-white mb-4">Ready to automate your billing?</h2>
            <p className="text-lg text-blue-50 mb-8">Start your 14-day trial for $1 today. Payment method required.</p>
            <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-blue-600 font-bold px-8 py-4 rounded-xl transition-colors">
              Start $1 Trial <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>);

}
