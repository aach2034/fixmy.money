import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, User } from 'lucide-react';
import { ARTICLES } from '@/lib/blog/articles';

export const metadata: Metadata = {
  title: 'Blog | FixMy.Money — Credit Repair Software for Agencies',
  description:
    'Guides, insights, and resources for credit repair professionals. Learn about CROA compliance, dispute workflows, software selection, and running a credit repair agency.',
  alternates: { canonical: 'https://fixmy.money/blog' },
  openGraph: {
    title: 'Blog | FixMy.Money',
    description: 'Guides and resources for credit repair professionals.',
    type: 'website',
    url: 'https://fixmy.money/blog',
    siteName: 'FixMy.Money',
  },
};

const CATEGORIES = ['All', 'Founder Story', 'Getting Started', 'Software', 'Compliance', 'Operations', 'Automation'];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Pricing</Link>
            <Link href="/signup" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
              Start $1 Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-950 to-[#0d1f3c]">
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            Resources
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Credit Repair Agency Resources
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl">
            Guides, insights, and practical resources for credit repair professionals.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 px-4 bg-slate-50 border-b border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className={`text-xs font-semibold px-4 py-2 rounded-full border cursor-pointer transition-colors ${
                  cat === 'All' ?'bg-blue-600 text-white border-blue-600' :'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ARTICLES.map((article) => (
              <article
                key={article.slug}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {article.category}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors leading-snug">
                  <Link href={`/blog/${article.slug}`}>{article.title}</Link>
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">{article.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {article.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {article.publishedDate.replace(/^\w+ (\d+), /, '')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {article.readingTime}
                    </span>
                  </div>
                  <Link
                    href={`/blog/${article.slug}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Read <ArrowRight size={12} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 px-4 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            Articles on this blog are for informational purposes only and do not constitute legal advice. Credit repair agencies are responsible for their own compliance with CROA, FCRA, TSR, and applicable laws. Consult a qualified attorney for legal guidance.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-white mb-3">Ready to run your agency from one platform?</h2>
          <p className="text-slate-400 mb-6 text-sm">14-day trial for $1. Payment method required.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all"
          >
            Start $1 Trial <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
