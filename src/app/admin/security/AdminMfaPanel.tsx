'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type TotpFactor = {
  id: string;
  status: 'verified' | 'unverified';
  friendly_name?: string;
};

type AdminSecurityOperation =
  | { operation: 'prepare_enrollment' }
  | { operation: 'record_event'; action: string }
  | { operation: 'confirm_step_up' }
  | { operation: 'authorize_destructive'; action: string; targetId: string; material: Record<string, string> }
  | { operation: 'remove_factor'; factorId: string }
  | { operation: 'revoke_sessions' };

const ADMIN_VERIFICATION_TIMEOUT_MS = 15_000;

class AdminVerificationTimeoutError extends Error {}

async function withVerificationTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new AdminVerificationTimeoutError()), ADMIN_VERIFICATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function runAdminSecurityOperation<T>(operation: AdminSecurityOperation): Promise<T> {
  const response = await fetch('/api/admin/security', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'x-fixmymoney-admin-security': '1',
    },
    body: JSON.stringify(operation),
  });
  if (!response.ok) throw new Error('Administrator security operation failed.');
  return response.json() as Promise<T>;
}

export default function AdminMfaPanel({ reason, active }: { reason?: string; active: boolean }) {
  const router = useRouter();
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activationPending, setActivationPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data, error: factorError }) => {
      if (factorError) setError('Multi-factor authentication is temporarily unavailable.');
      const totp = (data?.totp || []) as TotpFactor[];
      setFactors(totp);
      const verified = totp.find((factor) => factor.status === 'verified');
      if (verified) setFactorId(verified.id);
      setLoading(false);
    });
  }, []);

  async function enroll() {
    setBusy(true);
    setError('');
    try {
      await runAdminSecurityOperation({ operation: 'prepare_enrollment' });
      const supabase = createClient();
      const { data, error: enrollmentError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'FixMy.Money administrator',
      });
      if (enrollmentError || !data) {
        await runAdminSecurityOperation({
          operation: 'record_event',
          action: 'admin_mfa_enrollment_failed',
        }).catch(() => undefined);
        setError('Enrollment could not be started. No administrator access was granted.');
        return;
      }

      // Preserve the one-time enrollment material even if audit recording is
      // temporarily unavailable. Administrator access still remains locked
      // until the separate server-side confirmation succeeds.
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      await runAdminSecurityOperation({
        operation: 'record_event',
        action: 'admin_mfa_enrollment_started',
      }).catch(() => {
        setError('Enrollment started, but its audit event is delayed. Access remains locked until verification succeeds.');
      });
    } catch {
      setError('Enrollment could not be started safely. No administrator access was granted.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError('');
    let factorVerified = false;
    let navigateToAdmin = false;
    try {
      const supabase = createClient();
      const { error: verificationError } = await withVerificationTimeout(
        supabase.auth.mfa.challengeAndVerify({ factorId, code })
      );
      if (verificationError) {
        await runAdminSecurityOperation({
          operation: 'record_event',
          action: 'admin_mfa_challenge_failed',
        }).catch(() => undefined);
        setError('The code could not be verified. Administrator access remains locked.');
        return;
      }

      factorVerified = true;
      const result = await withVerificationTimeout(
        runAdminSecurityOperation<{ ok: true; activationPending: boolean }>({
          operation: 'confirm_step_up',
        })
      );
      if (result.activationPending) {
        setActivationPending(true);
        setQrCode('');
        setCode('');
        return;
      }

      navigateToAdmin = true;
    } catch (verificationFailure) {
      if (verificationFailure instanceof AdminVerificationTimeoutError) {
        // A timed-out browser promise may follow a successful Auth/session
        // rotation. Let the database-authoritative /admin guard decide using a
        // fresh document request instead of leaving the button permanently busy.
        navigateToAdmin = true;
      } else if (factorVerified) {
        setError('Verification succeeded, but secure administrator access could not be recorded. Sign out and try again.');
      } else {
        setError('The code could not be verified. Administrator access remains locked.');
      }
    } finally {
      setBusy(false);
    }

    if (navigateToAdmin) window.location.assign('/admin');
  }

  async function removeFactor() {
    if (!factorId) return;
    setBusy(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: verificationError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verificationError) throw verificationError;
      await runAdminSecurityOperation({
        operation: 'authorize_destructive',
        action: 'administrator_factor_removal',
        targetId: factorId,
        material: { factorId },
      });
      await runAdminSecurityOperation({ operation: 'remove_factor', factorId });
      router.push('/login');
      router.refresh();
    } catch {
      setError('The factor was not removed safely. Sign out and contact the security operator.');
      setBusy(false);
    }
  }

  async function signOutEverywhere() {
    setBusy(true);
    setError('');
    try {
      if (!factorId || !/^\d{6}$/.test(code)) throw new Error('A fresh authenticator code is required.');
      const supabase = createClient();
      const { error: verificationError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verificationError) throw verificationError;
      await runAdminSecurityOperation({
        operation: 'authorize_destructive',
        action: 'administrator_session_revocation',
        targetId: 'self',
        material: { scope: 'global' },
      });
      await runAdminSecurityOperation({ operation: 'revoke_sessions' });
      router.push('/login');
      router.refresh();
    } catch {
      setError('Sessions could not be revoked safely. Contact the security operator.');
      setBusy(false);
    }
  }

  const verifiedFactor = factors.find((factor) => factor.status === 'verified');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-black text-slate-950">Administrator verification</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Administrator pages require a verified authenticator-app code. Sensitive changes also require a new verification within 15 minutes.
      </p>
      {reason === 'unavailable' ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">
          Assurance checks are unavailable. Access is locked until they recover.
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {activationPending ? (
        <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">
          Your authenticator was verified. Administrator access remains inactive until a superadministrator completes the independent activation check.
        </p>
      ) : null}

      {loading ? <p className="mt-6 text-sm text-slate-500">Checking enrolled factors…</p> : null}

      {!loading && !verifiedFactor && !qrCode ? (
        <button type="button" onClick={enroll} disabled={busy} className="mt-6 rounded-xl bg-slate-950 px-4 py-2 font-bold text-white disabled:opacity-50">
          {busy ? 'Starting enrollment…' : 'Enroll authenticator app'}
        </button>
      ) : null}

      {qrCode ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Scan this one-time QR code with your authenticator app, then verify the generated code.</p>
          {/* Supabase returns a local data URI, so a framework image optimizer cannot fetch it. */}
          <img src={qrCode} alt="Authenticator enrollment QR code" className="h-48 w-48 rounded-lg border border-slate-200" />
        </div>
      ) : null}

      {!activationPending && (verifiedFactor || qrCode) ? (
        <div className="mt-6 max-w-sm space-y-3">
          <label htmlFor="admin-totp-code" className="block text-sm font-bold text-slate-800">Six-digit authenticator code</label>
          <input
            id="admin-totp-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-lg tracking-[0.3em]"
          />
          <button type="button" onClick={verify} disabled={busy || code.length !== 6} className="w-full rounded-xl bg-blue-700 px-4 py-2 font-bold text-white disabled:opacity-50">
            {busy ? 'Verifying…' : 'Verify and continue'}
          </button>
        </div>
      ) : null}

      {verifiedFactor && active ? (
        <div className="mt-8 border-t border-slate-200 pt-5">
          <p className="text-sm text-slate-600">Lost the authenticator? Use a separately controlled break-glass administrator. Never remove the final working administrator factor.</p>
          <button type="button" onClick={removeFactor} disabled={busy} className="mt-3 rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50">
            Remove factor and sign out everywhere
          </button>
          <button type="button" onClick={signOutEverywhere} disabled={busy} className="ml-3 mt-3 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">
            Revoke all administrator sessions
          </button>
        </div>
      ) : null}
    </section>
  );
}
