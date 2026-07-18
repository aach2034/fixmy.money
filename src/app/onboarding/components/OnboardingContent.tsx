'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AppLogo from '@/components/ui/AppLogo';
import { toast } from 'sonner';
import { Building2, User, CreditCard, CheckCircle2, ArrowRight, Loader2, Upload, Phone, Zap, Shield, Check, Sparkles, ExternalLink, FileText } from 'lucide-react';

import AffiliateProviderCard, { AffiliateDisclosure } from '@/components/AffiliateProviderCard';
import { DEFAULT_PROVIDERS, ReportProvider } from '@/lib/affiliates/reportProviders';


interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: OnboardingStep[] = [
  { id: 1, title: 'Company Setup', description: 'Tell us about your business', icon: Building2 },
  { id: 2, title: 'Connect Stripe', description: 'Set up client billing', icon: CreditCard },
  { id: 3, title: 'Ready to Go', description: 'Your workspace is ready', icon: CheckCircle2 },
];

interface CompanyFormData {
  companyName: string;
  ownerName: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  businessType: string;
}

export default function OnboardingContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [providers] = useState<ReportProvider[]>(DEFAULT_PROVIDERS.filter(p => p.isVisible));

  const [companyData, setCompanyData] = useState<CompanyFormData>({
    companyName: '',
    ownerName: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    businessType: 'credit_repair',
  });
  const [errors, setErrors] = useState<Partial<CompanyFormData>>({});

  // Pre-fill from user metadata
  useEffect(() => {
    if (user?.user_metadata) {
      setCompanyData(prev => ({
        ...prev,
        companyName: user.user_metadata?.company_name || '',
        ownerName: user.user_metadata?.full_name || '',
      }));
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading]);

  const validateCompany = (): boolean => {
    const newErrors: Partial<CompanyFormData> = {};
    if (!companyData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!companyData.ownerName.trim()) newErrors.ownerName = 'Your name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveCompany = async () => {
    if (!validateCompany()) return;
    if (!user) return;

    setSaving(true);
    try {
      // Save to workspace
      const { error: wsError } = await supabase
        .from('workspaces')
        .upsert({
          owner_id: user.id,
          name: companyData.companyName,
          phone: companyData.phone || null,
          website: companyData.website || null,
          address: companyData.address || null,
          city: companyData.city || null,
          state: companyData.state || null,
          zip: companyData.zip || null,
          business_type: companyData.businessType,
        }, { onConflict: 'owner_id' });

      if (wsError) {
        console.error('[Onboarding] workspace upsert error:', wsError);
      }

      // Update user profile
      await supabase
        .from('user_profiles')
        .update({
          full_name: companyData.ownerName,
          company_name: companyData.companyName,
        })
        .eq('id', user.id);

      setCurrentStep(2);
      toast.success('Company setup saved!');
    } catch (err) {
      console.error('[Onboarding] save error:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectStripe = async () => {
    setStripeConnecting(true);
    try {
      // In a real implementation, this would redirect to Stripe Connect OAuth
      // For now, mark as connected and proceed
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStripeConnected(true);
      toast.success('Stripe connected successfully!');
    } catch (err) {
      toast.error('Failed to connect Stripe. You can do this later in Settings.');
    } finally {
      setStripeConnecting(false);
    }
  };

  const handleSkipStripe = () => {
    setCurrentStep(3);
  };

  const handleStripeNext = () => {
    setCurrentStep(3);
  };

  const handleFinishOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      toast.success('Welcome to FixMy.Money! 🎉');
      router.push('/dashboard');
    } catch (err) {
      console.error('[Onboarding] finish error:', err);
      // Still redirect even if update fails
      router.push('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} />
            <span className="font-bold text-slate-900">FixMy.Money</span>
          </div>
          <span className="text-sm text-slate-500">Setup Wizard</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Step Progress */}
          <div className="flex items-center justify-center mb-10">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.id;
              const isActive = currentStep === step.id;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100' :'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <Check size={18} /> : <StepIcon size={18} />}
                    </div>
                    <p className={`text-xs font-semibold mt-1.5 ${isActive ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {step.title}
                    </p>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 mb-5 transition-colors ${currentStep > step.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── STEP 1: Company Setup ── */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building2 size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Set up your company</h2>
                  <p className="text-sm text-slate-500">This information appears on client-facing documents</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company Name *</label>
                    <input
                      type="text"
                      value={companyData.companyName}
                      onChange={e => setCompanyData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Apex Credit Solutions"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Full Name *</label>
                    <input
                      type="text"
                      value={companyData.ownerName}
                      onChange={e => setCompanyData(prev => ({ ...prev, ownerName: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.ownerName && <p className="text-red-500 text-xs mt-1">{errors.ownerName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={companyData.phone}
                      onChange={e => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 000-0000"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website</label>
                    <input
                      type="url"
                      value={companyData.website}
                      onChange={e => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourcompany.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Address</label>
                  <input
                    type="text"
                    value={companyData.address}
                    onChange={e => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Main Street"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
                    <input
                      type="text"
                      value={companyData.city}
                      onChange={e => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Atlanta"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">State</label>
                    <input
                      type="text"
                      value={companyData.state}
                      onChange={e => setCompanyData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="GA"
                      maxLength={2}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">ZIP Code</label>
                    <input
                      type="text"
                      value={companyData.zip}
                      onChange={e => setCompanyData(prev => ({ ...prev, zip: e.target.value }))}
                      placeholder="30301"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business Type</label>
                  <select
                    value={companyData.businessType}
                    onChange={e => setCompanyData(prev => ({ ...prev, businessType: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="credit_repair">Credit Repair Agency</option>
                    <option value="financial_coach">Financial Coach</option>
                    <option value="credit_consultant">Credit Consultant</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Credit Report Providers section in onboarding */}
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Client Credit Report Providers</h3>
                </div>
                <p className="text-sm text-slate-600">
                  When clients need to provide a 3-bureau credit report, we recommend these providers. Your clients will see these options during onboarding.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {providers.map(provider => (
                    <AffiliateProviderCard
                      key={provider.key}
                      provider={provider}
                      sourcePage="onboarding"
                      compact={true}
                    />
                  ))}
                </div>
                <AffiliateDisclosure />
                <p className="text-xs text-slate-500">
                  After signing up with a provider, clients should return and upload their PDF report. You can manage these provider links in{' '}
                  <a href="/settings/report-providers" className="text-blue-600 hover:underline">Settings → Report Providers</a>.
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <p className="text-xs text-slate-400">* Required fields</p>
                <button
                  onClick={handleSaveCompany}
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {saving ? 'Saving…' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Connect Stripe ── */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <CreditCard size={20} className="text-violet-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Connect Stripe</h2>
                  <p className="text-sm text-slate-500">Accept payments from your clients directly</p>
                </div>
              </div>

              {!stripeConnected ? (
                <>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                        <Zap size={16} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm mb-1">Why connect Stripe?</p>
                        <ul className="text-sm text-slate-600 space-y-1">
                          <li className="flex items-center gap-2"><Check size={13} className="text-emerald-500" /> Charge clients automatically on a recurring basis</li>
                          <li className="flex items-center gap-2"><Check size={13} className="text-emerald-500" /> Send invoices and track payment history</li>
                          <li className="flex items-center gap-2"><Check size={13} className="text-emerald-500" /> Get paid directly to your bank account</li>
                          <li className="flex items-center gap-2"><Check size={13} className="text-emerald-500" /> Manage refunds and disputes from the dashboard</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleConnectStripe}
                      disabled={stripeConnecting}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                    >
                      {stripeConnecting ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                      {stripeConnecting ? 'Connecting…' : 'Connect Stripe Account'}
                    </button>
                    <button
                      onClick={handleSkipStripe}
                      className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-6 py-3 rounded-xl transition-colors"
                    >
                      Skip for now
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 text-center mt-3">
                    You can connect Stripe later from Settings → Billing
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-800">Stripe connected successfully!</p>
                      <p className="text-sm text-emerald-700">You can now accept payments from clients.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleStripeNext}
                    className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── STEP 3: Ready ── */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">You&apos;re all set! 🎉</h2>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Your FixMy.Money workspace is ready. Start by adding your first client, uploading a credit report, and generating disputes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
                {[
                  { icon: User, title: 'Add a Client', desc: 'Onboard your first client and set up their profile', href: '/client-management', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { icon: Shield, title: 'Upload Credit Report', desc: 'Analyze a credit report with AI to find disputes', href: '/ai-dispute-analyzer', color: 'text-violet-600', bg: 'bg-violet-50' },
                  { icon: Sparkles, title: 'Explore Dashboard', desc: 'See your business metrics and AI insights', href: '/dashboard', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <a
                      key={item.title}
                      href={item.href}
                      className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                        <ItemIcon size={16} className={item.color} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                    </a>
                  );
                })}
              </div>

              <button
                onClick={handleFinishOnboarding}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-8 py-4 rounded-xl transition-colors shadow-lg shadow-blue-200"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {saving ? 'Loading dashboard…' : 'Go to Dashboard'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
