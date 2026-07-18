import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | FixMy.Money',
  description: 'Terms of Service for FixMy.Money credit repair business software. Read our platform use terms, compliance responsibilities, and billing policies.',
  alternates: { canonical: 'https://fixmy.money/terms' },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-8">
          <ArrowLeft size={16} /> Back to FixMy.Money
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText size={20} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Terms of Service</h1>
        </div>
        <p className="text-sm text-slate-500 mb-8">Last updated: June 2026</p>
        <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-6">
          <p className="text-slate-600">By accessing or using FixMy.Money, you agree to be bound by these Terms of Service. Please read them carefully.</p>

          <h2 className="text-lg font-bold text-slate-900">1. Platform Use</h2>
          <p className="text-slate-600">FixMy.Money provides business software tools for credit repair professionals. You are solely responsible for how you use the platform and for ensuring your business practices comply with all applicable laws, including the Credit Repair Organizations Act (CROA), Fair Credit Reporting Act (FCRA), Telemarketing Sales Rule (TSR), and all applicable state regulations.</p>

          <h2 className="text-lg font-bold text-slate-900">2. Not a Credit Repair Organization</h2>
          <p className="text-slate-600">FixMy.Money is a software platform. We do not provide consumer credit repair services. We do not dispute items on behalf of consumers. Users of this platform are responsible for their own client relationships, contracts, disclosures, and service delivery.</p>

          <h2 className="text-lg font-bold text-slate-900">3. No Legal Advice</h2>
          <p className="text-slate-600">FixMy.Money is not a law firm and does not provide legal advice. Nothing on this platform constitutes legal counsel. Users are responsible for their own contracts, disclosures, fees, client communications, and legal compliance. Consult a qualified attorney for legal guidance specific to your business.</p>

          <h2 className="text-lg font-bold text-slate-900">4. No Guaranteed Results</h2>
          <p className="text-slate-600">FixMy.Money does not guarantee credit score improvements, item removals, or any specific credit outcomes. Results depend on individual circumstances, bureau responses, and the accuracy of information on credit reports. Users must not make such guarantees to their own clients.</p>

          <h2 className="text-lg font-bold text-slate-900">5. Subscriptions and Billing</h2>
          <p className="text-slate-600">Subscriptions are billed monthly. You may cancel at any time from your billing settings. Trial periods are subject to the terms presented at signup. Payments are processed securely by Stripe. Subscription fees are generally non-refundable except as described in our Refund Policy.</p>

          <h2 className="text-lg font-bold text-slate-900">6. Acceptable Use</h2>
          <p className="text-slate-600">You agree not to use FixMy.Money for any unlawful purpose, to violate any regulations, to misrepresent your services to clients, or to make false or misleading claims about credit repair outcomes. Violation of these terms may result in account termination without refund.</p>

          <h2 className="text-lg font-bold text-slate-900">7. Data and Privacy</h2>
          <p className="text-slate-600">Your use of the platform is also governed by our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>. You are responsible for obtaining appropriate consent from your clients before uploading their data to the platform.</p>

          <h2 className="text-lg font-bold text-slate-900">8. Modifications</h2>
          <p className="text-slate-600">We reserve the right to modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the updated Terms.</p>

          <h2 className="text-lg font-bold text-slate-900">9. Contact</h2>
          <p className="text-slate-600">For questions about these terms, contact <a href="mailto:support@fixmy.money" className="text-blue-600 hover:underline">support@fixmy.money</a>.</p>
        </div>

        <div className="mt-10 bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Related: <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> · <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link> · <Link href="/cancellation-policy" className="text-blue-600 hover:underline">Cancellation Policy</Link> · <Link href="/compliance" className="text-blue-600 hover:underline">Compliance Information</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
