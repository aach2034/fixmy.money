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
  description: 'Create a FixMy.Money business account and start a 30-day free trial.',
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
          <p className="mb-7 mt-2 text-sm leading-6 text-slate-600">30-day free trial. No credit card required. Verify your email and complete onboarding to begin. You must choose a paid plan to continue after the trial.</p>
          <Suspense fallback={<p className="text-sm text-slate-500">Loading secure signup…</p>}><PublicSignupForm /></Suspense>
        </section>
      </div>
    </div>
  );
}
