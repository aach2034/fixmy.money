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
      title: 'AI Credit Analysis',
      description: 'Upload credit reports and get instant AI-powered analysis identifying negative items and dispute strategies.',
    },
    {
      icon: Zap,
      title: 'Automated Dispute Generation',
      description: 'Generate bureau-ready dispute letters for Equifax, Experian, and TransUnion with one click.',
    },
    {
      icon: Users,
      title: 'Client CRM',
      description: 'Manage unlimited clients with Salesforce-style profiles, dispute history, notes, and timelines.',
    },
    {
      icon: CreditCard,
      title: 'Stripe Native Billing',
      description: 'Charge clients automatically. Manage subscriptions, invoices, and payment history without leaving the platform.',
    },
    {
      icon: FileText,
      title: 'Document Storage',
      description: 'Secure cloud storage for credit reports, contracts, and dispute evidence with full compliance audit trails.',
    },
    {
      icon: Target,
      title: 'Task Automation',
      description: 'Build automation rules for onboarding, disputes, and billing. Reduce manual work by 80%.',
    },
  ];

  const faqs = [
    {
      q: 'What is credit repair software and why do I need it?',
      a: 'Credit repair software automates the dispute process, client management, and billing for credit repair agencies. It reduces manual work by 80%, improves accuracy, and helps you scale from 30 clients to 300+ clients without hiring additional staff.',
    },
    {
      q: 'How does the AI dispute generation work?',
      a: 'Our AI analyzes credit reports, identifies inaccuracies and negative items, and generates personalized dispute letters for each bureau. The letters are CROA-compliant and ready to send immediately.',
    },
    {
      q: 'Can I integrate with my existing CRM?',
      a: 'Fix My Money is a complete CRM built specifically for credit repair. It includes client management, billing, dispute tracking, and compliance tools in one platform. No integration needed.',
    },
    {
      q: 'Is the software CROA compliant?',
      a: 'Yes. The platform includes built-in compliance tools: required disclosure forms, contract templates, and audit trails designed to keep your business compliant with the Credit Repair Organizations Act.',
    },
    {
      q: 'How much can I save with credit repair software?',
      a: 'Most agencies save 15-20 hours per week on manual tasks. At $50/hour, that\'s $750-$1,000 per week in labor savings. Plus, you can serve 3-5× more clients with the same team.',
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
            Automate disputes, manage clients, collect payments, track results, and scale your credit repair business from one platform. AI-powered analysis and dispute generation included.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
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
              <div className="text-3xl font-bold text-blue-600">256K+</div>
              <div className="text-sm text-gray-600">Disputes Generated</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-600">99.9%</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-violet-600">4×</div>
              <div className="text-sm text-gray-600">Faster Scaling</div>
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
            From AI-powered dispute generation to client management and billing, Fix My Money is the complete platform for credit repair agencies.
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
              'Reduce manual work by 80% with automation',
              'Scale from 30 to 300+ clients without hiring',
              'AI-powered dispute generation saves 10+ hours per week',
              'CROA-compliant with built-in compliance tools',
              'Stripe native billing with automatic payments',
              'White-label client portal for professional branding',
              'Real-time analytics and performance tracking',
              'Dedicated support team for your success',
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
                  ['AI Credit Analysis', true, false],
                  ['AI Dispute Generation', true, false],
                  ['Modern Dashboard', true, false],
                  ['Stripe Native Billing', true, false],
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
            Start your free 14-day trial today. No credit card required.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
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