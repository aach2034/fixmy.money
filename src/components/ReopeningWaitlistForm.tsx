'use client';

import { FormEvent, useCallback, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { attributionEventParams, captureCurrentAttribution } from '@/lib/attribution';
import TurnstileChallenge from '@/components/TurnstileChallenge';
import {
  initialLeadChallengeState,
  leadChallengeReducer,
} from '@/lib/marketing/leadChallenge';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

export default function ReopeningWaitlistForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<SubmissionState>('idle');
  const [error, setError] = useState('');
  const [challenge, dispatchChallenge] = useReducer(
    leadChallengeReducer,
    initialLeadChallengeState,
  );
  const challengeRetryInFlight = useRef(false);
  const challengeGeneration = useRef(challenge.widgetGeneration);
  challengeGeneration.current = challenge.widgetGeneration;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  const submitWaitlist = useCallback(async (challengeToken?: string) => {
    setState('submitting');
    setError('');

    try {
      const response = await fetch('/api/reopening-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          website,
          source: 'reopening_list',
          ...(challengeToken ? { challengeToken } : {}),
        }),
      });
      const result = await response.json() as { error?: string; code?: string };
      if (!response.ok) {
        if (result.code === 'CHALLENGE_REQUIRED') {
          dispatchChallenge({
            type: challengeToken ? 'challenge_rejected' : 'challenge_required',
          });
          setState('idle');
          setError(
            challengeToken
              ? 'Verification expired or was not accepted. Complete the new verification to retry.'
              : 'Complete the security verification to continue.',
          );
          return;
        }
        throw new Error(result.error || 'We could not save your email. Please try again.');
      }
      dispatchChallenge({ type: 'resolved' });
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
  }, [email, website]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitWaitlist();
  }

  const handleChallengeToken = useCallback(async (token: string, generation: number) => {
    if (
      challengeRetryInFlight.current ||
      challenge.phase !== 'required' ||
      generation !== challengeGeneration.current
    ) return;

    challengeRetryInFlight.current = true;
    dispatchChallenge({ type: 'token_received' });
    try {
      await submitWaitlist(token);
    } finally {
      challengeRetryInFlight.current = false;
    }
  }, [challenge.phase, submitWaitlist]);

  const handleChallengeExpired = useCallback(() => {
    dispatchChallenge({ type: 'challenge_expired' });
    setState('idle');
    setError('Security verification expired. Please complete the new verification.');
  }, []);

  const handleChallengeError = useCallback(() => {
    setState('error');
    setError('Security verification could not load. Use Retry verification or try again later.');
  }, []);

  const retryChallenge = () => {
    dispatchChallenge({ type: 'challenge_expired' });
    setState('idle');
    setError('');
  };

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
      {error && <p id="reopening-error" role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
      {challenge.phase === 'required' && (
        <div aria-live="polite">
          {turnstileSiteKey ? (
            <TurnstileChallenge
              key={challenge.widgetGeneration}
              generation={challenge.widgetGeneration}
              siteKey={turnstileSiteKey}
              onToken={handleChallengeToken}
              onExpired={handleChallengeExpired}
              onError={handleChallengeError}
            />
          ) : (
            <p role="alert" className="text-sm font-semibold text-rose-700">
              Security verification is temporarily unavailable. Please try again later.
            </p>
          )}
        </div>
      )}
      {challenge.phase === 'required' && state === 'error' && turnstileSiteKey && (
        <button
          type="button"
          onClick={retryChallenge}
          className="text-sm font-bold text-[#284b36] underline underline-offset-2 hover:text-[#19322b]"
        >
          Retry verification
        </button>
      )}
      <button type="submit" disabled={state === 'submitting' || challenge.phase !== 'idle'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3fa447] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(63,164,71,.2)] transition hover:bg-[#338a3b] disabled:cursor-wait disabled:opacity-70">
        {state === 'submitting' ? <><Loader2 className="size-4 animate-spin" /> JOINING…</> : <>GET MY FREE MONTH <ArrowRight className="size-4" /></>}
      </button>
      <p className="text-xs leading-5 text-[#687871]">No payment, trial, subscription, or account is created. By joining, you agree to receive reopening updates. See our <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
    </form>
  );
}
