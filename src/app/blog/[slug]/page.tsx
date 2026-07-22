import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Calendar, Clock, User, ChevronRight } from 'lucide-react';
import { getArticleBySlug, getRelatedArticles, getAllSlugs } from '@/lib/blog/articles';

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

  return {
    title: article.seoTitle,
    description: article.metaDescription,
    alternates: { canonical: article.canonicalUrl },
    openGraph: {
      title: article.seoTitle,
      description: article.metaDescription,
      type: 'article',
      url: article.canonicalUrl,
      siteName: 'FixMy.Money',
      publishedTime: machineDate(article.publishedDate),
      modifiedTime: machineDate(article.updatedDate),
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.seoTitle,
      description: article.metaDescription,
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
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
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
      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Blog</Link>
            <Link href="/sign-up-login-screen?tab=register" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
              Start $1 Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="px-4 sm:px-8 py-3 bg-slate-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-700">Home</Link>
          <ChevronRight size={12} />
          <Link href="/blog" className="hover:text-slate-700">Blog</Link>
          <ChevronRight size={12} />
          <span className="text-slate-700 truncate max-w-xs">{article.title}</span>
        </div>
      </div>

      {/* Article Header */}
      <header className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-950 to-[#0d1f3c]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
              {article.category}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
            {article.title}
          </h1>
          <p className="text-lg text-slate-300 mb-6 max-w-2xl">{article.excerpt}</p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents — Sidebar */}
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="sticky top-24">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-slate-900 mb-3">Table of Contents</h2>
                <ol className="space-y-2">
                  {article.tableOfContents.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-xs font-bold text-blue-600 mt-0.5 shrink-0">{i + 1}.</span>
                      <span className="text-xs text-slate-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 bg-blue-600 rounded-2xl p-5 text-white">
                <p className="text-sm font-bold mb-2">Ready to get started?</p>
                <p className="text-xs text-blue-100 mb-3">14-day trial for $1. Payment method required.</p>
                <Link href="/sign-up-login-screen?tab=register" className="block text-center text-xs font-bold bg-white text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                  Start $1 Trial
                </Link>
              </div>
            </div>
          </aside>

          {/* Article Body */}
          <article className="lg:col-span-3 order-1 lg:order-2">
            <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-900">Written and reviewed by {article.author}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {article.authorTitle}. FixMy.Money publishes operational guidance for credit-repair professionals using primary regulatory sources and practical agency workflows. Content is educational and is not legal advice.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
                <Link href="/about" className="text-blue-700 hover:text-blue-800">About the publisher</Link>
                <Link href="/compliance" className="text-blue-700 hover:text-blue-800">Compliance approach</Link>
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
            <div className="mt-8 bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-extrabold mb-2">{article.cta.heading}</h3>
              <p className="text-slate-300 text-sm mb-4">{article.cta.body}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  Start $1 Trial <ArrowRight size={14} />
                </Link>
                <Link href="/demo-mode" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
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
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                    >
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{related.category}</span>
                      <p className="text-sm font-bold text-slate-900 mt-2 group-hover:text-blue-600 transition-colors leading-snug">{related.title}</p>
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
    </div>
  );
}
