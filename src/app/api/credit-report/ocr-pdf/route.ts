import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  OCR_STORAGE_BUCKET,
  isOwnedOcrStoragePath,
  isPendingOpenAiResponseStatus,
  isValidOpenAiResponseId,
  sanitizeOcrFileName,
} from '@/lib/creditReport/ocrTransport';

// ─── Server-Side PDF OCR Route (OpenAI Vision) ────────────────────────────────
// Accepts small PDFs directly or downloads larger PDFs from private temporary
// storage, then sends the document to OpenAI for native PDF extraction.

export interface OcrPageStatus {
  pageNumber: number;
  success: boolean;
  charCount: number;
  error?: string;
}

export interface OcrPdfResult {
  success: boolean;
  combinedText: string;
  totalPages: number;
  pagesRendered: number;
  pagesOcrProcessed: number;
  pagesOcrFailed: number;
  totalChars: number;
  providerHint?: string;
  pages: OcrPageStatus[];
  error?: string;
  ocrUnavailable?: boolean;
  pending?: boolean;
  jobId?: string;
  jobToken?: string;
}

// Detect provider hints from OCR text
function detectProviderHint(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/myscoreiq|my\s*score\s*iq/.test(lower)) return 'myscoreiq';
  if (/idiq/.test(lower)) return 'myscoreiq';
  if (/three\s*bureau\s*credit\s*report|3\s*bureau/.test(lower)) return 'myscoreiq';
  if (/smartcredit|smart\s*credit/.test(lower)) return 'smartcredit';
  if (/identityiq|identity\s*iq/.test(lower)) return 'identityiq';
  if (/privacyguard|privacy\s*guard/.test(lower)) return 'privacyguard';
  if (/myfreescorenow|my\s*free\s*score/.test(lower)) return 'myfreescorenow';
  if (/annualcreditreport|annual\s*credit\s*report/.test(lower)) return 'annualcreditreport';
  if (/experian/.test(lower) && !/transunion|equifax/.test(lower)) return 'experian';
  if (/transunion/.test(lower) && !/experian|equifax/.test(lower)) return 'transunion';
  if (/equifax/.test(lower) && !/experian|transunion/.test(lower)) return 'equifax';
  return undefined;
}

const SYSTEM_PROMPT = `You are a credit report OCR extraction assistant. Your task is to extract ALL text from the provided credit report PDF exactly as it appears.

Instructions:
- Extract every piece of text visible in the document
- Preserve the structure: account names, account numbers, balances, dates, payment history, personal information sections
- Include bureau names (Experian, TransUnion, Equifax) and their respective data
- Include negative items, late payments, collections, charge-offs, public records
- Include credit scores if shown
- Do NOT summarize or interpret — extract the raw text faithfully
- Separate pages with "--- Page N ---" markers if you can identify page breaks
- If a section is unclear, include your best reading with [unclear] notation

Output the extracted text directly with no preamble.`;

function getResponseText(response: any): string {
  if (typeof response?.output_text === 'string') return response.output_text;
  if (!Array.isArray(response?.output)) return '';
  return response.output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .map((item: any) => item?.text ?? item?.output_text ?? '')
    .filter(Boolean)
    .join('\n');
}

async function importOcrSigningKey(apiKey: string) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function getOcrJobPayload(jobId: string, totalPages: number): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${jobId}:${totalPages}`) as Uint8Array<ArrayBuffer>;
}

async function signOcrJob(apiKey: string, jobId: string, totalPages: number): Promise<string> {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await importOcrSigningKey(apiKey),
    getOcrJobPayload(jobId, totalPages),
  );
  return Buffer.from(signature).toString('base64url');
}

async function verifyOcrJob(
  apiKey: string,
  jobId: string,
  totalPages: number,
  token: string,
): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await importOcrSigningKey(apiKey),
      Buffer.from(token, 'base64url'),
      getOcrJobPayload(jobId, totalPages),
    );
  } catch {
    return false;
  }
}

function completedOcrResult(extractedText: string, actualPageCount: number): OcrPdfResult {
  const providerHint = detectProviderHint(extractedText);
  const pageMarkers = (extractedText.match(/---\s*Page\s*\d+\s*---/gi) ?? []).length;
  const estimatedPages = actualPageCount || (pageMarkers > 0 ? pageMarkers : 1);

  console.log(
    `[CreditReport/OCR-PDF] Vision extraction complete. Chars: ${extractedText.length}, ` +
    `Estimated pages: ${estimatedPages}, Provider hint: ${providerHint ?? 'none'}`
  );

  return {
    success: true,
    combinedText: extractedText,
    totalPages: estimatedPages,
    pagesRendered: estimatedPages,
    pagesOcrProcessed: estimatedPages,
    pagesOcrFailed: 0,
    totalChars: extractedText.length,
    providerHint,
    pages: Array.from({ length: estimatedPages }, (_, i) => ({
      pageNumber: i + 1,
      success: true,
      charCount: Math.floor(extractedText.length / estimatedPages),
    })),
  };
}

async function getPdfPageCount(data: Uint8Array): Promise<number> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data, disableWorker: true } as any).promise;
    return pdf.numPages;
  } catch {
    return 0;
  }
}

export async function PUT(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        ocrUnavailable: true,
        error: 'OpenAI API key is not configured.',
      }, { status: 500 });
    }

    const payload = await request.json().catch(() => null) as {
      jobId?: unknown;
      jobToken?: unknown;
      totalPages?: unknown;
    } | null;
    const jobId = typeof payload?.jobId === 'string' ? payload.jobId : '';
    const jobToken = typeof payload?.jobToken === 'string' ? payload.jobToken : '';
    const totalPages = typeof payload?.totalPages === 'number' ? payload.totalPages : -1;

    if (
      !isValidOpenAiResponseId(jobId)
      || !/^[a-zA-Z0-9_-]{43}$/.test(jobToken)
      || !Number.isSafeInteger(totalPages)
      || totalPages < 0
      || totalPages > 10000
      || !(await verifyOcrJob(apiKey, jobId, totalPages, jobToken))
    ) {
      return NextResponse.json({ success: false, error: 'Invalid OCR job' }, { status: 400 });
    }

    const apiResponse = await fetch(`https://api.openai.com/v1/responses/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const response = await apiResponse.json();

    if (!apiResponse.ok) {
      const message = response?.error?.message || `OpenAI status request failed (${apiResponse.status})`;
      throw new Error(message);
    }

    if (isPendingOpenAiResponseStatus(response?.status)) {
      return NextResponse.json({
        success: false,
        pending: true,
        jobId,
        jobToken,
        totalPages,
      }, { status: 202 });
    }

    if (response?.status !== 'completed') {
      const message = response?.error?.message
        || response?.incomplete_details?.reason
        || `OpenAI OCR ended with status ${response?.status ?? 'unknown'}`;
      throw new Error(message);
    }

    const extractedText = getResponseText(response);
    if (!extractedText || extractedText.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI Vision returned no text. The PDF may be corrupted or unreadable.',
        combinedText: '',
        totalPages: totalPages || 1,
        pagesRendered: totalPages || 1,
        pagesOcrProcessed: 0,
        pagesOcrFailed: totalPages || 1,
        totalChars: 0,
        pages: [],
      } as OcrPdfResult);
    }

    return NextResponse.json(completedOcrResult(extractedText, totalPages));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'OCR status check failed';
    console.error('[CreditReport/OCR-PDF] Background status error:', message.slice(0, 300));
    return NextResponse.json({
      success: false,
      error: `OpenAI Vision failed: ${message.slice(0, 200)}`,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let cleanupStoragePath: string | null = null;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          ocrUnavailable: true,
          error: 'OpenAI API key is not configured.',
          combinedText: '',
          totalPages: 0,
          pagesRendered: 0,
          pagesOcrProcessed: 0,
          pagesOcrFailed: 0,
          totalChars: 0,
          pages: [],
        } as OcrPdfResult,
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type') ?? '';
    let fileName = 'credit-report.pdf';
    let fileSize = 0;
    let arrayBuffer: ArrayBuffer;

    if (contentType.includes('application/json')) {
      const payload = await request.json().catch(() => null) as {
        storagePath?: unknown;
        fileName?: unknown;
      } | null;
      const storagePath = typeof payload?.storagePath === 'string' ? payload.storagePath : '';

      const sessionClient = await createServerSupabaseClient();
      const { data: { user } } = await sessionClient.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!isOwnedOcrStoragePath(storagePath, user.id)) {
        return NextResponse.json({ error: 'Invalid temporary PDF path' }, { status: 403 });
      }

      const admin = getAdminClient();
      const { data: storedPdf, error: downloadError } = await admin.storage
        .from(OCR_STORAGE_BUCKET)
        .download(storagePath);

      if (downloadError || !storedPdf) {
        return NextResponse.json({ error: 'Temporary PDF could not be read' }, { status: 400 });
      }

      cleanupStoragePath = storagePath;
      fileName = sanitizeOcrFileName(
        typeof payload?.fileName === 'string' ? payload.fileName : storagePath.split('/').pop() ?? '',
      );
      fileSize = storedPdf.size;
      arrayBuffer = await storedPdf.arrayBuffer();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
      }

      fileName = sanitizeOcrFileName(file.name);
      fileSize = file.size;
      arrayBuffer = await file.arrayBuffer();
    } else {
      return NextResponse.json({ error: 'Upload a PDF file' }, { status: 400 });
    }

    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    const pdfBytes = new Uint8Array(arrayBuffer);
    const pdfSignature = new TextDecoder().decode(pdfBytes.slice(0, 5));
    if (pdfSignature !== '%PDF-') {
      return NextResponse.json({ error: 'The uploaded file is not a valid PDF' }, { status: 400 });
    }

    // Convert PDF to base64 data URI
    const base64 = Buffer.from(pdfBytes).toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${base64}`;
    const actualPageCount = await getPdfPageCount(pdfBytes);

    console.log(`[CreditReport/OCR-PDF] Sending PDF to OpenAI, size: ${(fileSize / 1024).toFixed(1)}KB`);

    // Use the Responses API's native input_file flow. For PDFs, OpenAI extracts
    // both embedded text and every page image, which is substantially more
    // reliable than routing the document through a chat/vision compatibility
    // wrapper.
    let extractedText = '';
    try {
      const apiResponse = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          background: true,
          instructions: SYSTEM_PROMPT,
          input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_file',
                filename: fileName,
                file_data: pdfDataUri,
              },
              {
                type: 'input_text',
                text: 'Extract the complete report. Begin every page with an exact marker in the form "--- Page N ---" and do not omit account sections.',
              },
            ],
          },
          ],
          max_output_tokens: 30000,
        }),
      });
      const response = await apiResponse.json();
      if (!apiResponse.ok) {
        throw new Error(response?.error?.message || `OpenAI request failed (${apiResponse.status})`);
      }

      if (isPendingOpenAiResponseStatus(response?.status)) {
        const jobId = typeof response?.id === 'string' ? response.id : '';
        if (!isValidOpenAiResponseId(jobId)) {
          throw new Error('OpenAI returned an invalid background OCR job ID');
        }
        const jobToken = await signOcrJob(apiKey, jobId, actualPageCount);
        return NextResponse.json({
          success: false,
          pending: true,
          jobId,
          jobToken,
          combinedText: '',
          totalPages: actualPageCount,
          pagesRendered: actualPageCount,
          pagesOcrProcessed: 0,
          pagesOcrFailed: 0,
          totalChars: 0,
          pages: [],
        } as OcrPdfResult, { status: 202 });
      }

      if (response?.status && response.status !== 'completed') {
        throw new Error(`OpenAI OCR ended with status ${response.status}`);
      }
      extractedText = getResponseText(response);
    } catch (aiError: unknown) {
      const msg = aiError instanceof Error ? aiError.message : 'OpenAI Vision request failed';
      console.error('[CreditReport/OCR-PDF] OpenAI Vision error:', msg.slice(0, 300));
      return NextResponse.json(
        {
          success: false,
          error: `OpenAI Vision failed: ${msg.slice(0, 200)}`,
          combinedText: '',
          totalPages: 0,
          pagesRendered: 0,
          pagesOcrProcessed: 0,
          pagesOcrFailed: 0,
          totalChars: 0,
          pages: [],
        } as OcrPdfResult,
        { status: 500 }
      );
    }

    if (!extractedText || extractedText.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI Vision returned no text. The PDF may be corrupted or unreadable.',
        combinedText: '',
        totalPages: 1,
        pagesRendered: 1,
        pagesOcrProcessed: 0,
        pagesOcrFailed: 1,
        totalChars: 0,
        pages: [{ pageNumber: 1, success: false, charCount: 0, error: 'No text extracted' }],
      } as OcrPdfResult);
    }

    return NextResponse.json(completedOcrResult(extractedText, actualPageCount));
  } catch (error: unknown) {
    const safeMessage = error instanceof Error ? error.message : 'OCR processing failed';
    console.error('[CreditReport/OCR-PDF] Error:', safeMessage.slice(0, 200));
    return NextResponse.json(
      {
        success: false,
        error: 'OCR processing failed. Please try again.',
        combinedText: '',
        totalPages: 0,
        pagesRendered: 0,
        pagesOcrProcessed: 0,
        pagesOcrFailed: 0,
        totalChars: 0,
        pages: [],
      } as OcrPdfResult,
      { status: 500 }
    );
  } finally {
    if (cleanupStoragePath) {
      const { error } = await getAdminClient().storage
        .from(OCR_STORAGE_BUCKET)
        .remove([cleanupStoragePath]);
      if (error) {
        console.warn('[CreditReport/OCR-PDF] Temporary PDF cleanup failed.');
      }
    }
  }
}
