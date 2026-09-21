import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import ReopeningNotice from '@/components/ReopeningNotice';
import { isPublicSignupOpen } from '@/lib/signup/closure';
import PublicSignupForm from './components/PublicSignupForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Create Account | FixMy.Money',
  description: 'Create a FixMy.Money business account and select a monthly plan.',
  alternates: { canonical: 'https://fixmy.money/signup' },
};

export default function SignupPage() {
  if (!isPublicSignupOpen()) return <ReopeningNotice standalone />;

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3"><AppLogo size={38} /><span className="text-xl font-semibold text-slate-900">FixMy<span className="text-emerald-700">.Money</span></span></Link>
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <h1 className="text-3xl font-bold text-slate-900">Create your business account</h1>
          <p className="mb-7 mt-2 text-sm leading-6 text-slate-600">Verify your email, then select a monthly plan. The checkout shows the $1 charge, 14-day trial, and recurring monthly price before payment.</p>
          <Suspense fallback={<p className="text-sm text-slate-500">Loading secure signup…</p>}><PublicSignupForm /></Suspense>
        </section>
      </div>
    </div>
  );
}
