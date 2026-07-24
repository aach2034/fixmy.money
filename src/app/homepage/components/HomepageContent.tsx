'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { trackTrialSignup, trackPricingPlanSelect, trackCtaClick } from '@/lib/analytics';
import { Menu, X, ChevronDown, CheckCircle2, Users, FileText, Lock, Sparkles, Shield, Check, AlertTriangle, Building2, TrendingUp, LayoutDashboard, ClipboardList, UserPlus, Upload, DollarSign, ArrowRight, Search, Database, KeyRound, History, ScanLine } from 'lucide-react';
import DemoVideoPlayer from './DemoVideoPlayer';
import LeadCaptureSection from './LeadCaptureSection';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Product Tour', href: '/product-tour' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];

const FEATURES = [
  { icon: Building2, title: 'Agency Dashboard', body: 'See the client pipeline, overdue bureau responses, open tasks, revenue, and cases awaiting approval.', badge: 'Operate', badgeColor: 'bg-blue-100 text-blue-700', color: 'text-blue-700', bg: 'bg-blue-50', span: '' },
  { icon: Users, title: 'Client Workspace', body: 'Keep identity data, agreements, authorizations, documents, communications, invoices, and complete history together.', badge: 'Organize', badgeColor: 'bg-cyan-100 text-cyan-800', color: 'text-cyan-700', bg: 'bg-cyan-50', span: '' },
  { icon: Search, title: 'Report Review', body: 'Review structured accounts, bureau differences, suspected inconsistencies, and source-page citations.', badge: 'Verify', badgeColor: 'bg-violet-100 text-violet-700', color: 'text-violet-600', bg: 'bg-violet-50', span: '' },
  { icon: ClipboardList, title: 'Evidence & Disputes', body: 'Organize selected items, evidence checklists, editable drafts, factual assertions, approvals, and delivery history.', badge: 'Approve', badgeColor: 'bg-amber-100 text-amber-800', color: 'text-amber-700', bg: 'bg-amber-50', span: '' },
  { icon: LayoutDashboard, title: 'Client Portal', body: 'Give clients a focused place for secure uploads, progress updates, tasks, messages, agreements, and invoices.', badge: 'Connect', badgeColor: 'bg-emerald-100 text-emerald-800', color: 'text-emerald-700', bg: 'bg-emerald-50', span: '' },
  { icon: Shield, title: 'Agency Administration', body: 'Manage team roles, branding, templates, billing, integrations, retention settings, and audit exports.', badge: 'Control', badgeColor: 'bg-slate-200 text-slate-700', color: 'text-slate-700', bg: 'bg-slate-100', span: '' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: UserPlus, title: 'Onboard & authorize', body: 'Create the client record, capture agreements, disclosures, identity details, and documented authorization.' },
  { step: '02', icon: Upload, title: 'Import & structure', body: 'Upload the report, extract structured facts, preserve source pages, and compare information across bureaus.' },
  { step: '03', icon: Search, title: 'Verify the evidence', body: 'Review suspected inconsistencies, supporting documents, confidence, and the person responsible for verification.' },
  { step: '04', icon: FileText, title: 'Draft & approve', body: 'Build an editable draft from verified facts, review every assertion, and record explicit human approval.' },
  { step: '05', icon: TrendingUp, title: 'Deliver & track', body: 'Log delivery, response deadlines, bureau outcomes, follow-up tasks, and the next review without losing history.' },
];

const COMPARISON = [
  { feature: 'Source-page citations', fixmy: true, crc: false },
  { feature: 'Structured fact provenance', fixmy: true, crc: false },
  { feature: 'Named human verification', fixmy: true, crc: false },
  { feature: 'Draft assertion review', fixmy: true, crc: false },
  { feature: 'Explicit approval record', fixmy: true, crc: false },
  { feature: 'Delivery and deadline history', fixmy: true, crc: true },
  { feature: 'Bureau response and outcome', fixmy: true, crc: true },
  { feature: 'Append-oriented audit trail', fixmy: true, crc: false },
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
    description: 'For growing agencies with team-based evidence review.',
    features: ['100 active clients', '5 team members', 'Everything in Starter', 'Structured report review', 'Evidence-linked draft assistance', 'Named verification and approval', 'Workflow templates', 'Response tracking', 'Priority Support'],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 249,
    description: 'For larger teams that need stronger oversight and controls.',
    features: ['Unlimited clients', '15 team members', 'Everything in Professional', 'Role-based review controls', 'Agency Dashboard', '100 GB storage', 'Data export', 'Priority support'],
    highlight: false,
    badge: null,
  },
];

const FAQS = [
  { q: 'What is FixMy.Money and who is it for?', a: 'FixMy.Money is business software for credit repair professionals — agencies, consultants, and financial coaches who help clients manage their credit profiles. It provides tools for client management, dispute workflows, billing, and documentation. Users are responsible for operating in compliance with CROA, FCRA, TSR, and all applicable laws.' },
  { q: 'How does the agency trial work?', a: 'Pay $1 today for 14 days of full access to the features included in your selected plan. After the trial, your subscription renews automatically at the chosen monthly rate unless you cancel.' },
  { q: 'Does FixMy.Money provide CROA-compliant workflows?', a: 'FixMy.Money supports CROA-aware workflows, documentation, and recordkeeping. Each business remains responsible for its own legal compliance. FixMy.Money provides workflow, documentation, and recordkeeping tools. It does not provide legal advice or guarantee compliance with federal, state, or local law.' },
  { q: 'What makes FixMy.Money different from generic credit repair software?', a: 'FixMy.Money is built around evidence traceability. Source documents, extracted facts, verification, draft assertions, approvals, delivery, responses, and outcomes stay connected in one auditable workflow. AI can propose and organize; a human verifies and approves.' },
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
            description: 'Evidence-first operating software for credit repair agencies. Onboard clients, verify report facts, approve authorized disputes, and track bureau outcomes without losing the audit trail.',
            offers: {
              '@type': 'AggregateOffer',
              lowPrice: '49',
              highPrice: '249',
              priceCurrency: 'USD',
            },
            featureList: [
              'Source-linked report review',
              'Evidence-linked draft assistance',
              'Client CRM',
              'Client Portal',
              'Document Storage',
              'Billing and Stripe Integration',
              'Named human approvals',
              'Versioned audit history',
              'Agency Dashboard',
              'Workflow templates',
              'Response deadline tracking',
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
      <div className="border-b border-emerald-200/80 bg-emerald-50 text-emerald-950" role="status">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold sm:px-6 sm:text-sm lg:px-8">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" aria-hidden="true" />
          <span>Service update: FixMy.Money is fully operational, including secure trial and subscription billing.</span>
        </div>
      </div>

      {/* NAVBAR */}
      <header className={`sticky top-0 left-0 right-0 z-40 border-b transition-all duration-200 ${scrolled ? 'border-slate-200 bg-white/95 shadow-sm backdrop-blur-md' : 'border-slate-100 bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between gap-6">
            <Link href="/" className="flex shrink-0 items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 shadow-sm">
                <Image src="/assets/images/app_logo.png" alt="" width={27} height={31} className="h-[31px] w-auto object-contain" priority unoptimized />
              </span>
              <span className="leading-none">
                <span className="block text-[19px] font-black tracking-[-0.035em] text-slate-950">FixMy<span className="text-blue-600">.</span>Money</span>
                <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Agency software</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-7 xl:flex" aria-label="Main navigation">
              {NAV_LINKS.map(link => (
                link.href.startsWith('#')
                  ? <a key={link.href} href={link.href} className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded">{link.label}</a>
                  : <Link key={link.href} href={link.href} className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded">{link.label}</Link>
              ))}
            </nav>
            <div className="hidden items-center gap-2 xl:flex">
              <Link href="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2">Sign In</Link>
              <button
                type="button"
                onClick={() => handleStartTrial(undefined, undefined, 'header_nav')}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
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
              className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 xl:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {/* Mobile navigation — id matches aria-controls */}
          <div
          id="mobile-navigation"
          className={`border-t border-slate-100 bg-white px-4 py-4 shadow-lg xl:hidden ${mobileOpen ? '' : 'hidden'}`}
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
                  <span className="h-[3px] w-11 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,.65)]" /> Evidence-first agency operations
                </div>
                <h1 className="mt-9 max-w-2xl text-5xl font-semibold leading-[0.94] tracking-[-0.045em] text-[#F4F8FC] sm:text-6xl lg:text-[78px]" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                  Turn credit-report evidence into a <span className="text-cyan-200">documented workflow.</span>
                </h1>
                <p className="mt-8 max-w-xl text-lg leading-8 text-[#BDCCDC] sm:text-xl">
                  Onboard clients, verify source evidence, prepare authorized disputes, record human approval, and track every response—without losing the audit trail.
                </p>
                <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => handleStartTrial(undefined, undefined, 'hero')} className="inline-flex items-center justify-center gap-6 rounded-2xl bg-cyan-400 px-8 py-4 text-base font-extrabold text-[#031322] shadow-[0_12px_35px_rgba(34,211,238,.18)] transition hover:-translate-y-0.5 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#031322]">
                    Start agency trial <ArrowRight size={22} />
                  </button>
                  <a href="#starter-kit" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#31566E] px-6 py-4 text-sm font-extrabold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#031322]">
                    Get the free agency kit <ArrowRight size={17} />
                  </a>
                </div>
                <p className="mt-5 text-sm font-medium leading-6 text-[#8298AD]">Built for credit-repair agencies · Human approval stays required</p>
              </div>

              <div className="relative rounded-[38px] border border-[#2A5671] bg-[#0A2940] p-5 shadow-[0_34px_80px_rgba(0,0,0,.25)] sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">Agency evidence workspace</h2>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-300 sm:text-sm">Approval required</span>
                </div>
                <div className="mt-8 rounded-[28px] border border-[#153B54] bg-[#031725] p-5 sm:p-8">
                  <div className="flex items-center gap-5">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-cyan-400 text-cyan-400"><FileText size={31} strokeWidth={1.6} /></div>
                    <div className="min-w-0 flex-1"><p className="text-lg font-extrabold text-white">Tradeline evidence review</p><p className="mt-1 text-sm text-[#8198AD] sm:text-base">Source page, bureau, facts, and authorization connected</p></div>
                    <div className="hidden h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-[5px] border-cyan-400 sm:flex"><span className="text-3xl font-extrabold text-white">84</span><span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#8BA0B4]">Ready</span></div>
                  </div>
                  <div className="mt-10 space-y-3">
                    {[
                      ['Source page and bureau linked', 'Verified', true],
                      ['Supporting evidence reviewed', 'Complete', true],
                      ['Final assertions and approval', 'Required', false],
                    ].map(([label, status, done]) => <div key={String(label)} className="flex items-center gap-4 rounded-2xl bg-[#0A2132] px-5 py-4"><span className={`flex h-5 w-5 items-center justify-center text-cyan-400 ${done ? '' : 'rounded-full border-2 border-cyan-400'}`}>{done ? <Check size={18} /> : null}</span><span className="min-w-0 flex-1 text-sm font-semibold text-[#BDCCDC] sm:text-base">{label}</span><span className="text-xs font-extrabold uppercase text-cyan-200 sm:text-sm">{status}</span></div>)}
                  </div>
                  <div className="mt-12 grid grid-cols-5 gap-2">
                    {['Import', 'Verify', 'Draft', 'Approve', 'Track'].map((label, index) => <div key={label} className="relative text-center"><div className={`relative z-10 mx-auto flex h-11 w-11 items-center justify-center rounded-full border ${index === 0 ? 'border-cyan-200 bg-cyan-400 text-[#031322]' : 'border-[#31566E] bg-[#092235] text-cyan-200'}`}>{index + 1}</div>{index < 4 && <span className="absolute left-[calc(50%+22px)] top-[21px] h-px w-[calc(100%-44px)] bg-cyan-400/70" />}<p className="mt-3 text-[11px] text-[#8298AD] sm:text-xs">{label}</p></div>)}
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
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7890A5]">Built for accountable agency work</p>
              {[
                { icon: Check, label: 'Source-linked facts' },
                { icon: Shield, label: 'Tenant-scoped records' },
                { icon: CheckCircle2, label: 'Human-verified approvals' },
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
                See how one report becomes verified facts, an authorized draft, a recorded approval, and a traceable bureau outcome.
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
                  { icon: FileText, label: 'Source-linked report review', body: 'Every extracted value stays connected to its report, bureau, source page, and confidence.' },
                  { icon: ClipboardList, label: 'Evidence-linked drafts', body: 'Editable drafts are assembled from verified facts, with every factual assertion available for review.' },
                  { icon: TrendingUp, label: 'Response tracking', body: 'Delivery dates, response deadlines, bureau outcomes, and next reviews stay on the same case history.' },
                  { icon: DollarSign, label: 'Revenue Dashboard', body: 'Track revenue, subscriptions, and business performance from one analytics view.' },
                  { icon: CheckCircle2, label: 'Human approval controls', body: 'The record shows who verified the evidence and who approved the final version before delivery.' },
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

        <LeadCaptureSection />

        {/* ── SECTION 2: PROBLEM ── */}
        <section className="py-20 bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-red-700 uppercase tracking-widest mb-3">The operational gap</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">A generated letter is not an evidence workflow</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">When reports, evidence, authorizations, drafts, approvals, and bureau responses live in separate tools, your team loses context—and your audit trail breaks.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: '📄', title: 'Facts lose their source', body: 'A disputed value should always point back to the document, page, bureau, and supporting evidence it came from.' },
                { icon: '✓', title: 'Approval becomes ambiguous', body: 'Teams need to know who verified each fact, which assertions entered the draft, and who approved the final version.' },
                { icon: '↻', title: 'Outcomes lose continuity', body: 'Delivery dates, response deadlines, bureau outcomes, and next reviews should remain attached to the same case history.' },
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
              <p className="text-sm font-semibold text-emerald-700 uppercase tracking-widest mb-3">The central workflow</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">One connected lifecycle, from lead to outcome</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">Lead → onboarding → authorization → report import → evidence verification → draft → approval → delivery → response → next review.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                {[
                  { icon: Upload, title: 'Preserve provenance', body: 'Every extracted value retains its report, bureau, source page, and confidence so reviewers can return to the evidence.' },
                  { icon: Search, title: 'Verify before drafting', body: 'AI can organize and flag ambiguity; authorized agency users confirm facts, inconsistencies, and supporting documents.' },
                  { icon: FileText, title: 'Control every assertion', body: 'Drafts are assembled from verified structured facts and editable templates—not invented accounts, dates, laws, or evidence.' },
                  { icon: ClipboardList, title: 'Keep append-oriented history', body: 'Corrections create a new version. Approvals, delivery, bureau responses, outcomes, and exports remain attributable.' },
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
                    { label: 'Source citation', desc: 'Document → page → extracted fact' },
                    { label: 'Verification', desc: 'Reviewer, decision, and supporting evidence' },
                    { label: 'Draft assertions', desc: 'Every factual statement mapped to verified data' },
                    { label: 'Approval & outcome', desc: 'Approver, delivery, response, and next review' },
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
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Traceability by design</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Every disputed item carries its own evidence trail</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">Your team can see what the report says, why an item needs review, what supports it, who approved it, and what happened next.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: FileText, title: 'What the report says', body: 'The exact extracted value stays connected to its report, bureau, page, and source context.', color: 'text-blue-600', bg: 'bg-blue-50' },
                { icon: Search, title: 'Suspected inconsistency', body: 'Reason codes and cross-bureau differences explain why the item is being reviewed.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { icon: Shield, title: 'Supporting evidence', body: 'Identity records, statements, correspondence, and other supporting files remain attached to the case.', color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { icon: Users, title: 'Verified by', body: 'Reviewer identity, notes, timestamps, and decisions make responsibility explicit.', color: 'text-amber-600', bg: 'bg-amber-50' },
                { icon: ClipboardList, title: 'Assertions & approval', body: 'See which verified facts appear in the draft and who approved the final version.', color: 'text-slate-700', bg: 'bg-slate-50' },
                { icon: TrendingUp, title: 'Delivery & response', body: 'Track when it was sent, when a response is due, the bureau outcome, and the next review.', color: 'text-violet-600', bg: 'bg-violet-50' },
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
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Six connected workspaces</p>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Built around how an agency actually operates</h2>
              <p className="text-lg text-slate-600 max-w-3xl mx-auto">Each surface supports the same report-to-response lifecycle instead of becoming another disconnected tool.</p>
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
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">From authorization to bureau outcome in five controlled stages</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">AI proposes and organizes. Your agency verifies the evidence and approves what moves forward.</p>
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
              <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Trustworthy workflow, not just faster document generation</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">FixMy.Money is designed to preserve evidence, decisions, accountability, and outcomes across the complete agency lifecycle.</p>
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
                <div className="px-6 py-4 text-center text-sm font-semibold text-slate-300">Basic letter tools</div>
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
            <p className="mt-8 text-center text-sm text-slate-500">AI can assist with classification and wording. It does not replace authorization, factual verification, or final human approval.</p>
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

        {/* ── FOUNDER STORY ── */}
        <section className="border-y border-slate-200 bg-slate-950 py-20 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-cyan-300">Founder Story</p>
                <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">Built from personal frustration with a process that felt impossible to navigate.</h2>
              </div>
              <div>
                <p className="text-lg leading-relaxed text-slate-300">
                  I did what I thought was right, yet found myself confronting unclear reporting, inconsistent outcomes, and progress that never felt permanent. That experience pushed me to study the process, understand the evidence, and build the organized workflow I wished had existed when I needed it.
                </p>
                <p className="mt-5 text-sm font-semibold text-white">— Adam Hamilton, Founder</p>
                <Link
                  href="/blog/why-i-built-fixmy-money"
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                >
                  Read why I built FixMy.Money <ArrowRight size={16} />
                </Link>
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

        {/* ── SECTION: SECURITY AND OPERATING CONTROLS ── */}
        <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #111827 60%, #0d1f3c 100%)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-3xl -translate-y-1/2 -translate-x-1/4" style={{ background: 'rgba(37,99,235,0.08)' }} />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl translate-y-1/2 translate-x-1/4" style={{ background: 'rgba(34,197,94,0.06)' }} />
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-3">Security and accountability</p>
              <h2 className="text-4xl font-extrabold text-white mb-4">Sensitive records need more than a disclaimer</h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                FixMy.Money combines workspace isolation, access controls, encryption, and attributable history to protect the report-to-response workflow.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Lock, title: 'Encrypted transport and storage', body: 'TLS protects data in transit; database and document storage are encrypted at rest.' },
                { icon: Database, title: 'Tenant-scoped records', body: 'Row-level security restricts client, report, dispute, billing, and audit records to the signed-in agency workspace.' },
                { icon: KeyRound, title: 'Roles and secure sessions', body: 'Verified sign-in, managed sessions, and role-based permissions limit access to sensitive agency actions.' },
                { icon: History, title: 'Attributable audit history', body: 'Significant actions retain timestamps and user attribution; standard users cannot rewrite audit entries.' },
                { icon: ScanLine, title: 'Controlled AI handling', body: 'AI assists classification and wording. Uploaded reports are not used to train models, and human review remains required.' },
                { icon: Shield, title: 'Backups and incident process', body: 'Managed backups, documented incident notification, responsible disclosure, and account-deletion requests support operations.' },
              ].map(item => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-6">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300"><ItemIcon size={20} /></div>
                    <h3 className="mb-2 text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-sm leading-6 text-slate-400">{item.body}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 text-center">
              <Link href="/security" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950">
                Review verified security details <ArrowRight size={16} />
              </Link>
              <p className="mx-auto mt-4 max-w-2xl text-xs leading-5 text-slate-500">Two-factor authentication is available through Google sign-in; native TOTP is not currently offered. FixMy.Money has not completed SOC 2 certification.</p>
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
              Evidence first · Human approved · Fully traceable
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
              Build a more trustworthy<br />credit repair agency workflow
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Bring onboarding, report evidence, dispute approvals, delivery, responses, and outcomes into one connected operating system.
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
      <footer className="border-t border-slate-800 bg-[#07111f] py-16 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-[1.7fr_1fr_1fr_1fr] lg:gap-12">
            <div className="col-span-2 lg:col-span-1">
              <Link href="/" className="inline-flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Image src="/assets/images/app_logo.png" alt="" width={29} height={34} className="h-[34px] w-auto object-contain" unoptimized />
                </span>
                <span className="text-xl font-black tracking-[-0.035em] text-white">FixMy<span className="text-cyan-300">.</span>Money</span>
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
                Evidence-first operating software for credit repair agencies. Verify facts, control approvals, and preserve the complete report-to-response history.
              </p>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-white">Platform</p>
              <ul className="space-y-3 text-sm">
                <li><Link href="/features" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Features</Link></li>
                <li><Link href="/pricing" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Pricing</Link></li>
                <li><Link href="/credit-repair-crm" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Credit Repair CRM</Link></li>
                <li><Link href="/credit-repair-dispute-software" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Dispute Software</Link></li>
                <li><Link href="/credit-repair-client-portal" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Client Portal</Link></li>
                <li><Link href="/credit-repair-automation" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Workflow Automation</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-white">Company</p>
              <ul className="space-y-3 text-sm">
                <li><Link href="/product-tour" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Product Tour</Link></li>
                <li><Link href="/demo" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Book Demo</Link></li>
                <li><Link href="/blog" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Blog</Link></li>
                <li><Link href="/contact" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Contact</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-white">Trust & Legal</p>
              <ul className="space-y-3 text-sm">
                <li><Link href="/terms" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Terms of Service</Link></li>
                <li><Link href="/privacy" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Privacy Policy</Link></li>
                <li><Link href="/security" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Security</Link></li>
                <li><Link href="/compliance" className="text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-5 border-t border-slate-800 pt-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs leading-5 text-slate-500">FixMy.Money provides business software for credit repair professionals. We do not provide consumer credit repair services, legal advice, or guarantee credit outcomes.</p>
              <p className="mt-2 text-xs text-slate-500">© 2026 FixMy.Money. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
              <Link href="/refund-policy" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Refund Policy</Link>
              <Link href="/cancellation-policy" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950 rounded">Cancellation</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
