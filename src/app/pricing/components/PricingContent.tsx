'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trackPricingPlanSelect, trackCtaClick } from '@/lib/analytics';
import { PLANS_LIST } from '@/lib/stripe/plans';
import DemoVideoPlayer from '@/app/homepage/components/DemoVideoPlayer';
import PublicBrandLink from '@/components/marketing/PublicBrandLink';
import PublicFooter from '@/components/marketing/PublicFooter';
import {
  Check,
  X,
  ArrowRight,
  HelpCircle,
  Shield,
  AlertTriangle,
} from 'lucide-react';

// ─── Plan configuration (single source of truth) ─────────────────────────────
const PLANS = PLANS_LIST;

// ─── Comparison table rows ────────────────────────────────────────────────────
const COMPARISON_ROWS: {
  category: string;
  rows: { feature: string; starter: string | boolean; professional: string | boolean; agency: string | boolean; enterprise: string | boolean; tooltip?: string }[];
}[] = [
  {
    category: 'Core Features',
    rows: [
      { feature: 'Client portal', starter: true, professional: true, agency: true, enterprise: true },
      { feature: 'Dispute management', starter: true, professional: true, agency: true, enterprise: true },
      { feature: 'Credit report import', starter: true, professional: true, agency: true, enterprise: true },
      { feature: 'Audit log', starter: true, professional: true, agency: true, enterprise: true },
    ],
  },
  {
    category: 'Review',
    rows: [
      { feature: 'Structured report review', starter: true, professional: true, agency: true, enterprise: true },
      { feature: 'Human verification before use', starter: true, professional: true, agency: true, enterprise: true },
    ],
  },
  {
    category: 'Workflow Controls',
    rows: [
      { feature: 'Workflow templates', starter: false, professional: true, agency: true, enterprise: true },
      { feature: 'Response tracking', starter: false, professional: true, agency: true, enterprise: true },
    ],
  },
  {
    category: 'Advanced',
    rows: [
      { feature: 'Data export', starter: false, professional: false, agency: true, enterprise: true },
      { feature: 'Onboarding assistance', starter: false, professional: false, agency: true, enterprise: true },
    ],
  },
  {
    category: 'Support',
    rows: [
      { feature: 'Email support', starter: true, professional: true, agency: true, enterprise: true },
      { feature: 'Priority support', starter: false, professional: true, agency: true, enterprise: true },
      { feature: 'Dedicated success manager', starter: false, professional: false, agency: false, enterprise: true },
    ],
  },
];

const BILLING_FAQS = [
  { q: 'Is a credit card required for the free trial?', a: 'No. The 30-day free trial requires no card and never creates a charge or debt at expiration.' },
  { q: 'Who can purchase a plan?', a: 'Start and Grow are business software subscriptions for authorized representatives of businesses managing client workflows. New personal-use subscriptions are not offered.' },
  { q: 'When does paid billing begin?', a: 'Only after the workspace owner separately chooses Start or Grow, reviews the monthly price and terms, enters payment details, and confirms through secure Checkout. Trial expiration never starts billing.' },
  { q: 'Is this a fee for repairing my credit?', a: 'No. Published prices are for business access to software, not consumer credit-repair work or a promised credit result. They do not determine what an agency may charge its clients or when.' },
  { q: 'Can I cancel anytime?', a: 'Yes. You can cancel your subscription at any time from your billing settings. Your access continues until the end of the current billing period.' },
  { q: 'What happens when I cancel?', a: 'When you cancel, your subscription will not renew. You retain access until the end of the period you paid for. Your data remains available for export for 30 days after cancellation.' },
  { q: 'Can I upgrade or downgrade my plan?', a: 'Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately. Downgrades take effect at the next billing cycle.' },
  { q: 'What happens if a payment fails?', a: 'If a payment fails, we will retry the charge and notify you by email. If the payment cannot be collected after multiple attempts, your account will be suspended until the payment issue is resolved.' },
  { q: 'Do you offer refunds?', a: 'We do not offer refunds for partial billing periods. If you believe you were charged in error, contact support@fixmy.money within 7 days.' },
];

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={16} className="text-emerald-500 mx-auto" />;
  if (value === false) return <X size={16} className="text-slate-300 mx-auto" />;
  return <span className="text-xs text-slate-600 text-center block">{value}</span>;
}

export default function PricingContent() {
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleStartTrial = (planId: string, planName: string, price: number | null) => {
    if (planId === 'enterprise') {
      trackCtaClick('Contact Sales', '/contact', 'pricing_page');
      router.push('/contact');
      return;
    }
    trackPricingPlanSelect(planName, price ?? 0, 'pricing_page');
    trackCtaClick(`Start 30-Day Free Trial ${planName}`, `/signup?plan=${planId}`, 'pricing_page');
    router.push(`/signup?plan=${planId}`);
  };

  return (
    <div className="a11y-light premium-public min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav aria-label="Primary" className="sticky top-0 z-40 border-b border-[#d8e3de] bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <PublicBrandLink compact />
          <div className="flex items-center gap-3">
            <Link href="/product-tour" className="hidden text-sm font-semibold text-[#52636d] transition-colors hover:text-[#267a31] sm:block">Product Tour</Link>
            <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-[#52636d] transition-colors hover:bg-[#f1f5f3] hover:text-[#267a31] sm:block">Sign in</Link>
            <Link href="/signup?plan=professional" className="rounded-xl bg-[#267a31] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(38,122,49,.18)] transition hover:-translate-y-0.5 hover:bg-[#1f6729]">
              Start 30-Day Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="a11y-dark brand-grid bg-[#07153d] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#75d0a4]/30 bg-[#75d0a4]/10 px-4 py-2 text-xs font-bold text-[#98dfbc]">
            Transparent Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">Simple, honest pricing</h1>
          <p className="text-xl text-slate-300 mb-3">30-day free trial. No credit card required.</p>
          <p className="text-sm text-slate-400 mb-8">Trial expiration pauses paid features without charging you. Subscribe only after reviewing the price and monthly terms.</p>

          <div className="inline-flex items-center rounded-2xl border border-slate-700/60 bg-slate-800/60 px-5 py-3 text-sm font-semibold text-white">
            Monthly billing
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLANS.map((plan) => {
              const price = plan.monthlyPrice;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                    plan.highlight
                      ? 'border-[#79aa94] shadow-xl shadow-emerald-100/70'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-extrabold text-slate-900 mb-1">{plan.name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{plan.description}</p>
                  </div>
                  <div className="mb-5">
                    {price !== null ? (
                      <>
                        <span className="text-4xl font-extrabold text-slate-900">${price}</span>
                        <span className="text-slate-500 text-sm"> per month</span>
                      </>
                    ) : (
                      <span className="text-2xl font-extrabold text-slate-900">Custom</span>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
                        <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleStartTrial(plan.id, plan.name, price)}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                      plan.highlight
                        ? 'bg-[#267a31] hover:bg-[#1f6729] text-white'
                        : plan.id === 'enterprise' ?'bg-slate-900 hover:bg-slate-800 text-white' :'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    {plan.id === 'enterprise' ? 'Contact Sales' : 'Start 30-Day Free Trial'}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            30-day free trial. No credit card required. Start and Grow are for business use only. Personal is preserved for existing customers. Paid Checkout is separately gated.
          </p>
        </div>
      </section>

      {/* Video */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #111827 100%)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-blue-400 uppercase tracking-widest mb-3">Platform Demo</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">See Everything Included</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Watch the full platform walkthrough before choosing your plan.
            </p>
          </div>
          <DemoVideoPlayer
            placement="pricing"
            showTrialCta
            onTrialClick={() => router.push('/signup?plan=professional')}
          />
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Full feature comparison</h2>
            <p className="text-slate-600">See exactly what&apos;s included in each plan.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-2xl overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-4 font-semibold text-slate-700 w-1/3">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.id} className={`px-4 py-4 font-semibold text-center ${p.highlight ? 'text-blue-600' : 'text-slate-700'}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((section) => (
                  <React.Fragment key={section.category}>
                    <tr className="bg-slate-50">
                      <td colSpan={PLANS.length + 1} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {section.category}
                      </td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr key={row.feature} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-700 flex items-center gap-1">
                          {row.feature}
                          {row.tooltip && (
                            <span title={row.tooltip}><HelpCircle size={13} className="text-slate-400" /></span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center bg-blue-50/30"><CellValue value={row.professional} /></td>
                        <td className="px-4 py-3 text-center"><CellValue value={row.agency} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Billing Terms */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6 text-center">Billing terms</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: '30-day free trial', value: 'No card; no automatic conversion or charge' },
              { label: 'Paid activation', value: 'Separate owner choice and Checkout confirmation required' },
              { label: 'Monthly billing', value: 'Charged on the same date each month' },
              { label: 'Cancellation', value: 'Cancel anytime; access continues to end of period' },
              { label: 'Upgrades', value: 'Take effect immediately; prorated charge' },
              { label: 'Downgrades', value: 'Take effect at next billing cycle' },
              { label: 'Failed payments', value: 'Retried automatically; account suspended if unresolved' },
              { label: 'Refunds', value: 'No refunds for partial periods; billing errors reviewed within 7 days' },
              { label: 'Data export on cancellation', value: 'Available for 30 days after cancellation (Agency+ plans)' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 mb-1">{item.label}</p>
                  <p className="text-sm text-slate-800">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Notice */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Software Access Only</p>
              <p className="text-sm text-amber-700 leading-relaxed">
                FixMy.Money provides business workflow software, not credit-repair services for consumers. Businesses remain responsible for client authorization, marketing, services, and lawful fees. No credit result, revenue, or business success is guaranteed. See our <Link href="/business-use" className="font-semibold underline">Business Use Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-8 text-center">Billing FAQ</h2>
          <div className="space-y-3">
            {BILLING_FAQS.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
                >
                  <span className="font-semibold text-slate-900 text-sm">{faq.q}</span>
                  <span className="text-slate-400 text-lg shrink-0">{openFaq === idx ? '−' : '+'}</span>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Badge */}
      <section className="py-10 px-4 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2"><Shield size={16} className="text-blue-600" /> Supabase Row-Level Security</div>
          <div className="flex items-center gap-2"><Shield size={16} className="text-emerald-600" /> Stripe PCI DSS Level 1</div>
          <div className="flex items-center gap-2"><Shield size={16} className="text-violet-600" /> TLS 1.2+ Encryption</div>
          <div className="flex items-center gap-2"><Shield size={16} className="text-amber-600" /> Immutable Audit Logs</div>
        </div>
      </section>

      {/* CTA */}
      <section className="a11y-dark py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to get started?</h2>
          <p className="text-slate-400 mb-8">Try your selected business plan for 30 days. No credit card required. Choose a paid plan only if you want to continue paid features.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup?plan=professional"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all"
            >
              Start 30-Day Free Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
