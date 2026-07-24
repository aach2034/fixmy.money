'use client';

import { Printer } from 'lucide-react';

export default function StarterKitContent() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-extrabold text-[#031322] transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-[#071B2E]"
    >
      <Printer size={17} aria-hidden="true" />
      Print or save as PDF
    </button>
  );
}
