import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight, FileSearch, ShieldCheck } from 'lucide-react';
import TrackedLink from '@/components/marketing/TrackedLink';
import { creatorPages } from '@/lib/marketing/acquisition';
import { canonicalUrl } from '@/lib/seo/config';

interface Props {
  params: Promise<{ creatorSlug: string }>;
}

export function generateStaticParams() {
  return Object.keys(creatorPages).map(creatorSlug => ({ creatorSlug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { creatorSlug } = await params;
  const page = creatorPages[creatorSlug];
  if (!page) return { title: 'Referral Page Not Found | FixMy.Money' };
  return {
    title: `${page.name} Referral | FixMy.Money`,
    description: page.headline,
    alternates: { canonical: canonicalUrl(`/r/${creatorSlug}`) },
    robots: { index: false, follow: true },
  };
}

export default async function CreatorReferralPage({ params }: Props) {
  const { creatorSlug } = await params;
  const page = creatorPages[creatorSlug];
  if (!page) notFound();
  const plan = page.audience === 'consumer' ? 'starter' : 'professional';
  const href = `/signup?plan=${plan}&ref=${page.ref}&utm_source=${page.ref}&utm_medium=creator&utm_campaign=creator_referral`;

  return (
    <section className="min-h-screen bg-[#f7fbfa] px-4 py-10 text-slate-950" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="mx-auto max-w-5xl">
        <a href="/" className="text-lg font-black">FixMy<span className="text-emerald-700">.Money</span></a>
        <section className="mt-10 grid items-center gap-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_.8fr] md:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">{page.name}</p>
            <h1 className="mt-5 text-4xl font-black leading-tight">{page.headline}</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">{page.offer}</p>
            <TrackedLink href={href} eventLabel="Creator referral signup" eventLocation={`creator_${creatorSlug}`} className="mt-8 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-6 py-4 text-sm font-black text-white">
              Continue to FixMy.Money <ArrowRight size={16} />
            </TrackedLink>
          </div>
          <div className="rounded-lg bg-slate-950 p-6 text-white">
            <FileSearch size={34} className="text-emerald-300" />
            <h2 className="mt-6 text-xl font-black">What you can do next</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
              <p>Analyze credit-report information.</p>
              <p>Review possible reporting issues.</p>
              <p>Generate and organize correspondence.</p>
              <p>Track dispute activity over time.</p>
            </div>
            <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-slate-400">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-300" />
              Software only. No guaranteed credit outcome, deletion, or mortgage approval.
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
