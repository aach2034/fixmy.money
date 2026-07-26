'use client';

import React from 'react';
import {
  DISPUTE_REASON_OPTIONS,
  getDisputeReasonOption,
  type RemovalPotential,
} from '@/lib/disputes/reasonRanking';

interface DisputeReasonSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  allowedReasons?: string[];
}

const GROUPS: RemovalPotential[] = ['Higher', 'Moderate', 'Lower / uncertain'];

export default function DisputeReasonSelect({
  value,
  onChange,
  className = 'w-full text-xs border border-border rounded-lg px-2 py-1.5 bg-card text-foreground',
  placeholder = 'Select reason…',
  allowedReasons,
}: DisputeReasonSelectProps) {
  const selected = getDisputeReasonOption(value);
  const allowed = allowedReasons ? new Set(allowedReasons) : null;

  return (
    <div>
      <select value={value} onChange={event => onChange(event.target.value)} className={className}>
        <option value="">{placeholder}</option>
        {GROUPS.map(group => {
          const options = DISPUTE_REASON_OPTIONS.filter(
            option => option.removalPotential === group && (!allowed || allowed.has(option.value)),
          );
          return options.length > 0 ? (
            <optgroup key={group} label={`${group} removal potential`}>
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
      {selected ? (
        <div className="mt-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <p className="text-xs font-semibold text-foreground">{selected.removalPotential} removal potential</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{selected.why}</p>
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Ranked by estimated removal potential when the reason is accurate and supported by evidence.
        </p>
      )}
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/80">
        Guidance only—bureau and furnisher investigations determine outcomes. Never dispute accurate information.
      </p>
    </div>
  );
}
