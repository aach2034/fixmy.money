'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function CheckoutContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    // Existing paying customers keep their verified access; this page does not
    // initiate a new subscription or collect a payment method.
    void fetch('/api/stripe/entitlement', { method: 'POST' })
      .then(response => response.ok ? response.json() : null)
      .then(async entitlement => {
        if (!entitlement?.canAccess) return;
        const supabase = createClient();
        const { data } = await supabase.from('user_profiles')
          .select('onboarding_completed').eq('id', user.id).single();
        router.replace(data?.onboarding_completed ? '/dashboard' : '/onboarding');
      })
      .catch(() => {});
  }, [loading, router, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">New paid activation is on hold</h1>
        <p className="mt-4 leading-7 text-slate-700">
          We are reviewing the consumer billing flow and business-purchaser eligibility.
          No payment or card details are collected here. Consumer paid activation
          remains unavailable pending final legal approval.
        </p>
        <p className="mt-3 text-sm text-slate-600">Existing subscriptions and access are unchanged.</p>
        <div className="mt-7 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/reopen" className="text-blue-700 underline">Join the reopening list</Link>
          <Link href="/login" className="text-blue-700 underline">Sign in</Link>
          <Link href="/contact" className="text-blue-700 underline">Contact support</Link>
        </div>
      </section>
    </div>
  );
}
