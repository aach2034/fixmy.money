import type { Metadata } from 'next';
import Link from 'next/link';
import { XCircle, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cancellation Policy | FixMy.Money',
  description: 'Cancellation policy for FixMy.Money credit repair software. Learn how to cancel your subscription and what happens to your data.',
  alternates: { canonical: 'https://fixmy.money/cancellation-policy' },
};

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Back to FixMy.Money
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <XCircle size={20} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Cancellation Policy</h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">Last updated: June 2026</p>
        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <h2 className="text-lg font-bold text-slate-900">How to Cancel</h2>
          <p className="text-slate-600">You may cancel your FixMy.Money subscription at any time from your account billing settings. No phone call or email required. Cancellation takes effect at the end of your current billing period.</p>

          <h2 className="text-lg font-bold text-slate-900">Access After Cancellation</h2>
          <p className="text-slate-600">You will retain full access to the platform until the end of your current billing period. After that, your account will be downgraded and you will no longer be able to access paid features.</p>

          <h2 className="text-lg font-bold text-slate-900">Data After Cancellation</h2>
          <p className="text-slate-600">Your data is retained for 30 days after cancellation. During this period, you may export your data or reactivate your subscription. After 30 days, your data may be permanently deleted. To request immediate data deletion, contact support@fixmy.money.</p>

          <h2 className="text-lg font-bold text-slate-900">Trial Cancellation</h2>
          <p className="text-slate-600">If you cancel during your trial period, you will not be charged the full subscription amount. The trial charge (if applicable) is non-refundable. See our <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link> for details.</p>

          <h2 className="text-lg font-bold text-slate-900">No Cancellation Fees</h2>
          <p className="text-slate-600">There are no cancellation fees or penalties. You can cancel at any time without additional charges beyond your current billing period.</p>

          <h2 className="text-lg font-bold text-slate-900">Reactivation</h2>
          <p className="text-slate-600">You may reactivate your subscription at any time by logging in and selecting a plan. If your data has not been deleted, it will be restored upon reactivation.</p>

          <h2 className="text-lg font-bold text-slate-900">Contact</h2>
          <p className="text-slate-600">For cancellation assistance, contact <a href="mailto:support@fixmy.money" className="text-blue-600 hover:underline">support@fixmy.money</a>.</p>
        </div>

        <div className="mt-10 bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Related: <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link> · <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> · <Link href="/contact" className="text-blue-600 hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
