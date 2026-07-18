'use client';
import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Back to FixMy.Money
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText size={20} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Terms of Service</h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">Last updated: July 2026</p>
        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <p className="text-slate-600">By accessing or using FixMy.Money, you agree to be bound by these Terms of Service. Please read them carefully.</p>
          <h2 className="text-lg font-bold text-slate-900">Platform Use</h2>
          <p className="text-slate-600">FixMy.Money is a business-to-business software platform. We license workflow, document, client-management, and recordkeeping tools to independent businesses. We do not provide credit repair services to your clients, represent them, communicate with credit bureaus on their behalf, or make dispute decisions for them.</p>
          <h2 className="text-lg font-bold text-slate-900">Independent Business Responsibility</h2>
          <p className="text-slate-600">You control and are solely responsible for your business, clients, contracts, disclosures, marketing, fees, dispute decisions, letters, communications, and legal compliance. You must independently review every report, recommendation, and letter before using it and comply with CROA, FCRA, TSR, applicable state laws, and all other requirements that apply to you or your clients.</p>
          <h2 className="text-lg font-bold text-slate-900">No Legal Advice</h2>
          <p className="text-slate-600">Nothing on FixMy.Money constitutes legal advice. We do not provide legal counsel. Consult a qualified attorney for legal guidance specific to your business.</p>
          <h2 className="text-lg font-bold text-slate-900">No Guaranteed Results</h2>
          <p className="text-slate-600">FixMy.Money does not guarantee credit score improvements, item removals, or any specific credit outcomes. Results depend on individual circumstances, bureau responses, and the accuracy of information on credit reports.</p>
          <h2 className="text-lg font-bold text-slate-900">Subscriptions and Billing</h2>
          <p className="text-slate-600">Subscription charges purchase access to the FixMy.Money software for the selected subscription period; they are not fees for improving any consumer's credit or producing a particular credit outcome. Subscriptions are billed monthly or annually as selected. You may cancel from your billing settings, and trial periods are subject to the terms presented at signup. Payments are processed securely by Stripe.</p>
          <h2 className="text-lg font-bold text-slate-900">Acceptable Use</h2>
          <p className="text-slate-600">You may not use FixMy.Money to submit false claims, dispute information you know is accurate, impersonate a consumer, send a letter without the consumer's authorization, misrepresent your services, promise removals or score increases, evade fee restrictions, or violate any law. FixMy.Money does not automatically send dispute letters. Violation of these terms may result in account suspension or termination.</p>
          <h2 className="text-lg font-bold text-slate-900">Contact</h2>
          <p className="text-slate-600">For questions about these terms, contact <a href="mailto:support@fixmy.money" className="text-blue-600 hover:underline">support@fixmy.money</a>.</p>
        </div>
      </div>
    </div>
  );
}
