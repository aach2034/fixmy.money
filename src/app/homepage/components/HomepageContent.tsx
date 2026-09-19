'use client';

import Link from 'next/link';
import { ArrowRight, Check, Menu, Search, ShieldCheck, Upload } from 'lucide-react';
import { CHECKOUT_PLANS } from '@/lib/stripe/plans';
import ReopeningNotice from '@/components/ReopeningNotice';
import PublicBrandLink from '@/components/marketing/PublicBrandLink';
import PublicFooter from '@/components/marketing/PublicFooter';
import HomepageShareButton from '@/components/marketing/HomepageShareButton';
import TrackedLink from '@/components/marketing/TrackedLink';
import ProductPreview from './ProductPreview';

const comparisonDetails = [
  {
    number: '01',
    title: 'Balances and account status',
    body: 'Write down each bureau’s exact balance and status wording. A difference is a reason to investigate, not proof that one value is wrong.',
  },
  {
    number: '02',
    title: 'Important dates and payment history',
    body: 'Compare dates opened, last-reported dates, and payment-status details. Do not fill in information a report does not provide.',
  },
  {
    number: '03',
    title: 'Account identifiers',
    body: 'Check the furnisher name, account type, and masked account ending before treating rows from different bureaus as the same account.',
  },
];

export default function Home() {
  return (
    <div className="approved-homepage premium-public min-h-screen overflow-x-clip bg-white text-[#132440]">
      <header>
        <nav aria-label="Primary" className="mx-auto flex min-h-[84px] max-w-[1440px] items-center justify-between gap-4 border-b border-[#e9eef3] bg-white px-5 lg:px-12">
          <PublicBrandLink />
          <div className="hidden items-center gap-7 text-sm font-medium lg:flex">
            <Link href="/individuals" className="hover:text-[#008958]">For Individuals</Link>
            <Link href="/professionals" className="hover:text-[#008958]">For Professionals</Link>
            <a href="#solutions" className="hover:text-[#008958]">How It Works</a>
            <a href="#pricing" className="hover:text-[#008958]">Pricing</a>
            <Link href="/resources" className="hover:text-[#008958]">Resources</Link>
            <Link href="/blog" className="hover:text-[#008958]">Blog</Link>
          </div>
          <div className="hidden items-center gap-5 lg:flex">
            <Link href="/login" className="rounded-md px-3 py-3 text-sm font-medium hover:text-[#008958] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#008958]">Sign In</Link>
            <TrackedLink href="/reopen" eventLabel="Reserve My Free Month" eventLocation="homepage_nav" className="inline-flex min-h-12 items-center rounded-lg bg-[#007f51] px-5 text-sm font-bold text-white hover:bg-[#006e46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008958]">Reserve My Free Month</TrackedLink>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-[#132440] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#008958]">Sign In</Link>
            <details className="relative">
              <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-[#dce5ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#008958]" aria-label="Open navigation menu"><Menu className="size-5" aria-hidden="true" /></summary>
              <div className="absolute right-0 top-12 z-30 flex w-56 flex-col rounded-xl border border-[#dce5ee] bg-white p-2 shadow-lg">
                <Link className="rounded-md px-3 py-3 hover:bg-[#effbf5]" href="/individuals">For Individuals</Link>
                <Link className="rounded-md px-3 py-3 hover:bg-[#effbf5]" href="/professionals">For Professionals</Link>
                <a className="rounded-md px-3 py-3 hover:bg-[#effbf5]" href="#solutions">How It Works</a>
                <a className="rounded-md px-3 py-3 hover:bg-[#effbf5]" href="#pricing">Pricing</a>
                <Link className="rounded-md px-3 py-3 hover:bg-[#effbf5]" href="/resources">Resources</Link>
                <Link className="rounded-md px-3 py-3 hover:bg-[#effbf5]" href="/blog">Blog</Link>
                <Link className="rounded-md bg-[#007f51] px-3 py-3 font-bold text-white" href="/reopen">Reserve My Free Month</Link>
              </div>
            </details>
          </div>
        </nav>
      </header>
      <section className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 pb-12 pt-16 lg:grid-cols-[.95fr_1.05fr] lg:gap-12 lg:px-12 lg:pb-14 lg:pt-20">
        <div className="max-w-[680px]">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#007f51]">Structured credit-report review</p>
          <h1 className="mt-4 text-[clamp(2.35rem,3.3vw,3rem)] font-extrabold leading-[1.13] tracking-[-.055em] text-[#121f3a]">
            Your credit report, organized.{' '}<br />See what matters.{' '}<br />You take action.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#586984]">Import your report, review organized bureau data, and investigate potential inconsistencies through a guided workflow.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedLink href="/individuals" eventLabel="Review My Own Credit" eventLocation="homepage_hero" className="inline-flex min-h-[60px] items-center justify-center gap-3 rounded-lg bg-[#007f51] px-6 text-center text-base font-bold text-white hover:bg-[#006e46] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008958]">Review My Own Credit <ArrowRight className="size-5" aria-hidden="true" /></TrackedLink>
            <TrackedLink href="/professionals" eventLabel="Run My Credit Business" eventLocation="homepage_hero" className="inline-flex min-h-[60px] items-center justify-center gap-3 rounded-lg border border-[#aebfd2] bg-white px-6 text-center text-base font-bold text-[#263754] hover:border-[#007f51] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#008958]">Run My Credit Business <ArrowRight className="size-5" aria-hidden="true" /></TrackedLink>
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.17em] text-[#53647e]">Grand reopening · September 30, 2026</p>
          <p className="mt-2 text-base text-[#586984]">No payment today.</p>
        </div>
        <ProductPreview />
      </section>
      <section id="solutions" className="bg-[#f2fcf8] px-5 py-14 lg:px-12">
        <div className="mx-auto max-w-[1300px] text-center">
          <h2 className="text-3xl font-extrabold tracking-[-.04em] text-[#121f3a] sm:text-4xl">From report to clear next steps.</h2>
          <p className="mt-2 text-lg text-[#586984]">A simpler way to move from complex credit reports to confident action.</p>
          <div className="mt-9 grid gap-5 text-left md:grid-cols-3">
            {[[Upload, 'Import', 'Bring in your credit report and we’ll organize the bureau data for you.'], [Search, 'Understand', 'Compare details across Equifax, Experian and TransUnion, and spot potential inconsistencies.'], [Check, 'Take action', 'Follow a guided workflow to investigate and take the next steps that make sense for you.']].map(([Icon, title, body]) => { const I = Icon as typeof Upload; return <article key={title as string} className="flex gap-5 rounded-xl border border-[#dfe7ef] bg-white p-6 shadow-sm"><span className="grid size-14 shrink-0 place-items-center rounded-xl border border-[#bcecd8] bg-[#effdf7] text-[#007f51]"><I className="size-7" aria-hidden="true" /></span><div><h3 className="mt-1 text-xl font-bold text-[#121f3a]">{title as string}</h3><p className="mt-2 text-base leading-6 text-[#586984]">{body as string}</p></div></article>; })}
          </div>
        </div>
      </section>
      <section className="px-5 py-20 lg:px-12"><div className="mx-auto max-w-[1180px]"><ReopeningNotice /></div></section>
      <section id="three-details-to-compare" className="bg-[#f4f8f6] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#267a31]">A useful five-minute review</p>
              <h2 className="mt-4 text-4xl font-extrabold tracking-[-.05em] text-[#151a18] sm:text-5xl">Three details to compare across your credit reports.</h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#596761]">Potential differences deserve careful investigation. They do not automatically establish that information is inaccurate or that a dispute is appropriate.</p>
            </div>
            <HomepageShareButton />
          </div>

          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {comparisonDetails.map(detail => (
              <li key={detail.number} className="rounded-2xl border border-[#d4e1db] bg-white p-7 shadow-[0_10px_34px_rgba(12,43,34,.05)]">
                <span className="text-sm font-black tracking-[.12em] text-[#267a31]">{detail.number}</span>
                <h3 className="mt-5 text-xl font-extrabold tracking-[-.025em] text-[#17211e]">{detail.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5e6d67]">{detail.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-2xl border border-[#c8dcd2] bg-white px-5 py-4 text-sm leading-6 text-[#52615b]">
            Keep the comparison factual: record what each bureau actually reports, preserve masked identifiers, and investigate before drawing a conclusion.
          </div>
        </div>
      </section>
      <section id="security" className="bg-[#0b1742] px-5 py-24 text-white lg:px-8"><div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#71dcb9]">Protection first</p><h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Sensitive report data requires careful controls.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-[#abc3bc]">FixMy.Money uses data minimization and signed-in workflows, and temporarily disables features when their safeguards are incomplete.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{['Data minimization','Signed-in workflows','Human verification','Clear availability notices'].map(x=><div key={x} className="flex items-center gap-3 text-sm font-semibold"><span className="grid size-7 place-items-center rounded-full bg-white/10 text-[#71dcb9]"><Check className="size-4"/></span>{x}</div>)}</div></div><div className="rounded-[28px] border border-white/10 bg-white/[.06] p-8"><ShieldCheck className="size-12 text-[#71dcb9]"/><h3 className="mt-8 text-2xl font-semibold">Containment-aware design</h3><p className="mt-3 leading-7 text-[#abc3bc]">Risky integrations remain unavailable until their privacy and authorization controls are verified.</p><div className="mt-8 space-y-3">{['No raw report transmission to external AI','Human review before letter use','Fail-closed feature controls'].map(x=><div key={x} className="rounded-xl border border-white/10 bg-white/[.05] p-4 text-sm">{x}</div>)}</div></div></div></section>
      <section id="pricing" className="bg-[#fbfcfe] px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-[1050px]">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#267a31]">Software plans · Reopening September 30, 2026</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">Choose the workspace that fits.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#60716a]">Monthly software access for personal review, professional client work, and growing agencies.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {CHECKOUT_PLANS.map(plan => (
              <article key={plan.id} className={`relative rounded-2xl border p-7 ${plan.highlight ? 'border-[#79aa94] bg-white shadow-[0_18px_50px_rgba(16,61,48,.1)]' : 'border-[#dfe4ec] bg-white'}`}>
                <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#267a31]">{plan.id === 'starter' ? 'Personal use' : plan.id === 'professional' ? 'Professional teams' : 'Growing agencies'}</p>
                <h3 className="mt-3 text-lg font-semibold">{plan.name}</h3>
                <p className="mt-4 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-[-.05em]">${plan.monthlyPrice}</span><span className="text-sm font-semibold text-[#64736c]">per month</span></p>
                <p className="mt-2 text-sm text-[#718079]">{plan.description}</p>
                <a href="/reopen" className={`mt-7 block w-full rounded-xl py-3 text-center text-sm font-semibold ${plan.highlight ? 'bg-[#267a31] text-white' : 'border border-[#dfe4ec] text-[#19322b]'}`}>Reserve one month free</a>
                <div className="mt-6 space-y-3">{plan.features.slice(0,3).map(x => <p key={x} className="flex items-center gap-2 text-sm text-[#52655c]"><Check className="size-4 text-[#267a31]" />{x}</p>)}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
