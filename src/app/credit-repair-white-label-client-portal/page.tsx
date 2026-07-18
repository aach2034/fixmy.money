import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe, ArrowRight, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'White-Label Credit Repair Client Portal | FixMy.Money',
  description: 'White-label client portal for credit repair agencies. Customize branding, track disputes, upload documents. 14-day free trial.',
  keywords: ['white-label portal', 'client portal', 'credit repair portal', 'white-label software'],
  openGraph: {
    title: 'White-Label Credit Repair Client Portal | FixMy.Money',
    description: 'White-label client portal for credit repair agencies.',
    type: 'website',
    url: 'https://fixmy.money/credit-repair-white-label-client-portal',
    siteName: 'FixMy.Money',
    images: [{ url: "https://img.rocket.new/generatedImages/rocket_gen_img_1afadffe1-1771181949240.png", width: 1200, height: 630, alt: 'White-Label Portal' }]
  },
  alternates: { canonical: 'https://fixmy.money/credit-repair-white-label-client-portal' }
};

const faqs = [
{ q: 'What can I customize in the white-label portal?', a: 'Logo, colors, domain, and branding. Clients see your agency name, not FixMy.Money.' },
{ q: 'Can clients track their own disputes?', a: 'Yes. Clients log in to see their dispute status, upload documents, and communicate with your team.' },
{ q: 'Is the portal secure?', a: 'Yes. Enterprise-grade encryption, role-based access, and secure data isolation per client.' },
{ q: 'Can I use my own domain?', a: 'Yes. Agency plan includes custom domain support for your white-label portal.' }];


export default function WhiteLabelPortalPage() {
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

      <main>
        {/* Hero */}
        <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-2 rounded-full mb-6">
              <Globe size={14} />
              White-Label Portal
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
              White-Label Credit Repair Client Portal
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Branded client portal with your agency name, logo, and colors. Clients track disputes, upload documents, and communicate with your team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup?plan=agency" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-colors">
                Start Free Trial
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
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">White-Label Portal Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
              { title: 'Full Branding Control', desc: 'Customize logo, colors, domain, and messaging.' },
              { title: 'Client Dashboard', desc: 'Clients see their dispute status, documents, and communication history.' },
              { title: 'Document Upload', desc: 'Clients upload credit reports and supporting documents securely.' },
              { title: 'Dispute Tracking', desc: 'Real-time status updates on disputes sent to bureaus.' },
              { title: 'Secure Messaging', desc: 'Clients communicate with your team through the portal.' },
              { title: 'Custom Domain', desc: 'Use your own domain for the client portal (Agency plan).' }].
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
            <h2 className="text-3xl font-bold text-white mb-4">Build your branded client portal</h2>
            <p className="text-lg text-blue-50 mb-8">Start your 14-day free trial today. No credit card required.</p>
            <Link href="/signup?plan=agency" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-blue-600 font-bold px-8 py-4 rounded-xl transition-colors">
              Start Free Trial <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    </div>);

}