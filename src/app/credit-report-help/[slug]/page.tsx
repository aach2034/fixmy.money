import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react';
import TrackedLink from '@/components/marketing/TrackedLink';
import { consumerTools, getSeoTopic, seoTopics } from '@/lib/marketing/acquisition';
import { canonicalUrl } from '@/lib/seo/config';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return seoTopics.map(topic => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = getSeoTopic(slug);
  if (!topic) return { title: 'Credit Report Guide Not Found | FixMy.Money' };
  return {
    title: `${topic.title} | FixMy.Money`,
    description: `${topic.intent} Learn how to organize facts, evidence, letters, and follow-up without assured-outcome claims.`,
    alternates: { canonical: canonicalUrl(`/credit-report-help/${topic.slug}`) },
    openGraph: {
      title: `${topic.title} | FixMy.Money`,
      description: topic.intent,
      url: canonicalUrl(`/credit-report-help/${topic.slug}`),
      siteName: 'FixMy.Money',
      type: 'article',
    },
  };
}

export default async function CreditReportHelpPage({ params }: Props) {
  const { slug } = await params;
  const topic = getSeoTopic(slug);
  if (!topic) notFound();
  const tool = consumerTools.find(item => item.slug === topic.toolSlug) ?? consumerTools[0];

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: topic.title,
    description: topic.intent,
    publisher: { '@type': 'Organization', name: 'FixMy.Money', url: 'https://fixmy.money' },
    mainEntityOfPage: canonicalUrl(`/credit-report-help/${topic.slug}`),
    dateModified: '2026-08-27',
  };

  return (
    <main className="min-h-screen bg-white text-slate-950" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <nav className="border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-black">FixMy.Money</Link>
          <Link href="/tools" className="text-sm font-bold text-emerald-700">Free Tools</Link>
        </div>
      </nav>
      <article>
        <header className="bg-[#f7fbfa] px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-emerald-700"><BookOpen size={15} /> Credit report guide</p>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">{topic.title}</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">{topic.intent}</p>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {topic.sections.map((section, index) => (
              <section key={section} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-3 text-xl font-black">
                  <CheckCircle2 size={22} className="text-emerald-700" />
                  Step {index + 1}
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-700">{section}</p>
              </section>
            ))}
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-sm font-black text-amber-900">Important note</h2>
              <p className="mt-2 text-sm leading-6 text-amber-800">This guide is educational and does not provide legal, credit, or mortgage advice. FixMy.Money helps organize credit-report workflows and does not promise score changes, deletions, or approvals.</p>
            </section>
          </div>
          <aside className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-black">{tool.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{tool.description}</p>
            <TrackedLink href={tool.href} eventLabel={tool.cta} eventLocation={`seo_${topic.slug}`} className="mt-5 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-3 text-sm font-black text-white">
              {tool.cta} <ArrowRight size={16} />
            </TrackedLink>
            <div className="mt-6 border-t border-slate-200 pt-5">
              <h3 className="text-sm font-black">Related guides</h3>
              <div className="mt-3 space-y-2">
                {seoTopics.filter(item => item.slug !== topic.slug).slice(0, 4).map(item => (
                  <Link key={item.slug} href={`/credit-report-help/${item.slug}`} className="block text-sm font-semibold leading-5 text-slate-700 hover:text-emerald-700">
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
