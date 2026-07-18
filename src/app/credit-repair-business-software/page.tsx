import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Users, Zap, Brain, FileText, CreditCard, Target, Shield, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Credit Repair Business Software | Agencies & Professionals | FixMy.Money',
  description: 'Business software for credit repair agencies. Manage clients, disputes, billing, and documents. Built for professionals who help clients manage credit profiles.',
  alternates: { canonical: 'https://fixmy.money/credit-repair-business-software' },
  openGraph: {
    title: 'Credit Repair Business Software | Agencies & Professionals | FixMy.Money',
    description: 'Business software for credit repair agencies. Manage clients, disputes, billing, and documents.',
    url: 'https://fixmy.money/credit-repair-business-software',
    type: 'website',
  },
};

const features = [
  { icon: Users, title: 'Client Management', description: 'Organize client profiles, track dispute history, manage notes and tasks.' },
  { icon: Zap, title: 'Dispute Automation', description: 'Generate dispute letters and manage workflows for all three bureaus.' },
  { icon: CreditCard, title: 'Billing & Payments', description: 'Stripe-native billing, subscriptions, invoices, and payment tracking.' },
  { icon: FileText, title: 'Document Storage', description: 'Secure cloud storage for credit reports, contracts, and evidence.' },
  { icon: Brain, title: 'AI Analysis', description: 'Upload credit reports and get AI-powered analysis of negative items.' },
  { icon: Target, title: 'Task Automation', description: 'Build automation rules for onboarding, disputes, and billing workflows.' },
];

const faqs = [
  { q: 'What is credit repair business software?', a: 'Credit repair business software helps agencies and professionals manage their operations: client relationships, dispute workflows, billing, documents, and progress tracking. FixMy.Money is designed for B2B use by credit repair professionals.' },
  { q: 'Who should use FixMy.Money?', a: 'FixMy.Money is for credit repair agencies, consultants, coaches, and financial professionals who manage credit repair services for clients. It is not a consumer credit repair service.' },
  { q: 'Does FixMy.Money guarantee credit improvements?', a: 'No. FixMy.Money is business software. We do not guarantee credit score improvements, item removals, or any credit outcomes. Results depend on individual circumstances and bureau responses.' },
  { q: 'Is FixMy.Money CROA compliant?', a: 'FixMy.Money provides CROA-aware workflows. Users are responsible for ensuring their business practices comply with CROA, FCRA, TSR, and all applicable laws. FixMy.Money does not provide legal advice.' },
];

export default function CreditRepairBusinessSoftwarePage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
          })
        }}
      />

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
            Credit repair business software for growing agencies
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Manage clients, disputes, billing, and documents from one organized platform.
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

      {/* Features */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Everything your agency needs to scale</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">One platform replacing 5+ disconnected tools.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(feat => {
              const FeatIcon = feat.icon;
              return (
                <div key={feat.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <FeatIcon size={20} className="text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 text-sm">{feat.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
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
                FixMy.Money provides business software for credit repair professionals. We do not provide consumer credit repair services or guarantee credit outcomes. Users are responsible for compliance with CROA, FCRA, TSR, and applicable laws.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map(faq => (
              <div key={faq.q} className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-2 text-sm">{faq.q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to scale your credit repair business?</h2>
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
              { label: 'Credit Repair CRM', href: '/credit-repair-crm' },
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