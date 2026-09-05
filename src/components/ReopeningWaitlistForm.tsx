'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { attributionEventParams, captureCurrentAttribution } from '@/lib/attribution';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

export default function ReopeningWaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<SubmissionState>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('submitting');
    setError('');

    try {
      const response = await fetch('/api/reopening-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website, source: 'reopening_list' }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'We could not save your email. Please try again.');
      trackEvent('reopening_waitlist_joined', {
        event_category: 'conversion',
        offer: 'one_month_free',
        reopening_date: '2026-10-25',
        source: 'reopening_list',
        attribution: attributionEventParams(captureCurrentAttribution()),
      });
      setState('success');
    } catch (submissionError) {
      setState('error');
      setError(submissionError instanceof Error ? submissionError.message : 'We could not save your email. Please try again.');
    }
  }

  if (state === 'success') {
    return (
      <div role="status" aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-left text-emerald-950">
        <CheckCircle2 className="size-7 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-bold">You’re on the reopening list.</h2>
        <p className="mt-2 text-sm leading-6">We’ll email you when FixMy.Money reopens on October 25, 2026. Your email is reserved for one full month free when you activate after reopening.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={compact ? 'space-y-3' : 'space-y-4'}>
      <label htmlFor={compact ? 'reopening-email-compact' : 'reopening-email'} className="block text-sm font-semibold text-[#19322b]">
        Email address
      </label>
      <input
        id={compact ? 'reopening-email-compact' : 'reopening-email'}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        onChange={event => setEmail(event.target.value)}
        placeholder="you@example.com"
        aria-describedby={error ? 'reopening-error' : undefined}
        className="w-full rounded-xl border border-[#cbd8d2] bg-white px-4 py-3.5 text-[#0b1742] outline-none transition placeholder:text-slate-400 focus:border-[#3fa447] focus:ring-2 focus:ring-[#3fa447]/20"
      />
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor={compact ? 'reopening-website-compact' : 'reopening-website'}>Website</label>
        <input id={compact ? 'reopening-website-compact' : 'reopening-website'} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} />
      </div>
      {state === 'error' && <p id="reopening-error" role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
      <button type="submit" disabled={state === 'submitting'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3fa447] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(63,164,71,.2)] transition hover:bg-[#338a3b] disabled:cursor-wait disabled:opacity-70">
        {state === 'submitting' ? <><Loader2 className="size-4 animate-spin" /> JOINING…</> : <>GET MY FREE MONTH <ArrowRight className="size-4" /></>}
      </button>
      <p className="text-xs leading-5 text-[#687871]">No payment, trial, subscription, or account is created. By joining, you agree to receive reopening updates. See our <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
    </form>
  );
}
