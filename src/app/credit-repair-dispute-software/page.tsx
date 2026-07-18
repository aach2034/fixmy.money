import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Users, FileText, Shield, AlertTriangle, GitBranch, Zap, Brain } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Credit Repair Dispute Software | FixMy.Money',
  description: 'Credit repair dispute software for agencies. Generate bureau-ready dispute letters, track responses, and manage dispute workflows for Equifax, Experian, and TransUnion.',
  alternates: { canonical: 'https://fixmy.money/credit-repair-dispute-software' },
  openGraph: {
    title: 'Credit Repair Dispute Software | FixMy.Money',
    description: 'Generate bureau-ready dispute letters, track responses, and manage dispute workflows for Equifax, Experian, and TransUnion.',
    url: 'https://fixmy.money/credit-repair-dispute-software',
  },
};

const features = [
  { icon: Brain, title: 'AI Dispute Letter Generation', description: 'AI generates bureau-ready dispute letters for each negative item identified in a credit report.' },
  { icon: GitBranch, title: 'Dispute Workflow Tracking', description: 'Track every dispute from submission to bureau response with organized status updates.' },
  { icon: Zap, title: 'Multi-Bureau Support', description: 'Manage disputes across Equifax, Experian, and TransUnion from one organized workspace.' },
  { icon: FileText, title: 'Response Logging', description: 'Log bureau responses, outcomes, and next steps for every dispute item.' },
  { icon: Users, title: 'Client-Facing Updates', description: 'Keep clients informed through their portal without manual status emails.' },
  { icon: Shield, title: 'Audit Trail', description: 'Full audit trail of all dispute activity for compliance documentation purposes.' },
];

const faqs = [
  { q: 'What is credit repair dispute software?', a: 'Credit repair dispute software helps credit repair professionals manage the dispute process — generating letters, tracking submissions, logging bureau responses, and organizing client dispute history. FixMy.Money provides these tools for credit repair agencies.' },
  { q: 'Does FixMy.Money guarantee dispute results?', a: 'No. FixMy.Money provides tools to help you manage the dispute process. We do not guarantee that disputes will result in item removals, credit score improvements, or any specific outcomes. Results depend on individual circumstances and bureau responses.' },
  { q: 'What bureaus does FixMy.Money support?', a: 'FixMy.Money supports dispute workflows for Equifax, Experian, and TransUnion.' },
  { q: 'Is the dispute software CROA-aware?', a: 'FixMy.Money provides CROA-aware workflows and documentation tools to support your compliance process. Users are solely responsible for ensuring their business practices comply with CROA, FCRA, TSR, and all applicable laws.' },
];

export default function CreditRepairDisputeSoftwarePage() {
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

      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/demo" className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-xl">Book Demo</Link>
            <Link href="/sign-up-login-screen?tab=register" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">Start Agency Trial</Link>
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-br from-slate-950 to-[#0d1f3c] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Credit repair dispute software for agencies
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Generate dispute letters, track bureau responses, and manage dispute workflows for all three bureaus from one organized workspace.
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

      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-10 text-center">Dispute workflow tools for credit repair agencies</h2>
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

      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Legal Disclaimer</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                FixMy.Money is not a law firm and does not provide legal advice. Users are responsible for their own contracts, disclosures, and legal compliance. We do not guarantee credit score improvements, item removals, or any specific credit outcomes.
              </p>
              <Link href="/compliance" className="text-xs font-semibold text-amber-800 underline mt-2 inline-block">View Compliance Information →</Link>
            </div>
          </div>
        </div>
      </section>

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

      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Organize your dispute workflows</h2>
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

      <section className="py-10 px-4 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 text-center">Explore FixMy.Money</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Credit Repair Software', href: '/credit-repair-software' },
              { label: 'Credit Repair CRM', href: '/credit-repair-crm' },
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
