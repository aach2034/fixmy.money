import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  LayoutDashboard,
  Users,
  UserPlus,
  Upload,
  Brain,
  FileText,
  GitBranch,
  FolderOpen,
  Globe,
  Shield,
  ClipboardList,
  CreditCard,
  Zap,
  BarChart3,
  Palette,
  UsersRound,
  Play,
  CheckCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Product Tour | FixMy.Money Credit Repair Software',
  description:
    'Explore every feature of FixMy.Money — the all-in-one credit repair agency platform. See the dashboard, client management, AI dispute generation, CROA workflow, audit log, billing, and more.',
  alternates: { canonical: 'https://fixmy.money/product-tour' },
  openGraph: {
    title: 'Product Tour | FixMy.Money Credit Repair Software',
    description:
      'Explore every feature of FixMy.Money — the all-in-one credit repair agency platform.',
    type: 'website',
    url: 'https://fixmy.money/product-tour',
    siteName: 'FixMy.Money',
  },
};

const FEATURES = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Agency Dashboard',
    description:
      "Bird's-eye view of your entire agency. See active clients, open disputes, revenue metrics, team activity, and compliance status at a glance.",
    highlights: ['Revenue and MRR tracking', 'Active dispute pipeline', 'Client onboarding status', 'Team performance overview'],
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    id: 'client-management',
    icon: Users,
    title: 'Client Management',
    description:
      'Organized client profiles with full dispute history, notes, tasks, timelines, document storage, and complete audit trails.',
    highlights: ['Client profile with full history', 'Dispute tracking per client', 'Notes and task management', 'Document storage per client'],
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    id: 'onboarding',
    icon: UserPlus,
    title: 'Client Onboarding',
    description:
      'Guided onboarding wizard that walks new clients through intake, disclosure delivery, agreement signing, and the CROA-required cancellation period.',
    highlights: ['Intake form collection', 'Disclosure delivery tracking', 'Agreement management', 'Cancellation period tracking'],
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    id: 'credit-report',
    icon: Upload,
    title: 'Credit Report Upload',
    description:
      'Upload credit report PDFs or paste report data. The platform parses and organizes negative items, account details, and bureau information.',
    highlights: ['PDF upload support', 'Multi-bureau support', 'Negative item extraction', 'Account detail organization'],
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
  {
    id: 'ai-analysis',
    icon: Brain,
    title: 'AI Report Analysis',
    description:
      'AI analyzes uploaded credit reports and identifies dispute opportunities, risk factors, and recommended strategies for each negative item.',
    highlights: ['Negative item identification', 'Dispute strategy recommendations', 'Risk factor analysis', 'Bureau-specific guidance'],
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    id: 'dispute-letters',
    icon: FileText,
    title: 'Dispute Letter Generation',
    description:
      'Generate bureau-ready dispute letters for Equifax, Experian, and TransUnion with one click. AI drafts letters based on the specific negative item and dispute strategy.',
    highlights: ['Equifax, Experian, TransUnion letters', 'Item-specific letter content', 'Human review required before sending', 'Letter version history'],
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    id: 'dispute-rounds',
    icon: GitBranch,
    title: 'Dispute Rounds',
    description:
      'Track dispute rounds from initial submission through bureau response. Manage follow-up rounds, escalations, and response timelines.',
    highlights: ['Round-by-round tracking', 'Bureau response logging', 'Timeline management', 'Escalation workflows'],
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    id: 'documents',
    icon: FolderOpen,
    title: 'Document Storage',
    description:
      'Secure cloud storage for credit reports, contracts, dispute evidence, disclosure forms, and compliance documents — organized per client.',
    highlights: ['Per-client document organization', 'Version history', 'Secure access controls', 'Compliance document templates'],
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    id: 'client-portal',
    icon: Globe,
    title: 'Client Portal',
    description:
      'White-labeled client-facing portal where clients track their own progress, view dispute status, upload documents, and communicate with your team.',
    highlights: ['White-label branding', 'Dispute status visibility', 'Document upload', 'Secure client messaging'],
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    id: 'croa-workflow',
    icon: Shield,
    title: 'CROA Workflow',
    description:
      'Structured workflow supporting CROA-required steps: Lead → Disclosure → Agreement → Cancellation Period → Active → Disputes → Monitoring → Completed.',
    highlights: ['Required-step indicators', 'Status history with timestamps', 'Cancellation window tracking', 'Compliance warnings'],
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
  {
    id: 'audit-log',
    icon: ClipboardList,
    title: 'Audit Log',
    description:
      'Immutable audit log recording every significant action with timestamps and user attribution. Supports compliance documentation and internal review.',
    highlights: ['Immutable record keeping', 'Timestamp and user attribution', 'Compliance documentation support', 'Export capability'],
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
  {
    id: 'billing',
    icon: CreditCard,
    title: 'Billing',
    description:
      'Stripe-powered billing for client subscriptions, service fees, and invoicing. Manage payment history, failed payments, and billing records without leaving the platform.',
    highlights: ['Stripe integration', 'Client subscription management', 'Invoice history', 'Failed payment handling'],
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    id: 'automation',
    icon: Zap,
    title: 'Automation',
    description:
      'Build automation rules for onboarding sequences, dispute follow-ups, billing reminders, and client communications. Reduce manual work across your team.',
    highlights: ['Onboarding automation', 'Dispute follow-up rules', 'Billing reminders', 'Communication triggers'],
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics',
    description:
      'Track agency performance with revenue forecasting, dispute success metrics, client pipeline analytics, and team productivity reports.',
    highlights: ['Revenue forecasting', 'Dispute metrics', 'Client pipeline analytics', 'Team productivity'],
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    id: 'white-label',
    icon: Palette,
    title: 'White Labeling',
    description:
      'Apply your agency branding to the client portal, emails, and documents. Present a professional, branded experience to your clients.',
    highlights: ['Custom logo and colors', 'Branded client portal', 'Custom email templates', 'Domain customization'],
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    id: 'team',
    icon: UsersRound,
    title: 'Team Management',
    description:
      'Invite team members, assign roles, and control access permissions. Each team member sees only what they need based on their role.',
    highlights: ['Role-based access control', 'Team member invitations', 'Permission management', 'Activity tracking per user'],
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
];

export default function ProductTourPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Pricing</Link>
            <Link href="/demo" className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-xl hidden sm:block">Book Demo</Link>
            <Link href="/sign-up-login-screen?tab=register" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
              Start $1 Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 to-[#0d1f3c] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            Platform Tour
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Every feature, explained
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            FixMy.Money is a complete operating platform for credit repair agencies. Here&apos;s what&apos;s included.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up-login-screen?tab=register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all"
            >
              Start $1 Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors"
            >
              Book a Live Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Video Placeholder */}
      <section className="py-16 px-4 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-white mb-2">Product Walkthrough</h2>
            <p className="text-slate-400">See the full platform in action</p>
          </div>
          <div
            className="rounded-3xl overflow-hidden border border-slate-700/50 flex items-center justify-center"
            style={{
              background: 'rgba(17,24,39,0.75)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 80px rgba(37,99,235,0.15)',
              minHeight: '360px',
            }}
          >
            <div className="text-center py-20 px-8">
              <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                <Play size={28} className="text-blue-400 ml-1" />
              </div>
              <p className="text-white font-bold text-lg mb-2">Product walkthrough coming soon.</p>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                In the meantime, book a live demo and we&apos;ll walk you through the platform personally.
              </p>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all text-sm"
              >
                Book Live Demo <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Platform Features</p>
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Everything your agency needs</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              16 integrated modules replacing the patchwork of tools most agencies use today.
            </p>
          </div>

          <div className="space-y-8">
            {FEATURES.map((feature, idx) => {
              const FIcon = feature.icon;
              return (
                <div
                  key={feature.id}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-10 border-b border-slate-100 last:border-0 ${
                    idx % 2 === 1 ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                    <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-4`}>
                      <FIcon size={24} className={feature.color} />
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-3">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed mb-5">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.highlights.map((h) => (
                        <li key={h} className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                    <div
                      className="rounded-2xl border border-slate-200 flex items-center justify-center"
                      style={{ minHeight: '220px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}
                    >
                      <div className="text-center p-8">
                        <div className={`w-16 h-16 rounded-2xl ${feature.bg} flex items-center justify-center mx-auto mb-3`}>
                          <FIcon size={32} className={feature.color} />
                        </div>
                        <p className="text-sm text-slate-400 font-medium">{feature.title}</p>
                        <p className="text-xs text-slate-300 mt-1">Screenshot available in live demo</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            Now Accepting Founding Agencies
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Run your credit repair agency from one platform
          </h2>
          <p className="text-slate-400 mb-8">
            Start your 14-day trial for $1. Full platform access. Payment method required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up-login-screen?tab=register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all"
            >
              Start $1 Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors"
            >
              View Pricing
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-6">
            For verified credit-repair businesses purchasing software access. FixMy.Money does not provide personal credit-repair services.
          </p>
        </div>
      </section>
    </div>
  );
}
