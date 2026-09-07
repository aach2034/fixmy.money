export type ReportedAmountAccount = {
  isCollection?: boolean;
  isChargeOff?: boolean;
  collectionAmount?: number | null;
  chargeOffAmount?: number | null;
  balance?: number | null;
  pastDue?: number | null;
  originalBalance?: number | null;
  highBalance?: number | null;
};

export function getReportedAmount(account: ReportedAmountAccount): { value: number | null; source: string | null } {
  const candidates: Array<[boolean, number | null | undefined, string]> = [
    [account.isCollection === true, account.collectionAmount, 'Collection amount'],
    [account.isChargeOff === true, account.chargeOffAmount, 'Charge-off amount'],
    [true, account.balance, 'Current balance'],
    [true, account.pastDue, 'Past due'],
    [true, account.originalBalance, 'Original balance'],
    [true, account.highBalance, 'High balance'],
  ];
  const match = candidates.find(([eligible, value]) => eligible && value !== null && value !== undefined);
  return match ? { value: match[1]!, source: match[2] } : { value: null, source: null };
}

export function formatReportedAmount(account: ReportedAmountAccount): string {
  const { value } = getReportedAmount(account);
  return value === null ? 'Not reported' : value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function needsAccountReview(account: {
  creditorName?: string;
  accountNumberMasked?: string;
  bureau?: string;
  accountType?: string;
  status?: string;
  parserConfidence?: number;
  isNegative?: boolean;
  negativeReason?: string;
}): boolean {
  return !account.creditorName?.trim()
    || /unknown/i.test(account.creditorName)
    || !account.accountNumberMasked?.trim()
    || !account.bureau?.trim()
    || /unknown/i.test(account.bureau)
    || !account.accountType?.trim()
    || /unknown/i.test(account.accountType)
    || !account.status?.trim()
    || (account.parserConfidence ?? 0) < 70
    || (account.isNegative === true && !account.negativeReason?.trim());
}
