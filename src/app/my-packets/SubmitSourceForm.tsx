'use client';

import { useState } from 'react';

export function SubmitSourceForm({ cycleId }: { cycleId: string }) {
  const [provider, setProvider] = useState('unknown');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  return <form className="mt-4 space-y-3" onSubmit={async event => {
    event.preventDefault();
    setBusy(true);
    setResult('');
    try {
      const response = await fetch(`/api/personal-packets/${encodeURIComponent(cycleId)}/source`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, textContent: text }),
      });
      const body = await response.json();
      if (!response.ok || typeof body.reportId !== 'string') throw new Error('unavailable');
      setText('');
      setResult(`Report received for review. Reference: ${body.reportId}. This is not a completed packet.`);
    } catch {
      setResult('This report could not be accepted automatically. Check the provider and report text or request manual review.');
    } finally { setBusy(false); }
  }}>
    <label className="block text-sm font-medium" htmlFor={`provider-${cycleId}`}>Report provider</label>
    <select id={`provider-${cycleId}`} value={provider} onChange={event => setProvider(event.target.value)} className="w-full rounded border p-2">
      {['unknown', 'smartcredit', 'myscoreiq', 'identityiq', 'myfreescorenow', 'privacyguard', 'experian', 'transunion', 'equifax', 'annualcreditreport', 'creditkarma'].map(item =>
        <option key={item} value={item}>{item}</option>)}
    </select>
    <label className="block text-sm font-medium" htmlFor={`source-${cycleId}`}>Paste your credit report text</label>
    <textarea id={`source-${cycleId}`} value={text} onChange={event => setText(event.target.value)} required minLength={100}
      className="min-h-48 w-full rounded border p-2" autoComplete="off" />
    <p className="text-xs text-slate-600">Only structured results are saved. Do not paste passwords or authentication codes.</p>
    <button type="submit" disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {busy ? 'Checking report…' : 'Submit report for review'}
    </button>
    {result && <p role="status" className="text-sm">{result}</p>}
  </form>;
}
