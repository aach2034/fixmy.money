'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
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
  Star,
  UserRound,
} from 'lucide-react';
import { CHECKOUT_PLANS, PLANS } from '@/lib/stripe/plans';
import { trackCtaClick, trackPricingPlanSelect, trackTrialSignup } from '@/lib/analytics';

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
    <header className="mx-auto hidden h-[70px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:flex">
      <Logo />
      <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary navigation">
        {NAV_LINKS.map((link) =>
          link.href.startsWith('#') ? (
            <a key={link.label} href={link.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#061642] hover:text-[#079735]">
              {link.label}
              {link.dropdown && <ChevronDown size={14} />}
            </a>
          ) : (
            <Link key={link.label} href={link.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#061642] hover:text-[#079735]">
              {link.label}
              {link.dropdown && <ChevronDown size={14} />}
            </Link>
          ),
        )}
      </nav>
      <div className="hidden items-center gap-4 lg:flex">
        <Link href="/login" onClick={() => trackCtaClick('Sign In', '/login', 'nav')} className="rounded-md border border-[#061642] px-5 py-2.5 text-sm font-bold text-[#061642] hover:bg-[#f5f8fb]">
          Sign In
        </Link>
        <Link href="/signup?plan=professional" onClick={() => onStart('professional', 'nav')} className="rounded-md bg-[#069b35] px-7 py-3 text-sm font-black text-white shadow-lg shadow-green-900/10 hover:bg-[#07862f]">
          Start $1 Trial
        </Link>
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

function AudienceCard({ type, onStart }: { type: 'individuals' | 'business'; onStart: (plan: string, location: string) => void }) {
  const isBusiness = type === 'business';
  const href = isBusiness ? '/signup?plan=professional' : '/signup?plan=starter';
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
      <div className="mx-auto mb-2 grid h-7 w-7 place-items-center text-[#061b48]">
        {isBusiness ? <BriefcaseBusiness size={20} /> : <UserRound size={20} />}
      </div>
      <h3 className="text-lg font-black text-[#061642]">{isBusiness ? 'For Businesses' : 'For Individuals'}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-600">{isBusiness ? 'Manage clients. Grow your business.' : 'Take control of your credit.'}</p>
      <Link href={href} onClick={() => onStart(isBusiness ? 'professional' : 'starter', isBusiness ? 'hero_business' : 'hero_individual')} className={`mt-4 block rounded-md px-5 py-3 text-sm font-black text-white ${isBusiness ? 'bg-[#061b48]' : 'bg-[#079735]'}`}>
        {isBusiness ? 'See Business Software' : 'Start $1 Trial'}
      </Link>
      <p className="mt-3 text-xs font-semibold text-[#061642]">{isBusiness ? 'Powerful tools for credit pros' : '$1 trial with a card - Cancel anytime'}</p>
    </article>
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

  return (
    <div className="min-h-screen bg-white font-sans text-[#061642]">
      <Header onStart={start} />

      <main>
        <section className="relative hidden overflow-hidden px-5 pb-5 pt-0 sm:px-8 lg:block">
          <div className="absolute right-[9%] top-24 hidden h-[330px] w-[330px] rounded-full bg-[#c7f0d3] opacity-70 blur-sm lg:block" />
          <div className="absolute right-[5%] top-72 hidden h-[280px] w-[280px] rounded-full bg-[#dff0ff] opacity-80 blur-sm lg:block" />
          <div className="relative mx-auto grid max-w-[1320px] items-center gap-8 lg:grid-cols-[610px_1fr]">
            <div className="py-3 lg:py-4">
              <span className="inline-flex rounded-full bg-[#dff5e4] px-4 py-2 text-xs font-black text-[#07862f]">
                AI-POWERED CREDIT INTELLIGENCE
              </span>
              <h1 className="mt-4 max-w-[610px] text-[40px] font-black leading-[1.06] text-[#061642] xl:text-[44px]">
                AI Analyzes Your Credit.
                <span className="block">We Find What Matters.</span>
                <span className="block text-[#079735]">You Take Action.</span>
              </h1>
              <p className="mt-4 max-w-[535px] text-[15px] font-medium leading-7 text-slate-700">
                Instantly analyze your credit report, identify potentially disputable items, prioritize what to tackle first, and generate professional dispute letters - all in one place.
              </p>
              <div className="mt-5 grid max-w-[540px] gap-4 sm:grid-cols-3">
                {FEATURES.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="flex items-center gap-3">
                    <Icon size={26} className="shrink-0 text-[#079735]" strokeWidth={2.1} />
                    <span>
                      <b className="block text-xs text-[#061642]">{title}</b>
                      <span className="text-[11px] font-semibold text-slate-600">{copy}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid max-w-[530px] gap-5 sm:grid-cols-2">
                <AudienceCard type="individuals" onStart={start} />
                <AudienceCard type="business" onStart={start} />
              </div>
            </div>
            <div className="hidden lg:block">
              <ProductPreview />
            </div>
          </div>

          <div className="relative mx-auto mt-3 max-w-[1320px] rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-5 sm:grid-cols-3">
                {TRUST_ITEMS.map(({ icon: Icon, title, copy }) => (
                  <div key={title} className="flex items-center gap-3">
                    <Icon size={24} className="text-[#061b48]" />
                    <span>
                      <b className="block text-xs text-[#061642]">{title}</b>
                      <span className="text-[11px] font-semibold text-slate-600">{copy}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-5 border-slate-200 text-sm font-black text-[#061642] lg:border-l lg:pl-8">
                <span className="text-[10px] font-bold text-slate-500">FEATURED IN</span>
                <span>MarketWatch</span>
                <span className="text-[#4b26c9]">yahoo! finance</span>
                <span>BENZINGA</span>
                <span className="font-serif text-lg">Forbes</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f7fb] px-3 py-0 lg:hidden">
          <div className="mx-auto min-h-screen max-w-[390px] overflow-hidden rounded-[28px] bg-[#061b48] shadow-2xl">
            <div className="rounded-t-[28px] bg-white px-4 pb-4 pt-2">
              <div className="mb-4 flex h-7 items-center justify-between text-sm font-black text-black">
                <span>9:41</span>
                <span className="text-xs">••• Wi-Fi ▰</span>
              </div>
              <div className="mb-5 flex items-center justify-between gap-3">
                <Logo compact />
                <Link href="/signup?plan=professional" onClick={() => start('professional', 'mobile_preview')} className="rounded-md bg-[#079735] px-4 py-2 text-xs font-black text-white">
                  Start $1 Trial
                </Link>
                <button type="button" popoverTarget="homepage-mobile-nav" className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[#061642]" aria-label="Toggle navigation" aria-controls="homepage-mobile-nav">
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
              <div className="text-center">
                <span className="inline-flex rounded-full bg-[#dff5e4] px-4 py-2 text-xs font-black text-[#07862f]">AI-POWERED CREDIT INTELLIGENCE</span>
                <h1 className="mt-4 text-[30px] font-black leading-[1.12] text-[#061642]">
                  AI Analyzes Your Credit.
                  <span className="block">We Find What Matters.</span>
                  <span className="block text-[#079735]">You Take Action.</span>
                </h1>
                <p className="mx-auto mt-4 max-w-[300px] text-[13px] font-medium leading-5 text-[#061642]">
                  Instantly analyze your credit report, identify potentially disputable items, prioritize what to tackle first, and generate professional dispute letters - all in one place.
                </p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {FEATURES.map(({ icon: Icon, title, copy }) => (
                  <div key={title}>
                    <Icon size={20} className="mx-auto text-[#079735]" strokeWidth={2} />
                    <b className="mt-1 block text-[10px] text-[#061642]">{title}</b>
                    <span className="text-[9px] font-semibold leading-3 text-slate-600">{copy}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                <AudienceCard type="individuals" onStart={start} />
                <AudienceCard type="business" onStart={start} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-[10px] font-bold text-[#061642]">
                {TRUST_ITEMS.map(({ icon: Icon, title }) => (
                  <span key={title} className="flex items-center justify-center gap-1">
                    <Icon size={14} /> {title}
                  </span>
                ))}
              </div>
              <div className="mt-5">
                <ProductPreview mobile />
              </div>
            </div>
            <div className="py-5 text-center text-white">
              <p className="text-sm font-black">TRUSTED BY THOUSANDS</p>
              <p className="text-sm">Real people. Real results.</p>
              <div className="mt-3 flex justify-center gap-1 text-[#4bd85d]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={27} fill="currentColor" />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-5 pb-10 pt-3 sm:px-8">
          <div className="mx-auto max-w-[1320px] border-t border-slate-200 pt-8">
            <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
              <div>
                <p className="text-xs font-black text-blue-700">HOW IT WORKS</p>
                <h2 className="mt-4 text-3xl font-black text-[#061642]">AI That Finds What Others Miss</h2>
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
