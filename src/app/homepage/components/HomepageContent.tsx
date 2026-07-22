'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { trackTrialSignup, trackPricingPlanSelect, trackCtaClick } from '@/lib/analytics';
import { Menu, X, ChevronDown, CheckCircle2, Users, FileText, CreditCard, Lock, Sparkles, GitBranch, Shield, Zap, Brain, Bot, Check, AlertTriangle, Building2, TrendingUp, Inbox, BookOpen, LayoutDashboard, ClipboardList, UserPlus, Upload, Send, DollarSign, ChevronRight, Play, ArrowRight, Search } from 'lucide-react';
import DemoVideoPlayer from './DemoVideoPlayer';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Product Tour', href: '/product-tour' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

const FEATURES = [
  { icon: Brain, title: 'AI Credit Report Analysis', body: 'Upload any credit report and AI assists authorized users in identifying potential negative items, inconsistencies, and review opportunities.', badge: 'AI', badgeColor: 'bg-violet-100 text-violet-700', color: 'text-violet-600', bg: 'bg-violet-50', span: 'lg:col-span-2' },
  { icon: Zap, title: 'AI Dispute Letter Generator', body: 'Generate editable dispute-letter drafts. No FixMy.Money approval is required; your business verifies the facts and consumer authorization before use.', badge: 'AI', badgeColor: 'bg-violet-100 text-violet-700', color: 'text-blue-600', bg: 'bg-blue-50', span: '' },
  { icon: Users, title: 'Client CRM', body: 'Organized client profiles with dispute history, notes, tasks, timelines, and full audit trails.', badge: 'Core', badgeColor: 'bg-blue-100 text-blue-700', color: 'text-blue-600', bg: 'bg-blue-50', span: '' },
  { icon: LayoutDashboard, title: 'Client Portal', body: 'White-labeled client-facing portal where clients track their own progress, upload documents, and communicate with your team.', badge: 'Core', badgeColor: 'bg-blue-100 text-blue-700', color: 'text-indigo-600', bg: 'bg-indigo-50', span: '' },
  { icon: FileText, title: 'Document Storage', body: 'Secure cloud storage for credit reports, contracts, dispute evidence, and compliance documents.', badge: 'Core', badgeColor: 'bg-blue-100 text-blue-700', color: 'text-slate-600', bg: 'bg-slate-50', span: '' },
  { icon: CreditCard, title: 'Billing & Stripe Integration', body: 'Charge clients automatically. Manage subscriptions, invoices, and payment history without leaving the platform.', badge: 'Core', badgeColor: 'bg-blue-100 text-blue-700', color: 'text-emerald-700', bg: 'bg-emerald-50', span: '' },
  { icon: GitBranch, title: 'Task Automation', body: 'Build automation rules for onboarding, disputes, and billing. Keep your team on schedule without manual follow-up.', badge: 'Pro', badgeColor: 'bg-amber-100 text-amber-700', color: 'text-amber-600', bg: 'bg-amber-50', span: '' },
  { icon: BookOpen, title: 'Education Portal', body: 'White-labeled educational content to keep clients engaged and informed throughout the process.', badge: 'Agency', badgeColor: 'bg-rose-100 text-rose-700', color: 'text-rose-600', bg: 'bg-rose-50', span: '' },
  { icon: Building2, title: 'Agency Dashboard', body: "Bird's-eye view of your entire agency: revenue, disputes, client pipeline, and team performance in one place.", badge: 'Agency', badgeColor: 'bg-rose-100 text-rose-700', color: 'text-blue-700', bg: 'bg-blue-50', span: '' },
  { icon: ClipboardList, title: 'Workflow Templates', body: 'Pre-built dispute workflow templates for common negative item types. Start fast, customize as you grow.', badge: 'Pro', badgeColor: 'bg-amber-100 text-amber-700', color: 'text-teal-600', bg: 'bg-teal-50', span: '' },
  { icon: Inbox, title: 'Lead Intake Forms', body: 'Embeddable intake forms that capture leads, qualify prospects, and automatically create client records.', badge: 'Pro', badgeColor: 'bg-amber-100 text-amber-700', color: 'text-orange-600', bg: 'bg-orange-50', span: '' },
  { icon: TrendingUp, title: 'Progress Tracking', body: 'Real-time dispute progress tracking with bureau response timelines and client-facing status reports.', badge: 'Core', badgeColor: 'bg-blue-100 text-blue-700', color: 'text-emerald-700', bg: 'bg-emerald-50', span: 'lg:col-span-2' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: UserPlus, title: 'Add a Client', body: 'Create a client record, send the intake form, and collect signed agreements — all from one screen.' },
  { step: '02', icon: Upload, title: 'Upload or Review Credit Report Data', body: 'Upload a credit report PDF or connect bureau data. AI assists authorized users in identifying potential negative items and review opportunities.' },
  { step: '03', icon: Brain, title: 'Generate Dispute Workflow', body: 'AI suggests possible workflows and creates editable drafts. Your business independently verifies every fact and authorization before use.' },
  { step: '04', icon: Send, title: 'Send, Track, and Manage Progress', body: 'Send disputes, track bureau response timelines, log updates, and keep clients informed through their portal.' },
  { step: '05', icon: DollarSign, title: 'Bill Clients and Grow Your Agency', body: 'Automate billing via Stripe, track revenue, and use analytics to identify growth opportunities.' },
];

const COMPARISON = [
  { feature: 'AI Credit Analysis', fixmy: true, crc: false },
  { feature: 'AI Dispute Generation', fixmy: true, crc: false },
  { feature: 'Automated Workflows', fixmy: true, crc: true },
  { feature: 'Modern Dashboard', fixmy: true, crc: false },
  { feature: 'Stripe Native Billing', fixmy: true, crc: false },
  { feature: 'Client CRM', fixmy: true, crc: true },
  { feature: 'White-Label Client Portal', fixmy: true, crc: true },
  { feature: 'Credit Education Portal', fixmy: true, crc: false },
  { feature: 'Task Automation', fixmy: true, crc: true },
  { feature: 'AI Risk Assessment', fixmy: true, crc: false },
  { feature: 'Real-Time Analytics', fixmy: true, crc: false },
  { feature: 'Mobile Responsive', fixmy: true, crc: false },
  { feature: 'Lead Intake Forms', fixmy: true, crc: false },
  { feature: 'Workflow Templates', fixmy: true, crc: true },
];

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'For solo operators and new credit repair businesses.',
    features: ['25 active clients', '1 team member', 'Client portal', 'Dispute management', '5 GB storage', 'Stripe billing integration', 'Audit log', 'Email support'],
    highlight: false,
    badge: null,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 129,
    description: 'For growing agencies that need automation and AI tools.',
    features: ['100 active clients', '5 team members', 'Everything in Starter', 'AI Credit Analysis', 'AI Dispute Generator', 'Task Automation', 'Workflow Templates', 'Lead Intake Forms', 'Priority Support'],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 249,
    description: 'For larger teams, higher volume, and advanced workflows.',
    features: ['Unlimited clients', '15 team members', 'Everything in Professional', 'White-Label Portal', 'Agency Dashboard', '100 GB storage', 'API Access', 'Priority support'],
    highlight: false,
    badge: null,
  },
];

const FAQS = [
  { q: 'What is FixMy.Money and who is it for?', a: 'FixMy.Money is business software for credit repair professionals — agencies, consultants, and financial coaches who help clients manage their credit profiles. It provides tools for client management, dispute workflows, billing, and documentation. Users are responsible for operating in compliance with CROA, FCRA, TSR, and all applicable laws.' },
  { q: 'How does the agency trial work?', a: 'Pay $1 today for 14 days of full access to the features included in your selected plan. After the trial, your subscription renews automatically at the chosen monthly rate unless you cancel.' },
  { q: 'Does FixMy.Money provide CROA-compliant workflows?', a: 'FixMy.Money supports CROA-aware workflows, documentation, and recordkeeping. Each business remains responsible for its own legal compliance. FixMy.Money provides workflow, documentation, and recordkeeping tools. It does not provide legal advice or guarantee compliance with federal, state, or local law.' },
  { q: 'What makes FixMy.Money different from Credit Repair Cloud?', a: 'FixMy.Money is built AI-first. We offer AI credit analysis, AI dispute generation, and AI risk assessment — features Credit Repair Cloud does not have. We also provide a modern dashboard, native Stripe billing, lead intake forms, and a credit education portal, all in one platform.' },
  { q: 'Can I manage multiple clients from one account?', a: 'Yes. Depending on your plan, you can manage 25 clients (Starter), 100 clients (Professional), or unlimited clients (Agency). Each client gets their own portal, dispute tracking, and billing profile.' },
  { q: 'Do you guarantee credit score improvements or item removals?', a: 'No. FixMy.Money is a software platform that provides tools for credit repair professionals. We do not guarantee credit score improvements, item removals, or any specific credit outcomes. Results depend on individual circumstances, bureau responses, and the accuracy of information on credit reports.' },
  { q: 'What happens after my trial ends?', a: "Your account automatically converts to a paid subscription at your chosen plan rate. You\'ll receive an email reminder before the trial ends. Cancel any time from your billing settings." },
  { q: 'Is my client data secure?', a: 'Yes. FixMy.Money uses enterprise-grade encryption, secure cloud infrastructure, and role-based access controls. All data is stored securely and isolated per workspace. We do not sell or share client data.' },
];

const TRUST_BADGES = [
  { icon: Shield, label: 'CROA-Aware Workflows', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: Lock, label: 'Stripe Secure Payments', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { icon: FileText, label: 'Audit Trail Logging', color: 'text-violet-600', bg: 'bg-violet-50' },
  { icon: AlertTriangle, label: 'Compliance Documentation Tools', color: 'text-amber-600', bg: 'bg-amber-50' },
];

export default function HomepageContent() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);

  const plansWithPriceIds = PLANS.map(plan => ({
    ...plan,
    priceId:
      plan.id === 'starter'
        ? process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
        : plan.id === 'professional'
        ? process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID,
  }));

  useEffect(() => {
    let rafId: number;
    const onScroll = () => {
      // Use rAF to batch DOM reads and avoid forced reflow on scroll
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 20);
        setShowStickyCta(y > 700);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleStartTrial = (plan?: string, price?: number, location?: string) => {
    const p = plan || 'professional';
    const loc = location || (plan ? 'pricing_card' : 'cta');
    trackTrialSignup(p, loc);
    if (plan && price !== undefined) {
      trackPricingPlanSelect(plan, price, 'homepage_pricing');
    }
    router.push(`/signup?plan=${p}`);
  };

  const handleBookDemo = (location: string) => {
    trackCtaClick('Book Demo', '/demo', location);
    router.push('/demo');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* SKIP TO MAIN CONTENT */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:ring-2 focus:ring-blue-600"
      >
        Skip to main content
      </a>

      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'FixMy.Money',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: 'https://fixmy.money',
            description: 'Credit repair software for modern agencies. Manage clients, dispute workflows, billing, documents, and progress tracking from one organized workspace.',
            offers: {
              '@type': 'AggregateOffer',
              lowPrice: '49',
              highPrice: '249',
              priceCurrency: 'USD',
            },
            featureList: [
              'AI Credit Report Analysis',
              'AI Dispute Letter Generator',
              'Client CRM',
              'Client Portal',
              'Document Storage',
              'Billing and Stripe Integration',
              'Task Automation',
              'Education Portal',
              'Agency Dashboard',
              'Workflow Templates',
              'Lead Intake Forms',
              'Progress Tracking',
            ],
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
          })
        }}
      />

      {/* STICKY CTA */}
      {showStickyCta && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl">
          <Sparkles size={16} className="text-blue-400" />
          <span className="text-sm font-semibold">Start your agency trial today</span>
          <button
            type="button"
            onClick={() => handleStartTrial()}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Start Agency Trial
          </button>
          <button
            type="button"
            onClick={() => setShowStickyCta(false)}
            aria-label="Dismiss trial banner"
            className="text-slate-400 hover:text-white ml-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* SERVICE UPDATE */}
      <div className="border-b border-emerald-200 bg-emerald-50 text-emerald-950" role="status">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2.5 text-center text-sm font-semibold sm:px-6 lg:px-8">
          <CheckCircle2 size={17} className="shrink-0 text-emerald-600" aria-hidden="true" />
          <span>Service update: FixMy.Money is fully operational, including secure trial and subscription billing.</span>
        </div>
      </div>

      {/* NAVBAR */}
      <header className={`sticky top-0 left-0 right-0 z-40 transition-all duration-200 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded-lg">
              <Image src="/assets/images/fix_my_money_logo-1780535345534.png" alt="FixMy.Money — Credit Repair Software for Agencies" width={140} height={36} className="object-contain h-auto" priority unoptimized />
            </Link>
            <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
              {NAV_LINKS.map(link => (
                link.href.startsWith('#')
                  ? <a key={link.href} href={link.href} className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded">{link.label}</a>
                  : <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded">{link.label}</Link>
              ))}
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded-lg">Sign In</Link>
              <Link href="/product-tour" className="text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-xl hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">View Product Tour</Link>
              <button
                type="button"
                onClick={() => handleStartTrial(undefined, undefined, 'header_nav')}
                className="text-sm font-bold bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                Start Agency Trial
              </button>
            </div>
            {/* Mobile menu button — accessible name + aria attributes */}
            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {/* Mobile navigation — id matches aria-controls */}
          <div
          id="mobile-navigation"
          className={`md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-2 shadow-lg ${mobileOpen ? '' : 'hidden'}`}
        >
          {NAV_LINKS.map(link => (
            link.href.startsWith('#')
              ? <a key={link.href} href={link.href} className="block text-sm font-medium text-slate-700 py-2 px-3 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2" onClick={() => setMobileOpen(false)}>{link.label}</a>
              : <Link key={link.href} href={link.href} className="block text-sm font-medium text-slate-700 py-2 px-3 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2" onClick={() => setMobileOpen(false)}>{link.label}</Link>
          ))}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <Link href="/login" className="block text-sm font-medium text-slate-700 py-2 px-3 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2" onClick={() => setMobileOpen(false)}>Sign In</Link>
            <Link href="/demo" className="block text-sm font-medium text-slate-700 py-2 px-3 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2" onClick={() => { setMobileOpen(false); trackCtaClick('Book Demo Mobile Nav', '/demo', 'mobile_nav'); }}>Book Demo</Link>
            <button
              type="button"
              onClick={() => { setMobileOpen(false); handleStartTrial(); }}
              className="w-full text-sm font-bold bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              Start Agency Trial
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LANDMARK */}
      <main id="main-content">

        {/* ── SECTION 1: HERO ── */}
        <section className="relative overflow-hidden border-b border-[#183146] bg-[#031322] py-16 text-white sm:py-24">
          <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(40,204,229,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(40,204,229,.07) 1px, transparent 1px)', backgroundSize: '88px 88px' }} />
          <div className="pointer-events-none absolute -left-32 top-24 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="relative grid items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
              <div>
                <div className="inline-flex items-center gap-4 text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-200 sm:text-sm">
                  <span className="h-[3px] w-11 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.65)]" /> Clarity before action
                </div>
                <h1 className="mt-9 max-w-2xl text-5xl font-semibold leading-[0.94] tracking-[-0.045em] text-[#F4F8FC] sm:text-6xl lg:text-[78px]" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                  Evidence-first credit dispute <span className="text-cyan-200">readiness.</span>
                </h1>
                <p className="mt-8 max-w-xl text-lg leading-8 text-[#BDCCDC] sm:text-xl">
                  Turn complex credit reports into a clear, documented review process. Verify every detail, understand what is supportable, and stay in control before anything moves forward.
                </p>
                <div className="mt-9 flex flex-col gap-5 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => handleStartTrial(undefined, undefined, 'hero')} className="inline-flex items-center justify-center gap-6 rounded-2xl bg-cyan-400 px-8 py-4 text-base font-extrabold text-[#031322] shadow-[0_12px_35px_rgba(34,211,238,.18)] transition hover:-translate-y-0.5 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#031322]">
                    Review my report <ArrowRight size={22} />
                  </button>
                  <span className="max-w-[210px] text-sm font-medium leading-6 text-[#8298AD]">Private by design · You approve every action</span>
                </div>
              </div>

              <div className="relative rounded-[38px] border border-[#2A5671] bg-[#0A2940] p-5 shadow-[0_34px_80px_rgba(0,0,0,.25)] sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">Your evidence workspace</h2>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-300 sm:text-sm">Secure review</span>
                </div>
                <div className="mt-8 rounded-[28px] border border-[#153B54] bg-[#031725] p-5 sm:p-8">
                  <div className="flex items-center gap-5">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-cyan-400 text-cyan-400"><FileText size={31} strokeWidth={1.6} /></div>
                    <div className="min-w-0 flex-1"><p className="text-lg font-extrabold text-white">Credit report review</p><p className="mt-1 text-sm text-[#8198AD] sm:text-base">Evidence organized across all bureaus</p></div>
                    <div className="hidden h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-cyan-400 sm:flex"><span className="text-3xl font-extrabold text-white">84</span><span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#8BA0B4]">Ready</span></div>
                  </div>
                  <div className="mt-10 space-y-3">
                    {[
                      ['Identity details cross-checked', 'Verified', true],
                      ['Account evidence organized', 'Complete', true],
                      ['Your review and approval', 'Required', false],
                    ].map(([label, status, done]) => <div key={String(label)} className="flex items-center gap-4 rounded-2xl bg-[#0A2132] px-5 py-4"><span className={`flex h-5 w-5 items-center justify-center text-cyan-400 ${done ? '' : 'rounded-full border-2 border-cyan-400'}`}>{done ? <Check size={18} /> : null}</span><span className="min-w-0 flex-1 text-sm font-semibold text-[#BDCCDC] sm:text-base">{label}</span><span className="text-xs font-extrabold uppercase text-cyan-200 sm:text-sm">{status}</span></div>)}
                  </div>
                  <div className="mt-12 grid grid-cols-5 gap-2">
                    {['Upload', 'Verify', 'Score', 'Draft', 'Approve'].map((label, index) => <div key={label} className="relative text-center"><div className={`relative z-10 mx-auto flex h-11 w-11 items-center justify-center rounded-full border ${index === 0 ? 'border-cyan-200 bg-cyan-400 text-[#031322]' : 'border-[#31566E] bg-[#092235] text-cyan-200'}`}>{index + 1}</div>{index < 4 && <span className="absolute left-[calc(50%+22px)] top-[21px] h-px w-[calc(100%-44px)] bg-cyan-400/70" />}<p className="mt-3 text-[11px] text-[#8298AD] sm:text-xs">{label}</p></div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST STRIP ── */}
        <section className="border-b border-[#183146] bg-[#031322] py-10" aria-label="Platform highlights">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-12">
            <div className="grid gap-6 border-t border-[#183146] pt-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-9">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7890A5]">Built for informed decisions</p>
              {[
                { icon: Check, label: 'Evidence-based analysis' },
                { icon: Shield, label: 'Encrypted document handling' },
                { icon: CheckCircle2, label: 'No action without approval' },
              ].map(item => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 text-[#BDCCDC]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#31566E] text-cyan-400"><ItemIcon size={16} /></span>
                    <span className="text-sm font-semibold leading-5">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION: SEE FIXMY.MONEY IN ACTION (immediately below hero) ── */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-[#F7FAFB] py-24">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" style={{ background: 'rgba(37,99,235,0.08)' }} />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" style={{ background: 'rgba(34,197,94,0.05)' }} />
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-14">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-700">Product Walkthrough</p>
              <h2 className="mb-4 text-4xl font-extrabold text-[#071B2E]">See FixMy.Money In Action</h2>
              <p className="mx-auto max-w-2xl text-lg text-[#526579]">
                Watch how credit repair professionals use FixMy.Money to manage clients, automate disputes, and grow their business.
              </p>
            </div>

            {/* Video + Feature Cards side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Video stays visible */}
              <div className="w-full">
                <DemoVideoPlayer
                  placement="features"
                  showTrialCta
                  onTrialClick={() => handleStartTrial(undefined, undefined, 'features_video_cta')}
                />
              </div>

              {/* Feature cards */}
              <div className="space-y-4">
                {[
                  { icon: Users, label: 'Client Management', body: 'Organized client profiles with full history, notes, tasks, and communication logs.' },
                  { icon: FileText, label: 'Credit Report Analysis', body: 'AI assists authorized users in identifying potential negative items, inconsistencies, and review opportunities.' },
                  { icon: Brain, label: 'AI Dispute Generation', body: 'Generate editable dispute-letter drafts. Your business independently verifies every fact and authorization before use.' },
                  { icon: TrendingUp, label: 'Progress Tracking', body: 'Real-time dispute status tracking with bureau response timelines and client-facing reports.' },
                  { icon: DollarSign, label: 'Revenue Dashboard', body: 'Track revenue, subscriptions, and business performance from one analytics view.' },
                  { icon: Zap, label: 'Business Automation', body: 'Automate routine administrative steps while keeping decisions and final use under your business’s control.' },
                ].map(item => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-4 p-4 rounded-2xl transition-all"
                      style={{ background: '#FFFFFF', border: '1px solid #DCE7EC' }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E8F8FB', border: '1px solid #BDECF4' }}>
                        <ItemIcon size={18} className="text-cyan-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}>
                            <Check size={10} className="text-emerald-400" />
                          </span>
                          <h3 className="text-sm font-bold text-[#071B2E]">{item.label}</h3>
                        </div>
                        <p className="text-xs leading-relaxed text-[#526579]">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: PROBLEM ── */}
        <section className="py-20 bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-red-700 uppercase tracking-widest mb-3">The Problem</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Running a credit repair business is harder than it should be</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">Most credit repair professionals are stitching together spreadsheets, email, and outdated software — wasting hours on admin instead of growing their business.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: '📋', title: 'Manual Dispute Tracking', body: 'Tracking disputes across spreadsheets and email threads leads to missed deadlines, lost documents, and frustrated clients.' },
                { icon: '💸', title: 'Disconnected Billing', body: 'Chasing payments manually, sending invoices from separate tools, and losing track of who owes what costs you time and revenue.' },
                { icon: '🔄', title: 'No Scalable Workflow', body: 'Without automation, every new client means more manual work. Growth creates chaos instead of leverage.' },
              ].map(p => (
                <div key={p.title} className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm">
                  <div className="text-3xl mb-4">{p.icon}</div>
                  <h3 className="font-bold text-slate-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 3: WORKFLOW ── */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-emerald-700 uppercase tracking-widest mb-3">Dispute Workflow</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">From report review to tracked dispute — in one workspace</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">Review reports, generate drafts, track disputes, and manage follow-ups without switching tools.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                {[
                  { icon: Upload, title: 'Review credit reports', body: 'Upload reports and let AI identify negative items, dispute opportunities, and risk factors instantly.' },
                  { icon: FileText, title: 'Generate dispute drafts', body: 'AI creates editable drafts for selected items. Verify, customize, obtain authorization, and decide whether to send.' },
                  { icon: TrendingUp, title: 'Track dispute progress', body: 'Monitor bureau response timelines, log updates, and keep clients informed through their portal.' },
                  { icon: ClipboardList, title: 'Manage follow-ups', body: 'Automated reminders and task assignments keep your team on schedule without manual tracking.' },
                ].map(s => {
                  const SIcon = s.icon;
                  return (
                    <div key={s.title} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <SIcon size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 mb-1">{s.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-6 border border-white/10">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-4">Workflow Metrics (Your Data)</p>
                <div className="space-y-3">
                  {[
                    { label: 'Disputes Sent', desc: 'Track every letter sent to bureaus' },
                    { label: 'Responses Received', desc: 'Log bureau responses and outcomes' },
                    { label: 'Client Tasks Completed', desc: 'Monitor workflow progress per client' },
                    { label: 'Documents Uploaded', desc: 'Organize reports, contracts, evidence' },
                  ].map((item, i) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">{i + 1}</div>
                      <div className="flex-1">
                        <span className="text-sm text-slate-300 font-medium">{item.label}</span>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: CLIENT OPERATIONS ── */}
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Client Operations</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">CRM, portal, billing, notes, and documents — all connected</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">Every client interaction, document, and payment in one organized workspace.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Users, title: 'Client CRM', body: 'Organized client profiles with full history, notes, tasks, and communication logs.', color: 'text-blue-600', bg: 'bg-blue-50' },
                { icon: LayoutDashboard, title: 'Client Portal', body: 'White-labeled portal where clients track progress, upload documents, and communicate with your team.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { icon: CreditCard, title: 'Stripe Billing', body: 'Automated billing, subscription management, and payment tracking — powered by Stripe.', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { icon: ClipboardList, title: 'Notes & Tasks', body: 'Internal notes, task assignments, and follow-up reminders keep your team aligned.', color: 'text-amber-600', bg: 'bg-amber-50' },
                { icon: FileText, title: 'Document Storage', body: 'Secure storage for credit reports, contracts, dispute evidence, and compliance documents.', color: 'text-slate-700', bg: 'bg-slate-50' },
                { icon: TrendingUp, title: 'Progress Tracking', body: 'Real-time dispute status tracking with bureau response timelines and client-facing reports.', color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map(item => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.title} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-blue-100 transition-all">
                    <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center mb-4`}>
                      <ItemIcon size={22} className={item.color} />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 text-sm">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: FEATURE GRID ── */}
        <section id="features" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Platform Features</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Everything you need to run a credit repair business</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">From AI-powered dispute workflows to client billing — FixMy.Money replaces 5+ tools with one unified platform.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((feat, idx) => {
                const FeatIcon = feat.icon;
                return (
                  <div
                    key={idx}
                    className={`relative bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-100 transition-all group ${feat.span}`}
                  >
                    <div className={`w-11 h-11 rounded-xl ${feat.bg} flex items-center justify-center mb-4`}>
                      <FeatIcon size={22} className={feat.color} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 text-sm">{feat.title}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${feat.badgeColor}`}>{feat.badge}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{feat.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SECTION 6: HOW IT WORKS ── */}
        <section id="how-it-works" className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">How It Works</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">From first client to growing agency in 5 steps</h2>
              <p className="text-lg text-slate-600 max-w-xl mx-auto">FixMy.Money guides your entire workflow — from client intake to billing and beyond.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {HOW_IT_WORKS.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div key={step.step} className="relative">
                    {idx < HOW_IT_WORKS.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-[calc(100%-8px)] w-full h-0.5 bg-gradient-to-r from-blue-200 to-slate-200 z-0" />
                    )}
                    <div className="relative z-10 bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-200 hover:shadow-md transition-all h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                          <StepIcon size={16} className="text-white" />
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Step {step.step}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm mb-2">{step.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-10">
              <button
                type="button"
                onClick={() => handleStartTrial(undefined, undefined, 'features_section')}
                className="inline-flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                <Sparkles size={18} />
                Start Agency Trial
              </button>
            </div>
          </div>
        </section>

        {/* ── SECTION 7: COMPARISON ── */}
        <section id="compare" className="py-24 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Why FixMy.Money</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">The modern AI-first alternative to Credit Repair Cloud</h2>
              <p className="text-lg text-slate-600 max-w-xl mx-auto">Credit Repair Cloud was built for a different era. FixMy.Money is built for the AI age.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="grid grid-cols-3 bg-slate-900 border-b border-slate-700">
                <div className="px-6 py-4 text-sm font-semibold text-slate-300">Feature</div>
                <div className="px-6 py-4 text-center">
                  <div className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-4 py-1.5 rounded-full">
                    <Sparkles size={13} />
                    FixMy.Money
                  </div>
                </div>
                <div className="px-6 py-4 text-center text-sm font-semibold text-slate-300">Credit Repair Cloud</div>
              </div>
              {COMPARISON.map((row, idx) => (
                <div key={row.feature} className={`grid grid-cols-3 border-b border-slate-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <div className="px-6 py-3.5 text-sm font-medium text-slate-700">{row.feature}</div>
                  <div className="px-6 py-3.5 flex justify-center">
                    {row.fixmy ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check size={13} className="text-emerald-700" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                        <X size={13} className="text-red-700" />
                      </div>
                    )}
                  </div>
                  <div className="px-6 py-3.5 flex justify-center">
                    {row.crc ? (
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <Check size={13} className="text-slate-600" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
                        <X size={13} className="text-red-700" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/credit-repair-cloud-alternative" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded">
                See the full comparison <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION 8: COMPLIANCE SUPPORT ── */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Compliance Support</p>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Tools to support your compliance process</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">FixMy.Money provides CROA-aware workflows and documentation tools. Your compliance is your responsibility — we give you the infrastructure to manage it properly.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {TRUST_BADGES.map(badge => {
                const BadgeIcon = badge.icon;
                return (
                  <div key={badge.label} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center">
                    <div className={`w-12 h-12 rounded-2xl ${badge.bg} flex items-center justify-center mx-auto mb-3`}>
                      <BadgeIcon size={22} className={badge.color} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{badge.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex gap-3">
                <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800 mb-2">Legal Disclaimer</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    FixMy.Money is not a law firm and does not provide legal advice. Users are responsible for their own contracts, disclosures, fees, client communications, and legal compliance. FixMy.Money provides software tools only — users are solely responsible for complying with the Credit Repair Organizations Act (CROA), Fair Credit Reporting Act (FCRA), Telemarketing Sales Rule (TSR), applicable state laws, and all other regulations. We do not guarantee credit score improvements, item removals, or any specific credit outcomes.
                  </p>
                  <div className="mt-3 flex gap-3">
                    <Link href="/compliance" className="text-xs font-semibold text-amber-800 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 rounded">View Compliance Information</Link>
                    <Link href="/terms" className="text-xs font-semibold text-amber-800 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 rounded">Terms of Service</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 9: PRICING ── */}
        <section id="pricing" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Pricing</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Transparent pricing for credit repair agencies</h2>
              <p className="text-lg text-slate-600 max-w-xl mx-auto">$1 today for 14 days. Then your selected monthly rate. Cancel anytime.</p>
            </div>

            {/* Pricing disclaimer */}
            <div className="max-w-3xl mx-auto mb-8 bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 text-center">
              <p className="text-xs text-blue-700 leading-relaxed">
                FixMy.Money provides business software for credit repair professionals. We do not provide consumer credit repair services or guarantee credit outcomes.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
              {['No Long-Term Contracts', 'Cancel Anytime', 'Secure Payments via Stripe'].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  {item}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plansWithPriceIds.map(plan => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-8 flex flex-col transition-all ${
                    plan.highlight
                      ? 'bg-blue-600 border-blue-600 shadow-2xl shadow-blue-200 scale-105'
                      : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">{plan.badge}</span>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className={`text-lg font-bold mb-1 ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                    <p className={`text-sm mb-4 ${plan.highlight ? 'text-blue-50' : 'text-slate-600'}`}>{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>${plan.price}</span>
                      <span className={`text-sm ${plan.highlight ? 'text-blue-50' : 'text-slate-600'}`}>/month</span>
                    </div>
                  </div>
                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map(feat => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-white' : 'text-emerald-700'}`} />
                        <span className={plan.highlight ? 'text-white' : 'text-slate-700'}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => handleStartTrial(plan.id, plan.price)}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      plan.highlight
                        ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-sm focus:ring-blue-300 focus:ring-offset-blue-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 focus:ring-blue-600 focus:ring-offset-white'
                    }`}
                  >
                    Start Agency Trial — {plan.name}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-600 mt-8">No setup fees · Cancel anytime · Secure payments via Stripe</p>
            <p className="text-center text-xs text-slate-600 mt-2 max-w-2xl mx-auto">
              FixMy.Money does not guarantee credit score improvements, item removals, or specific credit outcomes. Results depend on individual circumstances and bureau responses.
            </p>
          </div>
        </section>

        {/* ── SECTION 10: FAQ ── */}
        <section id="faq" className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">FAQ</p>
              <h2 className="text-4xl font-extrabold text-slate-900">Frequently asked questions</h2>
            </div>
            <div className="space-y-3">
              {FAQS.map((faq, idx) => (
                <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-inset"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    aria-expanded={openFaq === idx}
                  >
                    <span className="font-semibold text-slate-900 text-sm pr-4">{faq.q}</span>
                    <ChevronDown size={16} className={`text-slate-600 shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-5">
                      <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION: BUILT TO SCALE YOUR CREDIT REPAIR BUSINESS ── */}
        <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #111827 60%, #0d1f3c 100%)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4" style={{ background: 'rgba(37,99,235,0.08)' }} />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl translate-y-1/2 translate-x-1/4" style={{ background: 'rgba(34,197,94,0.06)' }} />
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            {/* Section header */}
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-3">Scale Your Business</p>
              <h2 className="text-4xl font-extrabold text-white mb-4">Built To Scale Your Credit Repair Business</h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                Whether you're a solo consultant or running a full agency, FixMy.Money gives you the infrastructure to scale — without the chaos.
              </p>
            </div>

            {/* Video above copy */}
            <div className="max-w-4xl mx-auto mb-14">
              <DemoVideoPlayer
                placement="business_owner"
                showTrialCta
                showDemoCta
                onTrialClick={() => handleStartTrial(undefined, undefined, 'business_owner_video_cta')}
                onDemoClick={() => handleBookDemo('business_owner_video_cta')}
              />
            </div>

            {/* Feature list below video */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                  Automate disputes, manage hundreds of clients, and grow your revenue from one organized workspace.
                </p>
                <div className="space-y-4 mb-8">
                  {[
                    { icon: Users, label: 'Manage unlimited clients with full CRM', color: 'text-blue-400' },
                    { icon: Brain, label: 'AI-powered dispute generation in seconds', color: 'text-violet-400' },
                    { icon: DollarSign, label: 'Automated billing via Stripe', color: 'text-emerald-400' },
                    { icon: TrendingUp, label: 'Real-time analytics and revenue forecasting', color: 'text-amber-400' },
                    { icon: Building2, label: "Agency dashboard for bird's-eye oversight", color: 'text-blue-400' },
                  ].map(item => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <ItemIcon size={16} className={item.color} />
                        </div>
                        <span className="text-sm text-slate-300 font-medium">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => handleStartTrial(undefined, undefined, 'business_owner_section')}
                  className="inline-flex items-center gap-2.5 text-white font-bold text-base px-8 py-4 rounded-2xl transition-all hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
                  style={{ background: '#2563EB', boxShadow: '0 8px 32px rgba(37,99,235,0.4)' }}
                >
                  <Sparkles size={18} />
                  Start $1 Trial
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'Solo Consultants', body: 'Manage your first 50 clients with professional tools, automated billing, and a client portal — without hiring staff.' },
                  { title: 'Growing Agencies', body: 'Scale to 250+ clients with AI dispute generation, workflow automation, and team task management.' },
                  { title: 'Established Agencies', body: 'Run unlimited clients, white-label the portal, access the API, and get a dedicated success manager.' },
                ].map(tier => (
                  <div key={tier.title} className="p-5 rounded-2xl" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
                    <h3 className="text-sm font-bold text-white mb-2">{tier.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{tier.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 11: FINAL CTA ── */}
        <section className="py-24 bg-gradient-to-br from-slate-950 via-[#0a1628] to-[#0d1f3c] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-emerald-600/5 blur-3xl translate-y-1/2 -translate-x-1/4" />
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-8">
              <Sparkles size={13} />
              The modern alternative to Credit Repair Cloud
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
              Launch and scale your<br />credit repair agency today
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Start your agency trial. Full access to features in your selected plan. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button
                type="button"
                onClick={() => handleStartTrial(undefined, undefined, 'footer_cta')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-2xl shadow-blue-600/30 transition-all hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <Sparkles size={18} />
                Start Agency Trial
              </button>
              <Link
                href="/demo"
                onClick={() => trackCtaClick('Book Demo Footer CTA', '/demo', 'footer_cta')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-white/20 text-white font-semibold text-base px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Book a Demo
              </Link>
            </div>
            <p className="text-sm text-slate-300">No guaranteed results · Compliance is your responsibility · Cancel anytime</p>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-950 text-slate-300 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <Link href="/" className="focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded inline-block">
                <Image src="/assets/images/fix_my_money_logo-1780535345534.png" alt="FixMy.Money" width={130} height={34} className="object-contain h-auto brightness-0 invert opacity-70 mb-4" unoptimized />
              </Link>
              <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
                Credit repair software for modern agencies. Manage clients, dispute workflows, billing, documents, and progress tracking from one organized workspace.
              </p>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                FixMy.Money provides business software for credit repair professionals. We do not provide consumer credit repair services or guarantee credit outcomes. Not legal advice.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Platform</p>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/features" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Features</Link></li>
                <li><Link href="/pricing" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Pricing</Link></li>
                <li><Link href="/credit-repair-crm" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Credit Repair CRM</Link></li>
                <li><Link href="/credit-repair-dispute-software" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Dispute Software</Link></li>
                <li><Link href="/credit-repair-client-portal" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Client Portal</Link></li>
                <li><Link href="/credit-repair-automation" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Workflow Automation</Link></li>
                <li><Link href="/credit-repair-cloud-alternative" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">vs Credit Repair Cloud</Link></li>
                <li><Link href="/demo" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Book Demo</Link></li>
                <li><Link href="/blog" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Blog</Link></li>
                <li><Link href="/contact" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Contact</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">Legal & Compliance</p>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/terms" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Privacy Policy</Link></li>
                <li><Link href="/refund-policy" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Refund Policy</Link></li>
                <li><Link href="/cancellation-policy" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Cancellation Policy</Link></li>
                <li><Link href="/security" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Security</Link></li>
                <li><Link href="/compliance" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">© 2026 FixMy.Money. All rights reserved. FixMy.Money is a software platform, not a credit repair organization. We do not provide consumer credit repair services.</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <Link href="/privacy" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Terms</Link>
              <Link href="/refund-policy" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Refund Policy</Link>
              <Link href="/cancellation-policy" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Cancellation</Link>
              <Link href="/security" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Security</Link>
              <Link href="/compliance" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Compliance</Link>
              <Link href="/contact" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
