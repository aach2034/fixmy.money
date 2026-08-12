'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.session));
      setCheckingSession(false);
    });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      console.error('[ResetPassword] Password update error:', updateError);
      setError('This reset link is invalid or expired. Request a new link and try again.');
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setComplete(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <AppLogo size={36} />
          <span className="text-xl font-bold text-slate-900">FixMy.Money</span>
        </Link>

        {checkingSession ? (
          <div className="flex justify-center py-12" aria-label="Checking reset link">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        ) : complete ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-4 text-emerald-600" size={44} />
            <h1 className="text-2xl font-bold text-slate-900">Password updated</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Your password has been changed securely. You can now sign in with the new password.</p>
            <Link href="/login" className="btn-primary mt-7 inline-flex w-full items-center justify-center rounded-xl py-3 font-semibold">
              Sign in
            </Link>
          </div>
        ) : !hasSession ? (
          <div className="text-center">
            <LockKeyhole className="mx-auto mb-4 text-amber-600" size={44} />
            <h1 className="text-2xl font-bold text-slate-900">Reset link expired</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">For your security, password-reset links can only be used once and expire after a limited time.</p>
            <Link href="/forgot-password" className="btn-primary mt-7 inline-flex w-full items-center justify-center rounded-xl py-3 font-semibold">
              Request a new link
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
              <p className="mt-1 text-sm text-slate-500">Use at least 8 characters.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="label-text">New password</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-field pr-10"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-new-password" className="label-text">Confirm new password</label>
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="input-field"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              {error && <p className="error-text" role="alert">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3">
                {loading && <Loader2 className="animate-spin" size={16} />}
                {loading ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
