import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How to Start a Credit Repair Business | Step-by-Step Guide | FixMy.Money',
  description: 'Learn how to start a credit repair business. Step-by-step guide covering business setup, compliance, tools, and client acquisition. FixMy.Money provides the software to manage your business.',
  alternates: { canonical: 'https://fixmy.money/how-to-start-a-credit-repair-business' },
  openGraph: {
    title: 'How to Start a Credit Repair Business | Step-by-Step Guide | FixMy.Money',
    description: 'Learn how to start a credit repair business. Step-by-step guide covering business setup, compliance, tools, and client acquisition.',
    url: 'https://fixmy.money/how-to-start-a-credit-repair-business',
    type: 'website',
  },
};

const steps = [
  {
    num: 1,
    title: 'Understand the Regulations',
    description: 'Learn about CROA, FCRA, TSR, and state-specific credit repair laws. Consult with a qualified attorney to ensure compliance.'
  },
  {
    num: 2,
    title: 'Set Up Your Business',
    description: 'Choose a business structure (LLC, S-Corp, etc.), register your business, and obtain necessary licenses and permits.'
  },
  {
    num: 3,
    title: 'Create Your Service Offerings',
    description: 'Define your service packages, pricing, and client agreements. Ensure all disclosures comply with CROA and FCRA.'
  },
  {
    num: 4,
    title: 'Set Up Your Operations',
    description: 'Choose credit repair software, set up billing, create client intake processes, and establish document management systems.'
  },
  {
    num: 5,
    title: 'Build Your Client Base',
    description: 'Develop marketing strategies, build your online presence, and establish partnerships to acquire clients.'
  },
];

export default function HowToStartCreditRepairBusinessPage() {
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
            How to start a credit repair business
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            A step-by-step guide to launching your credit repair agency.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-3 mb-8 max-w-2xl mx-auto">
            <p className="text-xs text-slate-400">
              This guide provides educational information. Consult with a qualified attorney for legal advice on starting a credit repair business.
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">5 Steps to Launch Your Credit Repair Business</h2>
          </div>
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.num} className="bg-white rounded-2xl border border-slate-200 p-8 flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 text-white font-bold text-lg">
                    {step.num}
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why FixMy.Money */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Why FixMy.Money for Your Credit Repair Business</h2>
            <p className="text-lg text-slate-600">Software designed specifically for credit repair professionals.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: 'Client Management', desc: 'Organize clients, track disputes, manage notes and tasks.' },
              { title: 'Dispute Automation', desc: 'Generate dispute letters and manage workflows automatically.' },
              { title: 'Billing & Payments', desc: 'Stripe-native billing with automated invoicing and payment tracking.' },
              { title: 'Document Storage', desc: 'Secure cloud storage for credit reports, contracts, and evidence.' },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                </div>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Legal Disclaimer</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                FixMy.Money provides business software for credit repair professionals. We do not provide legal advice. Consult with a qualified attorney regarding CROA, FCRA, TSR, and state-specific credit repair laws before starting your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to launch your credit repair business?</h2>
          <p className="text-slate-400 mb-8">Start your 14-day trial for $1. Full platform access. Cancel anytime.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all">
              Start $1 Trial <ArrowRight size={16} />
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
              { label: 'Credit Repair Software', href: '/credit-repair-software' },
              { label: 'Resources', href: '/resources' },
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