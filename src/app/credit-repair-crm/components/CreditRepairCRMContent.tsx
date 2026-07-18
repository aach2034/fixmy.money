'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const CreditRepairCRMContent = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-blue-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Credit Repair CRM: Manage Clients Like Salesforce
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Salesforce-style client profiles with complete dispute history, notes, tasks, timelines, and automated follow-ups. Scale from 30 to 300+ clients without hiring.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center px-8 py-4 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition"
            >
              See CRM Demo <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-900 font-semibold rounded-lg hover:border-gray-400 transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-center">
            Complete Client Management Platform
          </h2>
          <p className="text-lg text-gray-600 text-center mb-16 max-w-2xl mx-auto">
            Everything you need to manage unlimited clients, track disputes, and automate follow-ups.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: 'Salesforce-Style Profiles',
                description: 'Complete client profiles with contact info, credit score history, dispute timeline, notes, and custom fields.',
              },
              {
                title: 'Dispute Tracking',
                description: 'Track every dispute by bureau, status, date sent, and expected resolution. Automated reminders for follow-ups.',
              },
              {
                title: 'Task Management',
                description: 'Assign tasks to team members, set deadlines, and track progress with Kanban boards.',
              },
              {
                title: 'Automated Workflows',
                description: 'Build automation rules for onboarding, dispute generation, follow-ups, and billing.',
              },
              {
                title: 'Communication History',
                description: 'All emails, notes, and interactions stored in one place for complete client history.',
              },
              {
                title: 'Custom Fields',
                description: 'Add unlimited custom fields to track data specific to your business.',
              },
            ]?.map((feature, idx) => (
              <div key={idx} className="p-8 border border-gray-200 rounded-lg hover:shadow-lg transition">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature?.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature?.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12 text-center">
            Why Credit Repair Agencies Love Our CRM
          </h2>
          <div className="space-y-6">
            {[
              'Manage unlimited clients from one dashboard',
              'Reduce admin time by 80% with automation',
              'Never miss a follow-up with automated reminders',
              'Track every dispute and client interaction',
              'Scale your team without hiring more staff',
              'White-label portal for client self-service',
              'Real-time reporting and analytics',
              'CROA-compliant audit trails',
            ]?.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-violet-600 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-700">{benefit}</p>
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
                q: 'How is this different from a generic CRM like Salesforce?',
                a: 'This CRM is built specifically for credit repair agencies. It includes dispute tracking, CROA compliance, automated dispute generation, and billing integration — features generic CRMs don\'t have.',
              },
              {
                q: 'Can I import my existing clients?',
                a: 'Yes. We support CSV imports and can help you migrate from other platforms. Contact our support team for assistance.',
              },
              {
                q: 'How many clients can I manage?',
                a: 'Unlimited. Starter plan supports 50 active clients, Professional supports 250, and Agency plan supports unlimited clients.',
              },
              {
                q: 'Can my team collaborate?',
                a: 'Yes. Assign tasks, share notes, and track progress together. Role-based permissions ensure data security.',
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-violet-600 to-blue-600">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Upgrade Your Client Management?
          </h2>
          <p className="text-xl text-violet-100 mb-8">
            Start your free 14-day trial. See how much time you can save.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-violet-600 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="mx-auto max-w-4xl">
          <p className="text-gray-600 mb-6">Related pages:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link href="/credit-repair-software" className="text-blue-600 hover:text-blue-700 font-medium">
              Credit Repair Software →
            </Link>
            <Link href="/credit-repair-automation" className="text-blue-600 hover:text-blue-700 font-medium">
              Automation →
            </Link>
            <Link href="/credit-repair-client-portal" className="text-blue-600 hover:text-blue-700 font-medium">
              Client Portal →
            </Link>
            <Link href="/features" className="text-blue-600 hover:text-blue-700 font-medium">
              All Features →
            </Link>
            <Link href="/pricing" className="text-blue-600 hover:text-blue-700 font-medium">
              Pricing →
            </Link>
            <Link href="/demo" className="text-blue-600 hover:text-blue-700 font-medium">
              Request Demo →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CreditRepairCRMContent;