'use client';

import { FormEvent, useCallback, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import TurnstileChallenge from '@/components/TurnstileChallenge';
import { getRuntimeTurnstileSiteKey } from '@/lib/marketing/leadChallenge';

const ALLOWED_PLANS = new Set(['starter', 'professional', 'agency']);

export default function PublicSignupForm() {
  const searchParams = useSearchParams();
  const requestedPlan = searchParams.get('plan') || 'professional';
  const plan = ALLOWED_PLANS.has(requestedPlan) ? requestedPlan : 'professional';
  const siteKey = getRuntimeTurnstileSiteKey();
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaGeneration, setCaptchaGeneration] = useState(0);
  const [captchaError, setCaptchaError] = useState(false);
  const [state, setState] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState('');

  const handleToken = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(false);
  }, []);
  const resetCaptcha = useCallback(() => {
    setCaptchaToken('');
    setCaptchaGeneration(value => value + 1);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (siteKey && !captchaToken) {
      setError('Complete the security verification to continue.');
      return;
    }

    const form = new FormData(event.currentTarget);
    if (form.get('password') !== form.get('confirmPassword')) {
      setError('Passwords do not match.');
      return;
    }
    if (form.get('terms') !== 'accepted') {
      setError('Accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setState('submitting');
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: form.get('adminName'),
          companyName: form.get('companyName'),
          email: form.get('email'),
          password: form.get('password'),
          plan,
          captchaToken,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Account creation is temporarily unavailable.');
      setState('success');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Account creation is temporarily unavailable.');
      resetCaptcha();
      setState('idle');
    }
  }

  if (state === 'success') {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7 text-emerald-950">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-sm leading-6">If the address can be registered, you’ll receive a verification link. Verify it to continue to the selected monthly plan and the $1, 14-day trial.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div><label className="label-text" htmlFor="companyName">Company name</label><input className="input-field" id="companyName" name="companyName" maxLength={120} required autoComplete="organization" /></div>
      <div><label className="label-text" htmlFor="adminName">Your name</label><input className="input-field" id="adminName" name="adminName" maxLength={100} required autoComplete="name" /></div>
      <div><label className="label-text" htmlFor="email">Work email</label><input className="input-field" id="email" name="email" type="email" maxLength={254} required autoComplete="email" /></div>
      <div><label className="label-text" htmlFor="password">Password</label><input className="input-field" id="password" name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /><p className="mt-1 text-xs text-slate-500">Use at least 12 characters.</p></div>
      <div><label className="label-text" htmlFor="confirmPassword">Confirm password</label><input className="input-field" id="confirmPassword" name="confirmPassword" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></div>
      <label className="flex items-start gap-3 text-sm leading-6 text-slate-600"><input className="mt-1" type="checkbox" name="terms" value="accepted" required />I agree to the <Link className="font-semibold text-blue-700 underline" href="/terms-of-service">Terms of Service</Link> and <Link className="font-semibold text-blue-700 underline" href="/privacy">Privacy Policy</Link>.</label>
      {siteKey && <TurnstileChallenge action="customer_signup" generation={captchaGeneration} siteKey={siteKey} onToken={handleToken} onExpired={resetCaptcha} onError={() => { setCaptchaError(true); setCaptchaToken(''); }} />}
      {captchaError && <p role="alert" className="text-sm font-semibold text-rose-700">Security verification could not load. Refresh the page or try again later.</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p>}
      <button type="submit" disabled={state === 'submitting' || captchaError} className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 disabled:opacity-60">{state === 'submitting' && <Loader2 className="size-4 animate-spin" />}{state === 'submitting' ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}</button>
      <p className="text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-blue-700 underline">Sign in</Link></p>
    </form>
  );
}
