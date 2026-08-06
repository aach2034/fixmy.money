'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';

const REPORT_IDS = [
  '2693b3cc-00ae-4138-8404-ca5e418f5bca',
  'dc99abaa-b054-4744-83d9-3b620dc2f206',
];

type RepairResult = {
  reportId: string;
  oldItems: number;
  newItems: number;
  bureaus: Record<string, number>;
};

export default function CreditReportRepairContent() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RepairResult[] | null>(null);
  const [error, setError] = useState('');

  const repair = async () => {
    setRunning(true);
    setError('');
    try {
      const response = await fetch('/api/credit-report/reparse-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportIds: REPORT_IDS }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The reports could not be repaired.');
      setResults(payload.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The reports could not be repaired.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="card p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Repair saved credit reports</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Reparse the two existing MyScoreIQ reports and separate TransUnion, Experian, and Equifax data. This does not purchase another report or use another parsing credit.
          </p>
        </div>

        {!results && (
          <button onClick={repair} disabled={running} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
            {running ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {running ? 'Repairing reports…' : 'Repair both reports'}
          </button>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-2">
            <TriangleAlert size={18} className="shrink-0" /> {error}
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 flex items-center gap-2">
              <CheckCircle2 size={20} /> Both reports were repaired successfully.
            </div>
            {results.map((result, index) => (
              <div key={result.reportId} className="rounded-lg border border-border p-4">
                <p className="font-medium text-foreground">Report {index + 1}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {['TransUnion', 'Experian', 'Equifax'].map(bureau => (
                    <div key={bureau} className="rounded-md bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{bureau}</p>
                      <p className="text-xl font-semibold text-foreground">{result.bureaus[bureau] ?? 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
