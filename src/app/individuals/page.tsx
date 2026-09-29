import type { Metadata } from 'next';
import Link from 'next/link';
import PublicFooter from '@/components/marketing/PublicFooter';

export const metadata: Metadata = {
  title: 'Personal subscriptions are no longer offered',
  description: 'FixMy.Money now offers business software. Existing Personal subscriptions and support remain unchanged.',
  robots: { index: false, follow: true },
};

export default function IndividualsPage() {
  return (
    <>
      <section className="mx-auto max-w-2xl px-6 py-20 text-slate-900">
        <h1 className="text-3xl font-bold">FixMy.Money is now business software.</h1>
        <p className="mt-6 leading-7">We no longer offer new Personal subscriptions for your own, friends’ or family members’ credit repair. Start and Grow are software plans for businesses managing client workflows.</p>
        <p className="mt-4 leading-7">Already have a Personal account? Your subscription, access, and support are unchanged by this announcement. You have not been moved to a business plan.</p>
        <nav className="mt-8 flex flex-wrap gap-6 font-semibold text-blue-700" aria-label="Next steps">
          <Link href="/login" className="underline">Sign in to an existing account</Link>
          <Link href="/professionals" className="underline">Explore business software</Link>
          <Link href="/contact" className="underline">Contact support</Link>
        </nav>
      </section>
      <PublicFooter />
    </>
  );
}
