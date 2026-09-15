import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Calendar, Clock, User, ChevronRight } from 'lucide-react';
import { getArticleBySlug, getRelatedArticles, getAllSlugs } from '@/lib/blog/articles';
import { articleSeo } from '@/lib/seo/article';
import TrackedLink from '@/components/marketing/TrackedLink';
import PublicBrandLink from '@/components/marketing/PublicBrandLink';
import PublicFooter from '@/components/marketing/PublicFooter';

function machineDate(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map(slug => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: 'Article Not Found | FixMy.Money' };
  const seo = articleSeo(article);

  return {
    title: seo.seoTitle,
    description: seo.metaDescription,
    keywords: [seo.primaryKeyword, ...seo.secondaryKeywords].filter(Boolean),
    alternates: { canonical: seo.canonicalUrl },
    robots: seo.indexStatus === 'noindex' ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: seo.seoTitle,
      description: seo.metaDescription,
      type: 'article',
      url: seo.canonicalUrl,
      siteName: 'FixMy.Money',
      publishedTime: machineDate(seo.publishedAt),
      modifiedTime: machineDate(seo.updatedAt),
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.seoTitle,
      description: seo.metaDescription,
      images: seo.ogImageUrl ? [seo.ogImageUrl] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedArticles(article.relatedSlugs);
  const primaryCtaHref = '/#reopening-list';
  const primaryCtaLabel = 'Reserve One Month Free';
  const primaryCtaBody = 'Join the reopening list and reserve one full month free when you activate after reopening.';

  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription,
    author: {
      '@type': 'Person',
      name: article.author,
      jobTitle: article.authorTitle,
    },
    publisher: {
      '@type': 'Organization',
      name: 'FixMy.Money',
      url: 'https://fixmy.money',
    },
    datePublished: machineDate(article.publishedDate),
    dateModified: machineDate(article.updatedDate),
    url: article.canonicalUrl,
    mainEntityOfPage: article.canonicalUrl,
  };

  const faqStructuredData = article.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  } : null;

  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://fixmy.money' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://fixmy.money/blog' },
      { '@type': 'ListItem', position: 3, name: article.title, item: article.canonicalUrl },
    ],
  };

  return (
    <div className="a11y-light premium-public min-h-screen bg-[#f8fbf9]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      {faqStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      {/* Nav */}
      <nav aria-label="Primary" className="sticky top-0 z-40 border-b border-[#d8e3de] bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <PublicBrandLink compact />
          <div className="flex items-center gap-3">
            <Link href="/blog" className="hidden text-sm font-semibold text-[#52636d] transition-colors hover:text-[#267a31] sm:block">Resources</Link>
            <Link href="/login" className="hidden text-sm font-semibold text-[#52636d] transition-colors hover:text-[#267a31] sm:block">Sign in</Link>
            <TrackedLink
              href={primaryCtaHref}
              eventLabel={primaryCtaLabel}
              eventLocation={`blog_article_nav:${article.slug}`}
              className="rounded-xl bg-[#267a31] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(38,122,49,.18)] transition hover:-translate-y-0.5 hover:bg-[#1f6729]"
            >
              Reserve One Month Free
            </TrackedLink>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="border-b border-[#dfe8e3] bg-white px-4 py-3 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-700">Home</Link>
          <ChevronRight size={12} />
          <Link href="/blog" className="hover:text-slate-700">Blog</Link>
          <ChevronRight size={12} />
          <span className="text-slate-700 truncate max-w-xs">{article.title}</span>
        </div>
      </div>

      {/* Article Header */}
      <header className="a11y-dark brand-grid bg-[#07153d] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="rounded-full border border-[#75d0a4]/30 bg-[#75d0a4]/10 px-3 py-1 text-xs font-bold text-[#98dfbc]">
              {article.category}
            </span>
          </div>
          <h1 className="mb-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-[-.035em] text-white sm:text-5xl">
            {article.title}
          </h1>
          <p className="mb-6 max-w-2xl text-lg leading-8 text-[#c8d6e5]">{article.excerpt}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <User size={14} />
              {article.author} · {article.authorTitle}
            </span>
            <time dateTime={machineDate(article.publishedDate)} className="flex items-center gap-1.5">
              <Calendar size={14} />
              Published {article.publishedDate}
            </time>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {article.readingTime}
            </span>
          </div>
          {article.updatedDate !== article.publishedDate && (
            <p className="text-xs text-slate-500 mt-2">
              Updated <time dateTime={machineDate(article.updatedDate)}>{article.updatedDate}</time>
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents — Sidebar */}
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-24">
              <div className="rounded-2xl border border-[#d8e4de] bg-white p-5 shadow-[0_8px_28px_rgba(12,43,34,.04)]">
                <h2 className="text-sm font-bold text-slate-900 mb-3">Table of Contents</h2>
                <ol className="space-y-2">
                  {article.tableOfContents.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-xs font-bold text-[#267a31]">{i + 1}.</span>
                      <span className="text-xs text-slate-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 rounded-2xl bg-[#07153d] p-5 text-white shadow-[0_14px_34px_rgba(7,21,61,.14)]">
                <p className="text-sm font-bold mb-2">Ready to get started?</p>
                <p className="text-xs text-white mb-3">One full month free when you activate after reopening.</p>
                <TrackedLink
                  href={primaryCtaHref}
                  eventLabel={primaryCtaLabel}
                  eventLocation={`blog_article_sidebar:${article.slug}`}
                  className="block rounded-xl bg-white px-4 py-2.5 text-center text-xs font-bold text-[#236b2e] transition hover:-translate-y-0.5 hover:bg-[#f2f9f5]"
                >
                  Reserve One Month Free
                </TrackedLink>
              </div>
            </div>
          </aside>

          {/* Article Body */}
          <article className="lg:col-span-3 order-1 lg:order-2">
            <div className="mb-8 rounded-2xl border border-[#d8e4de] bg-white p-5 shadow-[0_8px_28px_rgba(12,43,34,.04)]">
              <p className="text-sm font-bold text-slate-900">Written and reviewed by {article.author}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {article.authorTitle}. FixMy.Money publishes operational guidance for credit-repair professionals using primary regulatory sources and practical agency workflows. Content is educational and is not legal advice.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
                <Link href="/about" className="text-[#267a31] hover:text-[#1f6729]">About the publisher</Link>
                <Link href="/compliance" className="text-[#267a31] hover:text-[#1f6729]">Compliance approach</Link>
              </div>
            </div>
            <div className="prose prose-slate max-w-none">
              {article.sections.map((section, i) => (
                <div key={i} className="mb-8">
                  {section.level === 2 ? (
                    <h2 className="text-xl font-extrabold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                      {section.heading}
                    </h2>
                  ) : (
                    <h3 className="text-lg font-bold text-slate-900 mb-3">
                      {section.heading}
                    </h3>
                  )}
                  <div className="text-slate-700 leading-relaxed space-y-3">
                    {section.content.split('\n\n').map((para, j) => {
                      if (para.startsWith('**') && para.includes('**\n')) {
                        const parts = para.split('\n');
                        const boldPart = parts[0];
                        const rest = parts.slice(1);
                        return (
                          <div key={j}>
                            <p className="font-bold text-slate-900 mb-1">{boldPart.replace(/\*\*/g, '')}</p>
                            {rest.map((line, k) => (
                              <p key={k} className="text-slate-700">{line}</p>
                            ))}
                          </div>
                        );
                      }
                      if (para.startsWith('- ') || para.includes('\n- ')) {
                        const lines = para.split('\n').filter(l => l.trim());
                        return (
                          <ul key={j} className="list-disc list-inside space-y-1 ml-2">
                            {lines.map((line, k) => (
                              <li key={k} className="text-slate-700">
                                {line.replace(/^- /, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      if (/^\d+\./.test(para) || para.includes('\n1. ')) {
                        const lines = para.split('\n').filter(l => l.trim());
                        return (
                          <ol key={j} className="list-decimal list-inside space-y-1 ml-2">
                            {lines.map((line, k) => (
                              <li key={k} className="text-slate-700">
                                {line.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                              </li>
                            ))}
                          </ol>
                        );
                      }
                      return (
                        <p key={j} className="text-slate-700 leading-relaxed">
                          {para.replace(/\*\*(.*?)\*\*/g, '$1')}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* FAQ Section */}
            {article.faqs.length > 0 && (
              <div className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {article.faqs.map((faq, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                      <h3 className="font-bold text-slate-900 mb-2 text-sm">{faq.question}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Disclaimer:</strong> {article.disclaimer}
              </p>
            </div>

            {/* CTA */}
            <div className="a11y-dark brand-grid mt-8 rounded-2xl bg-[#07153d] p-6 text-white shadow-[0_18px_44px_rgba(7,21,61,.14)]">
              <h3 className="text-lg font-extrabold mb-2">Get FixMy.Money reopening updates</h3>
              <p className="text-slate-300 text-sm mb-4">{primaryCtaBody}</p>
              <div className="flex flex-wrap gap-3">
                <TrackedLink
                  href={primaryCtaHref}
                  eventLabel={primaryCtaLabel}
                  eventLocation={`blog_article_body:${article.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#267a31] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2f8d3b]"
                >
                  {primaryCtaLabel} <ArrowRight size={14} />
                </TrackedLink>
                <Link href="/product-tour" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  Explore Demo
                </Link>
              </div>
            </div>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-lg font-extrabold text-slate-900 mb-4">Related Articles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedArticles.map(related => (
                    <Link
                      key={related.slug}
                      href={`/blog/${related.slug}`}
                      className="group rounded-xl border border-[#d8e4de] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#b7d1c4] hover:shadow-sm"
                    >
                      <span className="rounded-full bg-[#eef7f2] px-2 py-0.5 text-xs font-bold text-[#267a31]">{related.category}</span>
                      <p className="mt-2 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#267a31]">{related.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{related.readingTime}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Blog */}
            <div className="mt-8">
              <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                <ArrowLeft size={14} /> Back to Blog
              </Link>
            </div>
          </article>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
