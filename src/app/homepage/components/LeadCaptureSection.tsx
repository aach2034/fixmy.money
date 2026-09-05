'use client';

import { FormEvent, useCallback, useReducer, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { trackLeadMagnetSignup } from '@/lib/analytics';
import TurnstileChallenge from '@/components/TurnstileChallenge';
import {
  initialLeadChallengeState,
  leadChallengeReducer,
} from '@/lib/marketing/leadChallenge';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

const KIT_ITEMS = [
  { icon: ClipboardCheck, label: 'Client onboarding checklist' },
  { icon: FileCheck2, label: 'Evidence-review worksheet' },
  { icon: ShieldCheck, label: 'Approval and audit-trail checklist' },
  { icon: CheckCircle2, label: 'Bureau-response tracker' },
];

export default function LeadCaptureSection() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [challenge, dispatchChallenge] = useReducer(
    leadChallengeReducer,
    initialLeadChallengeState,
  );
  const challengeRetryInFlight = useRef(false);
  const challengeGeneration = useRef(challenge.widgetGeneration);
  challengeGeneration.current = challenge.widgetGeneration;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  const submitLead = useCallback(async (challengeToken?: string) => {
    setSubmissionState('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/marketing/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          website,
          source: 'homepage_walkthrough',
          ...(challengeToken ? { challengeToken } : {}),
        }),
      });
      const result = (await response.json()) as { error?: string; code?: string };

      if (!response.ok) {
        if (result.code === 'CHALLENGE_REQUIRED') {
          dispatchChallenge({
            type: challengeToken ? 'challenge_rejected' : 'challenge_required',
          });
          setSubmissionState('idle');
          setErrorMessage(
            challengeToken
              ? 'Verification expired or was not accepted. Complete the new verification to retry.'
              : 'Complete the security verification to continue.',
          );
          return;
        }
        throw new Error(result.error || 'We could not save your signup. Please try again.');
      }

      dispatchChallenge({ type: 'resolved' });
      setSubmissionState('success');
      trackLeadMagnetSignup();
    } catch (error) {
      setSubmissionState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'We could not save your signup. Please try again.'
      );
    }
  }, [email, website]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitLead();
  };

  const handleChallengeToken = useCallback(async (token: string, generation: number) => {
    if (
      challengeRetryInFlight.current ||
      challenge.phase !== 'required' ||
      generation !== challengeGeneration.current
    ) return;
    challengeRetryInFlight.current = true;
    dispatchChallenge({ type: 'token_received' });
    try {
      await submitLead(token);
    } finally {
      challengeRetryInFlight.current = false;
    }
  }, [challenge.phase, submitLead]);

  const handleChallengeExpired = useCallback(() => {
    dispatchChallenge({ type: 'challenge_expired' });
    setSubmissionState('idle');
    setErrorMessage('Security verification expired. Please complete the new verification.');
  }, []);

  const handleChallengeError = useCallback(() => {
    setSubmissionState('error');
    setErrorMessage('Security verification could not load. Use Retry verification or try again later.');
  }, []);

  const retryChallenge = () => {
    dispatchChallenge({ type: 'challenge_expired' });
    setSubmissionState('idle');
    setErrorMessage('');
  };

  return (
    <section id="starter-kit" className="relative overflow-hidden border-b border-[#183146] bg-[#071B2E] py-20 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(40,204,229,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(40,204,229,.08) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-200">
            <Mail size={14} aria-hidden="true" />
            Free agency resource
          </div>
          <h2 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Build a workflow you can explain—and prove.
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#BDCCDC]">
            Get the Evidence-First Agency Starter Kit: practical checklists for onboarding,
            reviewing report evidence, approving disputes, and tracking bureau responses.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {KIT_ITEMS.map(({ icon: ItemIcon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm font-semibold text-[#DCE8F2]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                  <ItemIcon size={16} aria-hidden="true" />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#2A5671] bg-[#0A2940] p-6 shadow-[0_30px_70px_rgba(0,0,0,.24)] sm:p-8">
          {submissionState === 'success' ? (
            <div role="status" aria-live="polite">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                <Check size={24} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-2xl font-extrabold">Your starter kit is ready.</h3>
              <p className="mt-3 leading-7 text-[#BDCCDC]">
                Open the kit now, then print it or save it as a PDF for your team.
              </p>
              <Link
                href="/resources/evidence-first-agency-starter-kit"
                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-cyan-400 px-6 py-4 font-extrabold text-[#031322] transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#0A2940]"
              >
                Open the free starter kit
                <ArrowRight size={19} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-extrabold">Send me the free kit</h3>
              <p className="mt-2 text-sm leading-6 text-[#9EB1C2]">
                Made for credit-repair agency owners and operators.
              </p>
              <form className="mt-6" onSubmit={handleSubmit} noValidate>
                <label htmlFor="starter-kit-email" className="text-sm font-bold text-white">
                  Work email address
                </label>
                <input
                  id="starter-kit-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@youragency.com"
                  aria-describedby="starter-kit-consent starter-kit-error"
                  className="mt-2 w-full rounded-xl border border-[#31566E] bg-[#031725] px-4 py-3.5 text-white placeholder:text-[#6F879B] focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                />
                <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <label htmlFor="starter-kit-website">Website</label>
                  <input
                    id="starter-kit-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                  />
                </div>
                {errorMessage && (
                  <p id="starter-kit-error" role="alert" className="mt-3 text-sm font-semibold text-rose-300">
                    {errorMessage}
                  </p>
                )}
                {challenge.phase === 'required' && (
                  <div className="mt-4" aria-live="polite">
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
                      <p role="alert" className="text-sm font-semibold text-rose-300">
                        Security verification is temporarily unavailable. Please try again later.
                      </p>
                    )}
                  </div>
                )}
                {challenge.phase === 'required' && submissionState === 'error' && turnstileSiteKey && (
                  <button
                    type="button"
                    onClick={retryChallenge}
                    className="mt-3 text-sm font-bold text-cyan-200 underline underline-offset-2 hover:text-cyan-100"
                  >
                    Retry verification
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submissionState === 'submitting' || challenge.phase !== 'idle'}
                  className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-cyan-400 px-6 py-4 font-extrabold text-[#031322] transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#0A2940]"
                >
                  {submissionState === 'submitting' ? 'Preparing your kit…' : 'Get the free starter kit'}
                  {submissionState !== 'submitting' && <ArrowRight size={19} aria-hidden="true" />}
                </button>
                <p id="starter-kit-consent" className="mt-4 text-xs leading-5 text-[#8198AD]">
                  By submitting, you agree to receive the kit and occasional FixMy.Money
                  product and workflow emails. Unsubscribe anytime. See our{' '}
                  <Link href="/privacy" className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
