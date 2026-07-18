import { describe, expect, it } from 'vitest';
import { extractTextFromPdfDocument, joinPdfTextItems } from '../lib/creditReport/pdfUtils';

describe('credit report PDF text extraction', () => {
  it('preserves word boundaries and page line breaks', () => {
    expect(joinPdfTextItems([
      { str: 'Capital' },
      { str: 'One', hasEOL: true },
      { str: 'Account Number:' },
      { str: '****4521', hasEOL: true },
    ])).toBe('Capital One\nAccount Number: ****4521');
  });

  it('extracts all pages and counts pages containing embedded text', async () => {
    const pages = [
      [{ str: 'Experian Credit Report', hasEOL: true }],
      [],
      [{ str: 'Account Status:' }, { str: 'Current', hasEOL: true }],
    ];
    const pdf = {
      numPages: pages.length,
      async getPage(pageNumber: number) {
        return { async getTextContent() { return { items: pages[pageNumber - 1] }; } };
      },
    };

    const result = await extractTextFromPdfDocument(pdf);
    expect(result.pagesWithText).toBe(2);
    expect(result.text).toContain('--- Page 1 ---\nExperian Credit Report');
    expect(result.text).toContain('--- Page 2 ---\n');
    expect(result.text).toContain('Account Status: Current');
  });
});
