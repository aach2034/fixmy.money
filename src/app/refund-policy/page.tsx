import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund Policy | FixMy.Money',
  description: 'Refund policy for FixMy.Money credit repair software. Learn about our trial terms, subscription refunds, and billing policies.',
  alternates: { canonical: 'https://fixmy.money/refund-policy' },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Back to FixMy.Money
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <CreditCard size={20} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Refund Policy</h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">Last updated: June 2026</p>
        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <h2 className="text-lg font-bold text-slate-900">Trial Period</h2>
          <p className="text-slate-600">All plans include a trial period. You may cancel at any time during the trial and will not be charged the full subscription amount. Any trial charges are non-refundable.</p>

          <h2 className="text-lg font-bold text-slate-900">Subscription Refunds</h2>
          <p className="text-slate-600">Subscription fees are generally non-refundable. If you believe you were charged in error, contact us within 7 days at <a href="mailto:support@fixmy.money" className="text-blue-600 hover:underline">support@fixmy.money</a> and we will review your case.</p>

          <h2 className="text-lg font-bold text-slate-900">Cancellation</h2>
          <p className="text-slate-600">You may cancel your subscription at any time from your account billing settings. Cancellation takes effect at the end of your current billing period. You will retain access to the platform until the period ends. See our <Link href="/cancellation-policy" className="text-blue-600 hover:underline">Cancellation Policy</Link> for full details.</p>

          <h2 className="text-lg font-bold text-slate-900">Disputed Charges</h2>
          <p className="text-slate-600">If you have a question about a charge, please contact us before initiating a chargeback. We are happy to review billing issues and resolve them directly. Contact <a href="mailto:support@fixmy.money" className="text-blue-600 hover:underline">support@fixmy.money</a>.</p>

          <h2 className="text-lg font-bold text-slate-900">Contact</h2>
          <p className="text-slate-600">For billing questions, contact <a href="mailto:support@fixmy.money" className="text-blue-600 hover:underline">support@fixmy.money</a>.</p>
        </div>

        <div className="mt-10 bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Related: <Link href="/cancellation-policy" className="text-blue-600 hover:underline">Cancellation Policy</Link> · <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> · <Link href="/contact" className="text-blue-600 hover:underline">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
