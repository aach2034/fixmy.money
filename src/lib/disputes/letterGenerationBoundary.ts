import type { AuthorizedStaffClient } from '@/lib/workspaces/authorization';
import {
  asCanonicalBureau,
  type CanonicalBureau,
  type LetterEvidenceExclusion,
  type StoredNegativeItem,
  type VerifiedLetterEnclosure,
} from './canonicalLetter';

export type LetterEntryPoint = 'management' | 'wizard' | 'round';
export type EvidenceSourceTable = 'negative_items' | 'client_disputes';

export interface RequestedEvidenceSelection {
  id: string;
  source: EvidenceSourceTable;
}

export interface CanonicalLetterGenerationRequest {
  entryPoint: LetterEntryPoint;
  clientId: string;
  bureau?: CanonicalBureau;
  roundNumber?: number;
  evidenceSelections?: RequestedEvidenceSelection[];
  roundId?: string;
  enclosureIds?: string[];
}

export function createEvidenceLetterRequest(input: {
  entryPoint: 'management' | 'wizard';
  clientId: string;
  bureau: CanonicalBureau;
  roundNumber: number;
  evidenceSelections: RequestedEvidenceSelection[];
  enclosureIds?: string[];
}): CanonicalLetterGenerationRequest {
  return {
    entryPoint: input.entryPoint,
    clientId: input.clientId,
    bureau: input.bureau,
    roundNumber: input.roundNumber,
    evidenceSelections: input.evidenceSelections.map(selection => ({ id: selection.id, source: selection.source })),
    enclosureIds: [...(input.enclosureIds ?? [])],
  };
}

export function createRoundLetterRequest(input: {
  clientId: string;
  roundId: string;
  enclosureIds?: string[];
}): CanonicalLetterGenerationRequest {
  return {
    entryPoint: 'round',
    clientId: input.clientId,
    roundId: input.roundId,
    enclosureIds: [...(input.enclosureIds ?? [])],
  };
}

export interface StoredRound {
  id: string;
  owner_id: string;
  client_id: string;
  round_number?: number | null;
}

export interface StoredRoundItem {
  id: string;
  owner_id: string;
  client_id: string;
  round_id: string;
  negative_item_id?: string | null;
  bureau?: string | null;
}

export interface StoredEvidenceDocument {
  id: string;
  owner_id: string;
  client_id: string;
  document_name?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  object_exists?: boolean;
  user_confirmed_facts?: unknown;
}

export interface StoredEvidenceFact {
  id: string;
  owner_id: string;
  client_id: string;
  evidence_document_id?: string | null;
  confirmed_by_user?: boolean | null;
}

export class LetterGenerationBoundaryError extends Error {
  constructor(public readonly code: 'INVALID_REQUEST' | 'ACCESS_DENIED', message: string) {
    super(message);
    this.name = 'LetterGenerationBoundaryError';
  }
}

export function isOwnedEvidenceStoragePath(storagePath: string, workspaceOwnerId: string): boolean {
  if (!storagePath || storagePath.length > 512 || storagePath.startsWith('/') || storagePath.includes('..')) return false;
  const segments = storagePath.split('/');
  return segments.length >= 2 && segments[0] === workspaceOwnerId && segments.every(Boolean);
}

function sameTenant(record: { owner_id?: string | null; client_id?: string | null }, authorization: AuthorizedStaffClient): boolean {
  return record.owner_id === authorization.workspaceOwnerId && record.client_id === authorization.clientId;
}

function exactIds(requested: string[], returned: string[]): boolean {
  const expected = [...new Set(requested)].sort();
  const actual = [...new Set(returned)].sort();
  return expected.length === actual.length && expected.every((value, index) => value === actual[index]);
}

export function bindNegativeEvidenceToTenant(params: {
  authorization: AuthorizedStaffClient;
  requestedIds: string[];
  records: StoredNegativeItem[];
}): StoredNegativeItem[] {
  if (!exactIds(params.requestedIds, params.records.map(record => record.id))) {
    throw new LetterGenerationBoundaryError('ACCESS_DENIED', 'Selected evidence could not be resolved within the authorized client.');
  }
  if (params.records.some(record => !sameTenant(record, params.authorization))) {
    throw new LetterGenerationBoundaryError('ACCESS_DENIED', 'Selected evidence does not belong to the authorized client.');
  }
  return [...params.records].sort((left, right) => left.id.localeCompare(right.id));
}

export function bindLegacyEvidenceToTenant(params: {
  authorization: AuthorizedStaffClient;
  requestedIds: string[];
  records: Array<{ id: string; owner_id?: string | null; staff_client_id?: string | null }>;
}): LetterEvidenceExclusion[] {
  if (!exactIds(params.requestedIds, params.records.map(record => record.id))) {
    throw new LetterGenerationBoundaryError('ACCESS_DENIED', 'Selected legacy evidence could not be resolved.');
  }
  if (params.records.some(record => record.owner_id !== params.authorization.workspaceOwnerId || record.staff_client_id !== params.authorization.clientId)) {
    throw new LetterGenerationBoundaryError('ACCESS_DENIED', 'Selected legacy evidence does not belong to the authorized client.');
  }
  return params.records.map(record => ({
    sourceEvidenceId: record.id,
    code: 'legacy_unstructured_source',
    reason: 'This legacy item has no field-level structured evidence and requires human review.',
  }));
}

export function resolveRoundEvidence(params: {
  authorization: AuthorizedStaffClient;
  requestedRoundId: string;
  round: StoredRound | null;
  roundItems: StoredRoundItem[];
  negativeItems: StoredNegativeItem[];
}): {
  groups: Array<{ bureau: CanonicalBureau; evidenceIds: string[]; exclusions: LetterEvidenceExclusion[] }>;
  unassignedExclusions: LetterEvidenceExclusion[];
} {
  const { authorization, round, requestedRoundId } = params;
  if (!round || round.id !== requestedRoundId || !sameTenant(round, authorization)) {
    throw new LetterGenerationBoundaryError('ACCESS_DENIED', 'Dispute round not found or access denied.');
  }
  if (params.roundItems.some(item => item.round_id !== round.id || !sameTenant(item, authorization))) {
    throw new LetterGenerationBoundaryError('ACCESS_DENIED', 'Dispute round evidence crosses the authorized client boundary.');
  }
  const linkedIds = params.roundItems.map(item => item.negative_item_id).filter((value): value is string => Boolean(value));
  bindNegativeEvidenceToTenant({ authorization, requestedIds: linkedIds, records: params.negativeItems });

  const grouped = new Map<CanonicalBureau, { evidenceIds: string[]; exclusions: LetterEvidenceExclusion[] }>();
  const unassignedExclusions: LetterEvidenceExclusion[] = [];
  for (const item of params.roundItems) {
    const bureau = asCanonicalBureau(item.bureau);
    if (!bureau) {
      unassignedExclusions.push({
        sourceEvidenceId: item.negative_item_id ?? item.id,
        code: 'unsupported_bureau',
        reason: 'This round item does not identify a supported bureau and requires human review.',
      });
      continue;
    }
    const value = grouped.get(bureau) ?? { evidenceIds: [], exclusions: [] };
    if (item.negative_item_id) value.evidenceIds.push(item.negative_item_id);
    else value.exclusions.push({
      sourceEvidenceId: item.id,
      code: 'legacy_unstructured_source',
      reason: 'This round item is not linked to structured stored evidence and requires human review.',
    });
    grouped.set(bureau, value);
  }
  return {
    groups: [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([bureau, value]) => ({
      bureau,
      evidenceIds: [...new Set(value.evidenceIds)].sort(),
      exclusions: value.exclusions.sort((left, right) => left.sourceEvidenceId.localeCompare(right.sourceEvidenceId)),
    })),
    unassignedExclusions: unassignedExclusions.sort((left, right) => left.sourceEvidenceId.localeCompare(right.sourceEvidenceId)),
  };
}

function hasConfirmedFacts(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(fact => {
    if (typeof fact === 'string') return fact.trim().length > 0;
    if (typeof fact === 'number') return Number.isFinite(fact);
    if (!fact || typeof fact !== 'object' || Array.isArray(fact)) return false;
    return Object.values(fact as Record<string, unknown>).some(field => {
      if (typeof field === 'string') return field.trim().length > 0;
      if (typeof field === 'number') return Number.isFinite(field);
      return Boolean(field && typeof field === 'object' && Object.keys(field as Record<string, unknown>).length > 0);
    });
  });
}

export function resolveVerifiedEnclosures(params: {
  authorization: AuthorizedStaffClient;
  requestedIds: string[];
  documents: StoredEvidenceDocument[];
  facts: StoredEvidenceFact[];
}): { enclosures: VerifiedLetterEnclosure[]; exclusions: LetterEvidenceExclusion[] } {
  if (!exactIds(params.requestedIds, params.documents.map(document => document.id))) {
    throw new LetterGenerationBoundaryError('ACCESS_DENIED', 'Selected enclosure could not be resolved within the authorized client.');
  }
  if (params.documents.some(document => !sameTenant(document, params.authorization)) || params.facts.some(fact => !sameTenant(fact, params.authorization))) {
    throw new LetterGenerationBoundaryError('ACCESS_DENIED', 'Selected enclosure evidence crosses the authorized client boundary.');
  }

  const confirmedByDocument = new Map<string, string[]>();
  for (const fact of params.facts) {
    if (!fact.confirmed_by_user || !fact.evidence_document_id) continue;
    confirmedByDocument.set(fact.evidence_document_id, [...(confirmedByDocument.get(fact.evidence_document_id) ?? []), fact.id]);
  }
  const enclosures: VerifiedLetterEnclosure[] = [];
  const exclusions: LetterEvidenceExclusion[] = [];
  for (const document of params.documents) {
    const factIds = [...new Set(confirmedByDocument.get(document.id) ?? [])].sort();
    const stored = document.storage_bucket === 'evidence-documents'
      && document.object_exists === true
      && isOwnedEvidenceStoragePath(document.storage_path ?? '', params.authorization.workspaceOwnerId);
    const verified = factIds.length > 0 || hasConfirmedFacts(document.user_confirmed_facts);
    if (!stored || !verified || !document.document_name?.trim()) {
      exclusions.push({
        sourceEvidenceId: document.id,
        code: 'unverified_enclosure',
        reason: 'The selected document is not both stored and backed by verified evidence.',
      });
      continue;
    }
    enclosures.push({
      documentId: document.id,
      label: document.document_name,
      sourceEvidenceIds: factIds.length > 0 ? factIds : [document.id],
    });
  }
  return { enclosures, exclusions };
}
