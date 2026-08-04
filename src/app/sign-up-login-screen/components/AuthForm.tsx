'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowRight, Shield, Building2, LockKeyhole, Mail, Loader2, CheckCircle2, Sparkles, FileSearch, ClipboardCheck } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';

type LoginFormData = { email: string; password: string; remember: boolean };
type RegisterFormData = {
  companyName: string; adminName: string; email: string;
  password: string; confirmPassword: string;
};

const TRUST_ITEMS = [
  { icon: Shield, text: 'Tenant-isolated records for every business account' },
  { icon: Building2, text: 'A dedicated workspace created during onboarding' },
  { icon: LockKeyhole, text: 'Secure sign-in and owner-scoped business data' },
];

const FLOW_STEPS = [
  { step: 1, label: 'Create Account', active: true },
  { step: 2, label: 'Verify Email', active: false },
  { step: 3, label: 'Select Plan', active: false },
  { step: 4, label: 'Dashboard', active: false },
];

const WORKFLOW_FEATURES = [
  { icon: FileSearch, label: 'Source-linked report review' },
  { icon: ClipboardCheck, label: 'Verified facts and human approval' },
  { icon: Sparkles, label: 'Traceable responses and outcomes' },
];

export default function AuthForm({ defaultTab }: { defaultTab?: 'login' | 'register' | 'forgot' }) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const planFromUrl = searchParams.get('plan') || 'starter';
  const isPersonalPlan = planFromUrl === 'starter';
  const tabFromUrl = searchParams.get('tab') || defaultTab || 'login';
  const redirectTo = searchParams.get('redirect') || '';

  useEffect(() => {
    if (tabFromUrl === 'register') setTab('register');
  }, [tabFromUrl]);

  useEffect(() => {
    let cancelled = false;
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session) { setSessionChecked(true); return; }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subscription_status, subscription_plan, onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (cancelled) return;

        const activeStatuses = ['trialing', 'active', 'trial_active'];
        if (profile && activeStatuses.includes(profile.subscription_status || '')) {
          if (!profile.onboarding_completed) {
            router.replace('/onboarding');
          } else {
            router.replace(redirectTo || '/dashboard');
          }
        } else {
          router.replace(`/checkout?plan=${planFromUrl}`);
        }
      } catch (err) {
        console.error('[AuthForm] checkSession error:', err);
        if (!cancelled) setSessionChecked(true);
      }
    };
    checkSession();
    return () => { cancelled = true; };
  }, []);

  const loginForm = useForm<LoginFormData>({ defaultValues: { email: '', password: '', remember: false } });
  const registerForm = useForm<RegisterFormData>({ defaultValues: { companyName: '', adminName: '', email: '', password: '', confirmPassword: '' } });

  const handleLoginSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subscription_status, onboarding_completed')
          .eq('id', session.user.id)
          .single();
        const activeStatuses = ['trialing', 'active', 'trial_active'];
        if (profile && activeStatuses.includes(profile.subscription_status || '')) {
          if (!profile.onboarding_completed) {
            router.push('/onboarding');
          } else {
            router.push(redirectTo || '/dashboard');
          }
        } else {
          router.push(`/checkout?plan=${planFromUrl}`);
        }
      } else {
        router.push(redirectTo || '/dashboard');
      }
    } catch (error: any) {
      console.error('[AuthForm] Login error:', error);
      loginForm.setError('email', { message: error?.message || 'Invalid email or password. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      registerForm.setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(data.email, data.password, {
        fullName: data.adminName,
        companyName: data.companyName.trim() || `${data.adminName.trim()}'s Workspace`,
        plan: planFromUrl,
      });

      if (result?.user && result.user.identities && result.user.identities.length === 0) {
        registerForm.setError('email', { message: 'An account with this email already exists. Please sign in.' });
        setLoading(false);
        return;
      }

      const needsEmailConfirmation = result?.user && !result.user.email_confirmed_at && !result.session;

      trackEvent('sign_up', {
        method: 'email',
        plan_name: planFromUrl,
        email_confirmation_required: Boolean(needsEmailConfirmation),
      });

      if (needsEmailConfirmation) {
        setRegisteredEmail(data.email);
        setVerifyEmailSent(true);
        toast.success('Account created! Please check your email to verify your address.');
      } else {
        toast.success('Account created! Now start your 14-day trial for $1.');
        router.push(`/checkout?plan=${planFromUrl}`);
      }
    } catch (error: any) {
      console.error('[AuthForm] Register error:', error);
      let message = 'Unable to create account. Please contact support.';
      if (error?.message) {
        if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists') || error.message.toLowerCase().includes('user already')) {
          message = 'An account with this email already exists. Please sign in.';
        } else if (error.message.toLowerCase().includes('invalid email') || error.message.toLowerCase().includes('email')) {
          message = 'Please enter a valid email address.';
        } else if (error.message.toLowerCase().includes('password')) {
          message = error.message;
        } else if (!error.message.includes('is not a function') && !error.message.match(/^[A-Z] is not a function/)) {
          message = error.message;
        }
      }
      registerForm.setError('email', { message });
    } finally {
      setLoading(false);
    }
  };

  // Email verification pending screen
  if (verifyEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md text-center bg-white rounded-3xl border border-slate-200 shadow-sm p-10">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
            <Mail size={28} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Check your email</h1>
          <p className="text-slate-500 mb-2 text-sm">We sent a verification link to:</p>
          <p className="font-bold text-slate-900 mb-6">{registeredEmail}</p>
          {/* Flow progress */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {FLOW_STEPS.map((s, i) => (
              <React.Fragment key={s.step}>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${s.step <= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${s.step <= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {s.step <= 1 ? <CheckCircle2 size={12} /> : s.step}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < FLOW_STEPS.length - 1 && <div className={`w-6 h-px ${s.step < 2 ? 'bg-blue-300' : 'bg-slate-200'}`} />}
              </React.Fragment>
            ))}
          </div>
          <p className="text-sm text-slate-500 mb-8">
            Click the link in the email to verify your account. After verifying, you&apos;ll be taken to select your plan and start your 14-day trial for $1.
          </p>
          <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-500 mb-6">
            <p className="font-semibold text-slate-700 mb-1">Didn&apos;t receive the email?</p>
            <p>Check your spam folder, or{' '}
              <button type="button" className="text-blue-600 hover:underline font-medium" onClick={() => { setVerifyEmailSent(false); setRegisteredEmail(''); }}>
                try a different email address
              </button>
            </p>
          </div>
          <button type="button" onClick={() => router.push(`/checkout?plan=${planFromUrl}`)} className="text-sm text-blue-600 hover:underline">
            Already verified? Continue to plan selection →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* ── LEFT BRAND PANEL ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex-col justify-between p-10 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute bottom-32 right-8 w-48 h-48 rounded-full bg-violet-600/10 blur-2xl" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-blue-500/5 blur-xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <AppLogo size={40} />
            <span className="text-white font-bold text-xl tracking-tight">FixMy.Money</span>
          </Link>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Sparkles size={12} />
            Evidence-First Agency Platform
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Run Your Credit Repair<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Business Securely.
            </span>
          </h2>
          <p className="text-slate-300 text-base leading-relaxed mb-8">
            Manage clients, review reports, print dispute letters, track paper mail, and run billing in one private workspace.
          </p>
          {/* Workflow Features */}
          <div className="space-y-3 mb-8">
            {WORKFLOW_FEATURES.map(feat => {
              const FeatIcon = feat.icon;
              return (
                <div key={feat.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <FeatIcon size={15} className="text-blue-300" />
                  </div>
                  <p className="text-blue-100 text-sm font-medium">{feat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          {TRUST_ITEMS.map(item => {
            const ItemIcon = item.icon;
            return (
              <div key={item.text.slice(0, 20)} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <ItemIcon size={15} className="text-white" />
                </div>
                <p className="text-slate-300 text-sm">{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-16 bg-slate-50">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <AppLogo size={32} />
            <span className="font-bold text-slate-900 text-lg">FixMy.Money</span>
          </div>

          {/* Signup flow progress (register tab only) */}
          {tab === 'register' && (
            <div className="flex items-center gap-2 mb-8">
              {FLOW_STEPS.map((s, i) => (
                <React.Fragment key={s.step}>
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${s.step === 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${s.step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {s.step}
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < FLOW_STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 mb-8 shadow-sm">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'login' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === 'register' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Create Account
            </button>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
                <p className="text-sm text-slate-500">Sign in to your FixMy.Money workspace</p>
              </div>
              <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="label-text">Email address</label>
                  <input
                    id="login-email"
                    {...loginForm.register('email', { required: 'Email is required' })}
                    type="email"
                    placeholder="you@company.com"
                    className="input-field"
                    autoComplete="email"
                    required
                  />
                  {loginForm.formState.errors.email && (
                    <p className="error-text">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="login-password" className="label-text">Password</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      {...loginForm.register('password', { required: 'Password is required' })}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="input-field pr-10"
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass} onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="error-text">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 flex items-center justify-center gap-2 rounded-xl"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
              <p className="text-center text-sm text-slate-500 mt-6">
                Don&apos;t have an account?{' '}
                <button onClick={() => setTab('register')} className="text-blue-600 font-semibold hover:underline">
                  Create one free
                </button>
              </p>
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
                <p className="text-sm text-slate-500">Start your 14-day trial for $1 — full access, payment method required</p>
              </div>
              <form onSubmit={registerForm.handleSubmit(handleRegisterSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="register-name" className="label-text">Your Name</label>
                    <input
                      id="register-name"
                      {...registerForm.register('adminName', { required: 'Name is required' })}
                      type="text"
                      placeholder="John Smith"
                      className="input-field"
                      autoComplete="name"
                      required
                    />
                    {registerForm.formState.errors.adminName && (
                      <p className="error-text">{registerForm.formState.errors.adminName.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="register-company" className="label-text">{isPersonalPlan ? 'Workspace Name (optional)' : 'Company Name'}</label>
                    <input
                      id="register-company"
                      {...registerForm.register('companyName', { required: isPersonalPlan ? false : 'Company name is required' })}
                      type="text"
                      placeholder={isPersonalPlan ? 'My Credit Workspace' : 'My Credit Co.'}
                      className="input-field"
                      autoComplete="organization"
                      required={!isPersonalPlan}
                    />
                    {registerForm.formState.errors.companyName && (
                      <p className="error-text">{registerForm.formState.errors.companyName.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="register-email" className="label-text">Email address</label>
                  <input
                    id="register-email"
                    {...registerForm.register('email', { required: 'Email is required' })}
                    type="email"
                    placeholder="you@company.com"
                    className="input-field"
                    autoComplete="email"
                    required
                  />
                  {registerForm.formState.errors.email && (
                    <p className="error-text">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="register-password" className="label-text">Password</label>
                  <div className="relative">
                    <input
                      id="register-password"
                      {...registerForm.register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      className="input-field pr-10"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                    <button type="button" aria-label={showPass ? 'Hide password' : 'Show password'} aria-pressed={showPass} onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="error-text">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="register-confirm-password" className="label-text">Confirm Password</label>
                  <div className="relative">
                    <input
                      id="register-confirm-password"
                      {...registerForm.register('confirmPassword', { required: 'Please confirm your password' })}
                      type={showConfirmPass ? 'text' : 'password'}
                      placeholder="Repeat password"
                      className="input-field pr-10"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                    <button type="button" aria-label={showConfirmPass ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirmPass} onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="error-text">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                {/* Trust badges */}
                <div className="flex flex-wrap gap-3 py-1">
                  {['14-Day $1 Trial', 'Cancel Anytime', 'No Setup Fees'].map(badge => (
                    <div key={badge} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      {badge}
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 rounded-xl text-base"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {loading ? 'Creating account...' : 'Create Account — Start $1 Trial'}
                </button>
                <p className="text-xs text-slate-400 text-center">
                  By creating an account, you agree to our{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
                </p>
              </form>
              <p className="text-center text-sm text-slate-500 mt-4">
                Already have an account?{' '}
                <button onClick={() => setTab('login')} className="text-blue-600 font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
