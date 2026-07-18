import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, ArrowRight, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Credit Repair Software with Client Login | FixMy.Money',
  description: 'Credit repair software with secure client login portal. Clients track disputes, upload documents, and communicate with your team. 14-day trial for $1.',
  keywords: ['client login', 'client portal', 'credit repair portal', 'secure portal'],
  openGraph: {
    title: 'Credit Repair Software with Client Login | FixMy.Money',
    description: 'Credit repair software with secure client login portal.',
    type: 'website',
    url: 'https://fixmy.money/credit-repair-software-with-client-login',
    siteName: 'FixMy.Money',
    images: [{ url: "https://img.rocket.new/generatedImages/rocket_gen_img_15167a2a1-1769645744805.png", width: 1200, height: 630, alt: 'Client Login Portal' }]
  },
  alternates: { canonical: 'https://fixmy.money/credit-repair-software-with-client-login' }
};

const faqs = [
{ q: 'How do clients access the portal?', a: 'Clients receive an invitation email with a secure login link. They can access from any device without installing software.' },
{ q: 'What can clients see in their portal?', a: 'Dispute status, documents, communication history, and progress updates. They cannot see other clients\' data.' },
{ q: 'Is the portal secure?', a: 'Yes. Enterprise-grade encryption, secure data isolation, and role-based access controls.' },
{ q: 'Can I customize the portal branding?', a: 'Yes. Agency plan includes white-label branding with your logo and colors.' }];


export default function ClientLoginPage() {
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
              <Lock size={14} />
              Secure Client Portal
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
              Credit Repair Software with Client Login
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Secure client portal where clients track disputes, upload documents, and communicate with your team. Reduce manual updates and improve satisfaction.
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
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Client Portal Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
              { title: 'Secure Login', desc: 'Clients log in with email and password. Two-factor authentication available.' },
              { title: 'Dispute Tracking', desc: 'Real-time status updates on disputes sent to bureaus.' },
              { title: 'Document Upload', desc: 'Clients upload credit reports and supporting documents securely.' },
              { title: 'Communication', desc: 'Clients message your team directly through the portal.' },
              { title: 'Progress Reports', desc: 'Clients see their progress and dispute outcomes.' },
              { title: 'Mobile Responsive', desc: 'Works on all devices. Clients access from phone, tablet, or desktop.' }].
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
            <h2 className="text-3xl font-bold text-white mb-4">Give your clients a better experience</h2>
            <p className="text-lg text-blue-50 mb-8">Start your 14-day trial for $1 today. Payment method required.</p>
            <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-blue-600 font-bold px-8 py-4 rounded-xl transition-colors">
              Start $1 Trial <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    </div>);

}