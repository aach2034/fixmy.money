'use client';

// ─── PDF Utility Functions ────────────────────────────────────────────────────
// Handles detection of image-based PDFs and page rendering for OCR.
// All functions run client-side only.

export interface PdfExtractionResult {
  text: string;
  isImageBased: boolean;
  pageCount: number;
  pagesWithText: number;
  pagesRequiringOcr: number;
  binaryBlocksSkipped: number;
  readableTextLength: number;
  extractionMethod: 'text' | 'image_based' | 'empty';
}

export interface PdfPageImage {
  pageNumber: number;
  imageData: string; // base64 data URL
}

interface PdfTextItem {
  str?: string;
  hasEOL?: boolean;
}

interface PdfJsDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getTextContent(): Promise<{ items: readonly unknown[] }>;
  }>;
}

/**
 * Joins PDF.js text items without running words together. PDF generators often
 * omit explicit spaces between positioned text fragments, so blindly joining
 * with an empty string corrupts creditor names and field labels.
 */
export function joinPdfTextItems(items: readonly unknown[]): string {
  const lines: string[] = [];
  let line = '';

  for (const candidate of items) {
    if (!candidate || typeof candidate !== 'object' || !('str' in candidate)) continue;
    const item = candidate as PdfTextItem;
    const value = typeof item?.str === 'string' ? item.str.trim() : '';
    if (value) line = line ? `${line} ${value}` : value;
    if (item?.hasEOL && line) {
      lines.push(line);
      line = '';
    }
  }

  if (line) lines.push(line);
  return lines.join('\n');
}

export async function extractTextFromPdfDocument(pdf: PdfJsDocument): Promise<{
  text: string;
  pagesWithText: number;
}> {
  const pages: string[] = [];
  let pagesWithText = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = joinPdfTextItems(content.items);
    if (pageText.trim()) pagesWithText++;
    pages.push(`--- Page ${pageNumber} ---\n${pageText}`);
  }

  return { text: pages.join('\n\n'), pagesWithText };
}

// ─── Binary / image stream detection ─────────────────────────────────────────

/**
 * Returns true if a string looks like a PDF binary stream, DCTDecode/JFIF block,
 * or other non-text PDF internal data. These should be SKIPPED, not counted as
 * rejected text blocks.
 */
export function isBinaryPdfBlock(str: string): boolean {
  if (!str) return false;
  const s = str.slice(0, 200);

  // JFIF / JPEG header bytes (common in image-based PDFs decoded as text)
  if (/JFIF|Exif|IHDR|IDAT|PNG\r\n/.test(s)) return true;
  // PDF stream markers
  if (/\bstream\b[\s\S]{0,10}\bendstream\b/i.test(s)) return true;
  if (/^\d+\s+\d+\s+obj\b/m.test(s)) return true;
  if (/\bendobj\b/i.test(s)) return true;
  if (/\/DCTDecode|\/FlateDecode|\/LZWDecode|\/ASCII85Decode/i.test(s)) return true;
  if (/\/Image\b|\/XObject\b/i.test(s)) return true;

  // High ratio of non-printable characters = binary data
  const nonPrintable = (s.match(/[^\x09\x0A\x0D\x20-\x7E]/g) ?? []).length;
  if (s.length > 20 && nonPrintable / s.length > 0.3) return true;

  return false;
}

/**
 * Determines if a PDF's extracted text is actually readable or just binary garbage.
 * Returns true if the PDF is image-based (no readable text).
 *
 * Thresholds:
 * - If total text < 100 chars → image-based
 * - If printable ASCII ratio < 0.5 → image-based
 * - If letter ratio < 0.15 → image-based (mostly numbers/symbols from binary)
 */
export function isImageBasedPdf(rawText: string): boolean {
  if (!rawText || rawText.trim().length < 100) return true;

  const sample = rawText.slice(0, 5000);
  const total = sample.length;

  // Count printable ASCII characters
  const printable = (sample.match(/[\x20-\x7E]/g) ?? []).length;
  const printableRatio = printable / total;

  // Count actual letters
  const letters = (sample.match(/[A-Za-z]/g) ?? []).length;
  const letterRatio = letters / total;

  // Count binary/non-printable
  const nonPrintable = (sample.match(/[^\x09\x0A\x0D\x20-\x7E]/g) ?? []).length;
  const binaryRatio = nonPrintable / total;

  // Image-based if mostly binary
  if (binaryRatio > 0.3) return true;
  if (printableRatio < 0.5) return true;
  if (letterRatio < 0.1) return true;

  // Check for JFIF/JPEG/PNG binary signatures in the text
  if (/JFIF|Exif\x00\x00|PNG\r\n\x1a\n/.test(rawText.slice(0, 1000))) return true;

  // Check if the "text" is mostly PDF internal syntax (no real words)
  const words = (sample.match(/[A-Za-z]{3,}/g) ?? []).length;
  if (words < 10 && total > 500) return true;

  return false;
}

/**
 * Extracts positioned text from every PDF page using PDF.js.
 * Returns extraction result including whether the PDF is image-based.
 */
export async function extractPdfText(file: File): Promise<PdfExtractionResult> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const extracted = await extractTextFromPdfDocument(pdf);
    const text = extracted.text;
    const imageBased = isImageBasedPdf(text);
    const readableTextLength = (text.match(/[A-Za-z0-9\s.,!?;:()\-$%]/g) ?? []).length;

    return {
      text,
      isImageBased: imageBased,
      pageCount: pdf.numPages,
      pagesWithText: extracted.pagesWithText,
      pagesRequiringOcr: Math.max(0, pdf.numPages - extracted.pagesWithText),
      binaryBlocksSkipped: 0,
      readableTextLength,
      extractionMethod: imageBased ? 'image_based' : (text.trim().length < 20 ? 'empty' : 'text'),
    };
  } catch {
    // A malformed or encrypted PDF should follow the existing OCR/manual-text
    // recovery path instead of surfacing binary data as a parsed report.
    return {
      text: '',
      isImageBased: true,
      pageCount: 0,
      pagesWithText: 0,
      pagesRequiringOcr: 1,
      binaryBlocksSkipped: 0,
      readableTextLength: 0,
      extractionMethod: 'image_based',
    };
  }
}

/**
 * Renders PDF pages to base64 images using the Canvas API.
 * Requires PDF.js to be loaded. Returns null if PDF.js is unavailable.
 *
 * NOTE: This runs client-side only. PDF.js is loaded dynamically to avoid
 * SSR issues.
 */
export async function renderPdfPagesToImages(
  file: File,
  maxPages = 30
): Promise<PdfPageImage[] | null> {
  try {
    // Dynamically import pdfjs-dist (only available if installed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pdfjsLib: any = null;
    try {
      // Use Function constructor to prevent Next.js static analysis from
      // trying to resolve this import at build time
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      pdfjsLib = await dynamicImport('pdfjs-dist');
      // Set worker source — use CDN fallback
      if (pdfjsLib?.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
    } catch {
      // pdfjs-dist not installed — OCR page rendering not available
      return null;
    }

    if (!pdfjsLib) return null;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const totalPages = Math.min(pdf.numPages, maxPages);
    const images: PdfPageImage[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        // 300 DPI: PDF.js base is 72 DPI, scale 4.167 ≈ 300 DPI
        const viewport = page.getViewport({ scale: 4.167 });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert to base64 JPEG (smaller than PNG for API calls)
        const imageData = canvas.toDataURL('image/jpeg', 0.85);
        images.push({ pageNumber: pageNum, imageData });

        // Clean up
        canvas.width = 0;
        canvas.height = 0;
      } catch {
        // Skip failed pages
      }
    }

    return images.length > 0 ? images : null;
  } catch {
    return null;
  }
}
