import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { authorizeStaffClient, type AuthorizedStaffClient } from '@/lib/workspaces/authorization';
import {
  asCanonicalBureau,
  buildCanonicalDisputeLetter,
  type CanonicalLetterResult,
  type LetterEvidenceExclusion,
  type StoredNegativeItem,
  type VerifiedLetterEnclosure,
} from '@/lib/disputes/canonicalLetter';
import {
  bindLegacyEvidenceToTenant,
  bindNegativeEvidenceToTenant,
  isOwnedEvidenceStoragePath,
  LetterGenerationBoundaryError,
  resolveRoundEvidence,
  resolveVerifiedEnclosures,
  type CanonicalLetterGenerationRequest,
  type RequestedEvidenceSelection,
  type StoredEvidenceDocument,
  type StoredEvidenceFact,
  type StoredRound,
  type StoredRoundItem,
} from '@/lib/disputes/letterGenerationBoundary';
import { getLetterSenderInfo } from '@/lib/disputes/letterSender';
import { PersonalCapabilityError, requirePersonalWorkspaceCapability } from '@/lib/personalPacket/capabilities';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 16_384;
const MAX_EVIDENCE_SELECTIONS = 100;
const MAX_ENCLOSURES = 25;

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function parseSelections(value: unknown): RequestedEvidenceSelection[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_EVIDENCE_SELECTIONS) return null;
  const selections = value.map(item => {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    if (!isUuid(record.id) || (record.source !== 'negative_items' && record.source !== 'client_disputes')) return null;
    return { id: record.id, source: record.source } satisfies RequestedEvidenceSelection;
  });
  return selections.every(Boolean) ? selections as RequestedEvidenceSelection[] : null;
}

function parseRequest(value: unknown): CanonicalLetterGenerationRequest | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (!isUuid(body.clientId) || !['management', 'wizard', 'round'].includes(String(body.entryPoint))) return null;
  const enclosureIds = body.enclosureIds === undefined ? [] : body.enclosureIds;
  if (!Array.isArray(enclosureIds) || enclosureIds.length > MAX_ENCLOSURES || !enclosureIds.every(isUuid)) return null;
  const roundNumber = body.roundNumber === undefined ? 1 : Number(body.roundNumber);
  if (!Number.isInteger(roundNumber) || roundNumber < 1 || roundNumber > 20) return null;

  if (body.entryPoint === 'round') {
    if (!isUuid(body.roundId)) return null;
    return { entryPoint: 'round', clientId: body.clientId, roundId: body.roundId, enclosureIds };
  }
  const bureau = asCanonicalBureau(body.bureau);
  const evidenceSelections = parseSelections(body.evidenceSelections);
  if (!bureau || !evidenceSelections) return null;
  return {
    entryPoint: body.entryPoint as 'management' | 'wizard',
    clientId: body.clientId,
    bureau,
    roundNumber,
    evidenceSelections,
    enclosureIds,
  };
}

async function authenticateAndAuthorize(clientId: string) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = getAdminClient();
  const authorization = await authorizeStaffClient(admin, user.id, clientId, 'write');
  if (!authorization) return null;
  return { admin, authorization, user };
}

async function loadVerifiedEnclosures(
  admin: ReturnType<typeof getAdminClient>,
  authorization: AuthorizedStaffClient,
  requestedIds: string[],
): Promise<{ enclosures: VerifiedLetterEnclosure[]; exclusions: LetterEvidenceExclusion[] }> {
  if (requestedIds.length === 0) return { enclosures: [], exclusions: [] };
  const { data: documents, error: documentError } = await admin
    .from('evidence_documents')
    .select('id, owner_id, client_id, document_name, storage_bucket, storage_path, user_confirmed_facts')
    .eq('owner_id', authorization.workspaceOwnerId)
    .eq('client_id', authorization.clientId)
    .in('id', requestedIds);
  if (documentError) throw new Error('Selected enclosures could not be verified.');
  const verifiedDocuments = await Promise.all((documents ?? []).map(async document => {
    const bucket = document.storage_bucket ?? '';
    const storagePath = document.storage_path ?? '';
    if (bucket !== 'evidence-documents' || !isOwnedEvidenceStoragePath(storagePath, authorization.workspaceOwnerId)) {
      return { ...document, object_exists: false };
    }
    const { data: exists, error } = await admin.storage.from(bucket).exists(storagePath);
    return { ...document, object_exists: !error && exists === true };
  }));
  const { data: facts, error: factError } = await admin
    .from('evidence_facts')
    .select('id, owner_id, client_id, evidence_document_id, confirmed_by_user')
    .eq('owner_id', authorization.workspaceOwnerId)
    .eq('client_id', authorization.clientId)
    .in('evidence_document_id', requestedIds)
    .eq('confirmed_by_user', true);
  if (factError) throw new Error('Selected enclosure evidence could not be verified.');
  return resolveVerifiedEnclosures({
    authorization,
    requestedIds,
    documents: verifiedDocuments as StoredEvidenceDocument[],
    facts: (facts ?? []) as StoredEvidenceFact[],
  });
}

async function loadNegativeEvidence(
  admin: ReturnType<typeof getAdminClient>,
  authorization: AuthorizedStaffClient,
  requestedIds: string[],
): Promise<{ selected: StoredNegativeItem[]; context: StoredNegativeItem[] }> {
  if (requestedIds.length === 0) return { selected: [], context: [] };
  const { data: selected, error: selectedError } = await admin
    .from('negative_items')
    .select('*')
    .eq('owner_id', authorization.workspaceOwnerId)
    .eq('client_id', authorization.clientId)
    .in('id', requestedIds);
  if (selectedError) throw new Error('Selected evidence could not be loaded.');
  const bound = bindNegativeEvidenceToTenant({ authorization, requestedIds, records: (selected ?? []) as StoredNegativeItem[] });
  const contextQuery = admin
    .from('negative_items')
    .select('*')
    .eq('owner_id', authorization.workspaceOwnerId)
    .eq('client_id', authorization.clientId);
  const { data: context, error: contextError } = await contextQuery;
  if (contextError) throw new Error('Stored evidence context could not be loaded.');
  const contextRows = (context ?? []) as StoredNegativeItem[];
  const contextIds = contextRows.map(row => row.id);
  const { data: links, error: linkError } = contextIds.length > 0
    ? await admin
      .from('bureau_tradelines')
      .select('owner_id, client_id, source_negative_item_id, credit_account_id')
      .eq('owner_id', authorization.workspaceOwnerId)
      .eq('client_id', authorization.clientId)
      .in('source_negative_item_id', contextIds)
    : { data: [], error: null };
  if (linkError) throw new Error('Stored account provenance could not be loaded.');
  const accountIdsBySource = new Map<string, Set<string>>();
  for (const link of links ?? []) {
    if (!link.source_negative_item_id || !link.credit_account_id) continue;
    const ids = accountIdsBySource.get(link.source_negative_item_id) ?? new Set<string>();
    ids.add(link.credit_account_id);
    accountIdsBySource.set(link.source_negative_item_id, ids);
  }
  const linkedContext = contextRows.map(row => {
    const accountIds = accountIdsBySource.get(row.id);
    return { ...row, credit_account_id: accountIds?.size === 1 ? [...accountIds][0] : null };
  });
  return { selected: bound, context: linkedContext };
}

async function loadLegacyExclusions(
  admin: ReturnType<typeof getAdminClient>,
  authorization: AuthorizedStaffClient,
  requestedIds: string[],
): Promise<LetterEvidenceExclusion[]> {
  if (requestedIds.length === 0) return [];
  const { data, error } = await admin
    .from('client_disputes')
    .select('id, owner_id, staff_client_id')
    .eq('owner_id', authorization.workspaceOwnerId)
    .eq('staff_client_id', authorization.clientId)
    .in('id', requestedIds);
  if (error) throw new Error('Legacy evidence could not be loaded.');
  return bindLegacyEvidenceToTenant({ authorization, requestedIds, records: data ?? [] });
}

interface PreparedLetter {
  result: CanonicalLetterResult;
  reference: string;
  recordId: string;
  selectedEvidenceIds: string[];
}

function provenanceMetadata(prepared: PreparedLetter, table: 'dispute_letters' | 'generated_dispute_letters') {
  return {
    schema_version: 2,
    builder: 'canonical_bureau_letter',
    letter_table: table,
    letter_record_id: prepared.recordId,
    letter_reference: prepared.reference,
    bureau: prepared.result.bureau,
    paragraphs: prepared.result.paragraphs,
    enclosures: prepared.result.enclosures,
    exclusions: prepared.result.exclusions,
  };
}

function uniqueExclusions(exclusions: LetterEvidenceExclusion[]): LetterEvidenceExclusion[] {
  const unique = new Map<string, LetterEvidenceExclusion>();
  for (const value of exclusions) {
    unique.set(`${value.sourceEvidenceId}:${value.code}`, value);
  }
  return [...unique.values()].sort((left, right) =>
    left.sourceEvidenceId.localeCompare(right.sourceEvidenceId)
      || left.code.localeCompare(right.code));
}

async function persistPreparedLetters(params: {
  admin: ReturnType<typeof getAdminClient>;
  authorization: AuthorizedStaffClient;
  entryPoint: CanonicalLetterGenerationRequest['entryPoint'];
  actorUserId: string;
  clientName: string;
  roundId?: string;
  roundNumber: number;
  prepared: PreparedLetter[];
}) {
  const table = params.entryPoint === 'round' ? 'generated_dispute_letters' : 'dispute_letters';
  const auditRows = params.prepared.map(value => ({
    owner_id: params.authorization.workspaceOwnerId,
    client_id: params.authorization.clientId,
    action: 'dispute_generated',
    actor_name: '',
    actor_email: '',
    actor_ip: '',
    description: `Evidence-specific ${value.result.bureau} dispute draft generated`,
    metadata: { ...provenanceMetadata(value, table), actor_user_id: params.actorUserId },
  }));
  const { data: audits, error: auditError } = await params.admin.from('audit_logs').insert(auditRows).select('id');
  if (auditError || (audits?.length ?? 0) !== auditRows.length) throw new Error('Letter provenance could not be recorded. No letter was saved.');
  const auditIds = (audits ?? []).map(value => value.id);

  const now = new Date().toISOString();
  const insertion = params.entryPoint === 'round'
    ? await params.admin.from('generated_dispute_letters').insert(params.prepared.map(value => ({
      id: value.recordId,
      owner_id: params.authorization.workspaceOwnerId,
      client_id: params.authorization.clientId,
      round_id: params.roundId,
      bureau: value.result.bureau,
      letter_content: value.result.letterContent,
      items_count: value.result.paragraphs.length,
      items_summary: provenanceMetadata(value, 'generated_dispute_letters'),
      status: 'generated',
      response_due_date: null,
      days_remaining: 0,
    })))
    : await params.admin.from('dispute_letters').insert(params.prepared.map(value => ({
      id: value.recordId,
      owner_id: params.authorization.workspaceOwnerId,
      client_id: params.authorization.clientId,
      workspace_id: params.authorization.workspaceId,
      letter_id: value.reference,
      client_name: params.clientName,
      bureau: value.result.bureau,
      items_count: value.result.paragraphs.length,
      round: params.roundNumber,
      sent_date: null,
      response_due_date: null,
      days_remaining: 0,
      letter_status: 'draft',
      template: 'Evidence-specific bureau dispute',
      auto_generated: false,
      letter_content: value.result.letterContent,
      generated_at: now,
    })));
  const letterError = insertion.error;
  if (letterError) {
    const { error: cleanupError } = await params.admin.from('audit_logs').delete().in('id', auditIds);
    if (cleanupError) console.error('[CanonicalLetter] Audit compensation failed', { auditCount: auditIds.length });
    throw new Error('The canonical letter could not be saved.');
  }

  const evidenceIds = [...new Set(params.prepared.flatMap(value => {
    const provenanceIds = new Set(value.result.paragraphs.flatMap(paragraph => paragraph.sourceEvidenceIds));
    return value.selectedEvidenceIds.filter(id => provenanceIds.has(id));
  }))];
  if (evidenceIds.length > 0) {
    const { error } = await params.admin
      .from('negative_items')
      .update({ dispute_status: 'generated' })
      .in('id', evidenceIds)
      .eq('owner_id', params.authorization.workspaceOwnerId)
      .eq('client_id', params.authorization.clientId);
    if (error) console.error('[CanonicalLetter] Source status update failed', { evidenceCount: evidenceIds.length });
  }
  if (params.entryPoint === 'round' && params.roundId) {
    const itemStatusUpdate = evidenceIds.length > 0
      ? params.admin
        .from('dispute_round_items')
        .update({ status: 'generated' })
        .eq('round_id', params.roundId)
        .in('negative_item_id', evidenceIds)
        .eq('owner_id', params.authorization.workspaceOwnerId)
        .eq('client_id', params.authorization.clientId)
      : Promise.resolve({ error: null });
    const [{ error: roundError }, { error: itemError }] = await Promise.all([
      params.admin
        .from('dispute_rounds')
        .update({ status: 'generated', letters_generated: params.prepared.length, updated_at: now })
        .eq('id', params.roundId)
        .eq('owner_id', params.authorization.workspaceOwnerId)
        .eq('client_id', params.authorization.clientId),
      itemStatusUpdate,
    ]);
    if (roundError || itemError) console.error('[CanonicalLetter] Round status update failed', { roundId: params.roundId });
  }
  return params.prepared.map(value => ({
    id: value.recordId,
    reference: value.reference,
    bureau: value.result.bureau,
    letterContent: value.result.letterContent,
    itemsCount: value.result.paragraphs.length,
    status: 'generated',
    mailedAt: null,
    responseDueDate: null,
    provenance: value.result.paragraphs,
    exclusions: value.result.exclusions,
  }));
}

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId || !isUuid(clientId)) return json({ error: 'Invalid client.' }, 400);
  const context = await authenticateAndAuthorize(clientId);
  if (!context) return json({ error: 'Client not found or access denied.' }, 403);
  const { data: documents, error } = await context.admin
    .from('evidence_documents')
    .select('id')
    .eq('owner_id', context.authorization.workspaceOwnerId)
    .eq('client_id', context.authorization.clientId)
    .order('document_name');
  if (error) return json({ error: 'Verified documents could not be loaded.' }, 500);
  const ids = (documents ?? []).map(value => value.id);
  const resolved = await loadVerifiedEnclosures(context.admin, context.authorization, ids);
  return json({ documents: resolved.enclosures.map(value => ({ id: value.documentId, label: value.label })) });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return json({ error: 'Cross-site letter generation is not allowed.' }, 403);
  const raw = await request.text();
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'Invalid letter request.' }, 400);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid letter request.' }, 400);
  }
  const body = parseRequest(parsed);
  if (!body) return json({ error: 'Invalid letter request.' }, 400);

  try {
    const context = await authenticateAndAuthorize(body.clientId);
    if (!context) return json({ error: 'Client not found or access denied.' }, 403);
    await requirePersonalWorkspaceCapability({
      workspaceId: context.authorization.workspaceId,
      consumerId: context.authorization.workspaceOwnerId,
      capability: 'dispute_generation',
    });
    const { data: client, error: clientError } = await context.admin
      .from('staff_clients')
      .select('id, owner_id, workspace_id, name, email, phone, address, city, state, zip')
      .eq('id', context.authorization.clientId)
      .maybeSingle();
    if (
      clientError
      || !client
      || client.id !== context.authorization.clientId
      || client.owner_id !== context.authorization.workspaceOwnerId
      || client.workspace_id !== context.authorization.workspaceId
    ) {
      return json({ error: 'Client not found or access denied.' }, 403);
    }
    const sender = getLetterSenderInfo(client);
    if (!sender) return json({ error: 'The client needs a complete mailing address before a letter can be generated.' }, 400);
    const enclosureResult = await loadVerifiedEnclosures(context.admin, context.authorization, body.enclosureIds ?? []);
    const generatedOn = new Date();
    let roundNumber = body.roundNumber ?? 1;
    let prepared: PreparedLetter[] = [];
    let requestExclusions: LetterEvidenceExclusion[] = [];

    if (body.entryPoint === 'round') {
      const { data: roundData, error: roundError } = await context.admin
        .from('dispute_rounds')
        .select('id, owner_id, client_id, round_number')
        .eq('owner_id', context.authorization.workspaceOwnerId)
        .eq('client_id', context.authorization.clientId)
        .eq('id', body.roundId!)
        .maybeSingle();
      if (roundError) throw new Error('Dispute round could not be loaded.');
      const { data: roundItems, error: itemError } = await context.admin
        .from('dispute_round_items')
        .select('id, owner_id, client_id, round_id, negative_item_id, bureau')
        .eq('owner_id', context.authorization.workspaceOwnerId)
        .eq('client_id', context.authorization.clientId)
        .eq('round_id', body.roundId!);
      if (itemError) throw new Error('Dispute round evidence could not be loaded.');
      const linkedIds = [...new Set((roundItems ?? []).map(value => value.negative_item_id).filter((value): value is string => Boolean(value)))];
      const evidence = await loadNegativeEvidence(context.admin, context.authorization, linkedIds);
      const roundEvidence = resolveRoundEvidence({
        authorization: context.authorization,
        requestedRoundId: body.roundId!,
        round: roundData as StoredRound | null,
        roundItems: (roundItems ?? []) as StoredRoundItem[],
        negativeItems: evidence.selected,
      });
      requestExclusions = roundEvidence.unassignedExclusions;
      roundNumber = Math.max(1, Number(roundData?.round_number ?? 1));
      prepared = roundEvidence.groups.map(group => {
        const reference = `${group.bureau.slice(0, 2).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
        const result = buildCanonicalDisputeLetter({
          sender,
          bureau: group.bureau,
          letterReference: reference,
          generatedOn,
          selectedEvidenceIds: group.evidenceIds,
          evidenceRows: evidence.context,
          enclosures: enclosureResult.enclosures,
          priorExclusions: [
            ...group.exclusions,
            ...enclosureResult.exclusions,
          ],
        });
        return { result, reference, recordId: randomUUID(), selectedEvidenceIds: group.evidenceIds };
      });
    } else {
      const selections = body.evidenceSelections ?? [];
      const negativeIds = selections.filter(value => value.source === 'negative_items').map(value => value.id);
      const legacyIds = selections.filter(value => value.source === 'client_disputes').map(value => value.id);
      const [evidence, legacyExclusions] = await Promise.all([
        loadNegativeEvidence(context.admin, context.authorization, negativeIds),
        loadLegacyExclusions(context.admin, context.authorization, legacyIds),
      ]);
      const bureau = body.bureau!;
      const reference = `${bureau.slice(0, 2).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      const result = buildCanonicalDisputeLetter({
        sender,
        bureau,
        letterReference: reference,
        generatedOn,
        selectedEvidenceIds: negativeIds,
        evidenceRows: evidence.context,
        enclosures: enclosureResult.enclosures,
        priorExclusions: [...legacyExclusions, ...enclosureResult.exclusions],
      });
      prepared = [{ result, reference, recordId: randomUUID(), selectedEvidenceIds: negativeIds }];
    }

    const ready = prepared.filter(value => value.result.status === 'ready');
    const allExclusions = uniqueExclusions([
      ...requestExclusions,
      ...prepared.flatMap(value => value.result.exclusions),
    ]);
    if (ready.length === 0) return json({ status: 'review_required', letters: [], exclusions: allExclusions });
    const letters = await persistPreparedLetters({
      admin: context.admin,
      authorization: context.authorization,
      entryPoint: body.entryPoint,
      actorUserId: context.user.id,
      clientName: sender.name,
      roundId: body.roundId,
      roundNumber,
      prepared: ready,
    });
    return json({ status: 'ready', letters, exclusions: allExclusions });
  } catch (error) {
    if (error instanceof PersonalCapabilityError) return json({ error: error.code }, error.status);
    if (error instanceof LetterGenerationBoundaryError) {
      return json({ error: 'Selected evidence not found or access denied.' }, error.code === 'ACCESS_DENIED' ? 403 : 400);
    }
    console.error('[CanonicalLetter] Generation failed', { message: error instanceof Error ? error.message : 'unknown error' });
    return json({ error: 'Letter generation failed.' }, 500);
  }
}
