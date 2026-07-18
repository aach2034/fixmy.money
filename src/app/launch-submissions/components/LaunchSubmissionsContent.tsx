'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ExternalLink, Copy, CheckCircle, Clock, XCircle, AlertCircle, Search, RefreshCw, Globe, Star, ChevronDown, ChevronUp, Send, FileText, Calendar, Link2, Tag, Edit3, Megaphone } from 'lucide-react';

interface Directory {
  id: string;
  name: string;
  category: string;
  url: string;
  submission_url: string | null;
  requires_login: boolean;
  free_or_paid: string;
  relevance_score: number;
  domain_authority_estimate: number;
  notes: string | null;
  listing_status: string;
  submitted_at: string | null;
  approved_at: string | null;
  login_email_used: string | null;
  required_assets: string[] | null;
  next_action: string | null;
  follow_up_date: string | null;
  utm_link: string | null;
}

interface OutreachTarget {
  id: string;
  publication_name: string;
  category: string;
  contact_url: string | null;
  pitch_angle: string | null;
  relevance_score: number;
  outreach_status: string;
  notes: string | null;
}

type ActiveTab = 'directories' | 'outreach' | 'copy' | 'social' | 'utm';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600', icon: <Clock className="w-3 h-3" /> },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: <Send className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  needs_followup: { label: 'Follow Up', color: 'bg-amber-100 text-amber-700', icon: <AlertCircle className="w-3 h-3" /> },
};

const OUTREACH_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600' },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  replied: { label: 'Replied', color: 'bg-purple-100 text-purple-700' },
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700' },
};

const CATEGORY_LABELS: Record<string, string> = {
  saas_directory: 'SaaS Directory',
  startup_launch: 'Startup Launch',
  software_review: 'Software Review',
  fintech_directory: 'Fintech',
  small_business: 'Small Business',
  ai_tools: 'AI Tools',
  credit_repair: 'Credit Repair',
  entrepreneur: 'Entrepreneur',
  product_launch: 'Product Launch',
  social: 'Social',
};

const SUBMISSION_COPY = {
  tagline_50: 'AI credit repair software for modern agencies',
  tagline_one_line: 'FixMy.Money — AI-powered credit repair software for professionals and agencies.',
  meta_description: 'FixMy.Money is AI-powered credit repair software for professionals and agencies. Manage clients, generate dispute workflows, organize documents, automate billing, and grow your credit repair business.',
  social_280: 'We built FixMy.Money — AI-powered credit repair software for professionals and agencies. Manage clients, generate dispute workflows, automate billing, and scale your business from one dashboard. Start your $1 trial: https://fixmy.money',
  short: 'FixMy.Money is AI-powered credit repair software for professionals and agencies. Manage clients, generate dispute workflows, organize documents, automate billing, and grow your credit repair business from one clean workspace.',
  medium: 'FixMy.Money helps credit repair professionals and agencies run a more organized, modern business. The platform combines client intake, AI-assisted dispute workflows, CRM tools, document storage, billing, task automation, and agency dashboards in one place. It is designed for entrepreneurs who want a cleaner alternative to outdated credit repair software.',
  long: 'FixMy.Money is an AI-powered credit repair software platform built for credit repair professionals, agencies, and entrepreneurs. It helps teams manage clients, organize documents, generate dispute workflows, track progress, automate billing, and operate from one centralized dashboard. The platform is designed to help credit repair businesses move faster, stay organized, and create a more professional client experience. FixMy.Money provides software tools only. Users are responsible for following CROA, FCRA, TSR, state laws, and all applicable regulations.',
  product_hunt: `**FixMy.Money — AI-powered credit repair software for modern agencies**

Hey Product Hunt! 👋

We built FixMy.Money because credit repair professionals deserve better software than what has existed for the past decade.

**What it does:**
- AI-assisted dispute workflow generation
- Client CRM and intake management
- Document storage and organization
- Stripe-native billing and subscriptions
- Agency dashboard for team management
- Client portal for transparent progress tracking

**Who it's for:**
Credit repair professionals, agencies, and entrepreneurs who want to run a more organized, compliant, and modern business.

**Why we built it:**
The credit repair software market is dominated by outdated tools. We wanted to build something that feels like Salesforce + HubSpot + modern AI — designed specifically for this industry.

**Compliance note:**
FixMy.Money provides software tools only. Users are responsible for CROA, FCRA, TSR, and all applicable regulations.

Try it for $1 → https://fixmy.money`,
  betalist: `FixMy.Money is AI-powered credit repair software for professionals and agencies. Manage clients, generate dispute workflows, organize documents, automate billing, and grow your credit repair business from one clean workspace. Built for modern agencies that want a compliant, organized alternative to outdated credit repair software. Start your $1 trial at fixmy.money.`,
  g2_capterra: `FixMy.Money is an AI-powered credit repair software platform designed for credit repair professionals, agencies, and entrepreneurs. The platform provides client CRM, AI-assisted dispute workflow generation, document storage, Stripe-native billing, task automation, and an agency dashboard — all in one workspace. It is built for teams that want to move faster, stay organized, and deliver a more professional client experience. FixMy.Money provides software tools only. Users are responsible for compliance with CROA, FCRA, TSR, and applicable state laws.`,
  crunchbase: `FixMy.Money is an AI-powered credit repair software platform for credit repair professionals, agencies, and entrepreneurs. The platform combines client management, AI-assisted dispute workflows, document storage, billing automation, and agency dashboards in one workspace. FixMy.Money is designed as a modern alternative to legacy credit repair software, helping businesses operate more efficiently and professionally.`,
  linkedin_announcement: `Excited to announce the launch of FixMy.Money — AI-powered credit repair software for professionals and agencies.

After seeing how outdated most credit repair software is, we built a platform that combines:
✅ AI-assisted dispute workflow generation
✅ Client CRM and intake management
✅ Document storage and organization
✅ Stripe-native billing
✅ Agency dashboard and client portal

If you work in credit repair or know someone who does, we'd love your feedback.

Start your $1 trial: https://fixmy.money

#creditrepair #fintech #saas #AI #smallbusiness`,
  reddit_launch: `**Show r/SaaS: FixMy.Money — AI credit repair software for agencies (built after seeing how bad existing tools are)**

Hey r/SaaS,

I built FixMy.Money after spending time in the credit repair industry and being frustrated by how outdated the software options were.

**What it does:**
- AI-assisted dispute letter generation
- Client CRM with intake forms
- Document storage
- Stripe billing integration
- Agency dashboard

**Tech stack:** Next.js, Supabase, OpenAI, Stripe

**Business model:** $99/$199/$399/month with a $1 trial

**Compliance:** Software tools only — users handle their own CROA/FCRA compliance

Would love feedback from anyone in fintech, SaaS, or the credit repair space.

Link: https://fixmy.money`,
  founder_story: `I spent years watching credit repair professionals struggle with software that looked like it was built in 2008. Spreadsheets, disconnected tools, manual processes — in an industry where organization and compliance are everything.

So I built FixMy.Money.

The goal was simple: give credit repair professionals one clean workspace that handles everything — client intake, dispute workflows, document storage, billing, and client communication — with AI to make the hard parts faster.

We are not trying to do credit repair for anyone. We build the tools. The professionals do the work.

FixMy.Money is for the credit repair entrepreneur who wants to run a real business, not just manage chaos.

Start your $1 trial at https://fixmy.money`,
  compliance_disclaimer: `FixMy.Money provides software tools for credit repair professionals. FixMy.Money does not provide legal advice, credit counseling, or credit repair services. Users are solely responsible for complying with the Credit Repair Organizations Act (CROA), Fair Credit Reporting Act (FCRA), Telemarketing Sales Rule (TSR), FTC regulations, applicable state laws, client disclosure requirements, and all other applicable regulations. FixMy.Money makes no guarantees regarding credit score improvements, dispute outcomes, or the removal of negative items from credit reports.`,
};

const SOCIAL_CALENDAR = [
  { day: 1, theme: 'Launch Announcement', platform: 'All', content: 'We launched FixMy.Money — AI-powered credit repair software for professionals and agencies. One workspace for client management, dispute workflows, billing, and growth. Start your $1 trial: https://fixmy.money #creditrepair #saas #fintech' },
  { day: 2, theme: 'Problem: Outdated Software', platform: 'LinkedIn/Twitter', content: 'Most credit repair software looks like it was built in 2008. Spreadsheets. Manual processes. Disconnected tools. Credit repair professionals deserve better. That is why we built FixMy.Money. https://fixmy.money #creditrepair #smallbusiness' },
  { day: 3, theme: 'Client Organization', platform: 'LinkedIn', content: 'When you are managing 50+ credit repair clients, organization is not optional — it is your business. FixMy.Money gives every client a complete profile: intake forms, documents, dispute history, notes, and billing. All in one place. https://fixmy.money' },
  { day: 4, theme: 'AI Dispute Workflows', platform: 'Twitter/LinkedIn', content: 'AI does not repair credit. But it can help you generate dispute workflows faster, organize your process, and reduce manual work. FixMy.Money uses AI to assist — not replace — the professional. https://fixmy.money #AI #creditrepair' },
  { day: 5, theme: 'Compliance Reminder', platform: 'LinkedIn', content: 'Running a credit repair business means staying compliant with CROA, FCRA, TSR, and state laws. FixMy.Money is built with compliance in mind — but the responsibility is always yours. We provide the tools. You run the business. https://fixmy.money' },
  { day: 6, theme: 'Business Operations', platform: 'All', content: 'A credit repair business is still a business. That means client intake, billing, follow-ups, documents, and team management. FixMy.Money handles the operations so you can focus on results. https://fixmy.money #creditrepairbusiness' },
  { day: 7, theme: 'Software Comparison', platform: 'LinkedIn', content: 'Comparing credit repair software? Here is what to look for: ✅ Client CRM ✅ Dispute workflow tools ✅ Document storage ✅ Billing integration ✅ Client portal ✅ Compliance-aware design FixMy.Money checks every box. https://fixmy.money' },
  { day: 8, theme: 'Founder Story', platform: 'LinkedIn/Medium', content: 'I built FixMy.Money because I kept seeing credit repair professionals struggle with outdated tools. The industry deserves modern software. Not guaranteed results — just better tools to run a better business. https://fixmy.money #founder #saas' },
  { day: 9, theme: 'Behind the Product', platform: 'Twitter/Dev.to', content: 'Behind FixMy.Money: Next.js + Supabase + OpenAI + Stripe. Built for credit repair professionals who want a modern, organized, compliant workspace. The stack is boring. The problem it solves is not. https://fixmy.money #buildinpublic' },
  { day: 10, theme: 'Client Portal Benefits', platform: 'LinkedIn', content: 'Your clients want to see progress. FixMy.Money includes a client portal where clients can log in, view dispute status, see documents, and track their journey. Transparency builds trust. Trust builds referrals. https://fixmy.money' },
  { day: 11, theme: 'Billing and Automation', platform: 'Twitter/LinkedIn', content: 'Chasing payments is not a business strategy. FixMy.Money integrates with Stripe so you can set up recurring billing, send invoices, and track revenue — without the manual work. https://fixmy.money #billing #automation' },
  { day: 12, theme: 'How Agencies Scale', platform: 'LinkedIn', content: 'Scaling a credit repair agency means: more clients, more staff, more processes. FixMy.Money gives you the dashboard, team management, and workflow tools to grow without losing control. https://fixmy.money #creditrepairagency' },
  { day: 13, theme: 'Product Demo', platform: 'All', content: 'Want to see FixMy.Money in action? We have a live demo at https://fixmy.money/demo — no signup required. See the client dashboard, dispute workflow, and billing tools for yourself. #creditrepair #saas' },
  { day: 14, theme: 'Trial CTA', platform: 'All', content: 'If you run a credit repair business and want better software, try FixMy.Money for $1. No long-term contracts. Cancel anytime. 7-day risk-$1 trial. https://fixmy.money #creditrepair #trial' },
];

const OUTREACH_TEMPLATES = {
  saas_launch: `Subject: FixMy.Money — AI credit repair software for agencies (new launch)

Hi [Name],

I recently launched FixMy.Money, an AI-powered credit repair software platform for credit repair professionals and agencies.

The short version: it is a modern alternative to outdated credit repair software — combining client CRM, AI-assisted dispute workflows, document storage, billing, and agency dashboards in one workspace.

I thought it might be relevant to your readers given your coverage of [SaaS/fintech/small business software].

Happy to share more details, a demo, or answer any questions.

Best,
[Founder Name]
https://fixmy.money`,

  ai_pitch: `Subject: AI credit repair software — compliance-first approach to dispute automation

Hi [Name],

I wanted to share FixMy.Money with you — it is an AI-powered credit repair software platform we just launched for credit repair professionals and agencies.

What makes it different: we built it compliance-first. The AI assists with dispute workflow generation, but the platform is designed around CROA, FCRA, and TSR requirements. No guaranteed results. No fake claims. Just better tools for professionals who take compliance seriously.

Given your coverage of AI tools in [fintech/business/finance], I thought this might be worth a look.

Demo: https://fixmy.money/demo

Best,
[Founder Name]`,

  founder_story: `Subject: Founder story — building AI software for the credit repair industry

Hi [Name],

I am the founder of FixMy.Money, an AI-powered credit repair software platform I just launched after spending time in the credit repair industry.

The short version of the story: I kept seeing credit repair professionals struggle with software that looked like it was built in 2008. Spreadsheets, disconnected tools, manual processes — in an industry where organization and compliance are everything.

So I built something better.

I would love to share the full story with your audience if it is a fit. Happy to write a guest post, do an interview, or provide whatever format works best.

Best,
[Founder Name]
https://fixmy.money`,
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

export default function LaunchSubmissionsContent() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('directories');
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [outreach, setOutreach] = useState<OutreachTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState('');
  const [stats, setStats] = useState({ total: 0, submitted: 0, approved: 0, pending: 0 });

  const fetchDirectories = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('launch_directories')
      .select('*')
      .order('relevance_score', { ascending: false });
    if (data) {
      setDirectories(data);
      setStats({
        total: data.length,
        submitted: data.filter(d => d.listing_status === 'submitted').length,
        approved: data.filter(d => d.listing_status === 'approved').length,
        pending: data.filter(d => d.listing_status === 'pending').length,
      });
    }
    setLoading(false);
  }, [supabase]);

  const fetchOutreach = useCallback(async () => {
    const { data } = await supabase
      .from('outreach_targets')
      .select('*')
      .order('relevance_score', { ascending: false });
    if (data) setOutreach(data);
  }, [supabase]);

  useEffect(() => {
    fetchDirectories();
    fetchOutreach();
  }, [fetchDirectories, fetchOutreach]);

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { listing_status: status };
    if (status === 'submitted') updates.submitted_at = new Date().toISOString();
    if (status === 'approved') updates.approved_at = new Date().toISOString();
    await supabase.from('launch_directories').update(updates).eq('id', id);
    fetchDirectories();
  };

  const updateOutreachStatus = async (id: string, status: string) => {
    const updates: Record<string, unknown> = { outreach_status: status };
    if (status === 'contacted') updates.contacted_at = new Date().toISOString();
    if (status === 'replied') updates.replied_at = new Date().toISOString();
    if (status === 'published') updates.published_at = new Date().toISOString();
    await supabase.from('outreach_targets').update(updates).eq('id', id);
    fetchOutreach();
  };

  const saveNotes = async (id: string) => {
    await supabase.from('launch_directories').update({ notes: notesValue }).eq('id', id);
    setEditingNotes(null);
    fetchDirectories();
  };

  const saveEmail = async (id: string) => {
    await supabase.from('launch_directories').update({ login_email_used: emailValue }).eq('id', id);
    setEditingEmail(null);
    fetchDirectories();
  };

  const filteredDirectories = directories.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.listing_status === statusFilter;
    const matchCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const filteredOutreach = outreach.filter(o =>
    o.publication_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'directories', label: 'Directories', icon: <Globe className="w-4 h-4" /> },
    { id: 'outreach', label: 'Press Outreach', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'copy', label: 'Copy Assets', icon: <FileText className="w-4 h-4" /> },
    { id: 'social', label: 'Social Calendar', icon: <Calendar className="w-4 h-4" /> },
    { id: 'utm', label: 'UTM Links', icon: <Link2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Launch Distribution</h1>
            <p className="text-sm text-slate-500 mt-0.5">Submit FixMy.Money to directories, press, and social channels</p>
          </div>
          <button
            onClick={() => { fetchDirectories(); fetchOutreach(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          {[
            { label: 'Total Directories', value: stats.total, color: 'text-slate-900' },
            { label: 'Pending', value: stats.pending, color: 'text-slate-600' },
            { label: 'Submitted', value: stats.submitted, color: 'text-blue-600' },
            { label: 'Approved', value: stats.approved, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5 border-b border-slate-200 -mb-5 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600' :'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* DIRECTORIES TAB */}
        {activeTab === 'directories' && (
          <div>
            {/* Filters */}
            <div className="flex gap-3 mb-5">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search directories..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="needs_followup">Follow Up</option>
              </select>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDirectories.map(dir => {
                  const statusCfg = STATUS_CONFIG[dir.listing_status] || STATUS_CONFIG.pending;
                  const isExpanded = expandedId === dir.id;
                  return (
                    <div key={dir.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Row */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        {/* Score */}
                        <div className="flex items-center gap-1 w-12 shrink-0">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-semibold text-slate-700">{dir.relevance_score}</span>
                        </div>

                        {/* Name & Category */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{dir.name}</span>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                              {CATEGORY_LABELS[dir.category] || dir.category}
                            </span>
                            {dir.free_or_paid === 'paid' && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">Paid</span>
                            )}
                            {dir.requires_login && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600">Login Required</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">DA: {dir.domain_authority_estimate} · {dir.url}</div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${statusCfg.color}`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {dir.submission_url && (
                            <a
                              href={dir.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Submit
                            </a>
                          )}
                          <select
                            value={dir.listing_status}
                            onChange={e => updateStatus(dir.id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="needs_followup">Follow Up</option>
                          </select>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : dir.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Notes */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notes</span>
                                <button
                                  onClick={() => { setEditingNotes(dir.id); setNotesValue(dir.notes || ''); }}
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit
                                </button>
                              </div>
                              {editingNotes === dir.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={notesValue}
                                    onChange={e => setNotesValue(e.target.value)}
                                    rows={3}
                                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => saveNotes(dir.id)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                                    <button onClick={() => setEditingNotes(null)} className="px-3 py-1 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-600 leading-relaxed">{dir.notes || 'No notes yet.'}</p>
                              )}
                            </div>

                            {/* Required Assets */}
                            <div>
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">Required Assets</span>
                              <div className="flex flex-wrap gap-1.5">
                                {dir.required_assets?.map(asset => (
                                  <span key={asset} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-white border border-slate-200 rounded-full text-slate-600">
                                    <Tag className="w-2.5 h-2.5" />
                                    {asset.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Login Email */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Login Email Used</span>
                              <button
                                onClick={() => { setEditingEmail(dir.id); setEmailValue(dir.login_email_used || ''); }}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                            </div>
                            {editingEmail === dir.id ? (
                              <div className="flex gap-2">
                                <input
                                  type="email"
                                  value={emailValue}
                                  onChange={e => setEmailValue(e.target.value)}
                                  placeholder="email@example.com"
                                  className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button onClick={() => saveEmail(dir.id)} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                                <button onClick={() => setEditingEmail(null)} className="px-3 py-1.5 text-xs bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">Cancel</button>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-600">{dir.login_email_used || 'Not set'}</p>
                            )}
                          </div>

                          {/* UTM Link */}
                          {dir.utm_link && (
                            <div>
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5">UTM Tracking Link</span>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 truncate">{dir.utm_link}</code>
                                <CopyButton text={dir.utm_link} label="Copy UTM" />
                              </div>
                            </div>
                          )}

                          {/* Timestamps */}
                          {(dir.submitted_at || dir.approved_at) && (
                            <div className="flex gap-6 text-xs text-slate-400">
                              {dir.submitted_at && <span>Submitted: {new Date(dir.submitted_at).toLocaleDateString()}</span>}
                              {dir.approved_at && <span>Approved: {new Date(dir.approved_at).toLocaleDateString()}</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* OUTREACH TAB */}
        {activeTab === 'outreach' && (
          <div>
            <div className="mb-5">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search publications..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Email Templates */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { key: 'saas_launch', label: 'SaaS Launch Pitch' },
                { key: 'ai_pitch', label: 'AI Credit Repair Pitch' },
                { key: 'founder_story', label: 'Founder Story Pitch' },
              ].map(t => (
                <div key={t.key} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-900">{t.label}</span>
                    <CopyButton text={OUTREACH_TEMPLATES[t.key as keyof typeof OUTREACH_TEMPLATES]} label="Copy" />
                  </div>
                  <pre className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed line-clamp-4 font-sans">
                    {OUTREACH_TEMPLATES[t.key as keyof typeof OUTREACH_TEMPLATES].slice(0, 200)}...
                  </pre>
                </div>
              ))}
            </div>

            {/* Outreach Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Publication</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pitch Angle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOutreach.map(o => {
                    const statusCfg = OUTREACH_STATUS_CONFIG[o.outreach_status] || OUTREACH_STATUS_CONFIG.pending;
                    return (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900">{o.publication_name}</td>
                        <td className="px-4 py-3 text-slate-500 capitalize">{o.category.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs">
                          <span className="line-clamp-2 text-xs">{o.pitch_angle}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-sm font-medium text-slate-700">{o.relevance_score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {o.contact_url && (
                              <a href={o.contact_url} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <select
                              value={o.outreach_status}
                              onChange={e => updateOutreachStatus(o.id, e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
                            >
                              <option value="pending">Pending</option>
                              <option value="contacted">Contacted</option>
                              <option value="replied">Replied</option>
                              <option value="published">Published</option>
                              <option value="declined">Declined</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COPY ASSETS TAB */}
        {activeTab === 'copy' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'tagline_50', label: '50-Char Tagline' },
                { key: 'tagline_one_line', label: 'One-Line Tagline' },
                { key: 'meta_description', label: '160-Char Meta Description' },
                { key: 'social_280', label: '280-Char Social Post' },
              ].map(item => (
                <div key={item.key} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                    <CopyButton text={SUBMISSION_COPY[item.key as keyof typeof SUBMISSION_COPY]} label="Copy" />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{SUBMISSION_COPY[item.key as keyof typeof SUBMISSION_COPY]}</p>
                </div>
              ))}
            </div>

            {[
              { key: 'short', label: 'Short Description (1-2 sentences)' },
              { key: 'medium', label: 'Medium Description (3-4 sentences)' },
              { key: 'long', label: 'Long Description (full paragraph)' },
              { key: 'product_hunt', label: 'Product Hunt Launch Copy' },
              { key: 'betalist', label: 'BetaList Copy' },
              { key: 'g2_capterra', label: 'G2 / Capterra Listing Copy' },
              { key: 'crunchbase', label: 'Crunchbase Description' },
              { key: 'linkedin_announcement', label: 'LinkedIn Launch Announcement' },
              { key: 'reddit_launch', label: 'Reddit Launch Post' },
              { key: 'founder_story', label: 'Founder Story' },
              { key: 'compliance_disclaimer', label: 'Compliance Disclaimer' },
            ].map(item => (
              <div key={item.key} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                  <CopyButton text={SUBMISSION_COPY[item.key as keyof typeof SUBMISSION_COPY]} label="Copy All" />
                </div>
                <pre className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                  {SUBMISSION_COPY[item.key as keyof typeof SUBMISSION_COPY]}
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* SOCIAL CALENDAR TAB */}
        {activeTab === 'social' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-800 font-medium">14-Day Launch Social Calendar</p>
              <p className="text-xs text-blue-600 mt-1">Post across LinkedIn, X/Twitter, Reddit, and other channels. Every post links to https://fixmy.money with UTM tracking.</p>
            </div>
            {SOCIAL_CALENDAR.map(post => (
              <div key={post.day} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                      {post.day}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{post.theme}</div>
                      <div className="text-xs text-slate-400">{post.platform}</div>
                    </div>
                  </div>
                  <CopyButton text={post.content} label="Copy Post" />
                </div>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">{post.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* UTM LINKS TAB */}
        {activeTab === 'utm' && (
          <div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-semibold text-slate-900">UTM Link Format</h3>
                <code className="text-xs text-slate-500 mt-1 block">https://fixmy.money?utm_source=[source]&utm_medium=[medium]&utm_campaign=fixmymoney_launch</code>
              </div>
              <div className="p-5 grid grid-cols-3 gap-4 text-xs text-slate-600">
                <div><span className="font-semibold block mb-1">Directories</span>utm_medium=directory</div>
                <div><span className="font-semibold block mb-1">Social</span>utm_medium=social</div>
                <div><span className="font-semibold block mb-1">Content/Blog</span>utm_medium=content</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Medium</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Full URL</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { source: 'producthunt', medium: 'directory', url: 'https://fixmy.money?utm_source=producthunt&utm_medium=directory&utm_campaign=fixmymoney_launch' },
                    { source: 'betalist', medium: 'directory', url: 'https://fixmy.money?utm_source=betalist&utm_medium=directory&utm_campaign=fixmymoney_launch' },
                    { source: 'g2', medium: 'directory', url: 'https://fixmy.money?utm_source=g2&utm_medium=directory&utm_campaign=fixmymoney_launch' },
                    { source: 'capterra', medium: 'directory', url: 'https://fixmy.money?utm_source=capterra&utm_medium=directory&utm_campaign=fixmymoney_launch' },
                    { source: 'crunchbase', medium: 'directory', url: 'https://fixmy.money?utm_source=crunchbase&utm_medium=directory&utm_campaign=fixmymoney_launch' },
                    { source: 'futurepedia', medium: 'directory', url: 'https://fixmy.money?utm_source=futurepedia&utm_medium=directory&utm_campaign=fixmymoney_launch' },
                    { source: 'theresanaiforthat', medium: 'directory', url: 'https://fixmy.money?utm_source=theresanaiforthat&utm_medium=directory&utm_campaign=fixmymoney_launch' },
                    { source: 'linkedin', medium: 'social', url: 'https://fixmy.money?utm_source=linkedin&utm_medium=social&utm_campaign=fixmymoney_launch' },
                    { source: 'twitter', medium: 'social', url: 'https://fixmy.money?utm_source=twitter&utm_medium=social&utm_campaign=fixmymoney_launch' },
                    { source: 'reddit_saas', medium: 'social', url: 'https://fixmy.money?utm_source=reddit_saas&utm_medium=social&utm_campaign=fixmymoney_launch' },
                    { source: 'reddit_entrepreneur', medium: 'social', url: 'https://fixmy.money?utm_source=reddit_entrepreneur&utm_medium=social&utm_campaign=fixmymoney_launch' },
                    { source: 'medium', medium: 'content', url: 'https://fixmy.money?utm_source=medium&utm_medium=content&utm_campaign=fixmymoney_launch' },
                    { source: 'indiehackers', medium: 'community', url: 'https://fixmy.money?utm_source=indiehackers&utm_medium=community&utm_campaign=fixmymoney_launch' },
                    { source: 'hackernews', medium: 'community', url: 'https://fixmy.money?utm_source=hackernews&utm_medium=community&utm_campaign=fixmymoney_launch' },
                    { source: 'email_newsletter', medium: 'email', url: 'https://fixmy.money?utm_source=email_newsletter&utm_medium=email&utm_campaign=fixmymoney_launch' },
                  ].map(row => (
                    <tr key={row.source} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-900">{row.source}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">{row.medium}</span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-slate-500 truncate max-w-xs block">{row.url}</code>
                      </td>
                      <td className="px-4 py-3">
                        <CopyButton text={row.url} label="Copy" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
