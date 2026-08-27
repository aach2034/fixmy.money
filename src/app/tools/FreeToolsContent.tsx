'use client';

import { useState } from 'react';
import { ArrowRight, Calculator, CalendarClock, CheckSquare, FileText, Mail } from 'lucide-react';
import TrackedLink from '@/components/marketing/TrackedLink';
import { consumerTools } from '@/lib/marketing/acquisition';
import { trackToolCompleted, trackToolStarted } from '@/lib/analytics';

export default function FreeToolsContent() {
  const [balance, setBalance] = useState(450);
  const [limit, setLimit] = useState(2500);
  const [sentDate, setSentDate] = useState('2026-08-27');
  const utilization = limit > 0 ? Math.round((balance / limit) * 100) : 0;
  const deadline = new Date(`${sentDate}T00:00:00`);
  deadline.setDate(deadline.getDate() + 30);

  return (
    <main className="min-h-screen bg-white text-slate-950" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <section className="bg-slate-950 px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-300">Free credit report tools</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">Review one issue for free. Use FixMy.Money to organize the whole report.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Start with calculators, checklists, and letter helpers for self-directed credit-report work.</p>
        </div>
      </section>

      <section className="px-4 py-14">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-slate-200 p-6 shadow-sm">
            <Calculator className="text-emerald-700" size={28} />
            <h2 className="mt-5 text-2xl font-black">Credit Utilization Calculator</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">Reported balance
                <input type="number" min="0" value={balance} onFocus={() => trackToolStarted('credit_utilization_calculator')} onChange={event => setBalance(Number(event.target.value))} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm font-bold">Credit limit
                <input type="number" min="0" value={limit} onFocus={() => trackToolStarted('credit_utilization_calculator')} onChange={event => setLimit(Number(event.target.value))} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
            </div>
            <p className="mt-5 text-3xl font-black">{Number.isFinite(utilization) ? utilization : 0}%</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Compare reported balances against limits to understand how utilization appears on a report.</p>
            <TrackedLink href="/signup?plan=starter&utm_source=tools&utm_medium=calculator&utm_campaign=credit_utilization" onClick={() => trackToolCompleted('credit_utilization_calculator')} eventLabel="Organize full report" eventLocation="utilization_tool" className="mt-6 inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-3 text-sm font-black text-white">
              Organize My Full Report <ArrowRight size={16} />
            </TrackedLink>
          </article>

          <article className="rounded-lg border border-slate-200 p-6 shadow-sm">
            <CalendarClock className="text-emerald-700" size={28} />
            <h2 className="mt-5 text-2xl font-black">FCRA Dispute Deadline Calculator</h2>
            <label className="mt-6 block text-sm font-bold">Dispute sent or submitted
              <input type="date" value={sentDate} onFocus={() => trackToolStarted('fcra_dispute_deadline_calculator')} onChange={event => setSentDate(event.target.value)} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <p className="mt-5 text-sm font-bold text-slate-500">Estimated 30-day follow-up date</p>
            <p className="mt-1 text-3xl font-black">{deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">This is an educational estimate, not legal advice. Actual timelines can depend on delivery, method, and facts.</p>
            <TrackedLink href="/signup?plan=starter&utm_source=tools&utm_medium=calculator&utm_campaign=fcra_deadlines" onClick={() => trackToolCompleted('fcra_dispute_deadline_calculator')} eventLabel="Track dispute activity" eventLocation="deadline_tool" className="mt-6 inline-flex items-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Track Dispute Activity <ArrowRight size={16} />
            </TrackedLink>
          </article>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-black">More free tools</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {consumerTools.slice(2).map((tool, index) => {
              const Icon = [Mail, CheckSquare, FileText][index] ?? FileText;
              return (
                <article key={tool.slug} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon size={24} className="text-emerald-700" />
                  <h3 className="mt-5 text-lg font-black">{tool.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tool.description}</p>
                  <TrackedLink href={tool.href} eventLabel={tool.cta} eventLocation={`tools_${tool.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                    {tool.cta} <ArrowRight size={15} />
                  </TrackedLink>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
