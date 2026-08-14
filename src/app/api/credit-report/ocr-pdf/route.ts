import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  OCR_STORAGE_BUCKET,
  isOwnedOcrStoragePath,
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

async function getPdfPageCount(data: Uint8Array): Promise<number> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data, disableWorker: true } as any).promise;
    return pdf.numPages;
  } catch {
    return 0;
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

    const providerHint = detectProviderHint(extractedText);

    // Count approximate pages from page markers in the extracted text
    const pageMarkers = (extractedText.match(/---\s*Page\s*\d+\s*---/gi) ?? []).length;
    const estimatedPages = actualPageCount || (pageMarkers > 0 ? pageMarkers : 1);

    console.log(
      `[CreditReport/OCR-PDF] Vision extraction complete. Chars: ${extractedText.length}, ` +
      `Estimated pages: ${estimatedPages}, Provider hint: ${providerHint ?? 'none'}`
    );

    const result: OcrPdfResult = {
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

    return NextResponse.json(result);
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
