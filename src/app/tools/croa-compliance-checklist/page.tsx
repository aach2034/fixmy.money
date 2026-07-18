import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'CROA Compliance Checklist | Free Tool | FixMy.Money',
  description: 'Free CROA compliance checklist for credit repair agencies. Ensure your business practices comply with CROA regulations.',
  alternates: { canonical: 'https://fixmy.money/tools/croa-compliance-checklist' },
  openGraph: {
    title: 'CROA Compliance Checklist | Free Tool | FixMy.Money',
    description: 'Free CROA compliance checklist for credit repair agencies.',
    url: 'https://fixmy.money/tools/croa-compliance-checklist',
    type: 'website',
  },
};

const checklist = [
  'Written service agreement provided before payment',
  'Clear pricing and payment terms disclosed',
  'No payment collected before services rendered',
  'Client right to cancel within 3 days disclosed',
  'No guaranteed results promised',
  'No false or misleading statements made',
  'Credit reports obtained with proper authorization',
  'Client communications documented',
  'Dispute letters accurate and truthful',
  'Compliance documentation retained for 3+ years',
];

export default function CROAComplianceChecklistPage() {
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
            CROA compliance checklist
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Ensure your credit repair business complies with CROA regulations.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-3 mb-8 max-w-2xl mx-auto">
            <p className="text-xs text-slate-400">
              This checklist is for educational purposes. Consult with a qualified attorney for legal compliance guidance.
            </p>
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">CROA Compliance Checklist</h2>
            <div className="space-y-3">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 mt-0.5" />
                  <label className="text-slate-700">{item}</label>
                </div>
              ))}
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
                This checklist is for educational purposes only. CROA compliance is complex and varies by state. FixMy.Money is not a law firm and does not provide legal advice. Consult with a qualified attorney to ensure your business practices comply with all applicable laws.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Build your credit repair business with compliance in mind</h2>
          <p className="text-slate-400 mb-8">FixMy.Money provides CROA-aware workflows and compliance tools.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all">
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link href="/compliance" className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors">
              Compliance Info
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
              { label: 'CROA Compliance Software', href: '/croa-compliance-credit-repair-software' },
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