'use client';

import { AlertTriangle } from 'lucide-react';

export default function AIDisputeAnalyzerContent() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="card p-8 border border-warning/30 bg-warning/10">
        <AlertTriangle className="text-warning" size={28} />
        <h1 className="text-2xl font-semibold mt-4">AI dispute analysis is temporarily unavailable</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Credit-report files are not being sent to external AI providers while additional privacy and usage controls are completed. No file selected on this page is uploaded or analyzed.
        </p>
      </div>
    </div>
  );
}
