import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Users, Zap, Brain, FileText, CreditCard, Target, Shield, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Credit Repair Software for Agencies | FixMy.Money',
  description: 'Credit repair software built for modern agencies. Manage clients, dispute workflows, billing, documents, and progress tracking from one organized workspace.',
  alternates: { canonical: 'https://fixmy.money/credit-repair-software' },
  openGraph: {
    title: 'Credit Repair Software for Agencies | FixMy.Money',
    description: 'Credit repair software built for modern agencies. Manage clients, dispute workflows, billing, documents, and progress tracking from one organized workspace.',
    url: 'https://fixmy.money/credit-repair-software',
  },
};

const features = [
  { icon: Brain, title: 'AI Credit Analysis', description: 'Upload credit reports and get instant AI-powered analysis identifying negative items and dispute strategies.' },
  { icon: Zap, title: 'Dispute Workflow Engine', description: 'Generate bureau-ready dispute letters for Equifax, Experian, and TransUnion with structured workflows.' },
  { icon: Users, title: 'Client CRM', description: 'Manage clients with organized profiles, dispute history, notes, tasks, and timelines.' },
  { icon: CreditCard, title: 'Stripe Native Billing', description: 'Charge clients automatically. Manage subscriptions, invoices, and payment history without leaving the platform.' },
  { icon: FileText, title: 'Document Storage', description: 'Secure cloud storage for credit reports, contracts, and dispute evidence with full audit trails.' },
  { icon: Target, title: 'Task Automation', description: 'Build automation rules for onboarding, disputes, and billing. Keep your team on schedule.' },
];

const faqs = [
  { q: 'What is credit repair software?', a: 'Credit repair software is business software that helps credit repair professionals manage clients, organize dispute workflows, store documents, handle billing, and track progress. FixMy.Money provides these tools for credit repair agencies and professionals.' },
  { q: 'Who is FixMy.Money for?', a: 'FixMy.Money is for credit repair professionals, agencies, consultants, and financial coaches who help clients manage their credit profiles. It is business software — not a consumer credit repair service.' },
  { q: 'Does FixMy.Money guarantee credit improvements?', a: 'No. FixMy.Money is software for credit repair professionals. We do not guarantee credit score improvements, item removals, or any specific credit outcomes. Results depend on individual circumstances and bureau responses.' },
  { q: 'Is FixMy.Money CROA compliant?', a: 'FixMy.Money provides CROA-aware workflows and tools to support your compliance process. Users are solely responsible for ensuring their business practices comply with CROA, FCRA, TSR, and all applicable laws. FixMy.Money does not provide legal advice.' },
  { q: 'How does FixMy.Money compare to Credit Repair Cloud?', a: 'FixMy.Money offers AI-powered credit analysis, AI dispute generation, modern dashboard, native Stripe billing, and lead intake forms — features not available in Credit Repair Cloud. See our full comparison at /credit-repair-cloud-alternative.' },
];

export default function CreditRepairSoftwarePage() {
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
            <Link href="/sign-up-login-screen?tab=register" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">Start Agency Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 to-[#0d1f3c] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Shield size={13} />
            Business Software for Credit Repair Professionals
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Credit repair software for modern agencies
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Manage clients, dispute workflows, billing, documents, and progress tracking from one organized workspace.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-3 mb-8 max-w-2xl mx-auto">
            <p className="text-xs text-slate-400">
              FixMy.Money provides business software for credit repair professionals. We do not provide consumer credit repair services or guarantee credit outcomes.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5">
              Start Agency Trial <ArrowRight size={16} />
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
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Everything your credit repair agency needs</h2>
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

      {/* Compliance Disclaimer */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Legal Disclaimer</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                FixMy.Money is not a law firm and does not provide legal advice. Users are responsible for their own contracts, disclosures, fees, client communications, and legal compliance with CROA, FCRA, TSR, and applicable state laws. We do not guarantee credit score improvements or item removals.
              </p>
              <Link href="/compliance" className="text-xs font-semibold text-amber-800 underline mt-2 inline-block">View Compliance Information →</Link>
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
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to organize your credit repair agency?</h2>
          <p className="text-slate-400 mb-8">Start your agency trial. Full platform access. Cancel anytime.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all">
              Start Agency Trial <ArrowRight size={16} />
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors">
              Book Demo
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
              { label: 'Credit Repair CRM', href: '/credit-repair-crm' },
              { label: 'Dispute Software', href: '/credit-repair-dispute-software' },
              { label: 'Client Portal', href: '/credit-repair-client-portal' },
              { label: 'Credit Repair Cloud Alternative', href: '/credit-repair-cloud-alternative' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Compliance', href: '/compliance' },
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