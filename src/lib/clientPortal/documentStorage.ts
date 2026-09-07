export const CLIENT_DOCUMENT_BUCKET = 'client-documents';
export const MAX_CLIENT_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const CLIENT_DOCUMENT_FORMATS_LABEL = 'PDF, JPG, PNG, or WEBP';
export const CLIENT_DOCUMENT_SIGNED_URL_TTL_SECONDS = 60;

export type ClientDocumentFormat = 'pdf' | 'jpeg' | 'png' | 'webp';

type FormatRule = {
  format: ClientDocumentFormat;
  mimeType: string;
};

const FORMAT_BY_EXTENSION: Record<string, FormatRule> = {
  '.pdf': { format: 'pdf', mimeType: 'application/pdf' },
  '.jpg': { format: 'jpeg', mimeType: 'image/jpeg' },
  '.jpeg': { format: 'jpeg', mimeType: 'image/jpeg' },
  '.png': { format: 'png', mimeType: 'image/png' },
  '.webp': { format: 'webp', mimeType: 'image/webp' },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ClientDocumentValidation =
  | { valid: true; format: ClientDocumentFormat; extension: string; mimeType: string; safeFileName: string }
  | {
      valid: false;
      code:
        | 'EMPTY_FILE'
        | 'FILE_TOO_LARGE'
        | 'INVALID_FILE_NAME'
        | 'UNSUPPORTED_EXTENSION'
        | 'UNSUPPORTED_FILE_TYPE'
        | 'MIME_EXTENSION_MISMATCH'
        | 'EXECUTABLE_REJECTED'
        | 'INVALID_FILE_SIGNATURE';
      message: string;
    };

function extensionFor(fileName: string): string {
  return fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
}

export function sanitizeClientDocumentFileName(fileName: string): string {
  const normalized = fileName.normalize('NFKC').replace(/[\\/\u0000-\u001f\u007f]/g, '_');
  return normalized
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[._ -]+/, '')
    .slice(0, 160);
}

export function validateClientDocumentMetadata(input: {
  fileName: string;
  mimeType: string;
  size: number;
}): ClientDocumentValidation {
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { valid: false, code: 'EMPTY_FILE', message: 'The document is empty.' };
  }
  if (input.size > MAX_CLIENT_DOCUMENT_BYTES) {
    return { valid: false, code: 'FILE_TOO_LARGE', message: 'The document must be 10 MB or smaller.' };
  }

  const safeFileName = sanitizeClientDocumentFileName(input.fileName);
  if (!safeFileName || safeFileName === '.' || safeFileName === '..') {
    return { valid: false, code: 'INVALID_FILE_NAME', message: 'The document name is invalid.' };
  }

  const extension = extensionFor(safeFileName);
  const rule = FORMAT_BY_EXTENSION[extension];
  if (!rule) {
    return { valid: false, code: 'UNSUPPORTED_EXTENSION', message: `Supported formats: ${CLIENT_DOCUMENT_FORMATS_LABEL}.` };
  }

  const mimeType = input.mimeType.toLowerCase().split(';')[0].trim();
  if (!mimeType) {
    return { valid: false, code: 'UNSUPPORTED_FILE_TYPE', message: 'The document type could not be verified.' };
  }
  if (mimeType !== rule.mimeType) {
    return {
      valid: false,
      code: 'MIME_EXTENSION_MISMATCH',
      message: `The ${extension} extension does not match the reported document type.`,
    };
  }

  return { valid: true, format: rule.format, extension, mimeType, safeFileName };
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

export function validateClientDocumentContent(
  metadata: Extract<ClientDocumentValidation, { valid: true }>,
  bytes: Uint8Array,
): ClientDocumentValidation {
  if (
    startsWith(bytes, [0x4d, 0x5a])
    || startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])
    || startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe])
  ) {
    return { valid: false, code: 'EXECUTABLE_REJECTED', message: 'Executable content is not allowed.' };
  }

  const signatureMatches = metadata.format === 'pdf'
    ? startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
    : metadata.format === 'jpeg'
      ? startsWith(bytes, [0xff, 0xd8, 0xff])
      : metadata.format === 'png'
        ? startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
        : startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
          && bytes.length >= 12
          && startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);

  return signatureMatches
    ? metadata
    : { valid: false, code: 'INVALID_FILE_SIGNATURE', message: 'The document content does not match its declared format.' };
}

function requireUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) throw new Error(`${label} must be a UUID.`);
  return value.toLowerCase();
}

export function buildClientDocumentPath(input: {
  workspaceId: string;
  relationshipId: string;
  uploadId: string;
  safeFileName: string;
}): string {
  const workspaceId = requireUuid(input.workspaceId, 'workspaceId');
  const relationshipId = requireUuid(input.relationshipId, 'relationshipId');
  const uploadId = requireUuid(input.uploadId, 'uploadId');
  const safeFileName = sanitizeClientDocumentFileName(input.safeFileName);
  if (!safeFileName || safeFileName.includes('/')) throw new Error('safeFileName is invalid.');
  return `${workspaceId}/${relationshipId}/${uploadId}/${safeFileName}`;
}

export function isOwnedClientDocumentPath(
  storagePath: string,
  workspaceId: string,
  relationshipId: string,
): boolean {
  if (!storagePath || storagePath.length > 512 || storagePath.includes('..') || storagePath.startsWith('/')) return false;
  const segments = storagePath.split('/');
  return segments.length === 4
    && segments[0]?.toLowerCase() === workspaceId.toLowerCase()
    && segments[1]?.toLowerCase() === relationshipId.toLowerCase()
    && UUID_PATTERN.test(segments[2] ?? '')
    && Boolean(segments[3]);
}

export function resolveClientDocumentStoragePath(input: {
  storedValue: string;
  workspaceId: string;
  relationshipId: string;
  clientAccountId: string;
  supabaseUrl: string;
}): string | null {
  if (isOwnedClientDocumentPath(input.storedValue, input.workspaceId, input.relationshipId)) {
    return input.storedValue;
  }

  let candidate = input.storedValue;
  try {
    const parsed = new URL(input.storedValue);
    if (parsed.origin !== new URL(input.supabaseUrl).origin) return null;
    const markers = [
      `/storage/v1/object/public/${CLIENT_DOCUMENT_BUCKET}/`,
      `/storage/v1/object/sign/${CLIENT_DOCUMENT_BUCKET}/`,
    ];
    const marker = markers.find(value => parsed.pathname.startsWith(value));
    if (!marker) return null;
    candidate = decodeURIComponent(parsed.pathname.slice(marker.length));
  } catch {
    // A relative Storage object path is expected for all remediated uploads.
  }

  if (!candidate || candidate.length > 512 || candidate.includes('..') || candidate.startsWith('/')) return null;
  const segments = candidate.split('/');
  return segments.length >= 3
    && segments[0] === CLIENT_DOCUMENT_BUCKET
    && segments[1]?.toLowerCase() === input.clientAccountId.toLowerCase()
    && segments.slice(2).every(Boolean)
    ? candidate
    : null;
}

export interface StoredClientDocument {
  id: string;
  workspace_client_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  doc_status: string;
}

export interface ClientDocumentUploadDependencies {
  findExisting: (uploadId: string, relationshipId: string) => Promise<StoredClientDocument | null>;
  createPending: (record: StoredClientDocument & { dispute_id: string | null }) => Promise<boolean>;
  uploadObject: (path: string, bytes: Uint8Array, mimeType: string) => Promise<boolean>;
  markUploaded: (uploadId: string, relationshipId: string) => Promise<boolean>;
  removeObject: (path: string) => Promise<boolean>;
  deleteRecord: (uploadId: string, relationshipId: string) => Promise<boolean>;
}

export type ClientDocumentUploadResult =
  | { ok: true; idempotent: boolean; documentId: string; storagePath: string }
  | {
      ok: false;
      code: 'IDEMPOTENCY_CONFLICT' | 'PENDING_CLEANUP_FAILED' | 'METADATA_CREATE_FAILED' | 'STORAGE_WRITE_FAILED' | 'METADATA_FINALIZE_FAILED';
      cleanupComplete: boolean;
    };

async function safeOperation(operation: () => Promise<boolean>): Promise<boolean> {
  try {
    return await operation();
  } catch {
    return false;
  }
}

export async function persistClientDocumentUpload(
  input: {
    uploadId: string;
    relationshipId: string;
    disputeId: string | null;
    fileName: string;
    storagePath: string;
    size: number;
    mimeType: string;
    bytes: Uint8Array;
  },
  dependencies: ClientDocumentUploadDependencies,
): Promise<ClientDocumentUploadResult> {
  const existing = await dependencies.findExisting(input.uploadId, input.relationshipId);
  if (existing?.doc_status === 'uploaded') {
    const sameUpload = existing.file_url === input.storagePath
      && existing.file_name === input.fileName
      && existing.file_size === input.size
      && existing.mime_type === input.mimeType;
    return sameUpload
      ? { ok: true, idempotent: true, documentId: existing.id, storagePath: existing.file_url }
      : { ok: false, code: 'IDEMPOTENCY_CONFLICT', cleanupComplete: true };
  }

  if (existing) {
    if (existing.doc_status !== 'pending' || existing.file_url !== input.storagePath) {
      return { ok: false, code: 'IDEMPOTENCY_CONFLICT', cleanupComplete: true };
    }
    const objectRemoved = await safeOperation(() => dependencies.removeObject(existing.file_url));
    const recordDeleted = await safeOperation(() => dependencies.deleteRecord(existing.id, input.relationshipId));
    if (!objectRemoved || !recordDeleted) {
      return { ok: false, code: 'PENDING_CLEANUP_FAILED', cleanupComplete: false };
    }
  }

  const pendingCreated = await safeOperation(() => dependencies.createPending({
    id: input.uploadId,
    workspace_client_id: input.relationshipId,
    dispute_id: input.disputeId,
    file_name: input.fileName,
    file_url: input.storagePath,
    file_size: input.size,
    mime_type: input.mimeType,
    doc_status: 'pending',
  }));
  if (!pendingCreated) {
    return { ok: false, code: 'METADATA_CREATE_FAILED', cleanupComplete: true };
  }

  const storageWritten = await safeOperation(() => dependencies.uploadObject(input.storagePath, input.bytes, input.mimeType));
  if (!storageWritten) {
    const objectRemoved = await safeOperation(() => dependencies.removeObject(input.storagePath));
    const recordDeleted = await safeOperation(() => dependencies.deleteRecord(input.uploadId, input.relationshipId));
    return { ok: false, code: 'STORAGE_WRITE_FAILED', cleanupComplete: objectRemoved && recordDeleted };
  }

  const finalized = await safeOperation(() => dependencies.markUploaded(input.uploadId, input.relationshipId));
  if (!finalized) {
    const objectRemoved = await safeOperation(() => dependencies.removeObject(input.storagePath));
    const recordDeleted = await safeOperation(() => dependencies.deleteRecord(input.uploadId, input.relationshipId));
    return { ok: false, code: 'METADATA_FINALIZE_FAILED', cleanupComplete: objectRemoved && recordDeleted };
  }

  return { ok: true, idempotent: false, documentId: input.uploadId, storagePath: input.storagePath };
}
