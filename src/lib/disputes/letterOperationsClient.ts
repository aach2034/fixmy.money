import type { LetterRecordSource, OperationalLetterRecord } from './serverLetterOperations';

interface LetterOperationResponse {
  error?: string;
  letters?: OperationalLetterRecord[];
  deletedIds?: string[];
}

async function requestLetterOperation(body: {
  action: 'mark_mailed' | 'delete_drafts';
  source: LetterRecordSource;
  clientId: string;
  letterIds: string[];
}): Promise<LetterOperationResponse> {
  const response = await fetch('/api/dispute-letters/operations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as LetterOperationResponse;
  if (!response.ok) throw new Error(payload.error ?? 'The letter operation could not be completed.');
  return payload;
}

export function markLettersMailed(params: {
  source: LetterRecordSource;
  clientId: string;
  letterIds: string[];
}) {
  return requestLetterOperation({ action: 'mark_mailed', ...params });
}

export function deleteDraftLetters(params: { clientId: string; letterIds: string[] }) {
  return requestLetterOperation({
    action: 'delete_drafts',
    source: 'dispute_letters',
    ...params,
  });
}
