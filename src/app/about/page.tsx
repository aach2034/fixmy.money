import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Shield, Users, Zap, BarChart3, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About FixMy.Money | Credit Repair Software for Agencies',
  description:
    'FixMy.Money is a growing software company built for credit repair professionals. Learn about our founder, mission, and why we built this platform.',
  alternates: { canonical: 'https://fixmy.money/about' },
  openGraph: {
    title: 'About FixMy.Money | Credit Repair Software for Agencies',
    description:
      'FixMy.Money is a growing software company built for credit repair professionals. Learn about our founder, mission, and why we built this platform.',
    type: 'website',
    url: 'https://fixmy.money/about',
    siteName: 'FixMy.Money',
  },
};

const VALUES = [
  {
    icon: Shield,
    title: 'Compliance-First Design',
    body: 'Every workflow is designed with CROA, FCRA, and TSR requirements in mind. We build tools that help agencies document their work responsibly.',
  },
  {
    icon: Zap,
    title: 'Automation Without Complexity',
    body: 'Credit repair agencies should spend time serving clients, not managing spreadsheets. We automate the repetitive work so your team can focus on outcomes.',
  },
  {
    icon: Users,
    title: 'Built for Real Agencies',
    body: 'Every feature was shaped by conversations with working credit repair professionals. We build what agencies actually need, not what looks good in a demo.',
  },
  {
    icon: BarChart3,
    title: 'Transparent Operations',
    body: 'Simple pricing, no hidden fees, honest documentation. We believe software companies should be straightforward about what they offer and what they cost.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav className="border-b border-slate-100 px-4 sm:px-8 py-4 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/homepage" className="font-bold text-slate-900 text-lg">FixMy.Money</Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden sm:block">Pricing</Link>
            <Link href="/demo" className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-4 py-2 rounded-xl hidden sm:block">Book Demo</Link>
            <Link href="/sign-up-login-screen?tab=register" className="text-sm font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-950 to-[#0d1f3c] py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            About FixMy.Money
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Software built for credit repair professionals
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            FixMy.Money is a growing software company. We build tools that help credit repair agencies operate more efficiently, document their work responsibly, and serve more clients without adding overhead.
          </p>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Photo */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative">
                <div className="w-64 h-64 rounded-3xl overflow-hidden border-4 border-slate-100 shadow-xl">
                  <Image
                    src="/assets/images/adam_Hamilton_Author-1780449859291.png"
                    alt="Adam Hamilton, Founder of FixMy.Money"
                    width={256}
                    height={256}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">
                  Founder & Builder
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3">Meet the Founder</p>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Adam Hamilton</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  I built FixMy.Money because I kept seeing the same problem: credit repair agencies were running their businesses on a patchwork of spreadsheets, generic CRMs, separate document tools, and manual billing — and it was holding them back.
                </p>
                <p>
                  My background is in program management, workflow design, automation, analytics, and business systems. I&apos;ve spent years building operational infrastructure for organizations that need to manage complex, compliance-sensitive workflows at scale.
                </p>
                <p>
                  Credit repair agencies face a unique challenge: they need to manage client relationships, generate and track dispute correspondence, document every step of their process for compliance purposes, and run billing — all while staying current with CROA, FCRA, and state regulations.
                </p>
                <p>
                  FixMy.Money is my answer to that problem. It&apos;s a single platform that handles the operational side of running a credit repair agency — so professionals can focus on serving clients instead of managing tools.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <a
                  href="mailto:adam@fixmy.money"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Mail size={16} />
                  adam@fixmy.money
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3 text-center">Why We Exist</p>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-6 text-center">The problem we set out to solve</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { label: 'Generic CRM software', issue: 'Not built for dispute workflows or CROA documentation requirements' },
              { label: 'Manual spreadsheets', issue: 'No audit trail, no automation, breaks down as client volume grows' },
              { label: 'Separate document tools', issue: 'Files scattered across Google Drive, Dropbox, email — no organization' },
              { label: 'Separate billing tools', issue: 'Manual invoicing, no subscription management, no payment history' },
              { label: 'Separate dispute software', issue: 'Disconnected from client records, billing, and compliance documentation' },
              { label: 'Separate onboarding tools', issue: 'No connection between intake, agreements, and the active client workflow' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-2xl border border-slate-200 p-5">
                <p className="font-bold text-slate-900 text-sm mb-1">{item.label}</p>
                <p className="text-sm text-slate-500">{item.issue}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <p className="text-slate-700 font-medium">
              FixMy.Money replaces all of these with a single platform designed specifically for credit repair agencies.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-3 text-center">How We Build</p>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-10 text-center">Our principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {VALUES.map((v) => {
              const VIcon = v.icon;
              return (
                <div key={v.title} className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <VIcon size={20} className="text-blue-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{v.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Company information</h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex gap-4 items-start">
              <span className="text-sm font-semibold text-slate-500 w-32 shrink-0">Product</span>
              <span className="text-sm text-slate-700">FixMy.Money — Credit Repair Agency Software</span>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex gap-4 items-start">
              <span className="text-sm font-semibold text-slate-500 w-32 shrink-0">Founder</span>
              <span className="text-sm text-slate-700">Adam Hamilton</span>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex gap-4 items-start">
              <span className="text-sm font-semibold text-slate-500 w-32 shrink-0">Stage</span>
              <span className="text-sm text-slate-700">Growing software company — actively onboarding founding agencies</span>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex gap-4 items-start">
              <span className="text-sm font-semibold text-slate-500 w-32 shrink-0">Contact</span>
              <div className="text-sm text-slate-700 space-y-1">
                <div><a href="mailto:support@fixmy.money" className="text-blue-600 hover:underline">support@fixmy.money</a> — General support</div>
                <div><a href="mailto:security@fixmy.money" className="text-blue-600 hover:underline">security@fixmy.money</a> — Security disclosures</div>
                <div><a href="mailto:adam@fixmy.money" className="text-blue-600 hover:underline">adam@fixmy.money</a> — Founder direct</div>
              </div>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex gap-4 items-start">
              <span className="text-sm font-semibold text-slate-500 w-32 shrink-0">Disclaimer</span>
              <span className="text-sm text-slate-500 leading-relaxed">
                FixMy.Money provides software tools for credit repair professionals. We do not provide personal credit repair services, legal advice, or guarantees of any credit outcome. Each business using this platform is responsible for its own compliance with CROA, FCRA, TSR, and applicable laws.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Founding Agency CTA */}
      <section className="py-16 px-4 bg-slate-900 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold px-4 py-2 rounded-full mb-6">
            Now Accepting Founding Agencies
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Built with feedback from credit repair professionals
          </h2>
          <p className="text-slate-400 mb-3">
            Founding customer pricing available for qualified agencies. We&apos;re actively working with early customers to shape the platform.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            No fake testimonials. No inflated customer counts. Just a real product being built for real agencies.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up-login-screen?tab=register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl transition-all"
            >
              Start Free Trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors"
            >
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="py-8 px-4 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-4 text-sm text-slate-500">
          <Link href="/homepage" className="hover:text-blue-600">Home</Link>
          <Link href="/pricing" className="hover:text-blue-600">Pricing</Link>
          <Link href="/security" className="hover:text-blue-600">Security</Link>
          <Link href="/privacy-policy" className="hover:text-blue-600">Privacy Policy</Link>
          <Link href="/terms-of-service" className="hover:text-blue-600">Terms of Service</Link>
          <Link href="/contact" className="hover:text-blue-600">Contact</Link>
        </div>
      </section>
    </div>
  );
}
