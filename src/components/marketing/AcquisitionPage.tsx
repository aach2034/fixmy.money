import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileSearch, LockKeyhole, Mail, ShieldCheck, Users } from 'lucide-react';
import TrackedLink from '@/components/marketing/TrackedLink';
import StructuredData from '@/components/seo/StructuredData';
import { pricingSummary } from '@/lib/marketing/acquisition';
import { faqSchema } from '@/lib/seo/schema';

interface AcquisitionPageProps {
  audience: 'consumer' | 'professional' | 'mortgage' | 'affiliate';
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  features: string[];
  workflow: string[];
  faqs: Array<{ q: string; a: string }>;
}

const icons = [FileSearch, CheckCircle2, Mail, Users, ShieldCheck, LockKeyhole];

export default function AcquisitionPage({
  audience,
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  features,
  workflow,
  faqs,
}: AcquisitionPageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-950" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <StructuredData data={faqSchema(faqs)} />
      <nav className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="text-lg font-black">FixMy<span className="text-emerald-700">.Money</span></Link>
          <div className="hidden items-center gap-5 text-sm font-bold text-slate-700 md:flex">
            <Link href="/individuals">Individuals</Link>
            <Link href="/professionals">Professionals</Link>
            <Link href="/tools">Free Tools</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <TrackedLink href={primaryCta.href} eventLabel={primaryCta.label} eventLocation={`${audience}_nav`} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-black text-white">
            {primaryCta.label}
          </TrackedLink>
        </div>
      </nav>

      <section className="border-b border-slate-200 bg-[#f7fbfa] px-4 py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[.95fr_1.05fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">{eyebrow}</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedLink href={primaryCta.href} eventLabel={primaryCta.label} eventLocation={`${audience}_hero`} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-700 px-6 py-4 text-sm font-black text-white shadow-lg shadow-emerald-900/15">
                {primaryCta.label} <ArrowRight size={16} />
              </TrackedLink>
              {secondaryCta && (
                <TrackedLink href={secondaryCta.href} eventLabel={secondaryCta.label} eventLocation={`${audience}_hero`} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-4 text-sm font-black text-slate-900">
                  {secondaryCta.label}
                </TrackedLink>
              )}
            </div>
            <p className="mt-5 max-w-xl text-xs leading-5 text-slate-500">
              FixMy.Money is software. Consumers and professionals remain responsible for reviewing facts, choosing actions, and complying with applicable rules.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = icons[index % icons.length];
                return (
                  <div key={feature} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Icon size={22} className="text-emerald-700" />
                    <p className="mt-4 text-sm font-bold leading-6 text-slate-800">{feature}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black tracking-normal">How the workflow works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {workflow.map((step, index) => (
              <article key={step} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-xs font-black text-emerald-700">0{index + 1}</span>
                <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black tracking-normal">Pricing</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {pricingSummary.map(plan => (
              <article key={plan.id} className="rounded-lg border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-black">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                <p className="mt-5 text-3xl font-black">{plan.price ? `$${plan.price}` : 'Custom'}<span className="text-sm font-bold text-slate-500"> /mo</span></p>
                <TrackedLink href={`/signup?plan=${plan.id}`} eventLabel={`Start ${plan.name}`} eventLocation={`${audience}_pricing`} className="mt-5 block rounded-md bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
                  Start $1 Trial
                </TrackedLink>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-black tracking-normal">FAQ</h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {faqs.map(faq => (
              <article key={faq.q} className="p-5">
                <h3 className="text-sm font-black">{faq.q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
