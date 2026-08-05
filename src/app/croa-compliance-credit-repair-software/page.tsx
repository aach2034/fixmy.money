import type { Metadata } from 'next';
import { createSeoMetadata } from "@/lib/seo/config";
import Link from 'next/link';
import { ArrowRight, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export const metadata: Metadata = createSeoMetadata("/croa-compliance-credit-repair-software");

const features = [
  { icon: CheckCircle, title: 'CROA-Aware Workflows', description: 'Built-in workflows designed to support CROA compliance practices.' },
  { icon: Shield, title: 'Document Management', description: 'Organize and store contracts, disclosures, and client communications.' },
  { icon: CheckCircle, title: 'Audit Trails', description: 'Full audit trails for all client interactions and billing activities.' },
];

export default function CROAComplianceCreditRepairSoftwarePage() {
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
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Shield size={13} />
            Compliance-Aware Business Software
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            CROA compliance credit repair software
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Manage your credit repair business with CROA-aware workflows and compliance tools.
          </p>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-5 py-3 mb-8 max-w-2xl mx-auto">
            <p className="text-xs text-slate-400">
              FixMy.Money provides business software for credit repair professionals. We do not provide legal advice. Users are responsible for compliance with CROA, FCRA, TSR, and applicable laws.
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
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Compliance-aware tools for credit repair agencies</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Support your compliance process with built-in workflows and audit trails.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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

      {/* Compliance Info */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-2">Important Legal Notice</p>
              <p className="text-sm text-amber-700 leading-relaxed mb-3">
                FixMy.Money is not a law firm and does not provide legal advice. We provide business software with CROA-aware workflows to support your compliance process.
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                Users are solely responsible for ensuring their business practices comply with CROA, FCRA, TSR, and all applicable federal and state laws. Consult with a qualified attorney for legal guidance.
              </p>
              <Link href="/compliance" className="text-xs font-semibold text-amber-800 underline mt-2 inline-block">View Compliance Information →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Build your credit repair business with confidence</h2>
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
              { label: 'Compliance', href: '/compliance' },
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