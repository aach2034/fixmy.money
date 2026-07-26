export type RemovalPotential = 'Higher' | 'Moderate' | 'Lower / uncertain';

export interface DisputeReasonOption {
  value: string;
  removalPotential: RemovalPotential;
  why: string;
}

/**
 * Ordered by estimated removal potential when the stated reason is truthful
 * and supported by the consumer's report and documents. This is workflow
 * guidance, not an outcome prediction.
 */
export const DISPUTE_REASON_OPTIONS: DisputeReasonOption[] = [
  { value: 'Fraudulent account / identity theft', removalPotential: 'Higher', why: 'Identity-theft documentation can directly show the account does not belong to the consumer.' },
  { value: 'Not mine', removalPotential: 'Higher', why: 'A documented ownership or identity mismatch challenges whether the account belongs on this file.' },
  { value: 'Not my account', removalPotential: 'Higher', why: 'A documented ownership or identity mismatch challenges whether the account belongs on this file.' },
  { value: 'Mixed file issue', removalPotential: 'Higher', why: 'Evidence that another person’s information was merged into the file directly challenges the item’s attribution.' },
  { value: 'Duplicate account', removalPotential: 'Higher', why: 'Matching account details can demonstrate that the same obligation is being reported more than once.' },
  { value: 'Inquiry not authorized', removalPotential: 'Higher', why: 'If no permissible purpose can be verified, the inquiry may not be supportable.' },
  { value: 'Unauthorized inquiry', removalPotential: 'Higher', why: 'If no permissible purpose can be verified, the inquiry may not be supportable.' },
  { value: 'Account obsolete', removalPotential: 'Higher', why: 'Report dates may show that the item is beyond the applicable credit-reporting period.' },
  { value: 'Already resolved', removalPotential: 'Higher', why: 'Prior results or furnisher correspondence may show the disputed reporting should no longer appear.' },

  { value: 'Account information inaccurate', removalPotential: 'Moderate', why: 'Specific, documented factual conflicts can require correction or removal if the information cannot be verified.' },
  { value: 'Incorrect balance', removalPotential: 'Moderate', why: 'Statements, payoff records, or bureau differences may show the reported amount is inaccurate.' },
  { value: 'Incorrect payment history', removalPotential: 'Moderate', why: 'Payment records may contradict the reported month-by-month history.' },
  { value: 'Incorrect late payment', removalPotential: 'Moderate', why: 'Bank or creditor records may show that the reported late payment is inaccurate.' },
  { value: 'Incorrect account status', removalPotential: 'Moderate', why: 'Statements or creditor records may conflict with the reported open, closed, paid, or delinquent status.' },
  { value: 'Incorrect dates', removalPotential: 'Moderate', why: 'Source documents may show inaccurate opened, activity, delinquency, or reported dates.' },
  { value: 'Incorrect date of last activity', removalPotential: 'Moderate', why: 'Statements or account records may contradict the reported activity date.' },
  { value: 'Incorrect date opened', removalPotential: 'Moderate', why: 'Original account records may contradict the reported opening date.' },
  { value: 'Account paid but reporting incorrectly', removalPotential: 'Moderate', why: 'Payment or payoff proof may contradict the balance or status being reported.' },
  { value: 'Account paid in full', removalPotential: 'Moderate', why: 'Payoff proof may support correcting an inaccurate balance or status, though payment alone does not require deletion.' },
  { value: 'Account settled', removalPotential: 'Moderate', why: 'Settlement records may support correcting an inaccurate balance or status, though settlement alone does not require deletion.' },
  { value: 'Collection reporting incorrectly', removalPotential: 'Moderate', why: 'Ownership, balance, dates, or status records may reveal a specific reporting inconsistency.' },
  { value: 'Original creditor mismatch', removalPotential: 'Moderate', why: 'Account documents may show that the reported original creditor or ownership chain is inconsistent.' },
  { value: 'Account included in bankruptcy', removalPotential: 'Moderate', why: 'Bankruptcy schedules and discharge records may support correcting an inaccurate balance or status.' },
  { value: 'Personal information inaccurate', removalPotential: 'Moderate', why: 'Identity documents can support correcting personal data and may help separate mixed-file information.' },
  { value: 'Incorrect personal information', removalPotential: 'Moderate', why: 'Identity documents can support correcting personal data and may help separate mixed-file information.' },

  { value: 'Debt past statute of limitations', removalPotential: 'Lower / uncertain', why: 'A collection limitation period does not, by itself, determine how long accurate information may be reported.' },
  { value: 'No signed agreement / contract', removalPotential: 'Lower / uncertain', why: 'The absence of a signed contract alone may not establish that credit reporting is inaccurate or unverifiable.' },
  { value: 'Other', removalPotential: 'Lower / uncertain', why: 'The result depends on the specific factual inconsistency and the supporting evidence entered in the notes.' },
  { value: 'Other (specify in notes)', removalPotential: 'Lower / uncertain', why: 'The result depends on the specific factual inconsistency and the supporting evidence entered in the notes.' },
];

export const DISPUTE_REASONS = DISPUTE_REASON_OPTIONS.map(option => option.value);

export function getDisputeReasonOption(value: string): DisputeReasonOption | undefined {
  return DISPUTE_REASON_OPTIONS.find(option => option.value === value);
}

const POTENTIAL_ORDER: Record<RemovalPotential, number> = {
  Higher: 0,
  Moderate: 1,
  'Lower / uncertain': 2,
};

export function rankDisputeItem(reason: string, type = ''): DisputeReasonOption & { rank: number } {
  const exact = getDisputeReasonOption(reason);
  if (exact) return { ...exact, rank: POTENTIAL_ORDER[exact.removalPotential] };

  const context = `${reason} ${type}`.toLowerCase();
  if (/identity|fraud|not mine|not my|mixed file|duplicate|unauthorized inquiry|obsolete/.test(context)) {
    return {
      value: reason || type,
      removalPotential: 'Higher',
      why: 'The item appears to involve ownership, duplication, authorization, or reporting-age evidence that can directly challenge whether it belongs on the report.',
      rank: 0,
    };
  }
  if (/incorrect|inaccurate|balance|payment|late|status|date|collection|creditor|paid|settled|bankruptcy/.test(context)) {
    return {
      value: reason || type,
      removalPotential: 'Moderate',
      why: 'The item appears to contain a factual reporting issue. Documents or cross-bureau differences should identify the exact inconsistency.',
      rank: 1,
    };
  }
  return {
    value: reason || type,
    removalPotential: 'Lower / uncertain',
    why: 'No specific, supported reporting inconsistency has been recorded yet. Review the source report and evidence before selecting this item.',
    rank: 2,
  };
}
