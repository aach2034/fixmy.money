import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Wrench } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


export const metadata: Metadata = {
  title: 'Resources for Credit Repair Agencies | Guides & Tools | FixMy.Money',
  description: 'Free resources for credit repair agencies. Guides, tools, checklists, and calculators to help you launch and scale your credit repair business.',
  alternates: { canonical: 'https://fixmy.money/resources' },
  openGraph: {
    title: 'Resources for Credit Repair Agencies | Guides & Tools | FixMy.Money',
    description: 'Free resources for credit repair agencies. Guides, tools, checklists, and calculators.',
    url: 'https://fixmy.money/resources',
    type: 'website',
  },
};

const guides = [
  {
    title: 'How to Start a Credit Repair Business',
    desc: 'Step-by-step guide to launching your credit repair agency.',
    href: '/how-to-start-a-credit-repair-business',
    icon: BookOpen,
  },
  {
    title: 'Free Credit Repair Business Starter Kit',
    desc: 'Templates, checklists, and resources to launch your business.',
    href: '/free-credit-repair-business-starter-kit',
    icon: BookOpen,
  },
];

const tools = [
  {
    title: 'Startup Cost Calculator',
    desc: 'Estimate the costs to launch your credit repair agency.',
    href: '/tools/credit-repair-business-startup-cost-calculator',
    icon: Wrench,
  },
  {
    title: 'Pricing Calculator',
    desc: 'Calculate competitive pricing for your credit repair services.',
    href: '/tools/credit-repair-pricing-calculator',
    icon: Wrench,
  },
  {
    title: 'Client Intake Checklist',
    desc: 'Ensure you collect all necessary information from new clients.',
    href: '/tools/credit-repair-client-intake-checklist',
    icon: Wrench,
  },
  {
    title: 'CROA Compliance Checklist',
    desc: 'Ensure your business practices comply with CROA regulations.',
    href: '/tools/croa-compliance-checklist',
    icon: Wrench,
  },
];

const software = [
  {
    title: 'Credit Repair Software',
    desc: 'Complete platform for managing your credit repair agency.',
    href: '/credit-repair-software',
  },
  {
    title: 'Credit Repair CRM',
    desc: 'Client management system for credit repair professionals.',
    href: '/credit-repair-crm',
  },
  {
    title: 'Dispute Software',
    desc: 'Automate dispute letter generation and workflows.',
    href: '/credit-repair-dispute-software',
  },
  {
    title: 'Billing Software',
    desc: 'Stripe-native billing and payment automation.',
    href: '/credit-repair-billing-software',
  },
];

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/demo" className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-xl">Book Demo</Link>
            <Link href="/sign-up-login-screen?tab=register" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">Start Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 to-[#0d1f3c] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Resources for credit repair agencies
          </h1>
          <p className="text-xl text-slate-300 mb-6 max-w-2xl mx-auto">
            Free guides, tools, and checklists to help you launch and scale your credit repair business.
          </p>
        </div>
      </section>

      {/* Guides */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Guides & Tutorials</h2>
            <p className="text-lg text-slate-600">Learn how to start and scale your credit repair business.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {guides.map((guide) => {
              const Icon = guide.icon;
              return (
                <Link key={guide.href} href={guide.href} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <Icon size={20} className="text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{guide.title}</h3>
                  <p className="text-sm text-slate-600 mb-4">{guide.desc}</p>
                  <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                    Read Guide <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Free Tools</h2>
            <p className="text-lg text-slate-600">Calculators, checklists, and resources to support your business.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href} className="bg-slate-50 rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                    <Icon size={20} className="text-green-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors">{tool.title}</h3>
                  <p className="text-sm text-slate-600 mb-4">{tool.desc}</p>
                  <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                    Use Tool <ArrowRight size={14} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Software */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">FixMy.Money Software</h2>
            <p className="text-lg text-slate-600">Complete platform for managing your credit repair agency.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {software.map((item) => (
              <Link key={item.href} href={item.href} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all group">
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-600 mb-4">{item.desc}</p>
                <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                  Learn More <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">Ready to launch your credit repair business?</h2>
          <p className="text-slate-400 mb-8">Start your 14-day trial for $1. Full platform access. Cancel anytime.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up-login-screen?tab=register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all">
              Start $1 Trial <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="py-10 px-4 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 text-center">Explore FixMy.Money</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Credit Repair Software', href: '/credit-repair-software' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Demo', href: '/demo' },
              { label: 'Partners', href: '/partners' },
            ].map(link => (
              <Link key={link.href} href={link.href} className="text-sm text-blue-600 hover:text-blue-700 font-medium border border-blue-100 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}