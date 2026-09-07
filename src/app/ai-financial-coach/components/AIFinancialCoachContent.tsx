'use client';

import { AlertTriangle } from 'lucide-react';

export default function AIFinancialCoachContent() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="card p-8 border border-warning/30 bg-warning/10">
        <AlertTriangle className="text-warning" size={28} />
        <h1 className="text-2xl font-semibold mt-4">AI financial coaching is temporarily unavailable</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This feature is disabled while server-side privacy, model, usage, and subscription controls are completed.
        </p>
      </div>
    </div>
  );
}
