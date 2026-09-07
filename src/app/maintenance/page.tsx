import type { Metadata } from 'next';
import { Clock3, ShieldCheck, Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'We’ll be back shortly | FixMy.Money',
  description: 'FixMy.Money is temporarily unavailable while we make a few improvements.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function MaintenancePage() {
  return (
    <div className="relative isolate flex min-h-screen overflow-hidden bg-[#f7faf8] px-5 py-8 text-[#0b1742] sm:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_50%_0%,rgba(63,164,71,0.16),transparent_62%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-32 top-1/3 -z-10 size-96 rounded-full bg-[#e2f5ee] opacity-70 blur-3xl"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <header className="flex items-center gap-3 py-2" aria-label="FixMy.Money">
          <span className="grid size-10 place-items-center rounded-xl bg-[#083a32] text-base font-bold text-white shadow-sm">
            F
          </span>
          <span className="text-lg font-semibold tracking-[-0.035em]">
            FixMy<span className="text-[#3fa447]">.Money</span>
          </span>
        </header>

        <section className="flex flex-1 items-center justify-center py-12 sm:py-20">
          <section className="w-full max-w-2xl rounded-[2rem] border border-[#dfe8e3] bg-white/90 p-7 text-center shadow-[0_28px_80px_rgba(11,23,66,0.10)] backdrop-blur sm:p-12">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#eaf8ef] text-[#338a3b]">
              <Wrench className="size-7" aria-hidden="true" />
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#3fa447]">
              Scheduled maintenance
            </p>
            <h1 className="mt-4 text-balance text-4xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl">
              We’ll be back shortly.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-[#5f6c66] sm:text-lg sm:leading-8">
              We’re making a few behind-the-scenes improvements to FixMy.Money. The site is
              temporarily unavailable while we finish up.
            </p>

            <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
              <div className="flex gap-3 rounded-2xl border border-[#e3ebe7] bg-[#f8fbf9] p-4">
                <Clock3 className="mt-0.5 size-5 shrink-0 text-[#3fa447]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Please check back soon</p>
                  <p className="mt-1 text-xs leading-5 text-[#6c7872]">No action is needed from you.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-[#e3ebe7] bg-[#f8fbf9] p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#3fa447]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Your account stays protected</p>
                  <p className="mt-1 text-xs leading-5 text-[#6c7872]">We appreciate your patience.</p>
                </div>
              </div>
            </div>
          </section>
        </section>

        <footer className="py-2 text-center text-xs text-[#748078]">
          © 2026 FixMy.Money
        </footer>
      </div>
    </div>
  );
}
