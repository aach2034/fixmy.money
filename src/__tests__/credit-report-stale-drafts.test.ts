import { describe, expect, it } from 'vitest';
import { INVALID_DATE_DRAFT_NOTICE, repairUnsupportedFutureDateDraft } from '../lib/creditReport/staleDrafts';

const rationale = `Several candidates have issues with future reporting dates, which are strong dispute opportunities.

#1 YENDO INC (Strong): The reported date is in the future, which is a clear factual inaccuracy.
#2 5115 PARK PLACE) (Strong): The reported date is in the future, making it a verifiable error.`;

describe('stored future-date draft repair', () => {
  it('blocks an existing draft when every claimed future date is already valid', () => {
    const repaired = repairUnsupportedFutureDateDraft({
      id: 'letter-1', client_id: 'client-1', auto_generated: true, letter_status: 'draft',
      dispute_reason: rationale, letter_content: 'Printable letter', items_count: 2,
    }, [
      { client_id: 'client-1', creditor_name: 'YENDO INC', date_reported: '2026-08-04' },
      { client_id: 'client-1', creditor_name: '5115 PARK PLACE)', date_reported: '2026-08-05' },
    ], '2026-08-06');

    expect(repaired?.dispute_reason).toBe(INVALID_DATE_DRAFT_NOTICE);
    expect(repaired?.items_count).toBe(0);
    expect(repaired?.letter_content).toContain('blocked');
  });

  it('does not alter a draft containing a genuinely future reporting date', () => {
    expect(repairUnsupportedFutureDateDraft({
      id: 'letter-1', client_id: 'client-1', auto_generated: true, letter_status: 'draft',
      dispute_reason: rationale,
    }, [
      { client_id: 'client-1', creditor_name: 'YENDO INC', date_reported: '2026-08-07' },
      { client_id: 'client-1', creditor_name: '5115 PARK PLACE)', date_reported: '2026-08-05' },
    ], '2026-08-06')).toBeNull();
  });

  it('does not rewrite sent letters', () => {
    expect(repairUnsupportedFutureDateDraft({
      id: 'letter-1', client_id: 'client-1', auto_generated: true, letter_status: 'sent',
      dispute_reason: rationale,
    }, [], '2026-08-06')).toBeNull();
  });
});
