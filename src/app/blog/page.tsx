import React from 'react';
import type { Metadata } from 'next';
import { createSeoMetadata } from "@/lib/seo/config";
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, User } from 'lucide-react';
import { ARTICLES } from '@/lib/blog/articles';
import TrackedLink from '@/components/marketing/TrackedLink';
import PublicBrandLink from '@/components/marketing/PublicBrandLink';
import PublicFooter from '@/components/marketing/PublicFooter';

export const metadata: Metadata = createSeoMetadata("/blog");

const CATEGORIES = ['Credit Report Errors', 'Founder Story', 'Getting Started', 'Software', 'Compliance', 'Operations', 'Automation'];

export default function BlogPage() {
  return (
    <div className="a11y-light premium-public min-h-screen bg-[#f8fbf9]" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav aria-label="Primary" className="sticky top-0 z-40 border-b border-[#d8e3de] bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <PublicBrandLink compact />
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden text-sm font-semibold text-[#52636d] transition-colors hover:text-[#267a31] sm:block">Pricing</Link>
            <Link href="/login" className="hidden text-sm font-semibold text-[#52636d] transition-colors hover:text-[#267a31] sm:block">Sign in</Link>
            <TrackedLink
              href="/#reopening-list"
              eventLabel="Reserve One Month Free"
              eventLocation="blog_index_nav"
              className="rounded-xl bg-[#267a31] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(38,122,49,.18)] transition hover:-translate-y-0.5 hover:bg-[#1f6729]"
            >
              Reserve One Month Free
            </TrackedLink>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="a11y-dark brand-grid relative overflow-hidden bg-[#07153d] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#75d0a4]/30 bg-[#75d0a4]/10 px-4 py-2 text-xs font-bold text-[#98dfbc]">
            Evidence-led resources
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-[-.045em] text-white sm:text-6xl">
            Credit Repair Agency Resources
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#c8d6e5] sm:text-xl">
            Practical guidance for building careful, evidence-led credit-repair workflows.
          </p>
        </div>
      </section>

      {/* Topic index */}
      <section className="border-b border-[#dfe8e3] bg-white px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#65746e]">Explore by topic</p>
          <div className="flex flex-wrap gap-2" aria-label="Available article topics">
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className="rounded-full border border-[#d5e2dc] bg-[#f7faf8] px-3.5 py-2 text-xs font-semibold text-[#53635c]"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="bg-[#f8fbf9] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ARTICLES.map((article) => (
              <article
                key={article.slug}
                className="group rounded-2xl border border-[#d8e4de] bg-white p-6 shadow-[0_8px_28px_rgba(12,43,34,.04)] transition duration-200 hover:-translate-y-1 hover:border-[#b7d1c4] hover:shadow-[0_18px_42px_rgba(12,43,34,.09)]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-full bg-[#eef7f2] px-3 py-1 text-xs font-bold text-[#236b2e]">
                    {article.category}
                  </span>
                </div>
                <h2 className="mb-2 text-lg font-extrabold leading-snug text-[#0b1742] transition-colors group-hover:text-[#267a31]">
                  <Link href={`/blog/${article.slug}`}>{article.title}</Link>
                </h2>
                <p className="mb-4 text-sm leading-6 text-[#5c6b65]">{article.excerpt}</p>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
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
                    className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#267a31] hover:text-[#1f6729]"
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
      <section className="border-t border-[#dfe8e3] bg-white px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs leading-relaxed text-[#66766e]">
            Articles on this blog are for informational purposes only and do not constitute legal advice. Credit repair agencies are responsible for their own compliance with CROA, FCRA, TSR, and applicable laws. Consult a qualified attorney for legal guidance.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="a11y-dark brand-grid bg-[#07153d] px-4 py-14 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-white mb-3">Ready to run your agency from one platform?</h2>
          <p className="mb-6 text-sm text-[#c8d6e5]">One full month free when you activate after reopening.</p>
          <TrackedLink
            href="/#reopening-list"
            eventLabel="Reserve One Month Free"
            eventLocation="blog_index_footer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#267a31] px-8 py-4 font-bold text-white shadow-[0_12px_28px_rgba(38,122,49,.25)] transition hover:-translate-y-0.5 hover:bg-[#2f8d3b]"
          >
            Reserve One Month Free <ArrowRight size={16} />
          </TrackedLink>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
