import Link from 'next/link';
import ReopeningWaitlistForm from '@/components/ReopeningWaitlistForm';

export default function ReopeningNotice({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? 'h1' : 'h2';

  return (
    <div className={standalone ? 'premium-public min-h-screen bg-[#f5f9f7] px-5 py-16 text-[#0b1742]' : ''}>
      <section id="reopening-list" className={standalone ? 'mx-auto max-w-5xl' : 'scroll-mt-28'}>
        <div className="relative overflow-hidden rounded-[32px] border border-[#b9d7c9] bg-white shadow-[0_30px_90px_rgba(12,43,34,.18)] ring-1 ring-[#dcebe3]">
          <div className="grid lg:grid-cols-[1.08fr_.92fr]">
            <div className="relative isolate flex min-h-[460px] flex-col justify-between overflow-hidden bg-[#0b1742] p-7 text-white sm:p-10 lg:min-h-[540px] lg:p-12">
              <div
                aria-hidden="true"
                className="absolute inset-0 z-0 bg-cover bg-bottom"
                style={{ backgroundImage: "linear-gradient(90deg, rgba(7, 22, 49, .98) 0%, rgba(7, 22, 49, .91) 57%, rgba(7, 22, 49, .48) 100%), url('/assets/images/reopening-workspace.webp')" }}
              />
              <div className="relative z-10">
                <p className="inline-flex rounded-full border border-[#8bdcbb]/50 bg-[#66d6ac]/15 px-4 py-2 text-xs font-extrabold uppercase tracking-[.14em] text-[#b5f1d3]">Reopening · October 25, 2026</p>
                <Heading className="mt-7 max-w-[590px] text-balance text-4xl font-extrabold leading-[1.04] tracking-[-.055em] sm:text-5xl">Reserve your first month free</Heading>
                <p className="mt-6 max-w-lg text-base leading-7 text-[#e2f0eb]">Join the reopening list and we’ll let you know when new accounts become available. Activate after reopening to receive one full month of FixMy.Money free.</p>
              </div>
              <div className="relative z-10 mt-9 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-sm font-bold text-white">No payment today</span>
                <span className="rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-sm font-bold text-white">No account created</span>
              </div>
            </div>
            <div className="brand-grid flex items-center border-t border-[#cfe0d8] bg-[#edf7f2] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div className="w-full rounded-[24px] border border-[#bad8c9] bg-white p-6 shadow-[0_22px_55px_rgba(12,43,34,.14)] sm:p-8">
                <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#267a31]">Get on the list</p>
                <h3 className="mt-3 text-2xl font-extrabold tracking-[-.04em] text-[#17211e]">Save your spot</h3>
                <p className="mb-6 mt-2 text-sm leading-6 text-[#53635c]">Enter your email to get reopening updates and reserve your free month.</p>
                <ReopeningWaitlistForm />
                <Link href="/login" className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-[#245e35] underline decoration-[#9bc9ae] underline-offset-4 hover:text-[#19322b]">Already a customer? SIGN IN</Link>
              </div>
            </div>
          </div>
          <aside aria-labelledby="offer-eligibility-heading" className="border-t border-[#d7e5de] bg-[#f8fbf9] px-7 py-6 sm:px-10">
            <h3 id="offer-eligibility-heading" className="text-sm font-extrabold text-[#19322b]">Offer eligibility</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#53635c]">The one-month reopening offer is for new customers. Existing customers retain access to authorized accounts. Separately authorized pilot participation and its six-month offer are unchanged; joining this list does not change existing billing or pilot eligibility.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
