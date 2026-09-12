import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  buildClientDocumentPath,
  deleteClientDocument,
  isOwnedClientDocumentPath,
  persistClientDocumentUpload,
  replaceClientDocument,
  resolveClientDocumentStoragePath,
  validateClientDocumentContent,
  validateClientDocumentMetadata,
  type ClientDocumentUploadDependencies,
  type StoredClientDocument,
} from '@/lib/clientPortal/documentStorage';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const relationshipId = '22222222-2222-4222-8222-222222222222';
const uploadId = '33333333-3333-4333-8333-333333333333';
const storagePath = `${workspaceId}/${relationshipId}/${uploadId}/report.pdf`;

function validMetadata(fileName = 'report.pdf', mimeType = 'application/pdf', size = 100) {
  const result = validateClientDocumentMetadata({ fileName, mimeType, size });
  if (!result.valid) throw new Error(`Expected valid metadata, received ${result.code}`);
  return result;
}

function dependencies(overrides: Partial<ClientDocumentUploadDependencies> = {}) {
  const base: ClientDocumentUploadDependencies = {
    findExisting: vi.fn(async () => null),
    createPending: vi.fn(async () => true),
    uploadObject: vi.fn(async () => true),
    markUploaded: vi.fn(async () => true),
    removeObject: vi.fn(async () => true),
    deleteRecord: vi.fn(async () => true),
  };
  return { ...base, ...overrides };
}

function workflowInput() {
  return {
    uploadId,
    relationshipId,
    disputeId: null,
    fileName: 'report.pdf',
    storagePath,
    size: 100,
    mimeType: 'application/pdf',
    bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
  };
}

describe('FMM-006 strict document validation', () => {
  it.each([
    ['report.pdf', 'application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]],
    ['photo.jpg', 'image/jpeg', [0xff, 0xd8, 0xff]],
    ['scan.png', 'image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ['scan.webp', 'image/webp', [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ] as const)('accepts a signature-matched %s document', (fileName, mimeType, signature) => {
    const metadata = validMetadata(fileName, mimeType);
    expect(validateClientDocumentContent(metadata, new Uint8Array(signature))).toMatchObject({ valid: true });
  });

  it('rejects empty, oversized, unsupported, mismatched, disguised, and executable files', () => {
    expect(validateClientDocumentMetadata({ fileName: 'report.pdf', mimeType: 'application/pdf', size: 0 })).toMatchObject({ valid: false, code: 'EMPTY_FILE' });
    expect(validateClientDocumentMetadata({ fileName: 'report.pdf', mimeType: 'application/pdf', size: 10 * 1024 * 1024 + 1 })).toMatchObject({ valid: false, code: 'FILE_TOO_LARGE' });
    expect(validateClientDocumentMetadata({ fileName: 'report.exe', mimeType: 'application/octet-stream', size: 10 })).toMatchObject({ valid: false, code: 'UNSUPPORTED_EXTENSION' });
    expect(validateClientDocumentMetadata({ fileName: 'report.pdf', mimeType: 'image/png', size: 10 })).toMatchObject({ valid: false, code: 'MIME_EXTENSION_MISMATCH' });
    expect(validateClientDocumentContent(validMetadata(), new TextEncoder().encode('not a pdf'))).toMatchObject({ valid: false, code: 'INVALID_FILE_SIGNATURE' });
    expect(validateClientDocumentContent(validMetadata(), new Uint8Array([0x4d, 0x5a, 0, 0]))).toMatchObject({ valid: false, code: 'EXECUTABLE_REJECTED' });
  });

  it('builds one canonical tenant path and rejects cross-tenant or traversal paths', () => {
    expect(buildClientDocumentPath({ workspaceId, relationshipId, uploadId, safeFileName: '../report.pdf' })).toBe(storagePath);
    expect(isOwnedClientDocumentPath(storagePath, workspaceId, relationshipId)).toBe(true);
    expect(isOwnedClientDocumentPath(storagePath, workspaceId, '44444444-4444-4444-8444-444444444444')).toBe(false);
    expect(isOwnedClientDocumentPath(`${workspaceId}/${relationshipId}/../report.pdf`, workspaceId, relationshipId)).toBe(false);
  });

  it('allows only identity-bound legacy private paths during the migration window', () => {
    const clientAccountId = '55555555-5555-4555-8555-555555555555';
    const supabaseUrl = 'https://project.supabase.co';
    const legacyPath = `client-documents/${clientAccountId}/1700000000-report.pdf`;
    expect(resolveClientDocumentStoragePath({ storedValue: legacyPath, workspaceId, relationshipId, clientAccountId, supabaseUrl })).toBe(legacyPath);
    expect(resolveClientDocumentStoragePath({
      storedValue: `${supabaseUrl}/storage/v1/object/public/client-documents/${legacyPath}`,
      workspaceId,
      relationshipId,
      clientAccountId,
      supabaseUrl,
    })).toBe(legacyPath);
    expect(resolveClientDocumentStoragePath({
      storedValue: 'https://attacker.example/storage/v1/object/public/client-documents/' + legacyPath,
      workspaceId,
      relationshipId,
      clientAccountId,
      supabaseUrl,
    })).toBeNull();
    expect(resolveClientDocumentStoragePath({
      storedValue: `client-documents/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/report.pdf`,
      workspaceId,
      relationshipId,
      clientAccountId,
      supabaseUrl,
    })).toBeNull();
  });
});

describe('FMM-006 durable upload workflow', () => {
  it('reports success only after pending metadata, durable storage, and finalization succeed', async () => {
    const order: string[] = [];
    const deps = dependencies({
      createPending: vi.fn(async () => { order.push('pending'); return true; }),
      uploadObject: vi.fn(async () => { order.push('storage'); return true; }),
      markUploaded: vi.fn(async () => { order.push('finalized'); return true; }),
    });
    await expect(persistClientDocumentUpload(workflowInput(), deps)).resolves.toMatchObject({ ok: true, idempotent: false });
    expect(order).toEqual(['pending', 'storage', 'finalized']);
  });

  it('fails closed and compensates when storage fails', async () => {
    const deps = dependencies({ uploadObject: vi.fn(async () => false) });
    await expect(persistClientDocumentUpload(workflowInput(), deps)).resolves.toEqual({
      ok: false,
      code: 'STORAGE_WRITE_FAILED',
      cleanupComplete: true,
    });
    expect(deps.markUploaded).not.toHaveBeenCalled();
    expect(deps.removeObject).toHaveBeenCalledWith(storagePath);
    expect(deps.deleteRecord).toHaveBeenCalledWith(uploadId, relationshipId);
  });

  it('retains pending metadata when an uncertain failed upload cannot be removed', async () => {
    const deps = dependencies({
      uploadObject: vi.fn(async () => false),
      removeObject: vi.fn(async () => false),
    });
    await expect(persistClientDocumentUpload(workflowInput(), deps)).resolves.toEqual({
      ok: false,
      code: 'STORAGE_WRITE_FAILED',
      cleanupComplete: false,
    });
    expect(deps.deleteRecord).not.toHaveBeenCalled();
  });

  it('never attempts an object write when pending metadata creation fails', async () => {
    const deps = dependencies({ createPending: vi.fn(async () => false) });
    await expect(persistClientDocumentUpload(workflowInput(), deps)).resolves.toEqual({
      ok: false,
      code: 'METADATA_CREATE_FAILED',
      cleanupComplete: true,
    });
    expect(deps.uploadObject).not.toHaveBeenCalled();
    expect(deps.removeObject).not.toHaveBeenCalled();
  });

  it('removes the object and pending row when metadata finalization fails', async () => {
    const deps = dependencies({ markUploaded: vi.fn(async () => false) });
    await expect(persistClientDocumentUpload(workflowInput(), deps)).resolves.toMatchObject({
      ok: false,
      code: 'METADATA_FINALIZE_FAILED',
      cleanupComplete: true,
    });
    expect(deps.removeObject).toHaveBeenCalledWith(storagePath);
    expect(deps.deleteRecord).toHaveBeenCalledWith(uploadId, relationshipId);
  });

  it('retains pending metadata when finalization cleanup cannot remove the object', async () => {
    const deps = dependencies({
      markUploaded: vi.fn(async () => false),
      removeObject: vi.fn(async () => false),
    });
    await expect(persistClientDocumentUpload(workflowInput(), deps)).resolves.toEqual({
      ok: false,
      code: 'METADATA_FINALIZE_FAILED',
      cleanupComplete: false,
    });
    expect(deps.deleteRecord).not.toHaveBeenCalled();
  });

  it('returns an idempotent success for the same completed upload without writing again', async () => {
    const existing: StoredClientDocument = {
      id: uploadId,
      workspace_client_id: relationshipId,
      file_name: 'report.pdf',
      file_url: storagePath,
      file_size: 100,
      mime_type: 'application/pdf',
      doc_status: 'uploaded',
    };
    const deps = dependencies({ findExisting: vi.fn(async () => existing) });
    await expect(persistClientDocumentUpload(workflowInput(), deps)).resolves.toMatchObject({ ok: true, idempotent: true });
    expect(deps.createPending).not.toHaveBeenCalled();
    expect(deps.uploadObject).not.toHaveBeenCalled();
  });

  it('cleans an interrupted pending attempt before retrying and fails if cleanup is incomplete', async () => {
    const pending: StoredClientDocument = {
      id: uploadId,
      workspace_client_id: relationshipId,
      file_name: 'report.pdf',
      file_url: storagePath,
      file_size: 100,
      mime_type: 'application/pdf',
      doc_status: 'pending',
    };
    const retry = dependencies({ findExisting: vi.fn(async () => pending) });
    await expect(persistClientDocumentUpload(workflowInput(), retry)).resolves.toMatchObject({ ok: true });
    expect(vi.mocked(retry.removeObject).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(retry.createPending).mock.invocationCallOrder[0]);

    const blocked = dependencies({
      findExisting: vi.fn(async () => pending),
      removeObject: vi.fn(async () => false),
    });
    await expect(persistClientDocumentUpload(workflowInput(), blocked)).resolves.toEqual({
      ok: false,
      code: 'PENDING_CLEANUP_FAILED',
      cleanupComplete: false,
    });
    expect(blocked.uploadObject).not.toHaveBeenCalled();
    expect(blocked.deleteRecord).not.toHaveBeenCalled();
  });
});

describe('FMM-006 server-mediated replacement and deletion', () => {
  const previous: StoredClientDocument = {
    id: uploadId,
    workspace_client_id: relationshipId,
    file_name: 'original.pdf',
    file_url: `${workspaceId}/${relationshipId}/${uploadId}/original.pdf`,
    file_size: 100,
    mime_type: 'application/pdf',
    doc_status: 'approved',
    uploaded_at: '2026-09-01T00:00:00.000Z',
  };
  const replacement: StoredClientDocument = {
    ...previous,
    file_name: 'replacement.pdf',
    file_url: `${workspaceId}/${relationshipId}/44444444-4444-4444-8444-444444444444/replacement.pdf`,
    file_size: 120,
    doc_status: 'uploaded',
    uploaded_at: '2026-09-12T00:00:00.000Z',
  };
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

  it('replaces through a fresh object before removing the prior object', async () => {
    const order: string[] = [];
    const deps = {
      uploadObject: vi.fn(async () => { order.push('upload-new'); return true; }),
      updateRecord: vi.fn(async () => { order.push('update-row'); return true; }),
      removeObject: vi.fn(async path => { order.push(path === previous.file_url ? 'remove-old' : 'remove-new'); return true; }),
      restoreRecord: vi.fn(async () => true),
    };
    await expect(replaceClientDocument({ previous, replacement, bytes }, deps)).resolves.toEqual({
      ok: true,
      storagePath: replacement.file_url,
    });
    expect(order).toEqual(['upload-new', 'update-row', 'remove-old']);
    expect(deps.restoreRecord).not.toHaveBeenCalled();
  });

  it('removes the replacement and preserves the old row/object when its database update fails', async () => {
    const deps = {
      uploadObject: vi.fn(async () => true),
      updateRecord: vi.fn(async () => false),
      removeObject: vi.fn(async () => true),
      restoreRecord: vi.fn(async () => true),
    };
    await expect(replaceClientDocument({ previous, replacement, bytes }, deps)).resolves.toEqual({
      ok: false,
      code: 'METADATA_UPDATE_FAILED',
      cleanupComplete: true,
    });
    expect(deps.removeObject).toHaveBeenCalledWith(replacement.file_url);
    expect(deps.removeObject).not.toHaveBeenCalledWith(previous.file_url);
    expect(deps.restoreRecord).not.toHaveBeenCalled();
  });

  it('restores the prior row and removes the replacement when old-object cleanup fails', async () => {
    const deps = {
      uploadObject: vi.fn(async () => true),
      updateRecord: vi.fn(async () => true),
      removeObject: vi.fn(async path => path !== previous.file_url),
      restoreRecord: vi.fn(async () => true),
    };
    await expect(replaceClientDocument({ previous, replacement, bytes }, deps)).resolves.toEqual({
      ok: false,
      code: 'OLD_OBJECT_DELETE_FAILED',
      cleanupComplete: true,
    });
    expect(deps.restoreRecord).toHaveBeenCalledWith(
      previous.id,
      relationshipId,
      replacement.file_url,
      previous,
    );
    expect(deps.removeObject).toHaveBeenLastCalledWith(replacement.file_url);
  });

  it('deletes the private object before deleting its exact metadata row', async () => {
    const order: string[] = [];
    const deps = {
      removeObject: vi.fn(async () => { order.push('storage'); return true; }),
      deleteRecord: vi.fn(async () => { order.push('metadata'); return true; }),
    };
    await expect(deleteClientDocument({
      documentId: uploadId,
      relationshipId,
      storagePath: previous.file_url,
    }, deps)).resolves.toEqual({ ok: true });
    expect(order).toEqual(['storage', 'metadata']);
    expect(deps.deleteRecord).toHaveBeenCalledWith(uploadId, relationshipId, previous.file_url);
  });

  it('leaves metadata intact if object deletion fails and reports a later metadata failure', async () => {
    const storageFailure = {
      removeObject: vi.fn(async () => false),
      deleteRecord: vi.fn(async () => true),
    };
    await expect(deleteClientDocument({ documentId: uploadId, relationshipId, storagePath }, storageFailure))
      .resolves.toEqual({ ok: false, code: 'STORAGE_DELETE_FAILED', objectRemoved: false });
    expect(storageFailure.deleteRecord).not.toHaveBeenCalled();

    const metadataFailure = {
      removeObject: vi.fn(async () => true),
      deleteRecord: vi.fn(async () => false),
    };
    await expect(deleteClientDocument({ documentId: uploadId, relationshipId, storagePath }, metadataFailure))
      .resolves.toEqual({ ok: false, code: 'METADATA_DELETE_FAILED', objectRemoved: true });
  });
});

describe('FMM-006 private authorization contract', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

  it('keeps the bucket private while denying every direct authenticated Storage operation', () => {
    const original = read('supabase/migrations/20260903190954_fmm_006_private_client_documents.sql');
    const boundary = read('supabase/migrations/20260912105022_fmm_006_009_server_only_client_document_storage.sql');
    expect(original).toContain("'client-documents'");
    expect(original).toContain('file_size_limit');
    expect(original).toContain('allowed_mime_types');
    for (const operation of ['select', 'insert', 'update', 'delete']) {
      expect(boundary).toContain(`DROP POLICY IF EXISTS client_documents_storage_${operation}`);
    }
    expect(boundary).toContain('client_documents_storage_authenticated_route_only');
    expect(boundary).toContain('AS RESTRICTIVE');
    expect(boundary).toContain("USING (bucket_id <> 'client-documents')");
    expect(boundary).toContain("WITH CHECK (bucket_id <> 'client-documents')");
    expect(boundary).not.toMatch(/\b(DELETE|TRUNCATE)\s+FROM\s+(?:storage\.objects|public\.client_documents)/i);
  });

  it('uses authenticated server routes and never exposes a browser Storage mutation path', () => {
    const uploadRoute = read('src/app/api/client-portal/documents/route.ts');
    const accessRoute = read('src/app/api/client-portal/documents/[documentId]/access/route.ts');
    const mutationRoute = read('src/app/api/client-portal/documents/[documentId]/route.ts');
    const portal = read('src/app/client-portal/components/ClientPortalDashboardContent.tsx');
    expect(uploadRoute).toContain("request.headers.get('origin')");
    expect(uploadRoute).toContain('supabase.auth.getUser()');
    expect(uploadRoute).toContain(".eq('auth_user_id', user.id)");
    expect(uploadRoute).toContain(".eq('client_account_id', account.id)");
    expect(uploadRoute).toContain('persistClientDocumentUpload');
    expect(uploadRoute).toContain('const admin = getAdminClient()');
    expect(uploadRoute).toContain('admin.storage.from(CLIENT_DOCUMENT_BUCKET).upload');
    expect(uploadRoute).not.toContain('supabase.storage');
    expect(accessRoute).toContain('.createSignedUrl(');
    expect(accessRoute).toContain('getAdminClient().storage');
    expect(accessRoute).toContain('authorizeWorkspacePlanOperation');
    expect(accessRoute).toContain(".select('id, client_id, workspace_id, workspace_client_id, file_name, file_url, doc_status')");
    expect(accessRoute).toContain("'Cache-Control': 'private, no-store'");
    expect(mutationRoute).toContain('export async function PUT');
    expect(mutationRoute).toContain('export async function DELETE');
    expect(mutationRoute).toContain('supabase.auth.getUser()');
    expect(mutationRoute).toContain("request.headers.get('origin')");
    expect(mutationRoute).toContain('authorizeWorkspacePlanOperation');
    expect(mutationRoute).toContain('getAdminClient()');
    expect(mutationRoute).toContain('replaceClientDocument');
    expect(mutationRoute).toContain('deleteClientDocument');
    expect(portal).not.toContain('getPublicUrl');
    expect(portal).not.toContain('.storage');
    expect(portal).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(portal).not.toContain('@/lib/supabase/admin');
  });
});
