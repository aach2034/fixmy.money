'use client';
import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/homepage" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Back to FixMy.Money
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Shield size={20} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">Last updated: June 2026</p>
        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <p className="text-slate-600">FixMy.Money ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
          <h2 className="text-lg font-bold text-slate-900">Information We Collect</h2>
          <p className="text-slate-600">We collect information you provide directly (account registration, billing, client data), information collected automatically (usage data, log files, cookies), and information from third-party services (Stripe for payment processing, Supabase for data storage).</p>
          <h2 className="text-lg font-bold text-slate-900">How We Use Your Information</h2>
          <p className="text-slate-600">We use collected information to provide and improve our services, process payments, send transactional communications, ensure platform security, and comply with legal obligations. We do not sell your personal data to third parties.</p>
          <h2 className="text-lg font-bold text-slate-900">Data Security</h2>
          <p className="text-slate-600">We implement enterprise-grade encryption, role-based access controls, and secure cloud infrastructure. Client data is isolated per workspace. However, no method of transmission over the internet is 100% secure.</p>
          <h2 className="text-lg font-bold text-slate-900">Your Rights</h2>
          <p className="text-slate-600">You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at support@fixmy.money.</p>
          <h2 className="text-lg font-bold text-slate-900">Contact</h2>
          <p className="text-slate-600">For privacy-related questions, contact us at <a href="mailto:support@fixmy.money" className="text-blue-600 hover:underline">support@fixmy.money</a>.</p>
        </div>
      </div>
    </div>
  );
}
