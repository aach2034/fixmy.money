'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';
import { PLANS } from '@/lib/stripe/plans';

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
            FixMy.Money offers a modern dashboard, client CRM, structured report review, and a 30-day no-card business trial. External AI and new paid Checkout are temporarily unavailable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/signup?plan=professional"
              className="inline-flex items-center justify-center px-8 py-4 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition"
            >
              Start 30-Day Free Trial <ArrowRight className="ml-2 w-5 h-5" />
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
                  ['External AI analysis (temporarily unavailable)', false, false],
                  ['Evidence-linked dispute preparation', true, false],
                  ['Modern Dashboard', true, false],
                  ['New paid Checkout (on hold)', false, false],
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
              'Structured report review with evidence-linked findings',
              'Modern dashboard for client and workflow management',
              'Human review before any dispute preparation',
              'No automatic bureau submission or unsupported disputes',
              '30-day business trial with no credit card required',
              'FixMy Pro at $99 per month after separate paid activation',
              'FixMy Scale at $199 per month after separate paid activation',
              'External AI and new paid Checkout are clearly held',
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
                  <div className="text-3xl font-bold text-amber-600">${PLANS.professional.monthlyPrice}</div>
                  <div className="text-gray-600">{PLANS.professional.name} ({PLANS.professional.maxClients} clients)</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">${PLANS.agency.monthlyPrice}</div>
                  <div className="text-gray-600">{PLANS.agency.name} ({PLANS.agency.maxClients} clients)</div>
                </div>
              </div>
              <Link href="/signup?plan=professional" className="block text-center px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition">
                Start 30-Day Free Trial
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
              { step: '1', title: 'Start a Business Trial', desc: 'Create a FixMy Pro or FixMy Scale account for a 30-day trial with no credit card.' },
              { step: '2', title: 'Review Supported Imports', desc: 'Confirm the supported data and document paths before moving customer records.' },
              { step: '3', title: 'Set Up Your Workflows', desc: 'Configure client records, review steps, templates, and outcome tracking.' },
              { step: '4', title: 'Validate Before Switching', desc: 'Use synthetic data first and move live customer work only after your own review.' },
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
                a: 'Do not assume every record can be migrated automatically. Review supported imports, preserve your source data, and validate a synthetic sample before moving live customer records.',
              },
              {
                q: 'How long does the migration take?',
                a: 'Timing depends on your source data and required review. FixMy.Money does not promise a one- or two-day migration.',
              },
              {
                q: 'Can I cancel my Credit Repair Cloud subscription?',
                a: 'Your Credit Repair Cloud agreement controls cancellation. Keep access until you have independently verified any data you need to retain or move.',
              },
              {
                q: 'What if I have questions during the migration?',
                a: 'Use FixMy.Money support for product questions. No dedicated migration service or response-time promise is included unless separately agreed.',
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
            Start a 30-day FixMy Pro or FixMy Scale trial with no credit card. New paid Checkout remains on hold.
          </p>
          <Link
            href="/signup?plan=professional"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-amber-600 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Start 30-Day Free Trial <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CreditRepairCloudAlternativeContent;
