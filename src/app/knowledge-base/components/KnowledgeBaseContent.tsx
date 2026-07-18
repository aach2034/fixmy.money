'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  BookOpen,
  FileText,
  Users,
  CreditCard,
  Shield,
  MessageSquare,
  BarChart3,
  ChevronRight,
  Zap,
  Star,
} from 'lucide-react';

const categories = [
  {
    icon: Zap,
    title: 'Getting Started',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    articles: [
      'Setting up your FixMy.Money account',
      'Importing your first clients',
      'Configuring your white label portal',
      'Connecting your payment processor',
      'Inviting team members',
    ],
  },
  {
    icon: FileText,
    title: 'Dispute Management',
    color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    articles: [
      'How automated disputes work',
      'Customizing dispute letter templates',
      'Tracking bureau responses',
      'Managing round 2 and round 3 disputes',
      'Understanding dispute success rates',
    ],
  },
  {
    icon: Users,
    title: 'Client Management',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    articles: [
      'Adding and onboarding clients',
      'Using the client pipeline stages',
      'Setting up automated follow-ups',
      'Client portal walkthrough',
      'Managing client documents',
    ],
  },
  {
    icon: CreditCard,
    title: 'Billing & Payments',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    articles: [
      'Setting up recurring billing',
      'Creating payment plans',
      'Handling failed payments',
      'Issuing refunds',
      'Understanding your revenue dashboard',
    ],
  },
  {
    icon: Shield,
    title: 'Compliance & Legal',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    articles: [
      'CROA compliance overview',
      'Required disclosures and contracts',
      'Audit trail and record keeping',
      'State-specific regulations',
      'Dispute letter compliance guidelines',
    ],
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    articles: [
      'Understanding your dashboard metrics',
      'Revenue forecasting explained',
      'Client risk score methodology',
      'Exporting reports',
      'Setting up automated reports',
    ],
  },
];

const popularArticles = [
  { title: 'How to set up your white label client portal', views: '4.2k', category: 'Getting Started' },
  { title: 'CROA compliance checklist for credit repair businesses', views: '3.8k', category: 'Compliance' },
  { title: 'Automating dispute letters: step-by-step guide', views: '3.1k', category: 'Disputes' },
  { title: 'Setting up recurring billing for your clients', views: '2.9k', category: 'Billing' },
  { title: 'Understanding the client risk score', views: '2.4k', category: 'Analytics' },
];

export default function KnowledgeBaseContent() {
  const [query, setQuery] = useState('');

  const filteredCategories = categories?.map((cat) => ({
    ...cat,
    articles: cat?.articles?.filter((a) =>
      query === '' || a?.toLowerCase()?.includes(query?.toLowerCase())
    ),
  }))?.filter((cat) => query === '' || cat?.articles?.length > 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dashboard-style page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
            <BookOpen size={18} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Knowledge Base</h1>
            <p className="text-sm text-slate-500">Guides, tutorials, and documentation for credit repair professionals.</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Search */}
        <div className="relative mb-8 max-w-2xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e?.target?.value)}
            placeholder="Search articles, guides, tutorials..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors shadow-sm"
          />
        </div>

        {/* Popular Articles */}
        {query === '' && (
          <div className="mb-10">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Star size={16} className="text-amber-500" />
              Popular Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {popularArticles?.map((article) => (
                <div
                  key={article?.title}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors font-medium leading-snug">
                      {article?.title}
                    </p>
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">{article?.category}</span>
                    <span className="text-xs text-slate-400">{article?.views} views</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories */}
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-5">
            {query ? `Results for "${query}"` : 'Browse by Category'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCategories?.map((cat) => {
              const CatIcon = cat?.icon;
              return (
                <div key={cat?.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${cat?.color}`}>
                    <CatIcon size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-4">{cat?.title}</h3>
                  <ul className="space-y-2.5">
                    {cat?.articles?.map((article) => (
                      <li key={article}>
                        <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors text-left group w-full">
                          <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                          {article}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-10 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <MessageSquare size={22} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Can't find what you're looking for?</p>
              <p className="text-sm text-slate-500">Our support team typically responds within 2 hours.</p>
            </div>
          </div>
          <Link
            href="/live-chat"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors whitespace-nowrap"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
