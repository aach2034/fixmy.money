import React from 'react';
import type { Metadata } from 'next';
import { createSeoMetadata } from "@/lib/seo/config";
import Link from 'next/link';

export const metadata: Metadata = createSeoMetadata("/credit-repair-automation");

export default function AutomationPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Credit repair automation software with human approval built in
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Automate repeatable credit repair agency workflows without losing control of client authorization, evidence, approvals, deadlines, billing, or compliance records.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/demo" className="inline-flex items-center justify-center px-8 py-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition">
              See Automation in Action
            </Link>
            <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center justify-center px-8 py-4 border border-orange-200 bg-white text-orange-700 font-semibold rounded-lg hover:bg-orange-50 transition">
              Start $1 Trial
            </Link>
          </div>
        </div>
      </section>
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-5">Automate the workflow, not the responsibility</h2>
          <p className="text-lg leading-8 text-gray-600">
            Credit repair work still requires client authorization, factual review, and responsible business practices. FixMy.Money uses automation to reduce manual administration while keeping human verification and approval at the center of the workflow.
          </p>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Automation Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
            { title: 'Client intake reminders', desc: 'Route report requests, agreements, identity documents, and onboarding tasks into one client record.' },
            { title: 'Report review routing', desc: 'Send uploaded reports into an evidence-first review workflow before any dispute decision is made.' },
            { title: 'Draft preparation', desc: 'Prepare evidence-linked drafts for authorized agency users to review, edit, and approve.' },
            { title: 'Bureau response tracking', desc: 'Create follow-up deadlines and next-step tasks when bureau response windows are approaching.' },
            { title: 'Billing automation', desc: 'Connect Stripe billing status to agency operations, client records, and subscription follow-up.' },
            { title: 'Approval history', desc: 'Document who reviewed evidence, what was approved, and when the workflow moved forward.' }].
            map((item, idx) =>
            <div key={idx} className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-orange-100 bg-orange-50 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Why approval controls matter</h2>
          <p className="text-gray-700 leading-7">
            Generated letters alone are not enough. Agencies need to know who reviewed the evidence, which facts were used, what the client authorized, who approved the draft, when it was delivered, and what happened after the bureau response.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/credit-repair-software" className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700">Credit repair software</Link>
            <Link href="/credit-repair-business-software" className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700">Credit repair business software</Link>
            <Link href="/pricing" className="rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-700">Credit repair software pricing</Link>
          </div>
        </div>
      </section>
    </div>);

}
