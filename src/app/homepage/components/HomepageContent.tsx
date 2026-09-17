'use client';

import Link from 'next/link';
import { ArrowRight, Check, FileCheck2, FileSearch, ShieldCheck } from 'lucide-react';
import { CHECKOUT_PLANS } from '@/lib/stripe/plans';
import ReopeningNotice from '@/components/ReopeningNotice';
import PublicBrandLink from '@/components/marketing/PublicBrandLink';
import PublicFooter from '@/components/marketing/PublicFooter';
import HomepageShareButton from '@/components/marketing/HomepageShareButton';
import TrackedLink from '@/components/marketing/TrackedLink';
import { DEMO_AGENCY, DEMO_CLIENTS } from '@/lib/demo/demoData';

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
    <section className="approved-homepage premium-public min-h-screen overflow-hidden bg-[#f8fbf9] text-[#0b1742]">
      <header>
        <nav aria-label="Primary" className="fixed inset-x-0 top-0 z-50 border-b border-[#d8e3de] bg-white/90 shadow-[0_1px_0_rgba(7,60,52,.03)] backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-5 lg:px-8">
            <PublicBrandLink compact />
            <div className="hidden items-center gap-8 text-sm font-medium text-[#52636d] md:flex">
              <a className="transition-colors hover:text-[#267a31]" href="#platform">Platform</a><a className="transition-colors hover:text-[#267a31]" href="#solutions">How it works</a><Link className="transition-colors hover:text-[#267a31]" href="/blog">Blog</Link><a className="transition-colors hover:text-[#267a31]" href="#security">Security</a><a className="transition-colors hover:text-[#267a31]" href="#pricing">Pricing</a>
            </div>
            <div className="hidden items-center gap-2 md:flex"><Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#30434e] transition hover:bg-[#f1f5f3]">Sign in</Link><TrackedLink href="#reopening-list" aria-label="RESERVE MY FREE MONTH" eventLabel="Reserve My Free Month" eventLocation="homepage_nav" className="whitespace-nowrap rounded-xl bg-[#267a31] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(38,122,49,.2)] transition hover:-translate-y-0.5 hover:bg-[#1f6729]">RESERVE FREE MONTH</TrackedLink></div>
            <div className="flex items-center gap-1 sm:gap-2 md:hidden"><Link href="/blog" className="rounded-lg px-2.5 py-2 text-sm font-semibold text-[#30434e] hover:bg-[#f1f5f3]">Blog</Link><Link href="/login" className="rounded-lg border border-[#cedbd5] px-3 py-2 text-sm font-bold text-[#19322b] transition hover:bg-[#f1f5f3]">Sign in</Link></div>
          </div>
        </nav>
      </header>

      <section className="relative px-5 pb-16 pt-28 lg:px-8 lg:pb-24 lg:pt-32">
        <div className="hero-glow absolute inset-x-0 top-0 -z-0 h-[760px]" />
        <div className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="premium-reveal max-w-2xl text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b9dece] bg-white/90 px-3.5 py-2 text-xs font-bold text-[#236b2e] shadow-sm backdrop-blur"><FileSearch className="size-3.5" aria-hidden="true" /> Structured credit-report review</div>
            <h1 className="text-balance text-[38px] font-extrabold leading-[1.04] tracking-[-.055em] text-[#151a18] sm:text-[52px] lg:text-[52px] xl:text-[58px]">
              <span className="block">Your credit report, organized.</span>{' '}
              <span className="block text-[#267a31]">See what matters.</span>{' '}
              <span className="block">You take action.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-[#52615b]">Import your report, review organized bureau data, and investigate potential inconsistencies through a guided workflow.</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[#40534c]"><span>Reviewing your own reports?</span><Link href="/professionals" className="inline-flex items-center gap-1 text-[#267a31] underline decoration-[#9fcdb8] underline-offset-4 hover:text-[#1f6729]">For professionals and agencies <ArrowRight className="size-3.5" aria-hidden="true" /></Link></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2"><TrackedLink href="#reopening-list" aria-label="RESERVE MY FREE MONTH" eventLabel="Reserve My Free Month" eventLocation="homepage_hero" className="group flex h-[54px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#267a31] px-4 text-[14px] font-extrabold text-white shadow-[0_12px_30px_rgba(38,122,49,.22)] transition hover:-translate-y-0.5 hover:bg-[#1f6729]">RESERVE FREE MONTH <ArrowRight className="size-4 shrink-0 transition group-hover:translate-x-0.5" /></TrackedLink><Link href="/professionals" className="flex h-[54px] items-center justify-center rounded-xl border border-[#cbd8d2] bg-white px-6 text-[14px] font-bold text-[#0b1742] shadow-sm transition hover:-translate-y-0.5 hover:border-[#9fbaae] hover:bg-[#f7faf8]">See business software</Link></div>
            <p className="mt-4 text-sm font-bold text-[#315a47]">Reopening October 25, 2026 · No payment today</p>
            <div className="mt-5 grid gap-3 text-[12px] font-semibold leading-5 text-[#4f5d75] sm:grid-cols-2"><span className="flex items-start gap-2"><FileSearch className="mt-0.5 size-4 shrink-0 text-[#267a31]" /> Structured report review</span><span className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#267a31]" /> Human verification before action</span></div>
          </div>

          <div id="platform" className="relative mx-auto w-full max-w-[720px]">
            <div className="absolute -inset-5 -z-10 rounded-[38px] bg-gradient-to-b from-[#d7eee6]/70 to-transparent blur-2xl" />
            <div className="overflow-hidden rounded-[24px] border border-[#d4e1db] bg-white shadow-[0_24px_70px_rgba(12,43,34,.13)]">
              <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[#e4ebe7] bg-[#fbfcfb] px-4 py-3">
                <div className="flex gap-1.5" aria-hidden="true"><i className="size-2.5 rounded-full bg-[#d7dfdb]"/><i className="size-2.5 rounded-full bg-[#d7dfdb]"/><i className="size-2.5 rounded-full bg-[#d7dfdb]"/></div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#617069]"><ShieldCheck className="size-3.5 text-[#267a31]" aria-hidden="true" /> Secure workspace</div>
              </div>
              <div className="p-5 sm:p-7">
                <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#267a31]">Illustrative data — not a customer report</p>

                <div className="mt-4 space-y-3">
                  <article className="rounded-2xl border border-[#dbe5e0] bg-[#f8faf9] p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#65736d]">01 · Scattered</p>
                    <h2 className="mt-1 text-sm font-extrabold text-[#18211e]">Report details</h2>
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Illustrative scattered report information">
                      <span className="rounded-lg border border-[#dce4e0] bg-white px-3 py-2 text-xs font-semibold text-[#53615c]">Balance · $420</span>
                      <span className="rounded-lg border border-[#dce4e0] bg-white px-3 py-2 text-xs font-semibold text-[#53615c]">Account ending · ••72</span>
                      <span className="rounded-lg border border-[#dce4e0] bg-white px-3 py-2 text-xs font-semibold text-[#53615c]">Balance · $510</span>
                    </div>
                  </article>

                  <article className="rounded-2xl border border-[#bcd9cc] bg-[#f3faf6] p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#267a31]">02 · Organized</p>
                    <h2 className="mt-1 text-sm font-extrabold text-[#18211e]">Compared by bureau</h2>
                    <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                      <div className="flex justify-between gap-2 rounded-lg bg-white px-3 py-2"><dt className="font-semibold text-[#5a6862]">Equifax</dt><dd className="font-extrabold text-[#18211e]">$420</dd></div>
                      <div className="flex justify-between gap-2 rounded-lg bg-white px-3 py-2"><dt className="font-semibold text-[#5a6862]">Experian</dt><dd className="font-extrabold text-[#18211e]">$420</dd></div>
                      <div className="flex justify-between gap-2 rounded-lg bg-white px-3 py-2"><dt className="font-semibold text-[#5a6862]">TransUnion</dt><dd className="font-extrabold text-[#18211e]">$510</dd></div>
                    </dl>
                  </article>

                  <article className="rounded-2xl border border-[#f0cf9d] bg-[#fffaf0] p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#9a5b06]">03 · Review</p>
                    <h2 className="mt-1 text-sm font-extrabold text-[#18211e]">Potential difference</h2>
                    <p className="mt-2 text-xs leading-5 text-[#5f5a50]"><span className="font-extrabold text-[#7b4b08]">Needs investigation.</span> TransUnion reports $510; Equifax and Experian report $420.</p>
                  </article>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-[#0b1742] p-4 text-white sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-xs font-semibold leading-5 text-[#d7e3df]">Potential differences need investigation and do not automatically establish an error.</p>
                  <Link href="/credit-audit" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-extrabold text-[#a8e6c5]">See the review flow <ArrowRight className="size-4" aria-hidden="true" /></Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="px-5 pb-24 lg:px-8"><div className="mx-auto max-w-[1180px]"><ReopeningNotice /></div></section>
      <section id="solutions" className="border-y border-[#dfe8e2] bg-white px-5 py-20 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#267a31]">Inside the workspace</p>
            <h2 className="mt-4 max-w-lg text-balance text-3xl font-extrabold leading-[1.1] tracking-[-.045em] text-[#151a18] sm:text-4xl">A clearer place for the work behind every case.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#596b62]">See how FixMy.Money keeps client records and review work easy to find. The preview uses the same fictional records as our interactive demo.</p>
            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e7f6ed] text-[#267a31]"><FileSearch className="size-4" aria-hidden="true" /></span><div><h3 className="font-extrabold text-[#17211e]">Organize the details</h3><p className="mt-1 text-sm leading-6 text-[#65736d]">Keep reports and client information in a structured workspace.</p></div></div>
              <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e7f6ed] text-[#267a31]"><ShieldCheck className="size-4" aria-hidden="true" /></span><div><h3 className="font-extrabold text-[#17211e]">Review with context</h3><p className="mt-1 text-sm leading-6 text-[#65736d]">Document potential differences before deciding what to do next.</p></div></div>
              <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e7f6ed] text-[#267a31]"><FileCheck2 className="size-4" aria-hidden="true" /></span><div><h3 className="font-extrabold text-[#17211e]">Stay in control</h3><p className="mt-1 text-sm leading-6 text-[#65736d]">Keep people in charge of review and action.</p></div></div>
            </div>
            <Link href="/demo-mode" className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#0b1742] px-6 text-sm font-extrabold text-white transition hover:bg-[#16275a]">Explore the interactive demo <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <figure>
            <div className="overflow-hidden rounded-[28px] border border-[#d4e1db] bg-white shadow-[0_24px_70px_rgba(12,43,34,.12)]" aria-label="Preview of the FixMy.Money demo workspace">
              <div className="flex items-center justify-between border-b border-[#dce8e1] bg-[#0b1742] px-5 py-4 text-white">
                <div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#9bd8b7]">{DEMO_AGENCY.subtitle}</p><p className="mt-1 text-sm font-extrabold">{DEMO_AGENCY.name}</p></div>
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-[#c8e8d5]">Demo data</span>
              </div>
              <div className="grid sm:grid-cols-[150px_1fr]">
                <div className="hidden border-r border-[#e5ece8] bg-[#f7faf8] p-4 text-xs font-semibold text-[#5a6b62] sm:block"><p className="rounded-lg px-3 py-2">Dashboard</p><p className="rounded-lg bg-[#e5f4eb] px-3 py-2 font-extrabold text-[#245e35]">Clients</p><p className="rounded-lg px-3 py-2">Credit Reports</p></div>
                <div className="min-w-0 p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-extrabold tracking-[-.025em] text-[#17211e]">Recent clients</h3><span className="text-xs font-semibold text-[#668073]">Demo workspace</span></div>
                  <div className="mt-4 divide-y divide-[#e8eee9] rounded-xl border border-[#e0e9e3]">
                    {DEMO_CLIENTS.slice(0, 3).map(client => (
                      <div key={client.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#17211e]">{client.name}</p><p className="mt-0.5 text-xs text-[#66766e]">{client.stage}</p></div>
                        <span className="shrink-0 rounded-full bg-[#e7f6ed] px-2.5 py-1 text-xs font-bold text-[#245e35]">{client.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-xl border border-[#cfe5d7] bg-[#f3faf6] px-4 py-3 text-xs leading-5 text-[#355b47]">This preview uses fictional demo records. No customer information is shown.</div>
                </div>
              </div>
            </div>
            <figcaption className="mt-3 text-center text-xs text-[#697b71]">A glimpse of the existing interactive demo</figcaption>
          </figure>
        </div>
      </section>

      <section id="three-details-to-compare" className="bg-[#f4f8f6] px-5 py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-[1180px]">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#267a31]">A useful five-minute review</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-.045em] text-[#151a18] sm:text-[42px]">Three details to compare across your credit reports.</h2>
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
      <section id="security" className="bg-[#0b1742] px-5 py-20 text-white lg:px-8 lg:py-24"><div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-2 lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#71dcb9]">Protection first</p><h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-.045em] sm:text-[42px]">Sensitive report data requires careful controls.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-[#abc3bc]">FixMy.Money uses data minimization and signed-in workflows, and temporarily disables features when their safeguards are incomplete.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{['Data minimization','Signed-in workflows','Human verification','Clear availability notices'].map(x=><div key={x} className="flex items-center gap-3 text-sm font-semibold"><span className="grid size-7 place-items-center rounded-full bg-white/10 text-[#71dcb9]"><Check className="size-4"/></span>{x}</div>)}</div></div><div className="rounded-[28px] border border-white/10 bg-white/[.06] p-8"><ShieldCheck className="size-12 text-[#71dcb9]"/><h3 className="mt-8 text-2xl font-semibold">Containment-aware design</h3><p className="mt-3 leading-7 text-[#abc3bc]">Risky integrations remain unavailable until their privacy and authorization controls are verified.</p><div className="mt-8 space-y-3">{['No raw report transmission to external AI','Human review before letter use','Fail-closed feature controls'].map(x=><div key={x} className="rounded-xl border border-white/10 bg-white/[.05] p-4 text-sm">{x}</div>)}</div></div></div></section>
      <section id="pricing" className="bg-[#f8fbf9] px-5 py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-[1050px]">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#267a31]">Software plans · Reopening October 25, 2026</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] sm:text-[42px]">Choose the workspace that fits.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#60716a]">Monthly software access for personal review, professional client work, and growing agencies.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {CHECKOUT_PLANS.map(plan => (
              <article key={plan.id} className={`relative rounded-2xl border p-7 ${plan.highlight ? 'border-[#79aa94] bg-white shadow-[0_18px_50px_rgba(16,61,48,.1)]' : 'border-[#dfe4ec] bg-white'}`}>
                <p className="text-xs font-extrabold uppercase tracking-[.12em] text-[#267a31]">{plan.id === 'starter' ? 'Personal use' : plan.id === 'professional' ? 'Professional teams' : 'Growing agencies'}</p>
                <h3 className="mt-3 text-lg font-semibold">{plan.name}</h3>
                <p className="mt-4 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-[-.05em]">${plan.monthlyPrice}</span><span className="text-sm font-semibold text-[#64736c]">per month</span></p>
                <p className="mt-2 text-sm text-[#718079]">{plan.description}</p>
                <a href="#reopening-list" className={`mt-7 block w-full rounded-xl py-3 text-center text-sm font-semibold ${plan.highlight ? 'bg-[#267a31] text-white' : 'border border-[#dfe4ec] text-[#19322b]'}`}>Reserve one month free</a>
                <div className="mt-6 space-y-3">{plan.features.slice(0,3).map(x => <p key={x} className="flex items-center gap-2 text-sm text-[#52655c]"><Check className="size-4 text-[#267a31]" />{x}</p>)}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <PublicFooter />
    </section>
  );
}
