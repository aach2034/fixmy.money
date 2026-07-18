import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Shield, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Free Credit Repair Business Starter Kit | FixMy.Money',
  description: 'Download the free credit repair business starter kit. Templates, checklists, and resources to help you launch your credit repair agency.',
  alternates: { canonical: 'https://fixmy.money/free-credit-repair-business-starter-kit' },
  openGraph: {
    title: 'Free Credit Repair Business Starter Kit | FixMy.Money',
    description: 'Download the free credit repair business starter kit with templates and resources.',
    url: 'https://fixmy.money/free-credit-repair-business-starter-kit',
    type: 'website',
  },
};

const resources = [
  { title: 'Business Setup Checklist', desc: 'Essential steps to legally establish your credit repair business.' },
  { title: 'Service Agreement Template', desc: 'Professional service agreement template for credit repair clients.' },
  { title: 'Pricing Strategy Guide', desc: 'Guide to pricing your credit repair services competitively.' },
  { title: 'Client Intake Form', desc: 'Comprehensive client intake form for credit repair agencies.' },
];

export default function FreeStarterKitPage() {
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
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Shield size={13} />
            Free Resource
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Free credit repair business starter kit
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Templates, checklists, and resources to launch your credit repair agency.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-3 mb-8 max-w-2xl mx-auto">
            <p className="text-xs text-slate-400">
              FixMy.Money provides business software for credit repair professionals. We do not provide legal advice.
            </p>
          </div>
          <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all hover:-translate-y-0.5">
            Get Free Starter Kit <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Resources */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">What's Included</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {resources.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all">
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
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
                FixMy.Money provides business software for credit repair professionals. We do not provide legal advice. Consult with a qualified attorney regarding CROA, FCRA, TSR, and state-specific laws.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Start building your credit repair business today</h2>
          <p className="text-slate-400 mb-8">Get the free starter kit plus full platform access with your trial.</p>
          <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all">
            Get Free Starter Kit <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Internal Links */}
      <section className="py-10 px-4 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 text-center">Explore FixMy.Money</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Resources', href: '/resources' },
              { label: 'How to Start', href: '/how-to-start-a-credit-repair-business' },
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