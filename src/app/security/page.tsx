import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security | FixMy.Money',
  description: 'How FixMy.Money protects authenticated, workspace-scoped customer data.',
};

const CONTAINMENT_CONTROLS = [
  'Database row-level security and application authorization scope records to the selected workspace.',
  'Client documents use private, workspace-scoped storage and server-authorized operations.',
  'Administrative access requires a verified administrator role and step-up authentication.',
  'Raw credit-report files are not sent to external AI providers.',
  'The generic AI proxy is disabled and fails closed.',
  'Automatic purchase restoration is permanently removed and cannot change entitlement.',
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="border-b border-slate-100 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="font-bold">FixMy.Money</Link>
          <Link href="/contact" className="text-sm font-semibold text-blue-600">Contact support</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-blue-600">
          <ArrowLeft size={16} /> Back to FixMy.Money
        </Link>

        <div className="flex items-center gap-3">
          <Shield className="text-blue-600" size={34} />
          <div>
            <h1 className="text-3xl font-extrabold">Security and data protection</h1>
            <p className="mt-1 text-sm text-slate-500">Current status as of September 21, 2026</p>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold">Active controls</h2>
          <ul className="mt-5 space-y-3">
            {CONTAINMENT_CONTROLS.map(control => (
              <li key={control} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-1 shrink-0 text-emerald-600" size={16} />
                {control}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 p-6">
          <h2 className="text-xl font-bold">Service providers currently in use</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Supabase provides database and authentication infrastructure. Stripe processes FixMy.Money subscription checkout and billing. Google Analytics may process product-usage analytics when enabled. External AI processing of credit-report files is disabled during containment.
          </p>
        </section>
      </section>
    </div>
  );
}
