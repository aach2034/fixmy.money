import { describe, expect, it } from 'vitest';
import {
  combineExtractedPdfPages,
  extractTextFromPdfDocument,
  isImageBasedPdf,
  joinPdfTextItems,
  measureTextQuality,
  validateCreditReportExtraction,
  type ExtractedPdfPage,
  type PdfPageText,
} from '../lib/creditReport/pdfUtils';
import { resolveExtractedPage, selectBestOcrAttempt } from '../lib/creditReport/localOcr';

const reportText = (creditor: string) => [
  'Experian Equifax TransUnion Credit Report',
  `Creditor: ${creditor}`,
  'Account Number: ****4521',
  'Balance: $1,240',
  'Status: Current',
  'Date Opened: 01/15/2020',
  'Payment History: On time',
].join('\n');

const nativePage = (pageNumber: number, text: string): PdfPageText => ({
  pageNumber,
  text,
  quality: measureTextQuality(text),
});

describe('credit report PDF text extraction', () => {
  it('preserves word boundaries and readable raw text for a text PDF', async () => {
    expect(joinPdfTextItems([
      { str: 'Capital' },
      { str: 'One', hasEOL: true },
      { str: 'Account Number:' },
      { str: '****4521', hasEOL: true },
    ])).toBe('Capital One\nAccount Number: ****4521');

    const text = reportText('Capital One');
    const pdf = {
      numPages: 1,
      async getPage() {
        return { async getTextContent() { return { items: text.split('\n').map(str => ({ str, hasEOL: true })) }; } };
      },
    };
    const extracted = await extractTextFromPdfDocument(pdf);

    expect(extracted.pagesWithText).toBe(1);
    expect(extracted.pages[0].text).toContain('Creditor: Capital One');
    expect(extracted.pages[0].quality.meaningful).toBe(true);
  });

  it('classifies a fully scanned PDF from page content, never page markers', async () => {
    const pdf = {
      numPages: 3,
      async getPage() {
        return { async getTextContent() { return { items: [] }; } };
      },
    };
    const extracted = await extractTextFromPdfDocument(pdf);

    expect(extracted.pagesWithText).toBe(0);
    expect(extracted.pages.every(page => !page.quality.meaningful)).toBe(true);
    expect(isImageBasedPdf(extracted.text)).toBe(true);

    const pages = extracted.pages.map(page => resolveExtractedPage(page.pageNumber, page, [{
      text: reportText(`Scanned Creditor ${page.pageNumber}`),
      confidence: 87,
      rotation: 0,
    }]));
    expect(pages.every(page => page.source === 'ocr')).toBe(true);
    expect(combineExtractedPdfPages(pages)).toContain('Scanned Creditor 2');
  });

  it('keeps native text and OCRs only unreadable pages in a mixed PDF', () => {
    const page1 = nativePage(1, reportText('Native Bank'));
    const page2 = nativePage(2, '');
    const page3 = nativePage(3, reportText('Native Credit Union'));
    const pages = [
      resolveExtractedPage(1, page1, []),
      resolveExtractedPage(2, page2, [{ text: reportText('OCR Finance'), confidence: 84, rotation: 0 }]),
      resolveExtractedPage(3, page3, []),
    ];

    expect(pages.map(page => page.source)).toEqual(['native', 'ocr', 'native']);
    expect(combineExtractedPdfPages(pages)).toMatch(/Native Bank[\s\S]+OCR Finance[\s\S]+Native Credit Union/);
  });

  it('selects readable raw text from a corrected rotated page', () => {
    const best = selectBestOcrAttempt([
      { text: '1 | | = = ?', confidence: 18, rotation: 0 },
      { text: reportText('Rotated Tradeline Bank'), confidence: 82, rotation: 90 },
      { text: 'unreadable sideways marks', confidence: 25, rotation: 270 },
    ]);

    expect(best?.rotation).toBe(90);
    expect(best?.text).toContain('Date Opened: 01/15/2020');
    expect(best?.quality.meaningful).toBe(true);
  });

  it('records retry recovery at page level after an empty primary OCR result', () => {
    const page = resolveExtractedPage(1, nativePage(1, ''), [
      {
        text: '',
        confidence: 0,
        rotation: 0,
        engine: 'tesseract.js/local-worker',
        preprocessing: 'none',
      },
      {
        text: reportText('Retry Recovery Bank'),
        confidence: 83,
        rotation: 0,
        engine: 'tesseract.js/local-worker',
        preprocessing: 'contrast-normalized',
      },
    ]);

    expect(page.source).toBe('ocr');
    expect(page.extraction).toMatchObject({
      primaryOcrAttempted: true,
      primaryOcrSucceeded: false,
      retryAttempted: true,
      retryRecovered: true,
      fallbackOcrAttempted: false,
      finalStatus: 'ocr_retry',
    });
  });

  it('records fallback recovery when primary OCR remains unusable', () => {
    const page = resolveExtractedPage(1, nativePage(1, ''), [
      {
        text: '||| 1 ? $',
        confidence: 12,
        rotation: 0,
        engine: 'tesseract.js/local-worker',
        preprocessing: 'none',
      },
      {
        text: reportText('Fallback Recovery Bank'),
        confidence: 79,
        rotation: 0,
        engine: 'tesseract.js/fresh-worker',
        preprocessing: 'contrast-normalized',
      },
    ]);

    expect(page.source).toBe('ocr');
    expect(page.extraction).toMatchObject({
      primaryOcrAttempted: true,
      primaryOcrSucceeded: false,
      fallbackOcrAttempted: true,
      fallbackOcrSucceeded: true,
      finalStatus: 'ocr_fallback',
    });
  });

  it('rejects a low-quality scan before parsing', () => {
    const page = resolveExtractedPage(1, nativePage(1, ''), [
      { text: '||| 1 ? $', confidence: 9, rotation: 0 },
    ]);
    const validation = validateCreditReportExtraction([page], 1);

    expect(page.source).toBe('failed');
    expect(page.extraction).toMatchObject({
      finalStatus: 'unreadable',
      primaryOcrAttempted: false,
      retryRecovered: false,
      fallbackOcrSucceeded: false,
    });
    expect(combineExtractedPdfPages([page])).not.toContain('|||');
    expect(validation.valid).toBe(false);
    expect(validation.errorCode).toBe('OCR_FAILED');
    expect(validation.failedPages).toBe(1);
  });

  it('reassembles a multi-page report in order and accounts for every page', () => {
    const pages: ExtractedPdfPage[] = Array.from({ length: 6 }, (_, index) => resolveExtractedPage(
      index + 1,
      undefined,
      [{ text: reportText(`Tradeline Page ${index + 1}`), confidence: 80 + index, rotation: 0 }],
    ));
    const combined = combineExtractedPdfPages([...pages].reverse());
    const validation = validateCreditReportExtraction(pages, 6);

    expect(combined.indexOf('Tradeline Page 1')).toBeLessThan(combined.indexOf('Tradeline Page 6'));
    expect(combined).toContain('Balance: $1,240');
    expect(validation.valid).toBe(true);
    expect(validation.successfulPages + validation.failedPages).toBe(6);
    expect(validation.unaccountedPages).toBe(0);
  });
});
