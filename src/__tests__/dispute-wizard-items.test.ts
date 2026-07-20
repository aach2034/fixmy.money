import { describe, expect, it } from 'vitest';
import { deduplicateDisputeRows } from '../lib/creditReport/disputeItems';

describe('dispute wizard account deduplication', () => {
  it('collapses repeated rows for the same creditor, account, and category', () => {
    const rows = deduplicateDisputeRows([
      { id: 'a', creditor_name: 'Capital One', account_number_masked: '****1234', negative_category: 'late_payment', bureau: 'Equifax', parser_confidence: 50 },
      { id: 'b', creditor_name: 'CAPITAL  ONE', account_number_masked: '****-1234', negative_category: 'late_payment', bureau: 'Equifax', parser_confidence: 80 },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('b');
  });

  it('keeps distinct account numbers from the same creditor', () => {
    const rows = deduplicateDisputeRows([
      { id: 'a', creditor_name: 'Capital One', account_number_masked: '****1234', negative_category: 'late_payment' },
      { id: 'b', creditor_name: 'Capital One', account_number_masked: '****9876', negative_category: 'late_payment' },
    ]);

    expect(rows).toHaveLength(2);
  });

  it('deduplicates numberless rows without merging accounts with different balances', () => {
    const rows = deduplicateDisputeRows([
      { id: 'a', creditor_name: 'Midland Credit', negative_category: 'collection', bureau: 'TransUnion', balance: 500, date_reported: '2026-06-01' },
      { id: 'b', creditor_name: 'Midland Credit', negative_category: 'collection', bureau: 'TransUnion', balance: 500, date_reported: '2026-06-01' },
      { id: 'c', creditor_name: 'Midland Credit', negative_category: 'collection', bureau: 'TransUnion', balance: 900, date_reported: '2026-06-01' },
    ]);

    expect(rows.map(row => row.id)).toEqual(['a', 'c']);
  });
});
