import Link from 'next/link';
import ReopeningWaitlistForm from '@/components/ReopeningWaitlistForm';

export default function ReopeningNotice({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? 'h1' : 'h2';

  return (
    <div className={standalone ? 'premium-public min-h-screen bg-[#f5f9f7] px-5 py-16 text-[#0b1742]' : ''}>
      <section id="reopening-list" className={standalone ? 'mx-auto max-w-5xl' : 'scroll-mt-24'}>
        <div className="relative overflow-hidden rounded-[32px] border border-[#c9ddd4] bg-white shadow-[0_28px_80px_rgba(12,43,34,.11)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#267a31] via-[#71d1a2] to-[#267a31]" aria-hidden="true" />
          <div className="grid md:grid-cols-[1.08fr_.92fr]">
            <div className="p-7 md:p-10 lg:p-12">
              <p className="inline-flex rounded-full border border-[#c6dfd4] bg-[#f2f9f5] px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-[#236b2e]">Reopening · October 25, 2026</p>
              <Heading className="mt-5 text-4xl font-extrabold tracking-[-.05em] text-[#151a18] sm:text-5xl">Reserve your first month free</Heading>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#53635c]">Join the reopening list and we’ll let you know when new accounts become available. Activate after reopening to receive one full month of FixMy.Money free.</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#eaf7f0] px-3 py-2 text-sm font-bold text-[#245e35]">No payment today</span>
                <span className="rounded-full bg-[#f2f5f3] px-3 py-2 text-sm font-bold text-[#4a5d54]">No account created</span>
              </div>
              <Link href="/login" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-[#b8cac1] px-5 py-3 text-sm font-extrabold text-[#19322b] transition hover:-translate-y-0.5 hover:bg-[#f1f5f3]">Existing customer sign in</Link>
            </div>
            <div className="brand-grid flex items-center border-t border-[#cfe0d8] bg-[#edf7f2] p-6 md:border-l md:border-t-0 md:p-8 lg:p-10">
              <div className="w-full rounded-2xl border border-[#bfd8cc] bg-white p-6 shadow-[0_20px_50px_rgba(12,43,34,.1)]">
                <p className="mb-5 text-xs font-extrabold uppercase tracking-[.14em] text-[#236b2e]">Reserve my free month</p>
                <ReopeningWaitlistForm />
              </div>
            </div>
          </div>
          <aside aria-labelledby="offer-eligibility-heading" className="border-t border-[#d7e5de] bg-[#f8fbf9] px-7 py-6 md:px-10 lg:px-12">
            <h3 id="offer-eligibility-heading" className="text-sm font-extrabold text-[#19322b]">Offer eligibility</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#53635c]">The one-month reopening offer is for new customers. Existing customers retain access to authorized accounts. Separately authorized pilot participation and its six-month offer are unchanged; joining this list does not change existing billing or pilot eligibility.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
