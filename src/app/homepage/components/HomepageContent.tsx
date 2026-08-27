'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleDollarSign,
  CloudUpload,
  FileCheck2,
  FileText,
  Gauge,
  LockKeyhole,
  Mail,
  Menu,
  Monitor,
  RefreshCw,
  Scale,
  ShieldCheck,
  Star,
  Users,
  UserRound,
  UserRoundCheck,
  Zap,
} from 'lucide-react';
// import { CHECKOUT_PLANS } from '@/lib/stripe/plans'
import { CHECKOUT_PLANS, PLANS } from '@/lib/stripe/plans';
import { trackCtaClick, trackPricingPlanSelect, trackTrialSignup } from '@/lib/analytics';

const NAV_LINKS = [
  { label: 'Platform', href: '#platform', dropdown: true },
  { label: 'Solutions', href: '#solutions', dropdown: true },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '/resources', dropdown: true },
  { label: 'Company', href: '/about', dropdown: true },
];

const dashboardStats = [
  { label: 'Active Clients', value: '247', change: '+18 this week', icon: Users, tone: 'text-emerald-700' },
  { label: 'Reports Awaiting Review', value: '38', change: '+7 this week', icon: FileText, tone: 'text-blue-600' },
  { label: 'Disputes In Progress', value: '126', change: '+15 this week', icon: RefreshCw, tone: 'text-amber-500' },
  { label: 'Responses Received', value: '74', change: '+9 this week', icon: Mail, tone: 'text-purple-600' },
  { label: 'New Leads', value: '12', change: '+4 this week', icon: UserRoundCheck, tone: 'text-emerald-700' },
  { label: 'Revenue (MTD)', value: '$24,780', change: '+22% vs last month', icon: CircleDollarSign, tone: 'text-emerald-700' },
];

const appNav = ['Dashboard', 'Clients', 'Credit Reports', 'Disputes', 'Automations', 'Letters & Docs', 'Leads', 'Billing', 'Analytics', 'Client Portal', 'Team', 'Settings'];

const featureTiles = [
  { icon: Users, title: 'Client Management', copy: 'Organize clients, notes, documents, and activity in one place.' },
  { icon: FileText, title: 'Credit Report Analysis', copy: 'Instantly import and analyze reports from all 3 bureaus with AI-powered insights.' },
  { icon: Scale, title: 'Dispute Management', copy: 'Identify disputable items, automate follow-ups, and track every dispute.' },
  { icon: Mail, title: 'Letter Generation', copy: 'Create professional, FCRA-compliant letters in seconds.' },
  { icon: Zap, title: 'Automations', copy: 'Save hours with smart automations, reminders, and task workflows.' },
  { icon: Monitor, title: 'Client Portal', copy: 'Give your clients a branded portal to view progress and documents.' },
  { icon: BarChart3, title: 'Analytics & Reports', copy: 'Measure performance, track results, and grow with real data.' },
  { icon: ShieldCheck, title: 'Security & Compliance', copy: 'Enterprise security, audit logs, and built-in compliance tools.' },
];

const pricingPlans = [
  PLANS.starter,
  PLANS.professional,
  PLANS.agency,
  PLANS.enterprise,
];

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`relative grid shrink-0 place-items-center ${small ? 'h-8 w-8' : 'h-11 w-11'}`} aria-hidden="true">
      <span className="absolute left-[7%] top-[8%] h-[58%] w-[47%] skew-y-[-28deg] rounded-[5px] bg-[#93d7ce]" />
      <span className="absolute bottom-[7%] left-[7%] h-[58%] w-[47%] skew-y-[-28deg] rounded-[5px] bg-[#04a985]" />
      <span className="absolute bottom-[18%] right-[7%] h-[58%] w-[47%] skew-y-[-28deg] rounded-[5px] bg-[#087a78]" />
    </span>
  );
}

function Header() {
  const startTrial = () => {
    trackTrialSignup('professional', 'nav');
  };

  return (
    <header className="relative bg-[#020f27] text-white">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 sm:px-7 lg:px-9">
        <Link href="/" className="flex items-center gap-3" aria-label="FixMy.Money home">
          <BrandMark />
          <span>
            <span className="block text-[26px] font-black leading-none tracking-normal">
              FixMy<span className="text-[#05ad83]">.Money</span>
            </span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-[.24em] text-white/80">Credit Intelligence Platform</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary navigation">
          {NAV_LINKS.map((link) =>
            link.href.startsWith('#') ? (
              <a key={link.label} href={link.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-white transition hover:text-[#56dbbd]">
                {link.label}
                {link.dropdown && <ChevronDown size={14} />}
              </a>
            ) : (
              <Link key={link.label} href={link.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-white transition hover:text-[#56dbbd]">
                {link.label}
                {link.dropdown && <ChevronDown size={14} />}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <Link href="/login" onClick={() => trackCtaClick('Login', '/login', 'nav')} className="text-sm font-bold text-white">
            Log In
          </Link>
          <Link href="/signup?plan=professional" onClick={startTrial} className="rounded-md bg-[#04735d] px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-950/30 transition hover:bg-[#03634f]">
            Start $1 Trial
          </Link>
        </div>

        <button type="button" popoverTarget="homepage-mobile-nav" className="grid h-11 w-11 place-items-center rounded-md border border-white/15 lg:hidden" aria-label="Toggle navigation" aria-controls="homepage-mobile-nav">
          <Menu size={22} />
        </button>
        <div id="homepage-mobile-nav" popover="auto" className="inset-x-0 top-20 z-50 m-0 w-full max-w-none border-0 border-t border-white/10 bg-[#020f27] px-5 py-5 text-white shadow-2xl backdrop:bg-transparent lg:hidden">
          <div className="grid gap-4">
            {NAV_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="font-bold text-white">
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="font-bold text-white">
              Log In
            </Link>
            <Link href="/signup?plan=professional" onClick={startTrial} className="rounded-md bg-[#04735d] px-6 py-3 text-center font-black text-white">
              Start $1 Trial
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_26px_80px_-45px_rgba(2,15,39,.65)]">
      <div className="grid min-h-[690px] lg:grid-cols-[150px_1fr]">
        <aside className="hidden bg-[#021331] p-5 text-white lg:flex lg:flex-col">
          <BrandMark small />
          <div className="mt-9 space-y-2">
            {appNav.map((item, index) => (
              <div key={item} className={`flex h-9 items-center gap-2 rounded-md px-3 text-[11px] font-bold ${index === 0 ? 'bg-[#05866b]' : 'text-white/85'}`}>
                {index === 0 ? <Gauge size={14} /> : <span className="h-3 w-3 rounded-sm border border-current" />}
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-2 rounded-md bg-white/5 p-2 text-[10px]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 font-black">AH</span>
            <span>
              <b className="block">Adam Hamilton</b>
              <span className="text-white/60">Administrator</span>
            </span>
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex justify-center">
            <div className="grid w-full max-w-sm grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button className="flex items-center justify-center gap-2 rounded-md bg-white px-3 py-3 text-xs font-black text-[#05193a] shadow-sm">
                <UserRound size={18} className="text-slate-500" />
                <span>
                  Personal
                  <span className="block text-[10px] font-semibold text-slate-500">For individuals</span>
                </span>
              </button>
              <button className="flex items-center justify-center gap-2 rounded-md bg-[#021331] px-3 py-3 text-xs font-black text-white">
                <BriefcaseBusiness size={18} />
                <span>
                  Business
                  <span className="block text-[10px] font-semibold text-white/70">For professionals</span>
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#05193a]">Good morning, Adam</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Here&apos;s what&apos;s happening in your business today.</p>
            </div>
            <div className="flex gap-3">
              <span className="rounded-md border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-600">May 12 - May 18, 2026</span>
              <Link href="/client-management" className="rounded-md bg-[#04735d] px-4 py-2 text-[11px] font-black text-white">
                + Add Client
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboardStats.map(({ label, value, change, icon: Icon, tone }) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex justify-between gap-3">
                  <span className="text-[11px] font-black text-[#05193a]">{label}</span>
                  <Icon className={tone} size={23} />
                </div>
                <p className="mt-5 text-3xl font-black text-[#05193a]">{value}</p>
                <p className="mt-1 text-[11px] font-bold text-[#04735d]">{change}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_.92fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-black text-[#05193a]">Dispute Status</h3>
              <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
                <div className="relative grid h-28 w-28 place-items-center rounded-full bg-[conic-gradient(#4f70f0_0_43%,#04a985_43%_72%,#ffb432_72%_87%,#ef746f_87%_94%,#e5e7eb_94%_100%)]">
                  <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white text-center">
                    <b className="block text-2xl text-[#05193a]">126</b>
                    <span className="block text-[10px] font-bold text-slate-500">Total</span>
                  </span>
                </div>
                <div className="grid flex-1 gap-2 text-[11px]">
                  {[
                    ['In Progress', '126 (43%)', 'bg-blue-600'],
                    ['Waiting for Response', '86 (29%)', 'bg-emerald-700'],
                    ['Completed', '55 (18%)', 'bg-amber-500'],
                    ['Re-Disputed', '22 (7%)', 'bg-orange-500'],
                    ['Cancelled', '5 (3%)', 'bg-red-500'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-2 font-semibold text-slate-600">
                        <span className={`h-2 w-2 rounded-full ${color}`} />
                        {label}
                      </span>
                      <b className="text-[#05193a]">{value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-black text-[#05193a]">Reports Processed</h3>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-3xl font-black text-[#05193a]">342</p>
                <span className="pb-1 text-xs font-black text-[#04735d]">+12%</span>
              </div>
              <div className="mt-7 h-28">
                <svg viewBox="0 0 320 110" className="h-full w-full" role="img" aria-label="Reports processed line chart">
                  <defs>
                    <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#5d83ff" stopOpacity=".22" />
                      <stop offset="100%" stopColor="#5d83ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M10 94 L48 72 L86 81 L124 52 L162 68 L200 34 L238 48 L286 16 L312 7 L312 110 L10 110 Z" fill="url(#chartFill)" />
                  <path d="M10 94 L48 72 L86 81 L124 52 L162 68 L200 34 L238 48 L286 16 L312 7" fill="none" stroke="#3366eb" strokeWidth="3" />
                  {[10, 48, 86, 124, 162, 200, 238, 286, 312].map((x, index) => (
                    <circle key={x} cx={x} cy={[94, 72, 81, 52, 68, 34, 48, 16, 7][index]} r="3" fill="#fff" stroke="#3366eb" strokeWidth="2" />
                  ))}
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-black text-[#05193a]">Recent Activity</h3>
              <div className="mt-4 space-y-3 text-[11px]">
                {[
                  ['New report imported for Michael Johnson', 'TransUnion', '2m ago'],
                  ['Dispute advanced to Round 2 for Sarah Williams', 'Equifax', '15m ago'],
                  ['Response received from Experian', 'Experian', '1h ago'],
                  ['New client lead from Website', '', '2h ago'],
                ].map(([event, tag, time]) => (
                  <div key={event} className="flex items-center gap-3">
                    <FileCheck2 size={14} className="text-blue-600" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-600">{event}</span>
                    {tag && <span className="rounded bg-blue-50 px-2 py-1 font-bold text-blue-600">{tag}</span>}
                    <span className="text-slate-400">{time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[#05193a]">Upcoming Tasks</h3>
                <Link href="/workflow-task-management" className="text-[10px] font-black text-blue-600">View All</Link>
              </div>
              <div className="mt-4 space-y-3 text-[11px]">
                {[
                  ['Follow up on 12 pending responses', 'Today'],
                  ['Review 8 reports', 'Today'],
                  ['Send 15 dispute letters', 'Tomorrow'],
                  ['Client onboarding calls (3)', 'Tomorrow'],
                ].map(([task, due]) => (
                  <label key={task} className="flex items-center gap-3 font-semibold text-slate-600">
                    <span className="h-3 w-3 rounded border border-slate-300" />
                    <span className="flex-1">{task}</span>
                    <span className={due === 'Today' ? 'font-bold text-red-700' : 'text-emerald-700'}>{due}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudienceCards({ onStart }: { onStart: (plan: string, location: string) => void }) {
  return (
    <section id="solutions" className="px-5 pb-4 sm:px-7">
      <div className="mx-auto max-w-[1240px] rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-center text-2xl font-black tracking-[-.02em] text-[#05193a]">Powerful software for every path to better credit.</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <article className="grid overflow-hidden rounded-lg bg-gradient-to-br from-[#edf8f3] to-white lg:grid-cols-[180px_1fr]">
            <div className="relative min-h-[250px]">
              <Image src="/assets/images/homepage-individual-credit.png" alt="Individual reviewing credit progress on a phone" fill sizes="(max-width: 1024px) 100vw, 220px" className="object-cover object-center" unoptimized />
            </div>
            <div className="p-7">
              <span className="rounded-full border border-[#b8ead8] bg-[#e3f7ef] px-4 py-1 text-xs font-black uppercase tracking-wider text-[#04795f]">For Individuals</span>
              <h3 className="mt-5 text-2xl font-black tracking-[-.02em] text-[#05193a]">Take control of your own credit.</h3>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">Upload your reports, understand what&apos;s hurting you, identify potentially disputable information, create your letters, and track your progress.</p>
              <div className="mt-6 grid gap-3 text-xs font-bold text-[#05193a] sm:grid-cols-2">
                {['Analyze all 3 bureaus', 'Generate letters', 'Identify negative items', 'Track responses & results', 'Build dispute strategy', 'AI Assistant to guide you'].map((feature) => (
                  <span key={feature} className="flex items-center gap-2">
                    <Check size={14} className="text-[#04735d]" />
                    {feature}
                  </span>
                ))}
              </div>
              <Link href="/signup?plan=starter" onClick={() => onStart('starter', 'individual_card')} className="mt-7 inline-flex items-center gap-3 rounded-md bg-[#04735d] px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15">
                Start Fixing My Credit <ArrowRight size={16} />
              </Link>
            </div>
          </article>

          <article className="grid overflow-hidden rounded-lg bg-gradient-to-br from-[#eef5ff] to-white lg:grid-cols-[1fr_190px]">
            <div className="p-7">
              <span className="rounded-full border border-[#bdd7ff] bg-[#e6f0ff] px-4 py-1 text-xs font-black uppercase tracking-wider text-[#0645a3]">For Professionals</span>
              <h3 className="mt-5 text-2xl font-black tracking-[-.02em] text-[#05193a]">Everything you need to run your credit business.</h3>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">Manage clients, automate workflows, generate documents, provide a branded client experience, and grow your business.</p>
              <div className="mt-6 grid gap-3 text-xs font-bold text-[#05193a] sm:grid-cols-2">
                {['Client & lead management', 'Letter & document generation', 'Credit report analysis', 'Billing & subscriptions', 'Dispute automation', 'White label & API access'].map((feature) => (
                  <span key={feature} className="flex items-center gap-2">
                    <Check size={14} className="text-blue-600" />
                    {feature}
                  </span>
                ))}
              </div>
              <Link href="/signup?plan=professional" onClick={() => onStart('professional', 'business_card')} className="mt-7 inline-flex items-center gap-3 rounded-md bg-[#021331] px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20">
                Explore Business Software <ArrowRight size={16} />
              </Link>
            </div>
            <div className="relative min-h-[250px]">
              <Image src="/assets/images/homepage-business-credit.png" alt="Credit repair professional using business software on a laptop" fill sizes="(max-width: 1024px) 100vw, 220px" className="object-cover object-center" unoptimized />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export default function HomepageContent() {
  const checkoutPlans = useMemo(() => new Set(CHECKOUT_PLANS.map((plan) => plan.id)), []);

  const start = (plan = 'professional', location = 'homepage') => {
    trackTrialSignup(plan, location);
    const selectedPlan = pricingPlans.find((item) => item.id === plan);
    if (selectedPlan?.monthlyPrice) {
      trackPricingPlanSelect(selectedPlan.id, selectedPlan.monthlyPrice, location);
    }
  };

  const goTo = (href: string, label: string, location: string) => {
    trackCtaClick(label, href, location);
  };

  return (
    <div className="a11y-light min-h-screen bg-[#fbfcfd] font-sans text-[#05193a]">
      <Header />

      <main>
        <section id="platform" className="border-b border-slate-200 bg-gradient-to-b from-white to-[#f7fbfa] px-5 py-7 sm:px-7">
          <div className="mx-auto grid max-w-[1240px] items-center gap-9 lg:grid-cols-[.78fr_1.42fr]">
            <div className="py-8 lg:py-12">
              <p className="text-sm font-black uppercase tracking-[.18em] text-[#04735d]">One platform. Two ways to use it.</p>
              <h1 className="mt-5 max-w-[520px] font-serif text-[46px] font-black leading-[1.05] tracking-normal text-[#05193a] sm:text-[56px] lg:text-[57px]">
                The Platform for Better Credit.
                <span className="block text-[#058866]">Run your credit business—or take control of your own.</span>
              </h1>
              <p className="mt-6 max-w-[500px] text-lg leading-8 text-slate-600">
                Powerful credit software for professionals and individuals. Analyze reports, understand negative items, build disputes, generate letters, and track progress from one platform.
              </p>
              <div className="mt-7 grid max-w-[440px] gap-4 sm:grid-cols-2">
                <Link href="/signup?plan=starter" onClick={() => start('starter', 'hero_individual')} className="flex min-h-[74px] items-center justify-between gap-4 rounded-lg bg-[#04735d] px-5 py-4 text-left text-white shadow-xl shadow-emerald-900/15">
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><UserRound size={22} /></span>
                    <span className="text-sm font-black">I&apos;m Fixing My Own Credit</span>
                  </span>
                  <ArrowRight size={20} />
                </Link>
                <Link href="/signup?plan=professional" onClick={() => start('professional', 'hero_business')} className="flex min-h-[74px] items-center justify-between gap-4 rounded-lg bg-[#021331] px-5 py-4 text-left text-white shadow-xl shadow-slate-900/20">
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-md border border-white/25"><BriefcaseBusiness size={22} /></span>
                    <span className="text-sm font-black">I Run a Credit Business</span>
                  </span>
                  <ArrowRight size={20} />
                </Link>
              </div>
              <div className="mt-2 grid max-w-[440px] grid-cols-2 gap-4 text-center text-xs font-semibold text-slate-600">
                <span>For individuals</span>
                <span>For professionals & agencies</span>
              </div>
              <div className="mt-9 grid max-w-[560px] gap-5 sm:grid-cols-3">
                {[
                  [ShieldCheck, 'Bank-Level Security', '256-bit encryption'],
                  [CloudUpload, 'Secure Infrastructure', 'Data protection controls'],
                  [ShieldCheck, '$1 for 14 Days', 'Credit card required'],
                ].map(([Icon, title, copy]) => (
                  <div key={title as string} className="flex items-center gap-3">
                    <Icon size={22} className="shrink-0 text-[#021331]" />
                    <span>
                      <b className="block text-[11px] text-[#05193a]">{title as string}</b>
                      <span className="text-[10px] font-semibold text-slate-500">{copy as string}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <DashboardPreview />
          </div>
        </section>

        <AudienceCards onStart={start} />

        <section className="px-5 pb-4 sm:px-7">
          <div className="mx-auto max-w-[1240px] rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-sm">
            <h2 className="text-center text-2xl font-black tracking-[-.02em] text-[#05193a]">Everything you need. All in one platform.</h2>
            <div className="mt-7 grid gap-y-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
              {featureTiles.map(({ icon: Icon, title, copy }, index) => (
                <Link key={title} href={index === 1 ? '/credit-report-import' : index === 2 ? '/disputes' : index === 3 ? '/dispute-letter-management' : index === 5 ? '/client-portal/login' : index === 6 ? '/dashboard' : index === 7 ? '/security' : '/client-management'} className="border-slate-200 px-4 text-center transition hover:-translate-y-0.5 hover:text-[#04735d] lg:border-l first:lg:border-l-0">
                  <Icon size={40} className="mx-auto text-[#04735d]" strokeWidth={1.8} />
                  <h3 className="mt-5 text-[11px] font-black text-[#05193a]">{title}</h3>
                  <p className="mx-auto mt-3 max-w-[140px] text-[11px] font-medium leading-5 text-slate-600">{copy}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-6 sm:px-7">
          <div className="mx-auto grid max-w-[1240px] gap-8 rounded-lg bg-[#021331] px-8 py-7 text-white shadow-xl shadow-slate-900/15 lg:grid-cols-[1.05fr_.9fr_.9fr_.78fr] lg:px-9">
            <div>
              <h2 className="text-2xl font-black leading-tight">Built for credit professionals and chosen by individuals.</h2>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex gap-1 text-[#06b98e]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={22} fill="currentColor" />
                  ))}
                </div>
                <span className="text-sm font-bold">Designed for secure, guided credit workflows</span>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-6 text-sm font-black text-white/85">
                <span>Credit report analysis</span>
                <span>Dispute workflows</span>
                <span>Client portal</span>
                <span>Billing tools</span>
              </div>
            </div>
            <blockquote className="border-white/15 lg:border-l lg:pl-8">
              <span className="text-4xl font-black leading-none text-[#06b98e]">&ldquo;</span>
              <p className="mt-1 text-sm font-semibold leading-6">&ldquo;Organize reports, disputes, documents, tasks, and client updates in one focused workspace.&rdquo;</p>
              <footer className="mt-4 text-sm text-white/75">For credit professionals</footer>
            </blockquote>
            <blockquote className="border-white/15 lg:border-l lg:pl-8">
              <span className="text-4xl font-black leading-none text-[#06b98e]">&ldquo;</span>
              <p className="mt-1 text-sm font-semibold leading-6">&ldquo;Upload reports, understand negative items, build disputes, generate letters, and track progress.&rdquo;</p>
              <footer className="mt-4 text-sm text-white/75">For individuals</footer>
            </blockquote>
            <div className="grid grid-cols-2 gap-5 border-white/15 lg:border-l lg:pl-8">
              <div className="text-center">
                <ShieldCheck className="mx-auto" size={48} />
                <p className="mt-3 text-xs font-black">Security<br />Controls</p>
              </div>
              <div className="text-center">
                <LockKeyhole className="mx-auto" size={48} />
                <p className="mt-3 text-xs font-black">256-BIT<br />ENCRYPTION</p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-5 pb-12 sm:px-7">
          <div className="mx-auto grid max-w-[1240px] gap-5 lg:grid-cols-[1.25fr_1fr_1fr_1fr_1fr_.9fr]">
            <div className="py-6">
              <h2 className="text-3xl font-black tracking-[-.03em] text-[#05193a]">Simple, transparent pricing.</h2>
              <p className="mt-3 text-lg text-slate-600">No hidden fees. Cancel anytime.</p>
              <Link href="/pricing" onClick={() => trackCtaClick('View full pricing comparison', '/pricing', 'pricing_intro')} className="mt-12 inline-flex items-center gap-3 text-sm font-black text-[#04735d]">
                View full pricing comparison <ArrowRight size={16} />
              </Link>
            </div>

            {pricingPlans.map((plan) => {
              const hasCheckout = checkoutPlans.has(plan.id);
              const href = hasCheckout ? `/signup?plan=${plan.id}` : '/demo';
              return (
                <article key={plan.id} className="relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  {plan.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#04735d] px-5 py-1 text-[10px] font-black uppercase tracking-wider text-white">Most Popular</span>}
                  <h3 className="text-lg font-black text-[#05193a]">{plan.name}</h3>
                  <p className="mt-1 min-h-9 text-xs font-semibold leading-5 text-slate-500">{plan.description}</p>
                  <p className="mt-5 text-[#05193a]">
                    {plan.monthlyPrice ? (
                      <>
                        <b className="text-3xl font-black">${plan.monthlyPrice}</b>
                        <span className="text-sm font-bold"> /mo</span>
                      </>
                    ) : (
                      <b className="text-3xl font-black">Custom</b>
                    )}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{plan.monthlyPrice ? 'Billed monthly' : 'Custom pricing'}</p>
                  <Link href={href} onClick={() => (hasCheckout ? start(plan.id, 'pricing_card') : goTo(href, 'Schedule Demo', 'pricing_card'))} className={`mt-7 block w-full rounded-md px-4 py-3 text-center text-xs font-black text-white ${plan.id === 'enterprise' ? 'bg-[#021331]' : 'bg-[#04735d]'}`}>
                    {plan.id === 'enterprise' ? 'Schedule Demo' : 'Start $1 Trial'}
                  </Link>
                </article>
              );
            })}

            <div className="rounded-lg bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black text-[#05193a]">All plans include:</h3>
              <div className="mt-4 space-y-3 text-xs font-bold text-slate-600">
                {['All Core Features', 'Unlimited Disputes', 'Client Portal', 'Email & Chat Support', 'Regular Updates', 'Cancel Anytime'].map((item) => (
                  <p key={item} className="flex items-center gap-2">
                    <Check size={14} className="text-[#04735d]" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
