'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Shield, Loader2, AlertCircle, RefreshCw, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { CHECKOUT_PLANS, TRIAL_CONFIG, type PlanId } from '@/lib/stripe/plans';
import { getPlanAudience, trackEvent } from '@/lib/analytics';
import { appendAttributionToHref, attributionEventParams, captureCurrentAttribution, getStoredAttribution } from '@/lib/attribution';

interface UserProfile {
  subscription_status: string | null;
  subscription_plan: string | null;
  stripe_customer_id: string | null;
  full_name: string | null;
  email: string | null;
  onboarding_completed: boolean | null;
}

export default function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const urlPlan = (searchParams.get('plan') || 'professional') as PlanId;
  const validPlan = CHECKOUT_PLANS.find(p => p.id === urlPlan) ? urlPlan : 'professional';

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(validPlan);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [error, setError] = useState('');
  const checkoutCancelledTracked = useRef(false);
  const emailVerifiedTracked = useRef(false);

  const activeStatuses = ['trialing', 'active', 'trial_active'];

  useEffect(() => {
    if (searchParams.get('cancelled') === '1' && !checkoutCancelledTracked.current) {
      checkoutCancelledTracked.current = true;
      trackEvent('checkout_cancelled', {
        event_category: 'conversion',
        plan_name: validPlan,
        currency: 'USD',
      });
    }

    if (searchParams.get('verified') === '1' && !emailVerifiedTracked.current) {
      emailVerifiedTracked.current = true;
      trackEvent('email_verified', {
        event_category: 'conversion',
        plan_name: validPlan,
        audience: getPlanAudience(validPlan),
      });
    }
  }, [searchParams, validPlan]);

  useEffect(() => {
    captureCurrentAttribution();
    if (authLoading) return;
    if (!user) {
      router.replace(appendAttributionToHref(`/sign-up-login-screen?plan=${selectedPlan}`, getStoredAttribution()));
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('subscription_status, subscription_plan, stripe_customer_id, full_name, email, onboarding_completed')
          .eq('id', user.id)
          .single();

        setProfile(data as UserProfile | null);

        if (data && activeStatuses.includes(data.subscription_status || '')) {
          router.replace(data.onboarding_completed ? '/dashboard' : '/onboarding');
          return;
        }
      } catch {
        // non-blocking
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading]);

  const handleStartCheckout = async () => {
    if (!user) {
      router.push(appendAttributionToHref(`/sign-up-login-screen?plan=${selectedPlan}`, getStoredAttribution()));
      return;
    }

    const { data: freshProfile } = await supabase
      .from('user_profiles')
      .select('subscription_status, onboarding_completed')
      .eq('id', user.id)
      .single();

    if (freshProfile && activeStatuses.includes(freshProfile.subscription_status || '')) {
      router.replace(freshProfile.onboarding_completed ? '/dashboard' : '/onboarding');
      return;
    }

    setCheckoutLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          email: user.email || profile?.email,
          name: profile?.full_name || '',
          userId: user.id,
          attribution: attributionEventParams(captureCurrentAttribution()),
        }),
      });

      const data = await res.json();

      if (res.status === 503) {
        setError('Payment system is temporarily unavailable. Please try again later or contact support.');
        return;
      }

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      if (data.alreadyActive) {
        router.replace('/onboarding');
        return;
      }

      if (data.url) {
        const plan = CHECKOUT_PLANS.find(item => item.id === selectedPlan)!;
        trackEvent('begin_checkout', {
          currency: 'USD',
          value: TRIAL_CONFIG.chargeCents / 100,
          plan_name: selectedPlan,
          checkout_started: true,
          items: [{
            item_id: selectedPlan,
            item_name: `FixMy.Money ${plan.name}`,
            price: TRIAL_CONFIG.chargeCents / 100,
            quantity: 1,
          }],
        });
        trackEvent('checkout_started', {
          currency: 'USD',
          value: TRIAL_CONFIG.chargeCents / 100,
          plan_name: selectedPlan,
          authenticated: true,
        });
        window.location.href = data.url;
      } else {
        setError('Could not start checkout. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleRestorePurchase = async () => {
    if (!user) return;
    setRestoreLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/restore-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });

      const data = await res.json();

      if (data.activated) {
        router.replace('/dashboard');
        return;
      }

      if (data.message) {
        setError(data.message);
      } else {
        setError('No active payment found. Please complete checkout or contact support.');
      }
    } catch {
      setError('Could not check payment status. Please try again.');
    } finally {
      setRestoreLoading(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedPlanData = CHECKOUT_PLANS.find(p => p.id === selectedPlan)!;

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Image
            src="/assets/images/fix_my_money_logo-1780535345534.png"
            alt="FixMy.Money Logo"
            width={130}
            height={34}
            className="object-contain h-auto"
          />
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Shield size={13} style={{ color: '#00C16A' }} />
            Secured by Stripe
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#00C16A' }}>
              <CheckCircle2 size={14} />
            </div>
            <span className="text-sm font-semibold text-gray-700">Account Created</span>
          </div>
          <div className="w-12 h-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#0A2540' }}>2</div>
            <span className="text-sm font-semibold" style={{ color: '#0A2540' }}>Select Plan</span>
          </div>
          <div className="w-12 h-px bg-gray-300" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-gray-200 text-gray-500">3</div>
            <span className="text-sm text-gray-400">Payment</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#0A2540' }}>Choose Your Plan</h1>
          <p className="text-gray-500">{TRIAL_CONFIG.label}</p>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {CHECKOUT_PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`text-left rounded-2xl border-2 p-5 transition-all ${
                selectedPlan === plan.id
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {plan.badge && (
                <div className="inline-block bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mb-2">
                  {plan.badge}
                </div>
              )}
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPlan === plan.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                }`}>
                  {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              <div className="mb-3">
                <span className="text-2xl font-extrabold text-gray-900">${plan.monthlyPrice}</span>
                <span className="text-gray-500 text-sm">/mo</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
              <ul className="space-y-1.5">
                {plan.features.slice(0, 5).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-gray-700">
                    <Check size={13} style={{ color: '#00C16A' }} className="shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="max-w-md mx-auto">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleStartCheckout}
            disabled={checkoutLoading}
            className="w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 mb-3"
            style={{ background: '#00C16A' }}
          >
            {checkoutLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Redirecting to secure checkout…
              </>
            ) : (
              <>
                Start {selectedPlanData.name} $1 Trial
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-6">
            <Shield size={12} />
            <span>Secured by Stripe · {TRIAL_CONFIG.label}</span>
          </div>

          {/* Restore Purchase */}
          <div className="border-t border-gray-200 pt-5 text-center">
            <p className="text-xs text-gray-500 mb-2">Already paid but not activated?</p>
            <button
              onClick={handleRestorePurchase}
              disabled={restoreLoading}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:opacity-60"
            >
              {restoreLoading ? (
                <><Loader2 size={14} className="animate-spin" /> Checking payment status…</>
              ) : (
                <><RefreshCw size={14} /> Restore Purchase / Check Payment Status</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
