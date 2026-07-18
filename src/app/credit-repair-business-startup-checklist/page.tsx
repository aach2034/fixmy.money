import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Check, ArrowRight, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Credit Repair Business Startup Checklist | FixMy.Money',
  description: 'Complete checklist for starting a credit repair business. Legal requirements, licensing, compliance, and first steps. Free guide.',
  keywords: ['startup checklist', 'start credit repair business', 'business requirements', 'compliance checklist'],
  openGraph: {
    title: 'Credit Repair Business Startup Checklist | FixMy.Money',
    description: 'Complete checklist for starting a credit repair business.',
    type: 'website',
    url: 'https://fixmy.money/credit-repair-business-startup-checklist',
    siteName: 'FixMy.Money',
    images: [{ url: "https://img.rocket.new/generatedImages/rocket_gen_img_1a8964998-1766505772787.png", width: 1200, height: 630, alt: 'Startup Checklist' }]
  },
  alternates: { canonical: 'https://fixmy.money/credit-repair-business-startup-checklist' }
};

const checklist = [
{ title: 'Business Registration', items: ['Choose business structure (LLC, S-Corp, etc.)', 'Register business name', 'Get EIN from IRS', 'Open business bank account'] },
{ title: 'Legal & Compliance', items: ['Understand CROA requirements', 'Review FCRA and TSR rules', 'Check state-specific regulations', 'Consult with attorney'] },
{ title: 'Bonding & Insurance', items: ['Get surety bond (if required by state)', 'Obtain E&O insurance', 'Get general liability insurance', 'Document all policies'] },
{ title: 'Operations Setup', items: ['Choose software platform', 'Set up client intake process', 'Create service agreements', 'Establish billing system'] }];


export default function StartupChecklistPage() {
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
              <BookOpen size={14} />
              Free Resource
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
              Credit Repair Business Startup Checklist
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Complete checklist for starting a credit repair business. Legal requirements, compliance, bonding, and operations setup.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup?plan=starter" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-colors">
                Start Free Trial
              </Link>
              <Link href="/demo-mode" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl border border-white/20 transition-colors">
                View Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Checklist */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Startup Checklist</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {checklist.map((section, i) =>
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-900 mb-4 text-lg">{section.title}</h3>
                  <ul className="space-y-3">
                    {section.items.map((item, j) =>
                  <li key={j} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700">{item}</span>
                      </li>
                  )}
                  </ul>
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
                  This checklist is educational only and does not constitute legal advice. Consult with a qualified attorney for legal guidance specific to your state and business. FixMy.Money provides business software for credit repair professionals only.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-blue-600">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to start your credit repair business?</h2>
            <p className="text-lg text-blue-50 mb-8">Use FixMy.Money to manage clients, disputes, and compliance from day one.</p>
            <Link href="/signup?plan=starter" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-blue-600 font-bold px-8 py-4 rounded-xl transition-colors">
              Start Free Trial <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
    </div>);

}