import React from 'react';
import type { Metadata } from 'next';
import { createSeoMetadata } from "@/lib/seo/config";
import Link from 'next/link';
import { Users, ArrowRight, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = createSeoMetadata("/credit-repair-crm");

const faqs = [
{ q: 'How is this different from Salesforce or HubSpot?', a: 'This CRM is built specifically for credit repair agencies. It includes dispute tracking, CROA compliance tools, automated dispute generation, and billing integration — features generic CRMs don\'t have.' },
{ q: 'Can I import my existing clients?', a: 'Yes. Import clients from CSV or manually add them. We\'ll help you migrate your data.' },
{ q: 'What client information can I track?', a: 'Contact details, dispute history, documents, notes, tasks, communication history, billing, and more.' },
{ q: 'Can I set up automation rules?', a: 'Yes. Professional and Agency plans include task automation, workflow templates, and automated reminders.' }];


export default function CreditRepairCRMPage() {
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

      <div>
        {/* Hero */}
        <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-2 rounded-full mb-6">
              <Users size={14} />
              Client Management
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
              Credit Repair CRM Software
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              CRM built specifically for credit repair agencies. Manage clients, disputes, documents, and billing from one platform.
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
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">CRM Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
              { title: 'Client Profiles', desc: 'Organized client records with contact info, dispute history, notes, and communication logs.' },
              { title: 'Dispute Tracking', desc: 'Track disputes per client with status, bureau, dates, and outcomes.' },
              { title: 'Document Storage', desc: 'Secure storage for credit reports, contracts, evidence, and compliance documents.' },
              { title: 'Task Management', desc: 'Assign tasks, set reminders, and track completion.' },
              { title: 'Communication History', desc: 'All emails, notes, and interactions logged per client.' },
              { title: 'Billing Integration', desc: 'Track invoices, payments, and subscription status per client.' }].
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
            <h2 className="text-3xl font-bold text-white mb-4">Organize your client management</h2>
            <p className="text-lg text-blue-50 mb-8">Start your 14-day trial for $1 today. Payment method required.</p>
            <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-blue-600 font-bold px-8 py-4 rounded-xl transition-colors">
              Start $1 Trial <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>);

}
