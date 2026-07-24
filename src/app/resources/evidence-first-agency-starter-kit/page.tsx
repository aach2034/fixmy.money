import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Check, Circle } from 'lucide-react';
import StarterKitContent from './StarterKitContent';

export const metadata: Metadata = {
  title: 'Evidence-First Agency Starter Kit | FixMy.Money',
  description:
    'A practical onboarding, evidence-review, approval, and bureau-response checklist for credit-repair agency operators.',
  robots: { index: false, follow: false },
};

const SECTIONS = [
  {
    number: '01',
    title: 'Client onboarding',
    purpose: 'Establish identity, authorization, expectations, and a complete starting record.',
    items: [
      'Confirm the client’s identity and preferred contact information.',
      'Collect signed agreements, required disclosures, and documented authorization.',
      'Record services, fees, cancellation terms, and communication preferences.',
      'Create a secure checklist for missing identity and supporting documents.',
      'Assign an owner and next action before the client leaves intake.',
    ],
  },
  {
    number: '02',
    title: 'Report and evidence review',
    purpose: 'Keep every observation tied to its source instead of relying on memory or copied text.',
    items: [
      'Record the report provider, bureau, report date, and source page.',
      'Preserve the exact reported value before adding notes or interpretations.',
      'Compare the same account across bureaus and document differences.',
      'Attach supporting statements, correspondence, and identity records to the item.',
      'Mark uncertainty for human review instead of treating it as a verified fact.',
    ],
  },
  {
    number: '03',
    title: 'Draft and approval',
    purpose: 'Make responsibility for every factual assertion and final decision explicit.',
    items: [
      'Use only verified facts and client-authorized information in a draft.',
      'Map each factual assertion back to its report evidence or supporting document.',
      'Review names, account identifiers, dates, balances, and bureau addresses.',
      'Record who reviewed the evidence and who approved the final version.',
      'Keep the approved version unchanged; store later corrections as a new version.',
    ],
  },
  {
    number: '04',
    title: 'Delivery and response tracking',
    purpose: 'Preserve continuity from delivery through bureau response and the next review.',
    items: [
      'Record the delivery method, destination, date, and available confirmation.',
      'Set a response-review date and assign the responsible team member.',
      'Attach each bureau or furnisher response to the original case history.',
      'Record the outcome without promising or implying a guaranteed result.',
      'Document the next authorized action, client update, or case closure.',
    ],
  },
];

export default function EvidenceFirstAgencyStarterKitPage() {
  return (
    <div className="min-h-screen bg-[#EAF1F4] text-[#071B2E] print:bg-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <header className="border-b border-[#183146] bg-[#071B2E] text-white print:border-b-2 print:bg-white print:text-[#071B2E]">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between print:max-w-none print:px-0 print:py-6">
          <div>
            <Link href="/" className="print:hidden mb-7 inline-flex items-center gap-2 text-sm font-bold text-cyan-200 hover:text-cyan-100">
              <ArrowLeft size={16} aria-hidden="true" /> Back to FixMy.Money
            </Link>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300 print:text-[#17677A]">
              FixMy.Money field guide
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl print:text-3xl">
              Evidence-First Agency Starter Kit
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-[#BDCCDC] print:text-slate-600">
              A working checklist for building a documented client-to-response workflow.
            </p>
          </div>
          <StarterKitContent />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 print:max-w-none print:px-0 print:py-6">
        <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 print:break-inside-avoid">
          <strong>Use this as an operational worksheet, not legal advice.</strong> Your business is
          responsible for its own contracts, disclosures, fees, communications, authorization,
          and compliance with applicable federal and state law.
        </section>

        <div className="grid gap-7">
          {SECTIONS.map((section) => (
            <section key={section.number} className="break-inside-avoid rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:shadow-none">
              <div className="flex gap-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#071B2E] text-sm font-extrabold text-cyan-300 print:border print:border-slate-400 print:bg-white print:text-[#071B2E]">
                  {section.number}
                </span>
                <div>
                  <h2 className="text-2xl font-extrabold">{section.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{section.purpose}</p>
                </div>
              </div>
              <ul className="mt-6 grid gap-3">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 print:bg-white print:px-0 print:py-1.5">
                    <Circle size={17} className="mt-1 shrink-0 text-cyan-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 grid gap-3 border-t border-dashed border-slate-300 pt-5 sm:grid-cols-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Owner: ____________________</p>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Review date: _______________</p>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-8 break-inside-avoid rounded-[24px] bg-[#071B2E] p-7 text-white print:border print:border-slate-300 print:bg-white print:text-[#071B2E]">
          <div className="flex items-center gap-3">
            <Check className="text-cyan-300 print:text-[#17677A]" aria-hidden="true" />
            <h2 className="text-xl font-extrabold">Quick workflow score</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#BDCCDC] print:text-slate-600">
            Give yourself one point for every section your team can complete and document today.
          </p>
          <div className="mt-5 grid grid-cols-4 gap-3 text-center">
            {['Onboard', 'Verify', 'Approve', 'Track'].map((label) => (
              <div key={label} className="rounded-xl border border-[#31566E] p-4 print:border-slate-300">
                <p className="text-2xl font-extrabold">□</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-cyan-200 print:text-slate-600">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm font-bold">Score: ____ / 4</p>
        </section>

        <footer className="mt-10 border-t border-slate-300 pt-6 text-xs leading-5 text-slate-500">
          © 2026 FixMy.Money · Evidence-first operating software for credit-repair agencies ·
          No guaranteed credit outcomes.
        </footer>
      </main>
    </div>
  );
}
