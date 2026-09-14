import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isUnsupportedDateDraft,
  repairUnsupportedFutureDateDraft,
  repairUnsupportedMissingReportingDateDraft,
  type DraftDateItem,
} from '@/lib/creditReport/staleDrafts';
import {
  authorizeStaffClient,
  type AuthorizedStaffClient,
} from '@/lib/workspaces/authorization';

export type LetterRecordSource = 'dispute_letters' | 'generated_dispute_letters';

interface DisputeLetterRecord {
  id: string;
  owner_id: string;
  client_id: string | null;
  workspace_id: string | null;
  letter_status: string;
  sent_date?: string | null;
  response_due_date?: string | null;
  days_remaining?: number | null;
  generation_error?: string | null;
  auto_generated?: boolean | null;
  dispute_reason?: string | null;
  letter_content?: string | null;
}

interface GeneratedLetterRecord {
  id: string;
  owner_id: string;
  client_id: string | null;
  round_id: string | null;
  status: string;
  mailed_at?: string | null;
}

export type OperationalLetterRecord = DisputeLetterRecord | GeneratedLetterRecord;

export class LetterOperationError extends Error {
  constructor(
    public readonly status: 400 | 403 | 404 | 409 | 500,
    message: string,
  ) {
    super(message);
    this.name = 'LetterOperationError';
  }
}

function exactIds(requested: string[], returned: string[]): boolean {
  const expected = [...new Set(requested)].sort();
  const actual = [...new Set(returned)].sort();
  return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
}

export async function authorizeLetterClient(params: {
  admin: SupabaseClient;
  actorUserId: string;
  clientId: string;
}): Promise<AuthorizedStaffClient> {
  const authorization = await authorizeStaffClient(
    params.admin,
    params.actorUserId,
    params.clientId,
    'write',
  );
  if (!authorization) {
    throw new LetterOperationError(403, 'Client not found or access denied.');
  }
  return authorization;
}

async function loadAuthorizedRows(params: {
  admin: SupabaseClient;
  authorization: AuthorizedStaffClient;
  source: LetterRecordSource;
  letterIds: string[];
}): Promise<OperationalLetterRecord[]> {
  const query = params.source === 'dispute_letters'
    ? params.admin
      .from('dispute_letters')
      .select('id, owner_id, client_id, workspace_id, letter_status, sent_date, response_due_date, days_remaining, generation_error, auto_generated, dispute_reason, letter_content')
      .eq('owner_id', params.authorization.workspaceOwnerId)
      .eq('client_id', params.authorization.clientId)
      .eq('workspace_id', params.authorization.workspaceId)
      .in('id', params.letterIds)
    : params.admin
      .from('generated_dispute_letters')
      .select('id, owner_id, client_id, round_id, status, mailed_at')
      .eq('owner_id', params.authorization.workspaceOwnerId)
      .eq('client_id', params.authorization.clientId)
      .in('id', params.letterIds);
  const { data, error } = await query;
  if (error) throw new LetterOperationError(500, 'Letters could not be loaded.');
  const rows = (data ?? []) as OperationalLetterRecord[];
  if (!exactIds(params.letterIds, rows.map(row => row.id))) {
    throw new LetterOperationError(404, 'Letter not found or access denied.');
  }
  return rows;
}

async function validateGeneratedRounds(params: {
  admin: SupabaseClient;
  authorization: AuthorizedStaffClient;
  rows: GeneratedLetterRecord[];
}) {
  const roundIds = [...new Set(params.rows.map(row => row.round_id).filter((value): value is string => Boolean(value)))];
  if (roundIds.length === 0) return [];
  const { data, error } = await params.admin
    .from('dispute_rounds')
    .select('id, owner_id, client_id')
    .eq('owner_id', params.authorization.workspaceOwnerId)
    .eq('client_id', params.authorization.clientId)
    .in('id', roundIds);
  if (error || !exactIds(roundIds, (data ?? []).map(row => row.id))) {
    throw new LetterOperationError(409, 'The linked dispute round could not be verified.');
  }
  return roundIds;
}

async function assertDisputeDraftsSafe(params: {
  admin: SupabaseClient;
  authorization: AuthorizedStaffClient;
  rows: DisputeLetterRecord[];
}) {
  const drafts = params.rows.filter(row => row.letter_status === 'draft');
  if (drafts.some(isUnsupportedDateDraft)) {
    throw new LetterOperationError(409, 'This draft requires regeneration before mailing.');
  }
  const legacyDrafts = drafts.filter(row => row.auto_generated === true);
  if (legacyDrafts.length === 0) return;
  const { data, error } = await params.admin
    .from('negative_items')
    .select('client_id, creditor_name, date_reported')
    .eq('owner_id', params.authorization.workspaceOwnerId)
    .eq('client_id', params.authorization.clientId);
  if (error) throw new LetterOperationError(500, 'Stored date evidence could not be verified.');
  const dateItems = (data ?? []) as DraftDateItem[];
  const unsafe = legacyDrafts.some(row =>
    repairUnsupportedMissingReportingDateDraft(row)
      || repairUnsupportedFutureDateDraft(row, dateItems));
  if (unsafe) {
    throw new LetterOperationError(409, 'This draft requires regeneration before mailing.');
  }
}

async function loadMailableRows(params: {
  admin: SupabaseClient;
  authorization: AuthorizedStaffClient;
  source: LetterRecordSource;
  letterIds: string[];
}): Promise<{ rows: OperationalLetterRecord[]; roundIds: string[] }> {
  const rows = await loadAuthorizedRows(params);
  if (params.source === 'dispute_letters') {
    const typedRows = rows as DisputeLetterRecord[];
    if (typedRows.some(row => row.letter_status !== 'draft' && row.letter_status !== 'sent')) {
      throw new LetterOperationError(409, 'Only a draft letter may be marked as mailed.');
    }
    await assertDisputeDraftsSafe({
      admin: params.admin,
      authorization: params.authorization,
      rows: typedRows,
    });
    return { rows, roundIds: [] };
  }
  const typedRows = rows as GeneratedLetterRecord[];
  if (typedRows.some(row => row.status !== 'generated' && row.status !== 'sent')) {
    throw new LetterOperationError(409, 'Only a generated letter may be marked as mailed.');
  }
  const pending = typedRows.filter(row => row.status === 'generated');
  const roundIds = pending.length > 0
    ? await validateGeneratedRounds({
      admin: params.admin,
      authorization: params.authorization,
      rows: pending,
    })
    : [];
  return { rows, roundIds };
}

export async function assertLettersMailable(params: {
  admin: SupabaseClient;
  authorization: AuthorizedStaffClient;
  source: LetterRecordSource;
  letterIds: string[];
}): Promise<void> {
  await loadMailableRows(params);
}

export async function markLettersMailed(params: {
  admin: SupabaseClient;
  authorization: AuthorizedStaffClient;
  source: LetterRecordSource;
  letterIds: string[];
}): Promise<OperationalLetterRecord[]> {
  const { rows } = await loadMailableRows(params);
  if (params.source === 'dispute_letters') {
    const typedRows = rows as DisputeLetterRecord[];
    const pendingIds = typedRows.filter(row => row.letter_status === 'draft').map(row => row.id);
    if (pendingIds.length === 0) return typedRows;
    const { error } = await params.admin.rpc('mark_dispute_letters_mailed_server', {
      p_source: params.source,
      p_owner_id: params.authorization.workspaceOwnerId,
      p_client_id: params.authorization.clientId,
      p_workspace_id: params.authorization.workspaceId,
      p_letter_ids: params.letterIds,
    });
    if (error) {
      throw new LetterOperationError(409, 'Letter status changed before it could be marked as mailed.');
    }
    return loadAuthorizedRows(params);
  }

  const typedRows = rows as GeneratedLetterRecord[];
  const pending = typedRows.filter(row => row.status === 'generated');
  if (pending.length === 0) return typedRows;
  const { error } = await params.admin.rpc('mark_dispute_letters_mailed_server', {
    p_source: params.source,
    p_owner_id: params.authorization.workspaceOwnerId,
    p_client_id: params.authorization.clientId,
    p_workspace_id: params.authorization.workspaceId,
    p_letter_ids: params.letterIds,
  });
  if (error) {
    throw new LetterOperationError(409, 'Letter status changed before it could be marked as mailed.');
  }
  return loadAuthorizedRows(params);
}

export async function deleteDraftLetters(params: {
  admin: SupabaseClient;
  authorization: AuthorizedStaffClient;
  letterIds: string[];
}): Promise<string[]> {
  const rows = await loadAuthorizedRows({ ...params, source: 'dispute_letters' }) as DisputeLetterRecord[];
  if (rows.some(row => row.letter_status !== 'draft')) {
    throw new LetterOperationError(409, 'Only draft letters may be deleted.');
  }
  const { data: mailings, error: mailingError } = await params.admin
    .from('certified_mailings')
    .select('dispute_letter_id')
    .in('dispute_letter_id', params.letterIds);
  if (mailingError) throw new LetterOperationError(500, 'Mailing history could not be verified.');
  if ((mailings ?? []).length > 0) {
    throw new LetterOperationError(409, 'A letter with mailing history cannot be deleted.');
  }
  const { data, error } = await params.admin
    .from('dispute_letters')
    .delete()
    .eq('owner_id', params.authorization.workspaceOwnerId)
    .eq('client_id', params.authorization.clientId)
    .eq('workspace_id', params.authorization.workspaceId)
    .eq('letter_status', 'draft')
    .in('id', params.letterIds)
    .select('id');
  if (error || !exactIds(params.letterIds, (data ?? []).map(row => row.id))) {
    throw new LetterOperationError(409, 'Draft status changed before deletion completed.');
  }
  return (data ?? []).map(row => row.id);
}
