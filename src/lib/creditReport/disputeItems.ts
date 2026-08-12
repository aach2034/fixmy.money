export interface DisputeSourceRow {
  id?: string | null;
  creditor_name?: string | null;
  account_number_masked?: string | null;
  account_number?: string | null;
  negative_category?: string | null;
  negative_item_type?: string | null;
  bureau?: string | null;
  balance?: number | string | null;
  amount?: number | string | null;
  date_opened?: string | null;
  date_reported?: string | null;
  date_last_activity?: string | null;
  status?: string | null;
  parser_confidence?: number | null;
}

export function getDisputeItemDates(row: DisputeSourceRow) {
  return {
    dateOpened: String(row.date_opened ?? '').trim(),
    dateReported: String(row.date_reported ?? '').trim(),
    dateLastActivity: String(row.date_last_activity ?? '').trim(),
  };
}

function normalized(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function accountIdentity(row: DisputeSourceRow): string {
  const creditor = normalized(row.creditor_name).replace(/[^a-z0-9]/g, '');
  const account = normalized(row.account_number_masked ?? row.account_number).replace(/[^a-z0-9*]/g, '');
  const category = normalized(row.negative_category ?? row.negative_item_type);

  if (account) return `${creditor}|${account}|${category}`;

  // Some reports omit account numbers. These fields distinguish two real
  // accounts at the same creditor while still collapsing repeated parser rows.
  return [
    creditor,
    category,
    normalized(row.bureau),
    normalized(row.balance ?? row.amount),
    normalized(row.date_opened),
    normalized(row.date_reported),
    normalized(row.status),
  ].join('|');
}

function rowQuality(row: DisputeSourceRow): number {
  return (row.parser_confidence ?? 0) +
    (row.account_number_masked || row.account_number ? 10 : 0) +
    (row.date_reported ? 2 : 0) +
    (row.balance != null || row.amount != null ? 1 : 0);
}

export function deduplicateDisputeRows<T extends DisputeSourceRow>(rows: T[]): T[] {
  const bestByIdentity = new Map<string, { row: T; index: number }>();

  rows.forEach((row, index) => {
    const key = accountIdentity(row);
    const current = bestByIdentity.get(key);
    if (!current || rowQuality(row) > rowQuality(current.row)) {
      bestByIdentity.set(key, { row, index: current?.index ?? index });
    }
  });

  return [...bestByIdentity.values()]
    .sort((a, b) => a.index - b.index)
    .map(entry => entry.row);
}
