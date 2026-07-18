'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AIDisclaimerProps {
  compact?: boolean;
}

/**
 * AI Disclaimer component — must be shown wherever AI output can be used.
 * Per Priority 7 requirements.
 */
export default function AIDisclaimer({ compact = false }: AIDisclaimerProps) {
  if (compact) {
    return (
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>AI Review Required:</strong> AI-generated content must be reviewed by an authorized user before it is sent, filed, or relied upon.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900 mb-1">AI Review Required</p>
          <p className="text-xs text-amber-800 leading-relaxed">
            AI-generated content must be reviewed by an authorized user before it is sent, filed, or relied upon.
            AI output does not guarantee deletions, score increases, legal compliance, or bureau outcomes.
            Do not use AI output to create false dispute reasons or inaccurate statements.
          </p>
        </div>
      </div>
    </div>
  );
}
