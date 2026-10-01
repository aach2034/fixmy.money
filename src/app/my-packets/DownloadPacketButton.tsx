'use client';

import { useState } from 'react';

export function DownloadPacketButton({ cycleId }: { cycleId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return <div>
    <button type="button" disabled={busy} onClick={async () => {
      setBusy(true);
      setError(false);
      try {
        const response = await fetch(`/api/personal-packets/${encodeURIComponent(cycleId)}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok || typeof body.url !== 'string') throw new Error('unavailable');
        window.location.assign(body.url);
      } catch {
        setError(true);
      } finally {
        setBusy(false);
      }
    }} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {busy ? 'Preparing download…' : 'Download packet'}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">Packet access is temporarily unavailable. Please try again.</p>}
  </div>;
}
