'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { isBusinessPlan, PLANS } from '@/lib/stripe/plans';

export default function CheckoutContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = searchParams.get('plan');
  const planId = isBusinessPlan(requestedPlan) ? requestedPlan : 'professional';
  const plan = PLANS[planId];
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading || !user) return;
    // Existing paying customers keep their verified access; this page does not
    // initiate a new subscription or collect a payment method.
    void fetch('/api/stripe/entitlement', { method: 'POST' })
      .then(response => response.ok ? response.json() : null)
      .then(async entitlement => {
        if (!entitlement?.canAccess || entitlement.state === 'trial') return;
        const supabase = createClient();
        const { data } = await supabase.from('user_profiles')
          .select('onboarding_completed').eq('id', user.id).single();
        router.replace(data?.onboarding_completed ? '/dashboard' : '/onboarding');
      })
      .catch(() => {});
  }, [loading, router, user]);

  const subscribe = async () => {
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, requestId: crypto.randomUUID() }),
      });
      const result = await response.json() as { url?: string; redirectTo?: string; error?: string };
      if (result.redirectTo) return router.replace(result.redirectTo);
      if (!response.ok || !result.url) throw new Error(result.error || 'Checkout is unavailable.');
      window.location.assign(result.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout is unavailable.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Choose paid access when you are ready</h1>
        <p className="mt-4 leading-7 text-slate-700">
          {plan.name} is <strong>${plan.monthlyPrice}/month</strong>, billed monthly until canceled.
          Your free trial does not convert automatically and cannot create a charge, invoice, or debt.
          Payment details are requested only after you select the button below and review Stripe&apos;s confirmation screen.
        </p>
        <p className="mt-3 text-sm text-slate-600">Personal remains available only to existing customers. Existing subscriptions and access are unchanged.</p>
        {error && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        <button type="button" disabled={submitting} onClick={subscribe} className="btn-primary mt-6 w-full justify-center disabled:opacity-60">
          {submitting ? 'Opening secure checkout…' : `Subscribe to ${plan.name} — $${plan.monthlyPrice}/month`}
        </button>
        <div className="mt-7 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/billing-subscriptions" className="text-blue-700 underline">Back to billing</Link>
          <Link href="/login" className="text-blue-700 underline">Sign in</Link>
          <Link href="/contact" className="text-blue-700 underline">Contact support</Link>
        </div>
      </section>
    </div>
  );
}
