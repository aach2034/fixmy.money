import { currentIsoDate, isFalseFutureDateClaim } from './dateValidation';
import { isUnsupportedMissingReportingDateClaim } from './dateValidation';

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
  generation_error?: string | null;
}

const CLAIMED_ITEM = /^#\d+\s+(.+?)\s+\([^)]+\):\s*(.+)$/;
export const INVALID_DATE_DRAFT_NOTICE = 'This AI rationale was removed because its future-date claims were not supported by the saved reporting dates. Regenerate the draft before using it.';
export const INVALID_DATE_LETTER_NOTICE = 'This draft is blocked because its date-based dispute reasons were not supported by the saved reporting dates. Regenerate the letter before printing or sending it.';
export const INVALID_DATE_GENERATION_ERROR = 'Unsupported future-date rationale removed automatically';
export const INVALID_MISSING_REPORTING_DATE_GENERATION_ERROR = 'Unsupported missing-reporting-date rationale removed automatically';

export function isUnsupportedDateDraft(draft: StoredDraft): boolean {
  return draft.generation_error === INVALID_DATE_GENERATION_ERROR
    || draft.generation_error === INVALID_MISSING_REPORTING_DATE_GENERATION_ERROR
    || draft.dispute_reason === INVALID_DATE_DRAFT_NOTICE
    || draft.letter_content === INVALID_DATE_LETTER_NOTICE;
}

export function repairUnsupportedMissingReportingDateDraft(draft: StoredDraft): StoredDraft | null {
  if (!draft.auto_generated || draft.letter_status !== 'draft') return null;
  if (!isUnsupportedMissingReportingDateClaim(draft.dispute_reason)) return null;
  return {
    ...draft,
    generation_error: INVALID_MISSING_REPORTING_DATE_GENERATION_ERROR,
  };
}

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
    const matchingItems = clientItems.filter(item => normalizedCreditor(item.creditor_name) === creditor);

    // A creditor can appear once per bureau. The rationale stored on legacy
    // drafts does not identify the bureau, so using the first matching row can
    // compare an Experian or TransUnion claim with Equifax's date. Only repair
    // the draft when every bureau record for that creditor disproves the
    // future-date claim. Any genuinely future or missing date keeps the draft
    // available for human review instead of destroying potentially valid work.
    return matchingItems.length > 0 && matchingItems.every(item =>
      isFalseFutureDateClaim(item.date_reported, claim.explanation, today)
    );
  });
  if (!everyClaimIsFalse) return null;

  return {
    ...draft,
    dispute_reason: INVALID_DATE_DRAFT_NOTICE,
    letter_content: INVALID_DATE_LETTER_NOTICE,
    items_count: 0,
  };
}
