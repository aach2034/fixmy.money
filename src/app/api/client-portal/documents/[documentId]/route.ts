import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  buildClientDocumentPath,
  CLIENT_DOCUMENT_BUCKET,
  deleteClientDocument,
  MAX_CLIENT_DOCUMENT_BYTES,
  replaceClientDocument,
  resolveClientDocumentStoragePath,
  validateClientDocumentContent,
  validateClientDocumentMetadata,
  type StoredClientDocument,
} from '@/lib/clientPortal/documentStorage';
import { authorizeWorkspacePlanOperation } from '@/lib/subscription/planServer';
import { PlanAuthorizationError } from '@/lib/subscription/planEnforcement';

const MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthorizedDocument = StoredClientDocument & {
  client_id: string;
  workspace_id: string;
  uploaded_at: string;
};

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

async function loadAuthorizedPortalDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<AuthorizedDocument | null> {
  const { data: account, error: accountError } = await supabase
    .from('client_accounts')
    .select('id')
    .eq('auth_user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  if (accountError || !account) return null;

  const { data: document, error: documentError } = await supabase
    .from('client_documents')
    .select('id, client_id, workspace_id, workspace_client_id, file_name, file_url, file_size, mime_type, doc_status, uploaded_at')
    .eq('id', documentId)
    .eq('client_id', account.id)
    .neq('doc_status', 'pending')
    .maybeSingle();
  if (documentError || !document) return null;

  const { data: relationship, error: relationshipError } = await supabase
    .from('workspace_client_memberships')
    .select('id')
    .eq('id', document.workspace_client_id)
    .eq('workspace_id', document.workspace_id)
    .eq('client_account_id', account.id)
    .eq('status', 'active')
    .maybeSingle();

  return relationshipError || !relationship ? null : document as AuthorizedDocument;
}

async function requestContext(
  documentId: string,
): Promise<
  | { ok: true; document: AuthorizedDocument }
  | { ok: false; response: NextResponse }
> {
  if (!UUID_PATTERN.test(documentId)) {
    return { ok: false, response: NextResponse.json({ error: 'Document not found.' }, { status: 404 }) };
  }

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  }

  const document = await loadAuthorizedPortalDocument(supabase, user.id, documentId);
  if (!document) {
    return { ok: false, response: NextResponse.json({ error: 'Document not found or access denied.' }, { status: 404 }) };
  }

  return { ok: true, document };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site document changes are not allowed.' }, { status: 403 });
  }

  const declaredLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CLIENT_DOCUMENT_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json({ error: 'The document must be 10 MB or smaller.', code: 'FILE_TOO_LARGE' }, { status: 413 });
  }

  const { documentId } = await params;
  const context = await requestContext(documentId);
  if (!context.ok) return context.response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A valid replacement document is required.' }, { status: 400 });
  }

  const metadata = validateClientDocumentMetadata({ fileName: file.name, mimeType: file.type, size: file.size });
  if (!metadata.valid) {
    return NextResponse.json({ error: metadata.message, code: metadata.code }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const content = validateClientDocumentContent(metadata, bytes);
  if (!content.valid) {
    return NextResponse.json({ error: content.message, code: content.code }, { status: 400 });
  }

  const { document } = context;
  try {
    await authorizeWorkspacePlanOperation({
      workspaceId: document.workspace_id,
      feature: 'client_portal',
      limit: 'storage_bytes',
      increment: Math.max(0, file.size - document.file_size),
    });
  } catch (error) {
    if (error instanceof PlanAuthorizationError) {
      return NextResponse.json({ error: error.code, code: error.code }, { status: error.status });
    }
    throw error;
  }

  const storagePath = buildClientDocumentPath({
    workspaceId: document.workspace_id,
    relationshipId: document.workspace_client_id,
    uploadId: crypto.randomUUID(),
    safeFileName: metadata.safeFileName,
  });
  const replacement: StoredClientDocument = {
    id: document.id,
    workspace_client_id: document.workspace_client_id,
    file_name: metadata.safeFileName,
    file_url: storagePath,
    file_size: file.size,
    mime_type: metadata.mimeType,
    doc_status: 'uploaded',
    uploaded_at: new Date().toISOString(),
  };

  // The privileged client is created only after identity, tenant, content,
  // entitlement, and quota checks have succeeded.
  const admin = getAdminClient();
  const result = await replaceClientDocument({ previous: document, replacement, bytes }, {
    uploadObject: async (path, body, mimeType) => {
      const { error } = await admin.storage.from(CLIENT_DOCUMENT_BUCKET).upload(path, body, {
        cacheControl: '0',
        contentType: mimeType,
        upsert: false,
      });
      return !error;
    },
    updateRecord: async (id, relationshipId, previousStoragePath, next) => {
      const { data, error } = await admin
        .from('client_documents')
        .update({
          file_name: next.file_name,
          file_url: next.file_url,
          file_size: next.file_size,
          mime_type: next.mime_type,
          doc_status: next.doc_status,
          uploaded_at: next.uploaded_at,
        })
        .eq('id', id)
        .eq('workspace_client_id', relationshipId)
        .eq('file_url', previousStoragePath)
        .select('id')
        .maybeSingle();
      return !error && Boolean(data);
    },
    removeObject: async path => {
      const { error } = await admin.storage.from(CLIENT_DOCUMENT_BUCKET).remove([path]);
      return !error;
    },
    restoreRecord: async (id, relationshipId, replacementStoragePath, previous) => {
      const { data, error } = await admin
        .from('client_documents')
        .update({
          file_name: previous.file_name,
          file_url: previous.file_url,
          file_size: previous.file_size,
          mime_type: previous.mime_type,
          doc_status: previous.doc_status,
          uploaded_at: previous.uploaded_at,
        })
        .eq('id', id)
        .eq('workspace_client_id', relationshipId)
        .eq('file_url', replacementStoragePath)
        .select('id')
        .maybeSingle();
      return !error && Boolean(data);
    },
  });

  if (!result.ok) {
    console.error('[ClientDocumentReplacement] Replacement failed', {
      code: result.code,
      cleanupComplete: result.cleanupComplete,
      documentId,
    });
    return NextResponse.json({
      error: result.cleanupComplete
        ? 'The document was not replaced. Please retry.'
        : 'The document was not replaced and requires administrator cleanup.',
      code: result.code,
    }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    document: { id: document.id, fileName: metadata.safeFileName, status: 'uploaded' },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site document changes are not allowed.' }, { status: 403 });
  }

  const { documentId } = await params;
  const context = await requestContext(documentId);
  if (!context.ok) return context.response;
  const { document } = context;
  const storagePath = resolveClientDocumentStoragePath({
    storedValue: document.file_url,
    workspaceId: document.workspace_id,
    relationshipId: document.workspace_client_id,
    clientAccountId: document.client_id,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  });
  if (!storagePath) {
    return NextResponse.json({ error: 'Document not found or access denied.' }, { status: 404 });
  }

  const admin = getAdminClient();
  const result = await deleteClientDocument({
    documentId,
    relationshipId: document.workspace_client_id,
    storagePath,
  }, {
    removeObject: async path => {
      const { error } = await admin.storage.from(CLIENT_DOCUMENT_BUCKET).remove([path]);
      return !error;
    },
    deleteRecord: async (id, relationshipId, exactStoragePath) => {
      const { data, error } = await admin
        .from('client_documents')
        .delete()
        .eq('id', id)
        .eq('workspace_client_id', relationshipId)
        .eq('file_url', exactStoragePath)
        .select('id')
        .maybeSingle();
      return !error && Boolean(data);
    },
  });

  if (!result.ok) {
    console.error('[ClientDocumentDeletion] Deletion failed', {
      code: result.code,
      objectRemoved: result.objectRemoved,
      documentId,
    });
    return NextResponse.json({ error: 'The document could not be deleted safely.', code: result.code }, { status: 503 });
  }

  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
