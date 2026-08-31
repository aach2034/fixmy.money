'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileSearch,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CHECKOUT_PLANS, PLANS } from '@/lib/stripe/plans';
import { trackCtaClick, trackEvent, trackPricingPlanSelect, trackTrialSignup } from '@/lib/analytics';

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Individuals', href: '/individuals' },
  { label: 'For Business', href: '/professionals' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '/resources', dropdown: true },
];

const FEATURES = [
  { icon: Sparkles, title: 'AI Report Analysis', copy: 'Find issues others miss' },
  { icon: BadgeCheck, title: 'Prioritize & Score', copy: 'Focus on what matters' },
  { icon: ShieldCheck, title: 'Guided Disputes', copy: 'Take action with confidence' },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: 'Bank-Level Security', copy: '256-bit encryption' },
  { icon: LockKeyhole, title: 'Private & Secure', copy: 'Your data is protected' },
  { icon: CalendarClock, title: 'Cancel Anytime', copy: 'No long-term contracts' },
];

const WORKFLOW = [
  { icon: FileSearch, title: '1. Upload Your Report', copy: 'Securely upload your credit report.' },
  { icon: Sparkles, title: '2. AI Analyzes Everything', copy: 'We find issues and estimate dispute likelihood.' },
  { icon: ClipboardCheck, title: '3. Get Your Plan', copy: 'See what to dispute first and why it matters.' },
  { icon: Send, title: '4. Take Action', copy: 'Generate letters, track progress, and get results.' },
];

const pricingPlans = [PLANS.starter, PLANS.professional, PLANS.agency, PLANS.enterprise];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="FixMy.Money home">
      <span className={`${compact ? 'h-8 w-8' : 'h-9 w-9'} relative grid shrink-0 place-items-center rounded-full`}>
        <span className="absolute h-full w-full rounded-full border-[3px] border-[#18b95e]" />
        <span className="absolute h-[54%] w-[54%] rounded-full border-[3px] border-[#1769e0] border-r-transparent border-t-transparent" />
        <CheckCircle2 className="relative z-10 text-[#128f40]" size={compact ? 18 : 21} strokeWidth={3} />
      </span>
      <span className={`${compact ? 'text-[21px]' : 'text-[26px]'} font-black leading-none text-[#061642]`}>
        FixMy.Money
      </span>
    </Link>
  );
}

function Header({ onStart }: { onStart: (plan: string, location: string) => void }) {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white/95 backdrop-blur lg:block">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-8">
      <Logo />
      <nav className="flex items-center gap-7" aria-label="Primary navigation">
        {NAV_LINKS.map((link) =>
          link.href.startsWith('#') ? (
            <a key={link.label} href={link.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 transition hover:text-[#079735]">
              {link.label}
              {link.dropdown && <ChevronDown size={14} />}
            </a>
          ) : (
            <Link key={link.label} href={link.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700 transition hover:text-[#079735]">
              {link.label}
              {link.dropdown && <ChevronDown size={14} />}
            </Link>
          ),
        )}
      </nav>
      <div className="flex items-center gap-3">
        <Link href="/login" onClick={() => trackCtaClick('Sign In', '/login', 'nav')} className="rounded-lg px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">
          Sign In
        </Link>
        <Link href="/signup?plan=professional" onClick={() => onStart('professional', 'nav')} className="rounded-lg bg-[#079735] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#067d2c]">
          Start $1 Trial
        </Link>
      </div>
      </div>
    </header>
  );
}

function ProductPreview({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className={`relative overflow-hidden border border-slate-200 bg-white shadow-[0_24px_90px_-50px_rgba(6,22,66,.55)] ${mobile ? 'rounded-lg' : 'rounded-xl'}`}>
      <div className={`${mobile ? 'block' : 'grid lg:grid-cols-[150px_1fr]'}`}>
        {!mobile && (
          <aside className="hidden bg-[#061b48] p-5 text-white lg:block">
            <div className="mb-7 flex items-center gap-2 text-xs font-black text-white">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#079735]"><CheckCircle2 size={16} strokeWidth={3} /></span>
              FixMy.Money
            </div>
            {['Dashboard', 'Reports', 'AI Analysis', 'Disputes', 'Letters', 'Progress', 'History', 'Settings'].map((item, index) => (
              <div key={item} className={`mb-2 flex h-9 items-center gap-2 rounded-md px-3 text-xs font-bold ${index === 0 ? 'bg-white/10 text-white' : 'text-white/80'}`}>
                {index === 0 ? <LayoutDashboard size={14} /> : index === 7 ? <Settings size={14} /> : <span className="h-3 w-3 rounded-sm border border-current" />}
                {item}
              </div>
            ))}
          </aside>
        )}
        <div className={`${mobile ? 'p-3' : 'p-4 sm:p-5'}`}>
          <h2 className={`mb-4 font-black text-[#061642] ${mobile ? 'text-sm' : 'text-base'}`}>Overview</h2>
          <div className={`grid gap-3 ${mobile ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
            <div className={`rounded-lg border border-slate-200 bg-white ${mobile ? 'p-3' : 'p-5'}`}>
              <p className="text-xs font-black text-[#061642]">Overall Report Grade</p>
              <div className={`mt-4 flex items-center ${mobile ? 'gap-2' : 'gap-4'}`}>
                <div className={`grid place-items-center rounded-full bg-[conic-gradient(#18a952_0_62%,#cad2df_62%_100%)] p-2 ${mobile ? 'h-16 w-16' : 'h-20 w-20'}`}>
                  <div className={`grid h-full w-full place-items-center rounded-full bg-white font-black text-[#061642] ${mobile ? 'text-3xl' : 'text-4xl'}`}>B</div>
                </div>
                <div>
                  <p className="text-sm font-black text-[#079735]">Good</p>
                  {!mobile && <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">Your credit is improving. Keep going!</p>}
                </div>
              </div>
              <p className={`${mobile ? 'mt-2 text-[10px]' : 'mt-5 text-xs'} font-semibold text-slate-500`}>Next update in 7 days</p>
            </div>
            <div className={`rounded-lg border border-slate-200 bg-white ${mobile ? 'p-3' : 'p-5'}`}>
              <p className="text-xs font-black text-[#061642]">Potentially Disputable Items</p>
              <p className={`${mobile ? 'mt-3 text-3xl' : 'mt-4 text-4xl'} font-black text-[#061642]`}>23</p>
              <p className="text-xs font-semibold text-slate-500">Items Found</p>
              <div className={`${mobile ? 'mt-3 space-y-1.5 text-[10px]' : 'mt-4 space-y-2 text-xs'} font-semibold`}>
                {[
                  ['High Priority', '8', 'bg-red-500'],
                  ['Medium Priority', '10', 'bg-amber-400'],
                  ['Low Priority', '5', 'bg-[#18a952]'],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-[#061642]"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
              <Link href="/credit-report-import" onClick={() => trackCtaClick('Review All Items', '/credit-report-import', 'preview')} className={`${mobile ? 'mt-3 bg-[#079735] py-2 text-[10px]' : 'mt-5 bg-[#061b48] py-2.5 text-xs'} block rounded-md px-4 text-center font-black text-white`}>
                Review All Items
              </Link>
            </div>
          </div>
          <div className={`${mobile ? 'mt-3 p-3' : 'mt-4 p-5'} rounded-lg border border-slate-200 bg-white`}>
            <p className="text-xs font-black text-[#061642]">Credit Scores</p>
            <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 text-center">
              {[
                ['Experian', '682', '28 pts'],
                ['Equifax', '699', '34 pts'],
                ['TransUnion', '672', '22 pts'],
              ].map(([bureau, score, points]) => (
                <div key={bureau} className="px-2">
                  <p className="text-xs font-semibold text-slate-500">{bureau}</p>
                  <p className={`${mobile ? 'text-2xl' : 'text-3xl'} mt-1 font-black text-[#061642]`}>{score}</p>
                  <p className="text-xs font-black text-[#079735]">Up {points}</p>
                </div>
              ))}
            </div>
          </div>
          {!mobile && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-black text-[#061642]">Recent Activity</p>
              <div className="mt-4 space-y-4 text-xs">
                {[
                  ['Bank Collection Removed', 'Our dispute was successful', 'May 16, 2024'],
                  ['Credit Card Late Payment', 'Marked as Not Your Account', 'May 14, 2024'],
                ].map(([title, copy, date]) => (
                  <div key={title} className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-blue-700"><BadgeCheck size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-[#061642]">{title}</b>
                      <span className="font-semibold text-slate-500">{copy}</span>
                    </span>
                    <span className="font-semibold text-slate-500">{date}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard" className="mt-4 block text-center text-xs font-black text-blue-700">View All Activity</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomepageContent() {
  const checkoutPlans = useMemo(() => new Set(CHECKOUT_PLANS.map((plan) => plan.id)), []);

  useEffect(() => {
    const pricing = document.getElementById('pricing');
    if (!pricing || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      trackEvent('pricing_view', { source_page: 'homepage', authenticated: false });
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(pricing);
    return () => observer.disconnect();
  }, []);

  const start = (plan = 'professional', location = 'homepage') => {
    trackTrialSignup(plan, location);
    const selectedPlan = pricingPlans.find((item) => item.id === plan);
    if (selectedPlan?.monthlyPrice) {
      trackPricingPlanSelect(selectedPlan.id, selectedPlan.monthlyPrice, location);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#061642]">
      <Header onStart={start} />

      <main>
        <section className="relative hidden overflow-hidden border-b border-slate-200 bg-slate-50 px-8 py-16 lg:block">
          <div className="relative mx-auto grid max-w-[1240px] min-w-0 items-center gap-12 lg:grid-cols-[minmax(0,.86fr)_minmax(0,1.14fr)]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-xs font-black tracking-wide text-[#07862f] shadow-sm">
                <Sparkles size={14} /> AI-POWERED CREDIT INTELLIGENCE
              </span>
              <h1 className="mt-6 max-w-[590px] text-[54px] font-black leading-[1.02] tracking-[-0.045em] text-[#061642] xl:text-[60px]">
                Turn complex credit reports into a
                <span className="text-[#079735]"> clear action plan.</span>
              </h1>
              <p className="mt-6 max-w-[560px] text-lg font-medium leading-8 text-slate-600">
                FixMy.Money is credit intelligence software that analyzes credit reports, identifies potential reporting issues, prioritizes what to review, and organizes dispute letters and follow-up—whether you are working on your own credit or managing clients.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup?plan=starter" onClick={() => start('starter', 'hero_primary')} className="rounded-lg bg-[#079735] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#067d2c]">
                  Analyze my credit for $1
                </Link>
                <Link href="/professionals" onClick={() => trackCtaClick('Explore for professionals', '/professionals', 'hero_secondary')} className="rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-sm font-black text-[#061642] shadow-sm transition hover:border-slate-400 hover:bg-slate-50">
                  Explore for professionals
                </Link>
              </div>
              <div className="mt-8 grid max-w-[590px] grid-cols-3 gap-5 border-t border-slate-200 pt-6">
                {FEATURES.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="grid min-w-0 grid-cols-[22px_minmax(0,1fr)] items-start gap-2.5">
                    <Icon size={21} className="shrink-0 text-[#079735]" strokeWidth={2.1} />
                    <span className="min-w-0">
                      <b className="block text-xs text-[#071f4b]">{title}</b>
                      <span className="block text-[11px] font-semibold leading-4 text-[#53657d]">{copy}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative w-full min-w-0">
              <div className="absolute -inset-5 rounded-[28px] bg-gradient-to-br from-emerald-100 via-white to-blue-100" />
              <div className="relative">
              <ProductPreview />
              </div>
            </div>
          </div>

          <div className="relative mx-auto mt-14 max-w-[1240px] rounded-xl border border-slate-200 bg-white px-7 py-5 shadow-sm">
              <div className="grid gap-6 sm:grid-cols-3">
                {TRUST_ITEMS.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><Icon size={20} className="text-[#061b48]" /></span>
                    <span>
                      <b className="block text-xs text-[#061642]">{title}</b>
                      <span className="text-[11px] font-semibold text-slate-600">{copy}</span>
                    </span>
                  </div>
                ))}
              </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50 px-5 pb-14 pt-4 lg:hidden">
          <div className="mx-auto max-w-xl">
              <div className="flex items-center justify-between gap-3">
                <Logo compact />
                <button type="button" popoverTarget="homepage-mobile-nav" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[#061642] shadow-sm" aria-label="Toggle navigation" aria-controls="homepage-mobile-nav">
                  <Menu size={25} />
                </button>
              </div>
              <div id="homepage-mobile-nav" popover="auto" className="inset-x-4 top-20 z-50 m-0 max-w-none rounded-lg border border-slate-200 bg-white p-5 shadow-2xl backdrop:bg-transparent lg:hidden">
                <div className="grid gap-4">
                  {NAV_LINKS.map((link) => (
                    <Link key={link.label} href={link.href} className="font-bold text-[#061642]">
                      {link.label}
                    </Link>
                  ))}
                  <Link href="/login" className="font-bold text-[#061642]">
                    Sign In
                  </Link>
                </div>
              </div>
              <div className="pt-12">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-[11px] font-black tracking-wide text-[#07862f] shadow-sm"><Sparkles size={13} /> AI-POWERED CREDIT INTELLIGENCE</span>
                <h1 className="mt-5 text-[40px] font-black leading-[1.02] tracking-[-0.04em] text-[#061642]">
                  Turn complex credit reports into a <span className="text-[#079735]">clear action plan.</span>
                </h1>
                <p className="mt-5 text-base font-medium leading-7 text-slate-600">
                  Credit intelligence software for analyzing reports, prioritizing potential issues, and organizing dispute workflows for yourself or your clients.
                </p>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Link href="/signup?plan=starter" onClick={() => start('starter', 'mobile_hero')} className="rounded-lg bg-[#079735] px-5 py-3.5 text-center text-sm font-black text-white shadow-lg shadow-emerald-900/10">Analyze my credit for $1</Link>
                <Link href="/professionals" onClick={() => trackCtaClick('Explore for professionals', '/professionals', 'mobile_hero')} className="rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-center text-sm font-black text-[#061642] shadow-sm">For credit professionals</Link>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-5 text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-[#079735]" /> Secure</span>
                <span className="flex items-center gap-1.5"><LockKeyhole size={15} className="text-[#079735]" /> Private</span>
                <span className="flex items-center gap-1.5"><CalendarClock size={15} className="text-[#079735]" /> Cancel anytime</span>
              </div>
              <div className="mt-9">
                <ProductPreview mobile />
              </div>
          </div>
        </section>

        <section id="security" className="bg-[#0b1742] px-5 py-24 text-white lg:px-8">
          <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#71dcb9]">Trust is built in</p>
              <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Your financial data deserves serious protection.</h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#abc3bc]">FixMy.Money is designed around data minimization, clear permissions, and security controls that keep sensitive reports private.</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {['256-bit encryption', 'Private by default', 'Secure file handling', 'Transparent data controls'].map(item => (
                  <div key={item} className="flex items-center gap-3 text-sm font-semibold"><span className="grid size-7 place-items-center rounded-full bg-white/10 text-[#71dcb9]"><Check className="size-4" /></span>{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[.06] p-8">
              <ShieldCheck className="size-12 text-[#71dcb9]" />
              <h3 className="mt-8 text-2xl font-semibold">Enterprise-grade confidence</h3>
              <p className="mt-3 leading-7 text-[#abc3bc]">Sensitive uploads are protected in transit and at rest. Your workspace stays yours.</p>
              <div className="mt-8 space-y-3">{['Encrypted report processing', 'Role-aware workspace access', 'Continuous security monitoring'].map(item => <div key={item} className="rounded-xl border border-white/10 bg-white/[.05] p-4 text-sm">{item}</div>)}</div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-white px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
              <div>
                <p className="text-xs font-black text-blue-700">HOW IT WORKS</p>
                <h2 className="mt-4 text-4xl font-black tracking-tight text-[#061642]">From report upload to next action.</h2>
                <p className="mt-4 max-w-lg text-sm font-medium leading-7 text-slate-700">
                  Our AI reviews your full credit report line by line, identifies potentially disputable items, estimates your chances, and prioritizes what to tackle first.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-4">
                {WORKFLOW.map(({ icon: Icon, title, copy }, index) => (
                  <div key={title} className="relative text-center">
                    {index < WORKFLOW.length - 1 && <span className="absolute left-[62%] top-10 hidden h-px w-[76%] bg-slate-300 sm:block" />}
                    <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#eaf6ee] text-[#061b48]">
                      <Icon size={38} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-4 text-sm font-black text-[#079735]">{title}</h3>
                    <p className="mx-auto mt-2 max-w-[150px] text-xs font-semibold leading-5 text-[#061642]">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-5 pb-14 sm:px-8">
          <div className="mx-auto max-w-[1320px] border-t border-slate-200 pt-5">
            <div className="text-center">
              <h2 className="text-2xl font-black text-[#061642]">SIMPLE, TRANSPARENT PRICING</h2>
              <p className="mt-1 text-sm font-semibold text-slate-700">Start your $1 trial with a card. Cancel anytime.</p>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {pricingPlans.map((plan) => {
                const hasCheckout = checkoutPlans.has(plan.id);
                const href = hasCheckout ? `/signup?plan=${plan.id}` : '/contact';
                return (
                  <article key={plan.id} className={`relative rounded-lg border bg-white p-6 text-center shadow-sm ${plan.highlight ? 'border-[#079735] ring-1 ring-[#079735]' : 'border-slate-200'}`}>
                    {plan.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-[#079735] px-5 py-1 text-[10px] font-black text-white">MOST POPULAR</span>}
                    <h3 className="text-lg font-black text-[#061642]">{plan.name}</h3>
                    <p className="mx-auto mt-2 min-h-10 max-w-[220px] text-sm font-semibold leading-5 text-slate-600">{plan.description}</p>
                    <p className="mt-6 text-[#061642]">
                      {plan.monthlyPrice ? (
                        <>
                          <b className="text-4xl font-black">${plan.monthlyPrice}</b>
                          <span className="text-sm font-semibold"> /month</span>
                        </>
                      ) : (
                        <b className="text-4xl font-black">Custom</b>
                      )}
                    </p>
                    <p className={`mt-3 text-xs font-black ${plan.monthlyPrice ? 'text-[#079735]' : 'text-slate-600'}`}>
                      {plan.monthlyPrice ? '$1 trial with a card' : 'Volume pricing available'}
                    </p>
                    <Link href={href} onClick={() => (hasCheckout ? start(plan.id, 'pricing_card') : trackCtaClick('Contact Sales', href, 'pricing_card'))} className={`mt-6 block rounded-md px-5 py-3 text-sm font-black text-white ${plan.id === 'enterprise' ? 'bg-[#061b48]' : 'bg-[#079735]'}`}>
                      {plan.id === 'enterprise' ? 'Contact Sales' : 'Start $1 Trial'}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
