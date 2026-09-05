import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authorizeStaffClient } from '@/lib/workspaces/authorization';
import {
  validateCreditReportFileContent,
  validateCreditReportFileMetadata,
} from '@/lib/creditReport/reportFileValidation';

export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse form data ───────────────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string | null;
    const provider = (formData.get('provider') as string) || 'unknown';
    const importMethod = (formData.get('importMethod') as string) || 'upload';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }

    // Service-role clients bypass RLS. Rebind the requested client to its
    // workspace and verify the actor's active membership before any data use.
    const authorization = await authorizeStaffClient(supabase, user.id, clientId, 'write');
    if (!authorization) {
      return NextResponse.json({ error: 'Client not found or access denied' }, { status: 403 });
    }

    const metadataValidation = validateCreditReportFileMetadata({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });
    if (!metadataValidation.valid) {
      return NextResponse.json({
        error: metadataValidation.message,
        errorCode: metadataValidation.code,
      }, { status: 400 });
    }

    // ── Read file bytes ───────────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentValidation = validateCreditReportFileContent(metadataValidation, buffer);
    if (!contentValidation.valid) {
      return NextResponse.json({
        error: contentValidation.message,
        errorCode: contentValidation.code,
      }, { status: 400 });
    }

    // ── Extract text content ──────────────────────────────────────────────────
    let textContent = '';
    let isPdf = false;

    if (metadataValidation.format === 'pdf') {
      isPdf = true;
      // Return the raw buffer as base64 for the client to handle OCR
      const base64 = buffer.toString('base64');
      textContent = `__PDF_BASE64__${base64}`;
    } else {
      // HTML, TXT, JSON — decode as UTF-8
      textContent = contentValidation.text ?? '';
    }

    // ── Create import record ──────────────────────────────────────────────────
    const { data: importRecord, error: importError } = await supabase
      .from('credit_report_imports')
      .insert({
        owner_id: authorization.workspaceOwnerId,
        client_id: clientId,
        import_method: importMethod,
        provider,
        detected_provider: 'unknown',
        parser_adapter: 'pending',
        file_name: file.name.replace(/[^\w.\-]/g, '_').slice(0, 200),
        file_type: metadataValidation.mimeType,
        file_size_bytes: file.size,
        import_status: 'uploaded',
      })
      .select()
      .single();

    if (importError) {
      console.error('[ImportUpload] Failed to create import record:', importError.message);
      return NextResponse.json({ error: 'Failed to create import record' }, { status: 500 });
    }

    // ── Diagnostic log (no PII) ───────────────────────────────────────────────
    console.log('[ImportUpload] Upload received', {
      importId: importRecord.id,
      clientId,
      provider,
      importMethod,
      fileType: metadataValidation.mimeType,
      fileSizeBytes: file.size,
      isPdf,
    });

    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      textContent,
      isPdf,
      fileName: file.name,
      fileType: metadataValidation.mimeType,
    });
  } catch (err: any) {
    console.error('[ImportUpload] Unexpected error:', err?.message);
    return NextResponse.json({ error: err?.message ?? 'Upload failed' }, { status: 500 });
  }
}
