import { currentIsoDate, isFalseFutureDateClaim } from './dateValidation';

export interface DraftDateItem {
  client_id?: string | null;
  creditor_name?: string | null;
  date_reported?: string | null;
}

export interface StoredDraft {
  id: string;
  client_id?: string | null;
  auto_generated?: boolean | null;
  letter_status?: string | null;
  dispute_reason?: string | null;
  letter_content?: string | null;
  items_count?: number | null;
}

const CLAIMED_ITEM = /^#\d+\s+(.+?)\s+\([^)]+\):\s*(.+)$/;
export const INVALID_DATE_DRAFT_NOTICE = 'This AI rationale was removed because its future-date claims were not supported by the saved reporting dates. Regenerate the draft before using it.';
export const INVALID_DATE_LETTER_NOTICE = 'This draft is blocked because its date-based dispute reasons were not supported by the saved reporting dates. Regenerate the letter before printing or sending it.';

function normalizedCreditor(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
}

export function repairUnsupportedFutureDateDraft(
  draft: StoredDraft,
  items: DraftDateItem[],
  today = currentIsoDate(),
): StoredDraft | null {
  if (!draft.auto_generated || draft.letter_status !== 'draft') return null;
  const rationale = draft.dispute_reason ?? '';
  const claims = rationale.split('\n').map(line => line.trim()).flatMap(line => {
    const match = line.match(CLAIMED_ITEM);
    return match && /\bfuture/i.test(match[2]) ? [{ creditor: match[1], explanation: match[2] }] : [];
  });
  if (claims.length === 0) return null;

  const clientItems = items.filter(item => item.client_id === draft.client_id);
  const everyClaimIsFalse = claims.every(claim => {
    const creditor = normalizedCreditor(claim.creditor);
    const matchingItem = clientItems.find(item => normalizedCreditor(item.creditor_name) === creditor);
    return matchingItem
      ? isFalseFutureDateClaim(matchingItem.date_reported, claim.explanation, today)
      : false;
  });
  if (!everyClaimIsFalse) return null;

  return {
    ...draft,
    dispute_reason: INVALID_DATE_DRAFT_NOTICE,
    letter_content: INVALID_DATE_LETTER_NOTICE,
    items_count: 0,
  };
}
