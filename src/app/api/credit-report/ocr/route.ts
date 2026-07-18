import { NextRequest, NextResponse } from 'next/server';
import { getChatCompletion } from '@/lib/ai/chatCompletion';

// ─── OCR API Route ────────────────────────────────────────────────────────────
// Called when a PDF is detected as image-based (no extractable text).
// Accepts base64-encoded page images and runs OCR via OpenAI Vision.
// Returns combined OCR text and per-page status.

export interface OcrPageResult {
  pageNumber: number;
  success: boolean;
  charCount: number;
  text: string;
  error?: string;
}

export interface OcrResult {
  success: boolean;
  combinedText: string;
  pages: OcrPageResult[];
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  totalChars: number;
  error?: string;
}

const OCR_SYSTEM_PROMPT = `You are an OCR engine for credit reports. Extract ALL text from this credit report page exactly as it appears.

Rules:
- Output the raw text content only — no commentary, no analysis
- Preserve line breaks and section structure
- Include all labels, values, dates, amounts, account numbers (masked), and bureau names
- Do NOT summarize or interpret — just transcribe the text
- If a section header is visible (Personal Information, Accounts, Inquiries, Public Records, Credit Score), include it
- Preserve field labels like "Account Number:", "Balance:", "Status:", "Date Opened:", etc.
- Include all three bureau columns if visible (Equifax, Experian, TransUnion)
- Do NOT include any analysis or recommendations`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pages } = body as { pages: Array<{ pageNumber: number; imageData: string }> };

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: 'No page images provided' }, { status: 400 });
    }

    if (pages.length > 40) {
      return NextResponse.json({ error: 'Too many pages (max 40)' }, { status: 400 });
    }

    const pageResults: OcrPageResult[] = [];
    const textParts: string[] = [];

    for (const page of pages) {
      try {
        if (!page.imageData || typeof page.imageData !== 'string') {
          pageResults.push({
            pageNumber: page.pageNumber,
            success: false,
            charCount: 0,
            text: '',
            error: 'No image data',
          });
          continue;
        }

        const response = await getChatCompletion(
          'OPEN_AI',
          'gpt-4o',
          [
            { role: 'system', content: OCR_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract all text from this credit report page (page ${page.pageNumber}). Output raw text only.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: page.imageData,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          {
            max_tokens: 2000,
            temperature: 0,
          }
        );

        const extractedText = response?.choices?.[0]?.message?.content ?? '';

        if (extractedText && extractedText.trim().length > 10) {
          pageResults.push({
            pageNumber: page.pageNumber,
            success: true,
            charCount: extractedText.length,
            text: extractedText,
          });
          textParts.push(`\n\n--- Page ${page.pageNumber} ---\n${extractedText}`);
        } else {
          pageResults.push({
            pageNumber: page.pageNumber,
            success: false,
            charCount: 0,
            text: '',
            error: 'OCR returned empty text',
          });
        }
      } catch (pageErr: unknown) {
        const msg = pageErr instanceof Error ? pageErr.message : 'OCR failed';
        pageResults.push({
          pageNumber: page.pageNumber,
          success: false,
          charCount: 0,
          text: '',
          error: msg.slice(0, 200),
        });
      }
    }

    const combinedText = textParts.join('\n');
    const successfulPages = pageResults.filter(p => p.success).length;
    const failedPages = pageResults.filter(p => !p.success).length;

    const result: OcrResult = {
      success: successfulPages > 0,
      combinedText,
      pages: pageResults,
      totalPages: pages.length,
      successfulPages,
      failedPages,
      totalChars: combinedText.length,
    };

    // Only log metadata — never log the OCR text content
    console.log(`[CreditReport/OCR] Pages: ${pages.length}, Success: ${successfulPages}, Failed: ${failedPages}, Chars: ${combinedText.length}`);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const safeMessage = error instanceof Error ? error.message : 'OCR failed';
    console.error('[CreditReport/OCR] Error:', safeMessage.slice(0, 200));
    return NextResponse.json(
      { error: 'OCR processing failed. Please try again.' },
      { status: 500 }
    );
  }
}
