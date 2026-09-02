import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { createSeoMetadata } from '@/lib/seo/config';

export const metadata: Metadata = createSeoMetadata('/what-is-fixmy-money');

const helps = [
  'Client CRM and portal',
  'Credit report import',
  'Structured report review',
  'Source-linked evidence',
  'Dispute draft workflows',
  'Human verification and approval',
  'FixMy.Money subscription management',
  'Bureau response deadlines',
  'Audit history',
];

export default function WhatIsFixMyMoneyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav className="border-b border-slate-100 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-bold">FixMy.Money</Link>
          <Link href="/sign-up-login-screen?tab=register" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Start $1 Trial</Link>
        </div>
      </nav>

      <section className="bg-slate-950 px-4 py-20 text-white sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-blue-200">
            <Shield size={14} /> Company overview
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">What is FixMy.Money?</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            FixMy.Money is business software for credit repair professionals and agencies. It organizes client records, credit report review, evidence, dispute workflows, approvals, and bureau response tracking.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/product-tour" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 font-bold text-white">Explore the product tour <ArrowRight size={16} /></Link>
            <Link href="/demo" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-4 font-bold text-white">Book demo</Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-extrabold">Who FixMy.Money is for</h2>
            <p className="mt-4 leading-7 text-slate-600">
              FixMy.Money is for credit repair agencies, consultants, financial coaches, and professionals who manage authorized credit repair workflows for clients. It is not a consumer credit repair service.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {helps.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <CheckCircle2 className="text-blue-600" size={18} />
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="text-2xl font-extrabold">What FixMy.Money is not</h2>
          <p className="mt-4 leading-7 text-slate-600">
            FixMy.Money is not a law firm, does not provide legal advice, does not guarantee credit score improvement, and does not remove the agency's responsibility to comply with CROA, FCRA, TSR, and applicable state laws.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/product-tour" className="rounded-lg border border-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">Product tour</Link>
            <Link href="/pricing" className="rounded-lg border border-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">Pricing</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
