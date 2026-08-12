import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail, MessageSquare, Calendar, Shield, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact FixMy.Money | Credit Repair Software Support',
  description:
    'Get in touch with FixMy.Money. Email support, demo booking, sales inquiries, and security disclosures.',
  alternates: { canonical: 'https://fixmy.money/contact' },
  openGraph: {
    title: 'Contact FixMy.Money',
    description: 'Get in touch with FixMy.Money. Email support, demo booking, and sales inquiries.',
    type: 'website',
    url: 'https://fixmy.money/contact',
    siteName: 'FixMy.Money',
  },
};

export default function ContactPage() {
  return (
    <div className="a11y-light min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Pricing</Link>
            <Link href="/signup" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
              Start $1 Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="a11y-dark py-16 px-4 bg-gradient-to-br from-slate-950 to-[#0d1f3c]">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">Get in Touch</h1>
          <p className="text-xl text-slate-300">We&apos;re here to help. Reach out anytime.</p>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Email Support */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Mail size={20} className="text-blue-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 mb-2">Email Support</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Questions about the platform, your account, or billing. We respond within 1 business day.
              </p>
              <a href="mailto:support@fixmy.money" className="text-blue-600 font-semibold hover:text-blue-700 text-sm">
                support@fixmy.money
              </a>
            </div>

            {/* Book Demo */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <Calendar size={20} className="text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 mb-2">Book a Demo</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                See the full platform in a 30-minute personalized walkthrough with a platform specialist.
              </p>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 text-sm font-bold bg-emerald-700 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-800 transition-colors"
              >
                Schedule Demo <ArrowRight size={14} />
              </Link>
            </div>

            {/* Sales */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                <Phone size={20} className="text-violet-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 mb-2">Sales Inquiries</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Questions about Enterprise pricing, custom contracts, or agency partnerships.
              </p>
              <a href="mailto:adam@fixmy.money" className="text-violet-600 font-semibold hover:text-violet-700 text-sm">
                adam@fixmy.money
              </a>
            </div>

            {/* Security */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <Shield size={20} className="text-amber-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 mb-2">Security Disclosures</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Found a security vulnerability? Please report it responsibly. We take all security reports seriously.
              </p>
              <a href="mailto:security@fixmy.money" className="text-amber-800 font-semibold hover:text-amber-900 text-sm">
                security@fixmy.money
              </a>
            </div>
          </div>

          {/* Support Expectations */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
            <h3 className="font-extrabold text-slate-900 mb-4">Support expectations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Email response time', value: 'Within 1 business day' },
                { label: 'Demo confirmation', value: 'Within 1 business hour' },
                { label: 'Support hours', value: 'Monday – Friday, 9 AM – 6 PM EST' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs font-semibold text-slate-500 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Founding Agency */}
          <div className="a11y-dark bg-slate-900 rounded-2xl p-6 text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold px-4 py-2 rounded-full mb-4">
              Now Accepting Founding Agencies
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">Interested in founding agency pricing?</h3>
            <p className="text-slate-400 text-sm mb-5">
              We&apos;re actively working with early customers to shape the platform. Founding customer pricing available for qualified agencies.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm"
              >
                Start $1 Trial <ArrowRight size={14} />
              </Link>
              <a
                href="mailto:adam@fixmy.money"
                className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-sm"
              >
                <MessageSquare size={14} />
                Email the Founder
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
