'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Shield, TrendingUp, FileText, Users, Brain, ChevronRight, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';

const EDUCATION_ARTICLES = [
  {
    category: 'Credit Repair Business',
    icon: '🏢',
    articles: [
      { title: 'How to Start a Credit Repair Business in 2026', slug: '/blog/how-to-start-credit-repair-business', readTime: '8 min', description: 'A step-by-step guide to launching a compliant, profitable credit repair business from scratch.' },
      { title: 'CROA Compliance Guide for Credit Repair Professionals', slug: '/blog/croa-compliance-guide', readTime: '12 min', description: 'Everything you need to know about the Credit Repair Organizations Act and how to stay compliant.' },
      { title: 'How to Price Your Credit Repair Services', slug: '/blog/credit-repair-pricing-guide', readTime: '6 min', description: 'Pricing strategies, market rates, and how to structure your service packages.' },
    ],
  },
  {
    category: 'Dispute Process',
    icon: '📋',
    articles: [
      { title: 'How Credit Dispute Letters Work', slug: '/blog/how-credit-dispute-letters-work', readTime: '7 min', description: 'A plain-English explanation of the dispute process, bureau timelines, and what to expect.' },
      { title: 'Understanding the FCRA: A Credit Professional\'s Guide', slug: '/blog/fcra-guide-credit-professionals', readTime: '10 min', description: 'Key provisions of the Fair Credit Reporting Act that every credit repair professional must know.' },
      { title: 'Common Negative Items and How to Dispute Them', slug: '/blog/common-negative-items-dispute-guide', readTime: '9 min', description: 'Late payments, collections, charge-offs, and more — dispute strategies for each type.' },
    ],
  },
  {
    category: 'Business Growth',
    icon: '📈',
    articles: [
      { title: 'How to Get Your First 10 Credit Repair Clients', slug: '/blog/get-first-credit-repair-clients', readTime: '8 min', description: 'Proven lead generation strategies for new credit repair businesses.' },
      { title: 'Credit Repair CRM: Why You Need One from Day One', slug: '/blog/credit-repair-crm-guide', readTime: '6 min', description: 'Why managing clients in spreadsheets kills growth and what to use instead.' },
      { title: 'Automating Your Credit Repair Business', slug: '/blog/automate-credit-repair-business', readTime: '7 min', description: 'How automation tools help you scale without hiring more staff.' },
    ],
  },
];

const TOOLS = [
  { icon: Brain, title: 'AI Credit Analysis', description: 'Upload a credit report and get instant AI-powered analysis of negative items and dispute opportunities.', cta: 'Try for $1', href: '/sign-up-login-screen?tab=register' },
  { icon: FileText, title: 'Dispute Letter Generator', description: 'Generate bureau-ready dispute letters for Equifax, Experian, and TransUnion in seconds.', cta: 'Try for $1', href: '/sign-up-login-screen?tab=register' },
  { icon: Users, title: 'Client Management CRM', description: 'Manage all your clients, disputes, documents, and billing from one professional dashboard.', cta: 'Try for $1', href: '/sign-up-login-screen?tab=register' },
];

export default function FinanceContent() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleLeadCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>

      {/* RELATIONSHIP BANNER */}
      <div className="bg-blue-600 text-white text-center py-2.5 px-4 text-sm font-medium">
        FixMy.Finance is the education hub for{' '}
        <Link href="/" className="underline font-bold hover:no-underline">
          FixMy.Money
        </Link>{' '}
        — the AI credit repair software platform.
      </div>

      {/* NAVBAR */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Image src="/assets/images/fix_my_money_logo-1780535345534.png" alt="FixMy.Money" width={130} height={34} className="object-contain h-auto" />
              </Link>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-bold text-slate-700">Finance</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden md:block">Articles</Link>
              <Link href="/#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden md:block">Pricing</Link>
              <Link
                href="/sign-up-login-screen?tab=register"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
              >
                Try FixMy.Money for $1 <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <BookOpen size={13} />
            Financial Tools, Credit Education & Business Resources
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 mb-5 leading-tight">
            Credit Education &{' '}
            <span className="text-blue-600">Financial Resources</span>{' '}
            for Credit Professionals
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            Free guides, articles, and tools to help you understand credit repair, grow your business, and serve your clients better. Powered by FixMy.Money.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up-login-screen?tab=register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
            >
              <Sparkles size={18} />
              Try FixMy.Money — $1 Trial
            </Link>
            <a
              href="#articles"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 font-semibold text-base px-8 py-4 rounded-2xl hover:border-blue-200 hover:text-blue-600 transition-colors"
            >
              Browse Articles
            </a>
          </div>
        </div>
      </section>

      {/* RELATIONSHIP CALLOUT */}
      <section className="py-12 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Powered by FixMy.Money</p>
              <h2 className="text-2xl font-extrabold text-white mb-3">FixMy.Finance is the education hub. FixMy.Money is the software.</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                FixMy.Finance provides free credit education and business resources. When you're ready to run your credit repair business with professional tools, FixMy.Money is the platform — with AI analysis, dispute automation, client management, and billing built in.
              </p>
              <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold text-sm">
                Explore FixMy.Money <ExternalLink size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 shrink-0">
              {[
                { label: 'AI Credit Analysis', icon: Brain },
                { label: 'Dispute Automation', icon: FileText },
                { label: 'Client CRM', icon: Users },
                { label: 'Stripe Billing', icon: TrendingUp },
              ].map(item => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.label} className="bg-slate-800 rounded-xl border border-slate-700 p-3 flex items-center gap-2">
                    <ItemIcon size={16} className="text-blue-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-300">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* TOOLS SECTION */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-2">Free Tools</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Professional credit repair tools — try for $1</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TOOLS.map(tool => {
              const ToolIcon = tool.icon;
              return (
                <div key={tool.title} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:border-blue-200 hover:shadow-md transition-all">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <ToolIcon size={22} className="text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{tool.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">{tool.description}</p>
                  <Link href={tool.href} className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-sm">
                    {tool.cta} <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* EDUCATION ARTICLES */}
      <section id="articles" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Education</p>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Credit repair education for professionals</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">Practical guides on compliance, disputes, business growth, and client management.</p>
          </div>
          <div className="space-y-10">
            {EDUCATION_ARTICLES.map(category => (
              <div key={category.category}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{category.icon}</span>
                  <h3 className="text-xl font-bold text-slate-900">{category.category}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {category.articles.map(article => (
                    <Link
                      key={article.slug}
                      href={article.slug}
                      className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-200 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{article.readTime} read</span>
                        <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mb-2 leading-snug group-hover:text-blue-600 transition-colors">{article.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{article.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/blog" className="inline-flex items-center gap-2 border-2 border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:border-blue-200 hover:text-blue-600 transition-colors">
              View All Articles <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* COMPLIANCE NOTE */}
      <section className="py-10 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
            <Shield size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">Educational Content Disclaimer</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Content on FixMy.Finance is for educational purposes only and does not constitute legal advice. Credit repair professionals are solely responsible for complying with CROA, FCRA, TSR, applicable state laws, and all other regulations. Results vary. FixMy.Money does not guarantee credit score improvements or item removals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LEAD CAPTURE */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-950">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            <Sparkles size={13} />
            Free Credit Repair Resources
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4">Get free credit repair guides delivered to your inbox</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Compliance updates, dispute strategies, business growth tips, and more — for credit repair professionals.
          </p>
          {submitted ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-bold">You're on the list!</p>
              <p className="text-slate-400 text-sm mt-1">Check your inbox for your first resource.</p>
            </div>
          ) : (
            <form onSubmit={handleLeadCapture} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 backdrop-blur-sm"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shrink-0"
              >
                Subscribe
              </button>
            </form>
          )}
          <p className="text-xs text-slate-500 mt-4">No spam. Unsubscribe anytime. By subscribing, you agree to our <a href="/privacy-policy" className="underline hover:text-slate-400">Privacy Policy</a>.</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to run your credit repair business with professional tools?</h2>
          <p className="text-blue-100 mb-8 text-lg">FixMy.Money is the software platform — AI analysis, dispute automation, client management, and billing in one place.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up-login-screen?tab=register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white text-blue-600 font-bold text-base px-8 py-4 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <Sparkles size={18} />
              Start $1 Trial on FixMy.Money
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold text-base px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors"
            >
              Learn More <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-500 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs">© 2026 FixMy.Finance — An education resource by <Link href="/" className="text-blue-400 hover:text-blue-300">FixMy.Money</Link>. Educational content only. Not legal advice.</p>
            <div className="flex items-center gap-4 text-xs">
              <Link href="/" className="hover:text-slate-300 transition-colors">FixMy.Money</Link>
              <a href="/privacy-policy" className="hover:text-slate-300 transition-colors">Privacy</a>
              <a href="/terms-of-service" className="hover:text-slate-300 transition-colors">Terms</a>
              <Link href="/contact" className="hover:text-slate-300 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
