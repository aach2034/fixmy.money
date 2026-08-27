import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BarChart3, Link2, Megaphone, ShieldCheck } from 'lucide-react';
import TrackedLink from '@/components/marketing/TrackedLink';
import { canonicalUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: 'FixMy.Money Affiliate and Referral Program',
  description: 'Create trackable referral URLs for consumer, creator, professional, and mortgage partner acquisition campaigns.',
  alternates: { canonical: canonicalUrl('/affiliates') },
};

export default function AffiliatesPage() {
  const example = 'https://fixmy.money/signup?ref=creator123&utm_source=youtube&utm_medium=creator&utm_campaign=credit-report-video';
  return (
    <div className="min-h-screen bg-white text-slate-950" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav className="border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-lg font-black">FixMy.Money</Link>
          <TrackedLink href="/signup?plan=professional&utm_source=affiliates&utm_medium=landing_page&utm_campaign=partner_signup" eventLabel="Start Free Trial" eventLocation="affiliate_nav" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-black text-white">
            Start Free Trial
          </TrackedLink>
        </div>
      </nav>
      <main>
        <section className="bg-slate-950 px-4 py-20 text-white">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">Affiliate and referral program</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">Track creator, partner, and campaign referrals into FixMy.Money.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Use referral codes and UTM parameters to route consumers or professionals to the right landing page while preserving first-touch attribution through signup and checkout.</p>
            <div className="mt-8 break-all rounded-lg border border-white/10 bg-white/5 p-4 font-mono text-xs leading-6 text-emerald-100">{example}</div>
          </div>
        </section>
        <section className="px-4 py-16">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-4">
            {[
              { icon: Link2, title: 'Referral code', copy: '`ref` identifies the partner, creator, or campaign owner.' },
              { icon: Megaphone, title: 'Campaign fields', copy: 'UTM source, medium, campaign, content, and term are captured.' },
              { icon: BarChart3, title: 'Conversion metadata', copy: 'Signup and Stripe checkout carry attribution values forward.' },
              { icon: ShieldCheck, title: 'First-touch safe', copy: 'First touch is preserved and later visits update last-touch fields.' },
            ].map(item => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon size={24} className="text-emerald-700" />
                  <h2 className="mt-5 text-sm font-black">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy.replace(/`/g, '')}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section className="border-y border-slate-200 bg-slate-50 px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-black">Referral URL patterns</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ['/individuals?ref=coach&utm_source=linkedin&utm_medium=partner&utm_campaign=consumer_report_review', 'Consumer educator'],
                ['/professionals?ref=consultant&utm_source=webinar&utm_medium=partner&utm_campaign=agency_trial', 'Professional consultant'],
                ['/r/creator123?utm_source=youtube&utm_medium=creator&utm_campaign=credit-report-video', 'Creator landing page'],
              ].map(([href, label]) => (
                <article key={href} className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-black">{label}</h3>
                  <p className="mt-3 break-all font-mono text-xs text-slate-600">{href}</p>
                </article>
              ))}
            </div>
            <TrackedLink href="/signup?plan=professional&utm_source=affiliates&utm_medium=landing_page&utm_campaign=partner_signup" eventLabel="Affiliate referral" eventLocation="affiliate_body" className="mt-8 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-6 py-4 text-sm font-black text-white">
              Start Partner Tracking <ArrowRight size={16} />
            </TrackedLink>
          </div>
        </section>
      </main>
    </div>
  );
}
