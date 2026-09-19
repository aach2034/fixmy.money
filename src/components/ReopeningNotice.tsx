import Link from 'next/link';
import { Check, ChevronLeft, Feather, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react';
import ReopeningWaitlistForm from '@/components/ReopeningWaitlistForm';
import PublicBrandLink from '@/components/marketing/PublicBrandLink';

const bureauSummary = [
  { name: 'Experian', accounts: 12, open: 9, late: 0, collections: 0 },
  { name: 'Equifax', accounts: 11, open: 8, late: 1, collections: 0 },
  { name: 'TransUnion', accounts: 13, open: 10, late: 0, collections: 0 },
];

export default function ReopeningNotice({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? 'h1' : 'h2';
  return (
    <div className={standalone ? 'premium-public min-h-screen bg-white text-[#132440]' : 'text-[#132440]'}>
      {standalone && <header className="mx-auto flex max-w-[1420px] items-center justify-between gap-3 px-5 py-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6"><PublicBrandLink /><span className="hidden h-7 w-px bg-[#cbd6e4] sm:block" aria-hidden="true" /><Link href="/" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium hover:text-[#007f51]"><ChevronLeft className="size-5" aria-hidden="true" />Back to homepage</Link></div>
        <div className="hidden items-center gap-5 text-sm sm:flex"><span>Already a customer?</span><Link href="/login" className="font-bold text-[#007e50] underline underline-offset-2">Sign in</Link></div>
      </header>}
      <section id="reopening-list" className={standalone ? 'mx-auto max-w-[1260px] px-4 py-4 sm:px-6 lg:pt-5' : 'scroll-mt-8'} aria-labelledby="reopening-heading">
        <div className="grid overflow-hidden rounded-[14px] border border-[#dce5ef] bg-white shadow-[0_12px_28px_rgba(21,44,75,.07)] lg:grid-cols-2">
          <div className="min-w-0 p-6 sm:p-10 lg:p-11">
            <div className="mb-8"><p className="text-sm">Reservation</p><div className="mt-2 h-3 rounded-full bg-[#e9eff5]"><span className="block h-3 w-[12%] rounded-full bg-[#00935e]" /></div></div>
            <p className="text-sm font-bold uppercase tracking-[.05em] text-[#007f51]">Reopening September 30, 2026</p>
            <Heading id="reopening-heading" className="mt-2 text-[clamp(2.65rem,5vw,4.25rem)] font-extrabold leading-[1.07] tracking-[-.055em] text-[#132440]">Be first back in.</Heading>
            <p className="mt-3 max-w-lg text-lg leading-7 text-[#435773]">Reserve your place and receive your first month free when FixMy.Money reopens.</p>
            <div className="mt-7"><ReopeningWaitlistForm /></div>
            <div className="mt-7 border-t border-[#dce5ef] pt-5 text-center text-sm">Already have access? <Link href="/login" className="font-semibold text-[#007e50] underline underline-offset-2">Sign in</Link></div>
          </div>
          <aside aria-labelledby="next-heading" className="min-w-0 bg-[#effff9] p-6 sm:p-10 lg:p-12">
            <h2 id="next-heading" className="text-3xl font-extrabold tracking-[-.03em]">What happens next</h2>
            <ol className="mt-5 space-y-4 text-lg">
              {['Reserve your place', 'We’ll email you before reopening', 'Choose Personal, Start, or Grow'].map((step, index) => <li key={step} className="flex items-center gap-5"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#daf8eb] text-base font-bold text-[#006d49]">{index + 1}</span><span>{step}</span></li>)}
            </ol>
            <div className="mt-7 rounded-xl bg-[#e0f9ed] px-6 py-5"><p className="text-sm">Your reopening benefit</p><p className="mt-2 flex items-center gap-4 text-xl font-bold"><Check className="size-7 rounded-full bg-[#00955f] p-1 text-white" aria-hidden="true" />First month free</p></div>
            <div className="mt-5 rounded-xl border border-[#dce5ef] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold">Three-bureau credit report comparison</h3><span className="text-right text-xs text-[#586984]">Illustrative example</span></div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {bureauSummary.map(bureau => <div key={bureau.name} className="min-w-0 rounded-lg border border-[#dce5ef] p-2 text-[9px] sm:p-3 sm:text-xs"><p className="font-bold">{bureau.name}</p><dl className="mt-3 space-y-1.5">{[['Accounts', bureau.accounts], ['Open', bureau.open], ['Late payments', bureau.late], ['Collections', bureau.collections]].map(([label, value]) => <div key={label} className="flex justify-between gap-1"><dt>{label}</dt><dd className="font-bold">{value}</dd></div>)}</dl></div>)}
              </div>
            </div>
          </aside>
        </div>
        <div className="grid gap-5 px-2 py-8 text-sm md:grid-cols-3 md:gap-8">
          <p className="flex items-center gap-4"><ShieldCheck className="size-12 shrink-0 rounded-full bg-[#e8fbf2] p-2.5 text-[#008554]" aria-hidden="true" /><span><strong className="block">Your information is safe.</strong><span className="text-[#586984]">We take your privacy seriously.</span></span></p>
          <p className="flex items-center gap-4"><Feather className="size-12 shrink-0 rounded-full bg-[#e8fbf2] p-2.5 text-[#008554]" aria-hidden="true" /><span><strong className="block">No payment today</strong><span className="text-[#586984]">Just reserve your place.</span></span></p>
          <p className="flex items-center gap-4"><UsersRound className="size-12 shrink-0 rounded-full bg-[#e8fbf2] p-2.5 text-[#008554]" aria-hidden="true" /><span><strong className="block">Be the first to know</strong><span className="text-[#586984]">We’ll email you before we reopen.</span></span></p>
        </div>
        <p className="px-2 pb-6 text-xs leading-5 text-[#586984]">The first-month offer is for new customers when they activate after reopening. Existing customers keep their authorized access. Separately authorized pilot terms and existing billing are unchanged.</p>
        <p className="sr-only"><LockKeyhole aria-hidden="true" /> Joining the list does not create an account or payment.</p>
      </section>
    </div>
  );
}
