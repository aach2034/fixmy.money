'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';

const CreditRepairCloudAlternativeContent = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Credit Repair Cloud Alternative: Why Agencies Are Switching
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Tired of Credit Repair Cloud\'s limitations? Fix My Money offers AI-powered disputes, modern dashboard, Stripe billing, and better support at a better price.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition"
            >
              Switch to Fix My Money <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a
              href="#comparison"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:border-gray-400 transition"
            >
              See Comparison
            </a>
          </div>
        </div>
      </section>
      <section id="comparison" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            Feature Comparison: Fix My Money vs Credit Repair Cloud
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-amber-600">Fix My Money</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">Credit Repair Cloud</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI Credit Analysis', true, false],
                  ['AI Dispute Generation', true, false],
                  ['Modern Dashboard', true, false],
                  ['Stripe Native Billing', true, false],
                  ['White-Label Portal', true, true],
                  ['Client CRM', true, true],
                  ['Automated Workflows', true, true],
                  ['Task Management', true, true],
                  ['Mobile App', true, false],
                  ['API Access', true, false],
                  ['Dedicated Support', true, false],
                  ['CROA Compliance', true, true],
                ]?.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-900 font-medium">{row?.[0]}</td>
                    <td className="py-4 px-4 text-center">
                      {row?.[1] ? <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" /> : <X className="w-6 h-6 text-gray-300 mx-auto" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row?.[2] ? <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" /> : <X className="w-6 h-6 text-gray-300 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            Why Agencies Switch to Fix My Money
          </h2>
          <div className="space-y-6">
            {[
              'AI-powered dispute generation saves 10+ hours per week',
              'Modern, intuitive dashboard vs outdated interface',
              'Stripe native billing with lower processing fees',
              'Better customer support and faster response times',
              'More affordable pricing with more features',
              'Mobile app for managing clients on the go',
              'API access for custom integrations',
              'Faster onboarding and implementation',
            ]?.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-700">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            Pricing Comparison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 border-2 border-amber-600 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Fix My Money</h3>
              <div className="space-y-4 mb-8">
                <div>
                  <div className="text-3xl font-bold text-amber-600">$49</div>
                  <div className="text-gray-600">Starter (25 clients)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">$129</div>
                  <div className="text-gray-600">Professional (100 clients)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">$249</div>
                  <div className="text-gray-600">Agency (Unlimited)</div>
                </div>
              </div>
              <Link href="/demo" className="block text-center px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition">
                Start $1 Trial
              </Link>
            </div>
            <div className="p-8 border border-gray-200 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Credit Repair Cloud</h3>
              <div className="space-y-4 mb-8">
                <div>
                  <div className="text-3xl font-bold text-gray-600">$149</div>
                  <div className="text-gray-600">Starter (50 clients)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-600">$249</div>
                  <div className="text-gray-600">Professional (250 clients)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-600">$499</div>
                  <div className="text-gray-600">Agency (Unlimited)</div>
                </div>
              </div>
              <button disabled className="block w-full px-6 py-3 bg-gray-300 text-gray-600 font-semibold rounded-lg cursor-not-allowed">
                Visit Website
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            Migration Guide: How to Switch
          </h2>
          <div className="space-y-8">
            {[
              { step: '1', title: 'Start Your $1 Trial', desc: 'Sign up for a 14-day trial for $1. Payment method required.' },
              { step: '2', title: 'Import Your Clients', desc: 'We help you migrate all your clients from Credit Repair Cloud.' },
              { step: '3', title: 'Set Up Your Workflows', desc: 'Configure automation rules and customize your portal.' },
              { step: '4', title: 'Go Live', desc: 'Switch your clients over and start saving time immediately.' },
            ]?.map((item, idx) => (
              <div key={idx} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-white font-bold">{item?.step}</div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item?.title}</h3>
                  <p className="text-gray-600">{item?.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Will I lose my client data when switching?',
                a: 'No. We help you migrate all your clients, disputes, and history from Credit Repair Cloud. Your data is safe and secure.',
              },
              {
                q: 'How long does the migration take?',
                a: 'Most migrations take 1-2 days. Our team handles everything so you can focus on your business.',
              },
              {
                q: 'Can I cancel my Credit Repair Cloud subscription?',
                a: 'Yes. Once you\'re set up with Fix My Money, you can cancel your CRC subscription anytime.',
              },
              {
                q: 'What if I have questions during the migration?',
                a: 'Our support team is here to help. We provide dedicated support during your migration and beyond.',
              },
            ]?.map((faq, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left font-semibold text-gray-900 hover:bg-gray-50 transition flex justify-between items-center"
                >
                  {faq?.q}
                  <span className={`transform transition ${openFaq === idx ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-gray-700 leading-relaxed">
                    {faq?.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-amber-600 to-orange-600">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Switch to Fix My Money?
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Start your 14-day trial for $1 today. See why agencies are switching.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-amber-600 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Start $1 Trial <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CreditRepairCloudAlternativeContent;