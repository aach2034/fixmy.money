'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, DollarSign, TrendingUp, CheckCircle, Share2, Gift, Star, Zap,  } from 'lucide-react';

const steps = [
  {
    step: '01',
    title: 'Apply & Get Approved',
    desc: 'Fill out the short application. Most affiliates are approved within 24 hours.',
    icon: CheckCircle,
  },
  {
    step: '02',
    title: 'Share Your Link',
    desc: 'Get a unique referral link and marketing materials to share with your audience.',
    icon: Share2,
  },
  {
    step: '03',
    title: 'Earn Recurring Commissions',
    desc: 'Earn 30% recurring commission every month for as long as your referrals stay subscribed.',
    icon: DollarSign,
  },
];

const tiers = [
  {
    name: 'Starter Affiliate',
    commission: '20%',
    requirement: '1–5 active referrals',
    perks: ['Unique referral link', 'Marketing kit', 'Monthly payouts', 'Affiliate dashboard'],
    highlighted: false,
  },
  {
    name: 'Pro Affiliate',
    commission: '30%',
    requirement: '6–20 active referrals',
    perks: ['Everything in Starter', 'Priority support', 'Co-branded landing page', 'Quarterly bonus'],
    highlighted: true,
  },
  {
    name: 'Partner',
    commission: '40%',
    requirement: '21+ active referrals',
    perks: ['Everything in Pro', 'Dedicated partner manager', 'Custom integrations', 'Revenue share bonuses'],
    highlighted: false,
  },
];

const earnings = [
  { referrals: 5, plan: 'Professional ($129/mo)', monthly: '$194', annual: '$2,322' },
  { referrals: 10, plan: 'Professional ($129/mo)', monthly: '$387', annual: '$4,644' },
  { referrals: 25, plan: 'Mixed plans (~$140 avg)', monthly: '$1,050', annual: '$12,600' },
  { referrals: 50, plan: 'Mixed plans (~$140 avg)', monthly: '$2,100', annual: '$25,200' },
];

const testimonials = [
  {
    name: 'Keisha B.',
    role: 'Credit Repair Coach',
    content: 'I recommend FixMy.Money to every student in my course. The 30% recurring commission adds $1,200/month to my income without any extra work.',
    initials: 'KB',
    color: 'bg-emerald-600',
  },
  {
    name: 'Andre P.',
    role: 'Financial Educator, YouTube',
    content: 'My audience trusts my recommendations. FixMy.Money converts incredibly well because it\'s a product people actually need. Best affiliate program I\'ve joined.',
    initials: 'AP',
    color: 'bg-violet-600',
  },
];

export default function AffiliateProgramContent() {
  const [form, setForm] = useState({ name: '', email: '', website: '', audience: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">FM</span>
            </div>
            <span className="font-bold text-white">FixMy.Money</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-emerald-950 border-b border-gray-800 py-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
            <Gift size={13} className="text-emerald-400" />
            <span className="text-emerald-300 text-sm font-medium">Affiliate Program</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-5">
            Earn 30% recurring commission
          </h1>
          <p className="text-gray-400 text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            Refer credit repair professionals to FixMy.Money and earn recurring monthly commissions for every active subscriber you bring in.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#apply" className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-emerald-500/20">
              Apply Now
              <ArrowRight size={20} />
            </a>
            <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 bg-white/8 hover:bg-white/14 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors border border-white/15">
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-800 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: '30%', label: 'Recurring Commission', icon: DollarSign },
              { value: '90-day', label: 'Cookie Window', icon: TrendingUp },
              { value: '$0', label: 'Cost to Join', icon: Zap },
            ].map((stat) => {
              const StatIcon = stat.icon;
              return (
                <div key={stat.label}>
                  <StatIcon size={20} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-4xl font-bold tracking-tight">Simple. Transparent. Recurring.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.step} className="bg-gray-900 border border-gray-800 rounded-2xl p-7 relative">
                  <span className="absolute top-5 right-5 text-5xl font-black text-gray-800 leading-none">{step.step}</span>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                    <StepIcon size={20} className="text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Commission Tiers */}
      <section className="py-20 bg-gray-900/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3">Commission Tiers</p>
            <h2 className="text-4xl font-bold tracking-tight">Earn more as you grow</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-7 flex flex-col gap-5 ${
                  tier.highlighted
                    ? 'bg-emerald-600 ring-2 ring-emerald-400' :'bg-gray-900 border border-gray-800'
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${tier.highlighted ? 'text-emerald-100' : 'text-gray-400'}`}>
                    {tier.name}
                  </p>
                  <p className="text-5xl font-bold tracking-tight">{tier.commission}</p>
                  <p className={`text-sm mt-1 ${tier.highlighted ? 'text-emerald-100' : 'text-gray-400'}`}>recurring / month</p>
                  <p className={`text-xs mt-2 ${tier.highlighted ? 'text-emerald-200' : 'text-gray-500'}`}>{tier.requirement}</p>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-sm">
                      <CheckCircle size={14} className={tier.highlighted ? 'text-emerald-200' : 'text-emerald-400'} />
                      <span className={tier.highlighted ? 'text-white' : 'text-gray-300'}>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3">Earnings Potential</p>
            <h2 className="text-4xl font-bold tracking-tight">What could you earn?</h2>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 gap-0 text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 border-b border-gray-800">
              <span>Referrals</span>
              <span>Avg Plan</span>
              <span>Monthly</span>
              <span>Annual</span>
            </div>
            {earnings.map((row, i) => (
              <div key={i} className={`grid grid-cols-4 gap-0 px-6 py-4 text-sm ${i % 2 === 0 ? '' : 'bg-gray-900/50'} border-b border-gray-800/50 last:border-0`}>
                <span className="font-bold text-white">{row.referrals} clients</span>
                <span className="text-gray-400">{row.plan}</span>
                <span className="text-emerald-400 font-semibold">{row.monthly}</span>
                <span className="text-emerald-300 font-bold">{row.annual}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 text-center mt-3">Estimates based on 30% commission rate. Actual earnings vary.</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-gray-900 border border-gray-800 rounded-2xl p-7">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">&ldquo;{t.content}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Apply Form */}
      <section id="apply" className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-emerald-400 font-semibold text-sm uppercase tracking-widest mb-3">Apply Now</p>
            <h2 className="text-4xl font-bold tracking-tight mb-3">Join the affiliate program</h2>
            <p className="text-gray-400">Takes 2 minutes. Approved within 24 hours.</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle size={32} className="text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Application Submitted!</h3>
                <p className="text-gray-400 mb-6">
                  We'll review your application and send your affiliate credentials to <strong className="text-white">{form.email}</strong> within 24 hours.
                </p>
                <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                  ← Back to Home
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Website / Social Profile</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://yourwebsite.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">How will you promote FixMy.Money?</label>
                  <textarea
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    placeholder="Describe your audience and promotion strategy..."
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  Submit Application
                  <ArrowRight size={16} />
                </button>
                <p className="text-xs text-gray-500 text-center">
                  By applying, you agree to our affiliate terms and conditions.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
