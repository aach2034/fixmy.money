'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  authorizeDestructiveAdminAction,
  confirmAdminStepUp,
  recordAdminSecurityEvent,
  removeAdminFactor,
  revokeAdminSessions,
} from '@/app/admin/security/actions';

type TotpFactor = {
  id: string;
  status: 'verified' | 'unverified';
  friendly_name?: string;
};

export default function AdminMfaPanel({ reason }: { reason?: string }) {
  const router = useRouter();
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    const supabase = createClient();
    const { data, error: enrollmentError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'FixMy.Money administrator',
    });
    if (enrollmentError || !data) {
      await recordAdminSecurityEvent('admin_mfa_enrollment_failed');
      setError('Enrollment could not be started. No administrator access was granted.');
    } else {
      await recordAdminSecurityEvent('admin_mfa_enrollment_started');
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
    }
    setBusy(false);
  }

  async function verify() {
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError('');
    const supabase = createClient();
    const { error: verificationError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    if (verificationError) {
      await recordAdminSecurityEvent('admin_mfa_challenge_failed');
      setError('The code could not be verified. Administrator access remains locked.');
      setBusy(false);
      return;
    }

    try {
      await confirmAdminStepUp();
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Verification succeeded, but secure administrator access could not be recorded. Sign out and try again.');
      setBusy(false);
    }
  }

  async function removeFactor() {
    if (!factorId) return;
    setBusy(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: verificationError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verificationError) throw verificationError;
      await authorizeDestructiveAdminAction(
        'administrator_factor_removal',
        factorId,
        { factorId }
      );
      await removeAdminFactor(factorId);
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
      await authorizeDestructiveAdminAction(
        'administrator_session_revocation',
        'self',
        { scope: 'global' }
      );
      await revokeAdminSessions();
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

      {(verifiedFactor || qrCode) ? (
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

      {verifiedFactor ? (
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
