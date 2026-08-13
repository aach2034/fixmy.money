import { NextRequest, NextResponse } from 'next/server';

// ─── Server-Side PDF OCR Route (OpenAI Vision) ────────────────────────────────
// Accepts a PDF file via FormData, converts it to base64, and sends it to
// OpenAI gpt-4o which reads image-based PDFs natively via Vision.
// No canvas binaries, no Tesseract.js — just the OpenAI API.

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    // Convert PDF to base64 data URI
    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    const base64 = Buffer.from(pdfBytes).toString('base64');
    const pdfDataUri = `data:application/pdf;base64,${base64}`;
    const actualPageCount = await getPdfPageCount(pdfBytes);

    console.log(`[CreditReport/OCR-PDF] Sending PDF to OpenAI Vision (gpt-4o), size: ${(file.size / 1024).toFixed(1)}KB`);

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
                filename: file.name || 'credit-report.pdf',
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
  }
}
