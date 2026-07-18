'use client';
import React, { useState } from 'react';
import { X, Shield, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface CheckoutModalProps {
  plan: 'starter' | 'professional' | 'agency';
  planName: string;
  planPrice: number;
  onClose: () => void;
}

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Up to 50 active clients', 'Client portal', 'Dispute management', 'Automated reminders', 'Email support'],
  professional: ['Up to 100 active clients', 'AI analysis tools', 'Revenue Dashboard', 'Workflow automation', 'Priority Support'],
  agency: ['Unlimited clients', 'White Label Portal', 'Custom Branding', 'API Access', 'Dedicated Success Manager'],
};

export default function CheckoutModal({ plan, planName, planPrice, onClose }: CheckoutModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email, name }),
      });

      const data = await res.json();

      if (res.status === 503) {
        setError('Our payment system is temporarily unavailable. Please try again later or contact support.');
        setLoading(false);
        return;
      }

      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Could not start checkout. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,37,64,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
        {/* Header */}
        <div className="px-7 pt-7 pb-5" style={{ background: '#0A2540' }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} className="text-white/70" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(0,193,106,0.2)', color: '#00C16A' }}>
              14-Day Trial
            </div>
            <span className="text-white/50 text-xs">·</span>
            <span className="text-white/50 text-xs">Cancel anytime</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{planName} Plan — 14-day trial for $1</h2>
          <p className="text-sm text-blue-100/60">Full access for 14 days, then ${planPrice}/month</p>
        </div>

        {/* Features */}
        <div className="px-7 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">What's included</p>
          <div className="grid grid-cols-1 gap-1.5">
            {PLAN_FEATURES[plan]?.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 size={14} style={{ color: '#00C16A' }} className="shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleStartTrial} className="px-7 py-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address <span className="text-red-400">*</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: '#00C16A' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Redirecting to secure checkout…
              </>
            ) : (
              'Start My $1 Trial →'
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Shield size={12} />
            <span>Secured by Stripe · No charges until trial ends</span>
          </div>
        </form>
      </div>
    </div>
  );
}
