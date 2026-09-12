'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, CheckCircle2, ClipboardCheck, Eye, EyeOff, FileSearch, Loader2, LockKeyhole, Mail, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth } from '@/contexts/AuthContext';
import { clearLocalAuthState, createClient } from '@/lib/supabase/client';

type LoginFormData = { email: string; password: string; remember: boolean };
type ForgotPasswordFormData = { email: string };

const TRUST_ITEMS = [
  { icon: Shield, text: 'Tenant-isolated records for every business account' },
  { icon: Building2, text: 'A dedicated workspace for every authorized customer' },
  { icon: LockKeyhole, text: 'Secure sign-in and owner-scoped business data' },
];

const WORKFLOW_FEATURES = [
  { icon: FileSearch, label: 'Source-linked report review' },
  { icon: ClipboardCheck, label: 'Verified facts and human approval' },
  { icon: Sparkles, label: 'Traceable responses and outcomes' },
];

export function getSafeRedirectPath(value: string | null): string {
  if (!value) return '';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '';
  return value;
}

export default function AuthForm({ defaultTab }: { defaultTab?: 'login' | 'register' | 'forgot' }) {
  const [tab, setTab] = useState<'login' | 'forgot'>(defaultTab === 'forgot' ? 'forgot' : 'login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const authTransitionFailed = searchParams.get('auth_transition') === 'verification_failed';
  const passwordResetComplete = searchParams.get('password_reset') === '1';
  const forceReauth = searchParams.get('force_reauth') === '1';
  const redirectTo = getSafeRedirectPath(searchParams.get('redirect'));
  const [supabase] = useState(() => {
    if (authTransitionFailed) clearLocalAuthState();
    return createClient();
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('tab') === 'forgot') setTab('forgot');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      if (forceReauth) return;
      if (authTransitionFailed) {
        clearLocalAuthState();
        window.history.replaceState({}, '', '/login');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      const { data: profile } = await supabase.from('user_profiles').select('onboarding_completed').eq('id', session.user.id).single();
      const entitlementResponse = await fetch('/api/stripe/entitlement', { method: 'POST' });
      const entitlement = entitlementResponse.ok ? await entitlementResponse.json() : null;
      if (cancelled) return;
      if (profile && entitlement?.canAccess) {
        router.replace(profile.onboarding_completed ? (redirectTo || '/dashboard') : '/onboarding');
      } else {
        router.replace('/billing-subscriptions');
      }
    }
    checkSession().catch(error => console.error('[AuthForm] checkSession error:', error));
    return () => { cancelled = true; };
  }, [authTransitionFailed, forceReauth, redirectTo, router, supabase]);

  const loginForm = useForm<LoginFormData>({ defaultValues: { email: '', password: '', remember: false } });
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({ defaultValues: { email: '' } });

  async function handleLoginSubmit(data: LoginFormData) {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(redirectTo || '/dashboard');
        return;
      }
      const { data: profile } = await supabase.from('user_profiles').select('onboarding_completed').eq('id', session.user.id).single();
      const entitlementResponse = await fetch('/api/stripe/entitlement', { method: 'POST' });
      const entitlement = entitlementResponse.ok ? await entitlementResponse.json() : null;
      if (profile && entitlement?.canAccess) {
        router.push(profile.onboarding_completed ? (redirectTo || '/dashboard') : '/onboarding');
      } else {
        router.push('/billing-subscriptions');
      }
    } catch (error) {
      loginForm.setError('email', { message: error instanceof Error ? error.message : 'Invalid email or password. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPasswordSubmit(data: ForgotPasswordFormData) {
    setLoading(true);
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      await supabase.auth.resetPasswordForEmail(data.email, { redirectTo: `${siteUrl}/auth/callback?type=recovery&next=/reset-password` });
    } finally {
      setResetEmailSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="auth-form min-h-screen flex bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-[#071f1b] via-[#083a32] to-[#0b1742] flex-col justify-between p-10">
        <div>
          <Link href="/" className="flex items-center gap-3 mb-12"><AppLogo size={40} /><span className="text-white font-semibold text-xl">FixMy<span className="text-[#71dcb9]">.Money</span></span></Link>
          <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-300/20 text-[#71dcb9] text-xs font-semibold px-3 py-1.5 rounded-full mb-6"><Sparkles size={12} /> Existing customer access</div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">Welcome back to your <span className="text-[#71dcb9]">secure workspace.</span></h2>
          <p className="text-slate-300 leading-relaxed mb-8">Existing authorized customers can continue to sign in and use FixMy.Money during the improvement period.</p>
          <div className="space-y-3">{WORKFLOW_FEATURES.map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-3 text-emerald-50 text-sm font-medium"><Icon size={16} className="text-[#71dcb9]" />{label}</div>)}</div>
        </div>
        <div className="space-y-4">{TRUST_ITEMS.map(({ icon: Icon, text }) => <div key={text} className="flex items-center gap-3 text-slate-300 text-sm"><Icon size={16} className="text-white" />{text}</div>)}</div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-16 bg-slate-50">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-2 mb-8"><AppLogo size={32} /><span className="font-semibold text-lg">FixMy<span className="text-[#3fa447]">.Money</span></span></div>
          {tab === 'login' ? (
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
              <p className="mt-1 mb-6 text-sm text-slate-500">Sign in to your existing FixMy.Money account</p>
              {authTransitionFailed && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The previous verification link could not safely establish its account. Sign in with your existing account.</div>}
              {passwordResetComplete && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Your password was updated. Sign in with your new password.</div>}
              {forceReauth && <div role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">Sign in again to confirm this security-sensitive action. Your billing account has not been changed.</div>}
              <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                <div><label htmlFor="login-email" className="label-text">Email address</label><input id="login-email" {...loginForm.register('email', { required: 'Email is required' })} type="email" className="input-field" autoComplete="email" required />{loginForm.formState.errors.email && <p className="error-text">{loginForm.formState.errors.email.message}</p>}</div>
                <div><div className="flex justify-between"><label htmlFor="login-password" className="label-text">Password</label><button type="button" onClick={() => { setResetEmailSent(false); setTab('forgot'); }} className="text-xs font-semibold text-blue-600 hover:underline">Forgot password?</button></div><div className="relative"><input id="login-password" {...loginForm.register('password', { required: 'Password is required' })} type={showPass ? 'text' : 'password'} className="input-field pr-10" autoComplete="current-password" required /><button type="button" aria-label={showPass ? 'Hide password' : 'Show password'} onClick={() => setShowPass(value => !value)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-slate-400">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                <button type="submit" disabled={loading || !hydrated} className="w-full btn-primary py-3 flex items-center justify-center gap-2 rounded-xl">{loading && <Loader2 size={16} className="animate-spin" />}{loading ? 'Signing in…' : 'SIGN IN'}</button>
              </form>
              <p className="mt-6 text-center text-sm text-slate-500">New to FixMy.Money? <Link href="/#reopening-list" className="font-semibold text-blue-600 hover:underline">Join the reopening list</Link></p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
              <p className="mt-1 mb-6 text-sm text-slate-500">Existing customers can request a secure reset link.</p>
              {resetEmailSent ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><CheckCircle2 className="text-emerald-600" /><p className="mt-3 font-semibold text-emerald-900">Check your email</p><p className="mt-1 text-sm text-emerald-800">If an account exists for that address, a reset link is on its way.</p></div> : <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordSubmit)} className="space-y-4"><div><label htmlFor="forgot-email" className="label-text">Email address</label><input id="forgot-email" {...forgotPasswordForm.register('email', { required: 'Email is required' })} type="email" className="input-field" autoComplete="email" required /></div><button type="submit" disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center gap-2 rounded-xl">{loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}{loading ? 'Sending…' : 'Send reset link'}</button></form>}
              <button type="button" onClick={() => setTab('login')} className="mt-5 w-full text-sm font-semibold text-blue-600 hover:underline">Back to sign in</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
