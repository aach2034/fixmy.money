'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import DashboardContent from '@/app/components/DashboardContent';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { checkOnboardingStatus } from '@/lib/onboarding/onboardingGate';
import { CheckCircle2, X, Loader2 } from 'lucide-react';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  agency: 'Agency',
  pro: 'Growth',
  premium: 'Agency',
};

function DashboardSuccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isCheckoutSuccess = searchParams.get('checkout') === 'success';
  const planParam = searchParams.get('plan') || '';
  const planLabel = PLAN_LABELS[planParam.toLowerCase()] || planParam;

  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!isCheckoutSuccess) return;
    setShowBanner(true);

    // Access is activated only by the signed Stripe webhook. The success URL
    // is informational and must never be able to grant itself a subscription.
  }, [isCheckoutSuccess]);

  const dismissBanner = () => {
    setShowBanner(false);
    router.replace('/dashboard', { scroll: false });
  };

  if (!showBanner) return null;

  return (
    <div className="mx-6 mt-4 mb-0 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-start gap-3 shadow-sm">
      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle2 size={20} className="text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-emerald-800">
          Payment received. Welcome to FixMy.Money.
        </p>
        <p className="text-xs text-emerald-700 mt-0.5">
          {planLabel
            ? `You're on the ${planLabel} plan. Your $1, 14-day trial has started.`
            : 'Your $1, 14-day trial has started.'}
        </p>
      </div>
      <button
        onClick={dismissBanner}
        className="shrink-0 text-emerald-500 hover:text-emerald-700 transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * Neutral loading screen shown while onboarding status is being verified.
 * Must NOT show any dashboard data, skeletons with numbers, charts, or client info.
 */
function WorkspaceLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 size={32} className="animate-spin text-blue-600" />
      <p className="text-sm font-medium text-slate-600">Preparing your workspace…</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // Three-state gate: 'checking' | 'allowed' | 'redirecting'
  // Dashboard content MUST NOT render until state is 'allowed'.
  const [gateState, setGateState] = useState<'checking' | 'allowed' | 'redirecting'>('checking');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setGateState('redirecting');
      router.replace('/login?redirect=/dashboard');
      return;
    }

    // Verify onboarding is complete before rendering ANY dashboard content.
    // This is the client-side enforcement layer (middleware is the server-side layer).
    const verifyOnboarding = async () => {
      const status = await checkOnboardingStatus(supabase, user.id);
      if (!status.complete) {
        setGateState('redirecting');
        router.replace('/onboarding');
      } else {
        setGateState('allowed');
      }
    };

    verifyOnboarding();
  }, [user, authLoading]);

  // Show neutral loading screen while checking — never show dashboard data
  if (gateState === 'checking' || gateState === 'redirecting') {
    return <WorkspaceLoadingScreen />;
  }

  // Only render dashboard content after onboarding is confirmed complete
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <DashboardSuccessBanner />
      </Suspense>
      <DashboardContent />
    </AppLayout>
  );
}
