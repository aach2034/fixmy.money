import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  CLIENT_DOCUMENT_BUCKET,
  CLIENT_DOCUMENT_SIGNED_URL_TTL_SECONDS,
  resolveClientDocumentStoragePath,
} from '@/lib/clientPortal/documentStorage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  if (!UUID_PATTERN.test(documentId)) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data: document } = await supabase
    .from('client_documents')
    .select('id, client_id, workspace_id, workspace_client_id, file_name, file_url, doc_status')
    .eq('id', documentId)
    .neq('doc_status', 'pending')
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: 'Document not found or access denied.' }, { status: 404 });
  }

  const storagePath = resolveClientDocumentStoragePath({
    storedValue: document.file_url,
    workspaceId: document.workspace_id,
    relationshipId: document.workspace_client_id,
    clientAccountId: document.client_id,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  });
  if (!storagePath) return NextResponse.json({ error: 'Document not found or access denied.' }, { status: 404 });

  // The document row was authorized through the caller's RLS-bound client.
  // The server-only signer preserves access to validated legacy object paths
  // while the new Storage policy enforces the canonical tenant path.
  const { data, error } = await getAdminClient().storage
    .from(CLIENT_DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, CLIENT_DOCUMENT_SIGNED_URL_TTL_SECONDS, { download: document.file_name });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Document access is temporarily unavailable.' }, { status: 503 });
  }

  return NextResponse.json({
    url: data.signedUrl,
    expiresIn: CLIENT_DOCUMENT_SIGNED_URL_TTL_SECONDS,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
