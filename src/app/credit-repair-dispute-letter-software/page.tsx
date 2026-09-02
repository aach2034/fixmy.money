import React from 'react';
import type { Metadata } from 'next';
import { createSeoMetadata } from "@/lib/seo/config";
import Link from 'next/link';
import { FileText, ArrowRight, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = createSeoMetadata("/credit-repair-dispute-letter-software");

const faqs = [
{ q: 'How are dispute letters created?', a: 'An authorized user selects reviewed report items, dispute reasons, and supporting details. FixMy.Money builds an editable template-based draft for human review.' },
{ q: 'Are the letters CROA-compliant?', a: 'FixMy.Money provides editable workflow templates. Your staff must review each letter and remains responsible for legal compliance.' },
{ q: 'Can I customize the dispute letters?', a: 'Yes. Edit drafts before sending and add appropriate language, specific dispute reasons, and supporting documentation references.' },
{ q: 'What bureaus does it support?', a: 'FixMy.Money supports dispute letters for Equifax, Experian, and TransUnion.' }];


export default function DisputeLetterSoftwarePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">FixMy.Money</Link>
          <div className="flex gap-3">
            <Link href="/pricing" className="text-sm font-medium text-slate-700 hover:text-slate-900">Pricing</Link>
            <Link href="/product-tour" className="text-sm font-medium text-slate-700 hover:text-slate-900">Product Tour</Link>
          </div>
        </div>
      </header>

      <div>
        {/* Hero */}
        <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-4 py-2 rounded-full mb-6">
              <FileText size={14} />
              Guided Letter Drafts
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
              Credit Repair Dispute Letter Software
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Build editable dispute letter drafts from reviewed account data. Your staff reviews, approves, and sends.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-colors">
                Start $1 Trial
              </Link>
              <Link href="/product-tour" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl border border-white/20 transition-colors">
                View Product Tour
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">Dispute Letter Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
              { title: 'Reviewed-Item Drafts', desc: 'Build drafts from report items and dispute reasons selected by an authorized user.' },
              { title: 'Staff Review Required', desc: 'Every draft must be reviewed and approved by your staff before sending.' },
              { title: 'Customizable Templates', desc: 'Edit letter language and add appropriate supporting-document references.' },
              { title: 'Multi-Bureau Support', desc: 'Prepare letters for Equifax, Experian, and TransUnion.' },
              { title: 'Documented Review', desc: 'Keep the selected items and review state connected to the letter workflow.' },
              { title: 'Print and Text Export', desc: 'Print reviewed letters or download them as text.' }].
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
                  FixMy.Money provides editable letter templates and workflow tools. Every letter must be reviewed, customized, and approved by your staff before sending. FixMy.Money does not provide legal advice. Users are responsible for compliance with CROA, FCRA, TSR, and applicable state laws.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-blue-600">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Generate dispute letters faster</h2>
            <p className="text-lg text-blue-50 mb-8">Start your 14-day trial for $1 today. Payment method required.</p>
            <Link href="/signup?plan=professional" className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-blue-600 font-bold px-8 py-4 rounded-xl transition-colors">
              Start $1 Trial <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>);

}
