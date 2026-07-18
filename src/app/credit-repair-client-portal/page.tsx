import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Users, FileText, Shield, AlertTriangle, LayoutDashboard, CreditCard } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Credit Repair Client Portal Software | FixMy.Money',
  description: 'White-labeled client portal for credit repair agencies. Let clients track dispute progress, upload documents, and communicate with your team from one organized workspace.',
  alternates: { canonical: 'https://fixmy.money/credit-repair-client-portal' },
  openGraph: {
    title: 'Credit Repair Client Portal Software | FixMy.Money',
    description: 'White-labeled client portal for credit repair agencies. Let clients track dispute progress, upload documents, and communicate with your team.',
    url: 'https://fixmy.money/credit-repair-client-portal',
  },
};

const features = [
  { icon: LayoutDashboard, title: 'Client Progress Dashboard', description: 'Clients see their dispute status, documents, and next steps in a clean, organized dashboard.' },
  { icon: FileText, title: 'Document Upload', description: 'Clients upload credit reports, IDs, and supporting documents directly through their portal.' },
  { icon: Users, title: 'Communication Tools', description: 'Secure messaging between your team and clients, keeping all communication in one place.' },
  { icon: CreditCard, title: 'Payment Access', description: 'Clients can view invoices and payment history through their portal.' },
  { icon: Shield, title: 'White-Label Branding', description: 'Customize the portal with your agency branding for a professional client experience.' },
  { icon: CheckCircle2, title: 'Task Visibility', description: 'Clients see what tasks are pending, in progress, and completed — reducing support requests.' },
];

const faqs = [
  { q: 'What is a credit repair client portal?', a: 'A client portal is a secure, web-based workspace where your clients can log in to track their dispute progress, upload documents, view invoices, and communicate with your team. It reduces manual updates and improves the client experience.' },
  { q: 'Is the portal white-labeled?', a: 'Yes. The Agency plan includes white-label branding so you can customize the portal with your agency name and branding.' },
  { q: 'Does the portal guarantee credit improvements?', a: 'No. The portal is a communication and tracking tool. FixMy.Money does not guarantee credit score improvements, item removals, or any specific credit outcomes.' },
  { q: 'How do clients access the portal?', a: 'Clients receive an invitation email with a secure login link. They can access their portal from any device without installing software.' },
];

export default function CreditRepairClientPortalPage() {
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
            Credit repair client portal for agencies
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Give your clients a professional portal to track dispute progress, upload documents, and stay informed — without constant manual updates from your team.
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
          <h2 className="text-3xl font-extrabold text-slate-900 mb-10 text-center">Portal features for credit repair agencies</h2>
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
                FixMy.Money is not a law firm and does not provide legal advice. Users are responsible for their own contracts, disclosures, and legal compliance. We do not guarantee credit score improvements or item removals.
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
          <h2 className="text-3xl font-extrabold text-white mb-4">Give your clients a professional portal</h2>
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
              { label: 'Dispute Software', href: '/credit-repair-dispute-software' },
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
