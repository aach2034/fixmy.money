import Link from 'next/link';
import ReopeningWaitlistForm from '@/components/ReopeningWaitlistForm';

export default function ReopeningNotice({ standalone = false }: { standalone?: boolean }) {
  return (
    <div className={standalone ? 'min-h-screen bg-[#f5f9f7] px-5 py-16 text-[#0b1742]' : ''}>
      <section id="reopening-list" className={standalone ? 'mx-auto max-w-4xl' : 'scroll-mt-24'}>
        <div className="grid gap-10 rounded-[28px] border border-[#cfe1d8] bg-white p-7 shadow-[0_24px_70px_rgba(16,61,48,.10)] md:grid-cols-[1.1fr_.9fr] md:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#3fa447]">Grand Opening · October 25, 2026</p>
            <h1 className="mt-4 text-4xl font-bold tracking-[-.05em] sm:text-5xl">We’re Improving FixMy.Money</h1>
            <p className="mt-5 text-base leading-7 text-[#536078]">FixMy.Money is currently undergoing a focused software improvement period as we prepare for our official <strong className="text-[#0b1742]">Grand Opening on October 25, 2026</strong>.</p>
            <h2 className="mt-7 text-2xl font-bold tracking-[-.03em]">Sign up now and get your first month free when we reopen</h2>
            <p className="mt-3 leading-7 text-[#536078]">Leave your email and we’ll let you know as soon as FixMy.Money officially reopens. As a thank-you for joining the reopening list, you’ll receive <strong className="text-[#0b1742]">one full month of FixMy.Money free</strong> when you activate your account after reopening.</p>
            <div className="mt-7 rounded-xl bg-[#eef8ef] p-4 text-sm leading-6 text-[#284b36]">This one-month reopening offer is for new customers. Existing customers can continue to access their authorized accounts; those who elect to participate in the separately authorized pilot may receive six months free under that pilot. This reopening list does not change existing-customer billing or pilot eligibility.</div>
            <Link href="/login" className="mt-5 inline-flex rounded-xl border border-[#b8cac1] px-5 py-3 text-sm font-extrabold text-[#19322b] hover:bg-[#f1f5f3]">SIGN IN</Link>
          </div>
          <div className="self-center rounded-2xl bg-[#f6faf8] p-6"><ReopeningWaitlistForm /></div>
        </div>
      </section>
    </div>
  );
}
