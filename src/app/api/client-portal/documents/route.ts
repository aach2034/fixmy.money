import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  buildClientDocumentPath,
  CLIENT_DOCUMENT_BUCKET,
  MAX_CLIENT_DOCUMENT_BYTES,
  persistClientDocumentUpload,
  validateClientDocumentContent,
  validateClientDocumentMetadata,
} from '@/lib/clientPortal/documentStorage';

const MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Cross-site uploads are not allowed.' }, { status: 403 });
  }

  const declaredLength = Number(request.headers.get('content-length') || '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CLIENT_DOCUMENT_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json({ error: 'The document must be 10 MB or smaller.', code: 'FILE_TOO_LARGE' }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  const relationshipId = String(formData?.get('relationshipId') || '');
  const disputeIdValue = String(formData?.get('disputeId') || '');
  const uploadId = String(formData?.get('uploadId') || '');
  const disputeId = disputeIdValue || null;

  if (!(file instanceof File) || !UUID_PATTERN.test(relationshipId) || !UUID_PATTERN.test(uploadId)) {
    return NextResponse.json({ error: 'A valid document, relationship, and upload ID are required.' }, { status: 400 });
  }
  if (disputeId && !UUID_PATTERN.test(disputeId)) {
    return NextResponse.json({ error: 'The selected dispute is invalid.' }, { status: 400 });
  }

  const { data: account, error: accountError } = await supabase
    .from('client_accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  if (accountError || !account) {
    return NextResponse.json({ error: 'Relationship not found or access denied.' }, { status: 403 });
  }

  // RLS independently restricts this lookup to the authenticated portal
  // identity; the explicit account match makes the tenant binding reviewable.
  const { data: scopedRelationship, error: relationshipError } = await supabase
    .from('workspace_client_memberships')
    .select('id, workspace_id, client_account_id, status')
    .eq('id', relationshipId)
    .eq('client_account_id', account.id)
    .eq('status', 'active')
    .maybeSingle();
  if (relationshipError || !scopedRelationship) {
    return NextResponse.json({ error: 'Relationship not found or access denied.' }, { status: 403 });
  }

  if (disputeId) {
    const { data: dispute } = await supabase
      .from('client_disputes')
      .select('id')
      .eq('id', disputeId)
      .eq('workspace_client_id', relationshipId)
      .maybeSingle();
    if (!dispute) return NextResponse.json({ error: 'Dispute not found or access denied.' }, { status: 403 });
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

  const storagePath = buildClientDocumentPath({
    workspaceId: scopedRelationship.workspace_id,
    relationshipId,
    uploadId,
    safeFileName: metadata.safeFileName,
  });

  const result = await persistClientDocumentUpload({
    uploadId,
    relationshipId,
    disputeId,
    fileName: metadata.safeFileName,
    storagePath,
    size: file.size,
    mimeType: metadata.mimeType,
    bytes,
  }, {
    findExisting: async (id, scopedRelationshipId) => {
      const { data } = await supabase
        .from('client_documents')
        .select('id, workspace_client_id, file_name, file_url, file_size, mime_type, doc_status')
        .eq('id', id)
        .eq('workspace_client_id', scopedRelationshipId)
        .maybeSingle();
      return data;
    },
    createPending: async record => {
      const { error } = await supabase.from('client_documents').insert(record);
      return !error;
    },
    uploadObject: async (path, body, mimeType) => {
      const { error } = await supabase.storage.from(CLIENT_DOCUMENT_BUCKET).upload(path, body, {
        cacheControl: '0',
        contentType: mimeType,
        upsert: false,
      });
      return !error;
    },
    markUploaded: async (id, scopedRelationshipId) => {
      const { data, error } = await supabase
        .from('client_documents')
        .update({ doc_status: 'uploaded' })
        .eq('id', id)
        .eq('workspace_client_id', scopedRelationshipId)
        .eq('doc_status', 'pending')
        .select('id')
        .maybeSingle();
      return !error && Boolean(data);
    },
    removeObject: async path => {
      const { error } = await supabase.storage.from(CLIENT_DOCUMENT_BUCKET).remove([path]);
      return !error;
    },
    deleteRecord: async (id, scopedRelationshipId) => {
      const { error } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', id)
        .eq('workspace_client_id', scopedRelationshipId);
      return !error;
    },
  });

  if (!result.ok) {
    console.error('[ClientDocumentUpload] Upload failed', {
      code: result.code,
      cleanupComplete: result.cleanupComplete,
      relationshipId,
      uploadId,
    });
    const status = result.code === 'IDEMPOTENCY_CONFLICT' ? 409 : 503;
    return NextResponse.json({
      error: result.cleanupComplete
        ? 'The document was not saved. Please retry.'
        : 'The document was not saved and requires administrator cleanup.',
      code: result.code,
    }, { status });
  }

  return NextResponse.json({
    success: true,
    document: { id: result.documentId, fileName: metadata.safeFileName, status: 'uploaded' },
    idempotent: result.idempotent,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
