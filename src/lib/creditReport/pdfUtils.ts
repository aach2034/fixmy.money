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
  nativeExtractionQuality: number;
  extractionMethod: 'text' | 'image_based' | 'empty';
  pages: PdfPageText[];
}

export interface TextQualityMetrics {
  characters: number;
  words: number;
  readableCharacterRatio: number;
  creditSignals: string[];
  score: number;
  meaningful: boolean;
}

export interface PdfPageText {
  pageNumber: number;
  text: string;
  quality: TextQualityMetrics;
}

export interface ExtractedPdfPage extends PdfPageText {
  source: 'native' | 'ocr' | 'failed';
  ocrConfidence?: number;
  rotation?: number;
}

export interface ExtractionValidation {
  valid: boolean;
  errorCode?: 'OCR_FAILED';
  characters: number;
  words: number;
  readableCharacterRatio: number;
  creditSignals: string[];
  successfulPages: number;
  failedPages: number;
  unaccountedPages: number;
  quality: number;
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

const CREDIT_REPORT_SIGNALS: Array<[string, RegExp]> = [
  ['bureau', /\b(?:experian|equifax|trans\s*union|transunion)\b/i],
  ['account', /\baccount(?:s|\s+number)?\b/i],
  ['balance', /\bbalance\b/i],
  ['status', /\bstatus\b/i],
  ['date_opened', /\bdate\s+opened\b/i],
  ['creditor', /\bcreditor\b/i],
  ['payment', /\bpayment(?:s|\s+history)?\b/i],
  ['collection', /\bcollection(?:s)?\b/i],
  ['charge_off', /\bcharge(?:d)?[ -]?off\b/i],
];

export function stripPdfPageMarkers(text: string): string {
  return text.replace(/^--- Page \d+ ---\s*$/gim, '').trim();
}

export function measureTextQuality(rawText: string): TextQualityMetrics {
  const text = stripPdfPageMarkers(rawText ?? '');
  const nonWhitespace = text.match(/\S/g) ?? [];
  const readable = text.match(/[\p{L}\p{N}\s.,:;!?()#$%&*+\-/]/gu) ?? [];
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'*.\-/]{1,}/gu) ?? [];
  const readableCharacterRatio = text.length > 0 ? readable.length / text.length : 0;
  const creditSignals = CREDIT_REPORT_SIGNALS
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);
  const score = Math.round(Math.min(100,
    Math.min(35, nonWhitespace.length / 4)
    + Math.min(25, words.length * 1.5)
    + readableCharacterRatio * 25
    + Math.min(15, creditSignals.length * 3),
  ));
  const meaningful = nonWhitespace.length >= 40
    && words.length >= 6
    && readableCharacterRatio >= 0.7;

  return {
    characters: nonWhitespace.length,
    words: words.length,
    readableCharacterRatio,
    creditSignals,
    score,
    meaningful,
  };
}

export function combineExtractedPdfPages(pages: ExtractedPdfPage[]): string {
  return [...pages]
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map(page => `--- Page ${page.pageNumber} ---\n${page.source === 'failed' ? '' : page.text.trim()}`)
    .join('\n\n');
}

export function validateCreditReportExtraction(
  pages: ExtractedPdfPage[],
  totalPages: number,
): ExtractionValidation {
  const pageNumbers = new Set(pages.map(page => page.pageNumber));
  const unaccountedPages = Math.max(0, totalPages - pageNumbers.size);
  const successfulPages = pages.filter(page => page.source !== 'failed' && page.quality.meaningful).length;
  const failedPages = pages.filter(page => page.source === 'failed' || !page.quality.meaningful).length;
  const text = pages.filter(page => page.source !== 'failed').map(page => page.text).join('\n');
  const quality = measureTextQuality(text);
  const minimumCharacters = Math.max(120, totalPages * 20);
  const minimumWords = Math.max(20, totalPages * 3);
  const valid = totalPages > 0
    && unaccountedPages === 0
    && successfulPages > 0
    && quality.characters >= minimumCharacters
    && quality.words >= minimumWords
    && quality.readableCharacterRatio >= 0.7
    && quality.creditSignals.length >= 3;

  return {
    valid,
    errorCode: valid ? undefined : 'OCR_FAILED',
    characters: quality.characters,
    words: quality.words,
    readableCharacterRatio: quality.readableCharacterRatio,
    creditSignals: quality.creditSignals,
    successfulPages,
    failedPages: failedPages + unaccountedPages,
    unaccountedPages,
    quality: quality.score,
  };
}

export async function extractTextFromPdfDocument(pdf: PdfJsDocument): Promise<{
  text: string;
  pagesWithText: number;
  pages: PdfPageText[];
}> {
  const pages: PdfPageText[] = [];
  let pagesWithText = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = joinPdfTextItems(content.items);
    const quality = measureTextQuality(pageText);
    if (quality.meaningful) pagesWithText++;
    pages.push({ pageNumber, text: pageText, quality });
  }

  return {
    text: pages.map(page => `--- Page ${page.pageNumber} ---\n${page.text}`).join('\n\n'),
    pagesWithText,
    pages,
  };
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
  const markerFreeText = stripPdfPageMarkers(rawText ?? '');
  if (!markerFreeText || markerFreeText.length < 100) return true;

  const sample = markerFreeText.slice(0, 5000);
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
  if (/JFIF|Exif\x00\x00|PNG\r\n\x1a\n/.test(markerFreeText.slice(0, 1000))) return true;

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
    const meaningfulText = extracted.pages
      .filter(page => page.quality.meaningful)
      .map(page => page.text)
      .join('\n');
    const imageBased = extracted.pagesWithText === 0 || isImageBasedPdf(meaningfulText);
    const nativeExtractionQuality = extracted.pages.length > 0
      ? Math.round(extracted.pages.reduce((sum, page) => sum + page.quality.score, 0) / extracted.pages.length)
      : 0;
    const readableTextLength = measureTextQuality(meaningfulText).characters;

    const result: PdfExtractionResult = {
      text,
      isImageBased: imageBased,
      pageCount: pdf.numPages,
      pagesWithText: extracted.pagesWithText,
      pagesRequiringOcr: Math.max(0, pdf.numPages - extracted.pagesWithText),
      binaryBlocksSkipped: 0,
      readableTextLength,
      nativeExtractionQuality,
      extractionMethod: extracted.pagesWithText === 0 ? 'image_based' : 'text',
      pages: extracted.pages,
    };
    await pdf.destroy?.();
    return result;
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
      nativeExtractionQuality: 0,
      extractionMethod: 'image_based',
      pages: [],
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
