import type { Metadata } from 'next';
import Link from 'next/link';
import PublicFooter from '@/components/marketing/PublicFooter';

export const metadata: Metadata = {
  title: 'FixMy Credit | Individual Credit Software',
  description: 'FixMy Credit is the $39 monthly individual software plan. New enrollment is not yet available; existing subscriptions remain supported.',
  robots: { index: false, follow: true },
};

export default function IndividualsPage() {
  return (
    <>
      <section className="mx-auto max-w-2xl px-6 py-20 text-slate-900">
        <h1 className="text-3xl font-bold">FixMy Credit · $39 per month</h1>
        <p className="mt-6 leading-7">FixMy Credit is the individual software plan for people managing their own credit information. New enrollment and billing are not yet available. We will not collect payment or imply that the offer is available before its requirements are satisfied.</p>
        <p className="mt-4 leading-7">Already have an individual account? Your subscription, access, and support are unchanged. You have not been moved to a business plan.</p>
        <nav className="mt-8 flex flex-wrap gap-6 font-semibold text-blue-700" aria-label="Next steps">
          <Link href="/login" className="underline">Sign in to an existing account</Link>
          <Link href="/pricing" className="underline">Compare all plans</Link>
          <Link href="/contact" className="underline">Contact support</Link>
        </nav>
      </section>
      <PublicFooter />
    </>
  );
}
