'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Users, Zap, Brain, FileText, CreditCard, Target } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const CreditRepairSoftwareContent = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const features = [
    {
      icon: Brain,
      title: 'Structured Report Review',
      description: 'Import supported reports and review parsed accounts, bureau differences, and evidence-linked anomalies. External AI review is temporarily unavailable.',
    },
    {
      icon: Zap,
      title: 'Fact-Based Dispute Preparation',
      description: 'Prepare editable bureau-specific drafts from customer-reviewed facts. Nothing is sent automatically.',
    },
    {
      icon: Users,
      title: 'Client CRM',
      description: 'Manage clients within your plan limit with profiles, dispute history, notes, and timelines.',
    },
    {
      icon: CreditCard,
      title: 'Billing Controls',
      description: 'Review trial and billing status. New paid Checkout remains on hold; existing subscriptions are preserved.',
    },
    {
      icon: FileText,
      title: 'Document Storage',
      description: 'Secure cloud storage for credit reports, contracts, and dispute evidence with full compliance audit trails.',
    },
    {
      icon: Target,
      title: 'Workflow Controls',
      description: 'Use templates, tasks, and outcome tracking while keeping a human in control of every dispute decision.',
    },
  ];

  const faqs = [
    {
      q: 'What is credit repair software and why do I need it?',
      a: 'Credit repair software organizes client records, report review, dispute preparation, and outcome tracking. FixMy.Money does not automatically submit disputes or guarantee labor savings, credit outcomes, or business growth.',
    },
    {
      q: 'How does the AI dispute generation work?',
      a: 'External report AI is temporarily unavailable while production verification is completed. The current workflow supports structured, evidence-linked findings and editable drafts that require customer review; an anomaly never becomes an automatic or unsupported dispute.',
    },
    {
      q: 'Can I integrate with my existing CRM?',
      a: 'Fix My Money is a complete CRM built specifically for credit repair. It includes client management, billing, dispute tracking, and compliance tools in one platform. No integration needed.',
    },
    {
      q: 'Is the software CROA compliant?',
      a: 'The platform provides records, review controls, templates, and audit evidence. Those tools do not establish legal compliance; each business remains responsible for the laws that apply to its services, marketing, fees, and locations.',
    },
    {
      q: 'How much can I save with credit repair software?',
      a: 'Organized workflows may reduce manual work, but savings depend on your operation. FixMy.Money does not promise a specific number of hours, clients, revenue, or results.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Credit Repair Software Built for Modern Agencies
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Manage clients, import reports, review evidence-linked findings, prepare editable dispute drafts, and track outcomes from one platform. External AI analysis and new paid Checkout are temporarily unavailable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/signup?plan=professional"
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Start 30-Day Free Trial <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:border-gray-400 transition"
            >
              See Features
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">30 days</div>
              <div className="text-sm text-gray-600">No-card business trial</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-600">300</div>
              <div className="text-sm text-gray-600">FixMy Pro client limit</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-violet-600">600</div>
              <div className="text-sm text-gray-600">FixMy Scale client limit</div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            Everything You Need to Run a Credit Repair Business
          </h2>
          <p className="text-lg text-gray-600 text-center mb-16 max-w-2xl mx-auto">
            Current production access centers on client management, structured report review, editable dispute preparation, and outcome tracking.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features?.map((feature, idx) => {
              const Icon = feature?.icon;
              return (
                <div key={idx} className="p-8 border border-gray-200 rounded-lg hover:shadow-lg transition">
                  <Icon className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature?.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature?.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            Why Agencies Choose Fix My Money
          </h2>
          <div className="space-y-6">
            {[
              'Structured report review with evidence-linked findings',
              'Human review before dispute preparation',
              'No automatic bureau submission',
              'External report AI is temporarily unavailable',
              'New paid Checkout remains on hold',
              'Private document storage and audit records',
              'Plan-limited client CRM and workflow tracking',
              '30-day business trial with no credit card required',
            ]?.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-700">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            How Fix My Money Compares
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-blue-600">Fix My Money</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-600">Credit Repair Cloud</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['External AI analysis (temporarily unavailable)', false, false],
                  ['Evidence-linked dispute preparation', true, false],
                  ['Modern Dashboard', true, false],
                  ['New paid Checkout (on hold)', false, false],
                  ['Client CRM', true, true],
                  ['Automated Workflows', true, true],
                  ['White-Label Portal', true, true],
                  ['Task Automation', true, true],
                ]?.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-4 px-4 text-gray-900 font-medium">{row?.[0]}</td>
                    <td className="py-4 px-4 text-center">
                      {row?.[1] ? <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" /> : <div className="w-6 h-6 mx-auto" />}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row?.[2] ? <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" /> : <div className="w-6 h-6 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs?.map((faq, idx) => (
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Scale Your Credit Repair Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Start a 30-day FixMy Pro or FixMy Scale trial with no credit card. FixMy Credit enrollment and new paid Checkout remain unavailable.
          </p>
          <Link
            href="/signup?plan=professional"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Start 30-Day Free Trial <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="mx-auto max-w-4xl">
          <p className="text-gray-600 mb-6">Explore more:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link href="/credit-repair-crm" className="text-blue-600 hover:text-blue-700 font-medium">
              Credit Repair CRM →
            </Link>
            <Link href="/credit-repair-dispute-software" className="text-blue-600 hover:text-blue-700 font-medium">
              Dispute Software →
            </Link>
            <Link href="/credit-repair-automation" className="text-blue-600 hover:text-blue-700 font-medium">
              Automation →
            </Link>
            <Link href="/credit-repair-client-portal" className="text-blue-600 hover:text-blue-700 font-medium">
              Client Portal →
            </Link>
            <Link href="/credit-repair-cloud-alternative" className="text-blue-600 hover:text-blue-700 font-medium">
              Cloud Alternative →
            </Link>
            <Link href="/pricing" className="text-blue-600 hover:text-blue-700 font-medium">
              Pricing →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CreditRepairSoftwareContent;
