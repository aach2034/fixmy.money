import { CalendarDays, Check, FileText, Wallet } from 'lucide-react';

const bureaus = [
  { name: 'Equifax', balance: '$1,284', date: 'Aug 12, 2026' },
  { name: 'Experian', balance: '$0', date: 'Aug 10, 2026' },
  { name: 'TransUnion', balance: '$1,284', date: 'Aug 11, 2026' },
];

export default function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[720px] pb-7 lg:pb-11" aria-label="Illustrative three-bureau credit report comparison">
      <div className="rounded-2xl border border-[#dce5ef] bg-white p-4 shadow-[0_12px_28px_rgba(13,28,47,.1)] sm:hidden">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold">Three-Bureau Comparison</h2>
          <span className="text-xs text-[#586781]">Illustrative example</span>
        </div>
        <p className="mt-2 text-sm text-[#586781]">Spot differences and investigate what doesn’t look right.</p>
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-[#e3eaf2] p-3">
          <strong className="text-sm">Metro Auto Loan</strong>
          <span className="rounded-md border border-[#ffcad0] bg-[#fff0f1] px-2 py-1 text-xs font-semibold text-[#ae2131]">Needs review</span>
        </div>
        <div className="mt-3 space-y-2">
          {bureaus.map(bureau => <div key={bureau.name} className="rounded-lg border border-[#e3eaf2] p-3">
            <strong className="text-sm">{bureau.name}</strong>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div><dt className="text-[#586781]">Balance</dt><dd className="mt-1 font-bold">{bureau.balance}</dd></div>
              <div><dt className="text-[#586781]">Status</dt><dd className="mt-1 font-bold">Open</dd></div>
              <div><dt className="text-[#586781]">Date</dt><dd className="mt-1 font-bold">{bureau.date}</dd></div>
            </dl>
          </div>)}
        </div>
        <p className="mt-4 rounded-lg bg-[#f2fbf7] p-3 text-xs font-semibold text-[#132440]">Imported → Organized → Ready to review</p>
      </div>
      <div className="hidden sm:block">
      <div className="absolute inset-x-8 top-0 h-[90%] rounded-full bg-[#e8faf3]" aria-hidden="true" />
      <div className="relative rounded-[16px] border-[10px] border-[#171e26] bg-[#171e26] shadow-[0_20px_35px_rgba(13,28,47,.15)] sm:border-[12px]">
        <div className="h-[380px] overflow-hidden rounded-[4px] bg-white text-[#132440] sm:h-[420px]">
          <div className="flex h-11 items-center justify-between border-b border-[#e2eaf2] px-4 text-[10px] sm:px-6">
            <strong className="text-sm tracking-[-.05em]">FixMy<span className="text-[#007f51]">.Money</span></strong>
            <span className="hidden text-[#45516a] sm:inline">My Reports &nbsp;&nbsp; Disputes &nbsp;&nbsp; Resources</span>
            <span className="grid size-6 place-items-center rounded-full bg-[#e8edf5]">J</span>
          </div>
          <div className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="text-sm font-bold sm:text-base">Three-Bureau Comparison</h2><p className="text-[10px] text-[#586781] sm:text-xs">Spot differences and investigate what doesn’t look right.</p></div>
              <span className="text-right text-[9px] text-[#586781] sm:text-[10px]">Illustrative example</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px] sm:gap-2 sm:text-xs">
              {bureaus.map((bureau, index) => <div key={bureau.name} className={`rounded-md border py-2 ${index === 0 ? 'border-[#9ce6c7] bg-[#effcf6] font-semibold text-[#007a4e]' : 'border-[#e5ebf2]'}`}>{bureau.name}</div>)}
            </div>
            <div className="mt-2 rounded-xl border border-[#e3eaf2] p-2 shadow-sm sm:p-3">
              <div className="flex items-center gap-2 border-b border-[#e3eaf2] pb-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eef3f8] text-[#142441]" aria-hidden="true"><Wallet className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold sm:text-xs">METRO AUTO LOAN</p><p className="truncate text-[9px] text-[#586781]">Auto Loan · Account #4587••••</p></div>
                <span className="rounded-md border border-[#ffcad0] bg-[#fff0f1] px-1.5 py-1 text-[9px] font-semibold text-[#ae2131] sm:px-2">Needs review</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-[#e3eaf2] pt-2">
                {bureaus.map(bureau => <div key={bureau.name} className="min-w-0 px-1 first:pl-0 sm:px-2"><p className="truncate text-[9px] font-bold">{bureau.name}</p><p className="mt-1 text-sm font-extrabold sm:text-lg">{bureau.balance}</p><p className="text-[8px] text-[#586781] sm:text-[9px]">As of {bureau.date}</p></div>)}
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-[#f2fbf7] p-2.5 sm:p-3">
              <p className="text-[9px] font-bold">Your progress</p>
              <div className="mt-3 flex items-center justify-between text-[9px]"><span className="flex flex-col items-center gap-1"><Check className="size-5 rounded-full bg-[#00945f] p-1 text-white" />Imported</span><span className="h-px flex-1 bg-[#0b9d68]" /><span className="flex flex-col items-center gap-1"><Check className="size-5 rounded-full bg-[#00945f] p-1 text-white" />Organized</span><span className="h-px flex-1 bg-[#0b9d68]" /><span className="flex flex-col items-center gap-1 font-semibold"><span className="grid size-5 place-items-center rounded-full border border-[#0b9d68] text-[#0b9d68]">3</span>Ready to review</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="relative mx-auto h-3 w-[108%] max-w-[780px] -translate-x-[3.7%] rounded-b-[50%] bg-gradient-to-b from-[#dce1e5] to-[#aab2b9] shadow-[0_12px_12px_rgba(13,28,47,.12)]" aria-hidden="true" />
      <div className="absolute -right-2 top-[28%] hidden w-44 rounded-xl border border-[#dce5ef] bg-white p-4 shadow-[0_12px_28px_rgba(13,28,47,.12)] xl:block">
        <p className="text-xs font-bold">3 details to compare</p>
        <ul className="mt-3 space-y-3 text-xs text-[#344763]">
          <li className="flex items-center gap-2"><Wallet className="size-5 text-[#008e5b]" />Balance</li>
          <li className="flex items-center gap-2"><FileText className="size-5 text-[#008e5b]" />Status</li>
          <li className="flex items-center gap-2"><CalendarDays className="size-5 text-[#008e5b]" />Dates</li>
        </ul>
      </div>
      </div>
      <span className="sr-only">Compare balance, status, and dates across Equifax, Experian, and TransUnion. A difference needs review. Imported, Organized, Ready to review.</span>
    </div>
  );
}
