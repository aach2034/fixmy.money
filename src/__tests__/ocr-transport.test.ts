import { describe, expect, it } from 'vitest';
import {
  OCR_INLINE_UPLOAD_LIMIT_BYTES,
  createOcrCachePath,
  createOcrStoragePath,
  isValidCachedOcrExtraction,
  isOwnedOcrStoragePath,
  isPendingOpenAiResponseStatus,
  isValidOpenAiResponseId,
  sanitizeOcrFileName,
  shouldRelayOcrPdf,
} from '@/lib/creditReport/ocrTransport';

describe('OCR PDF transport', () => {
  it('relays only files above the inline request limit', () => {
    expect(shouldRelayOcrPdf(OCR_INLINE_UPLOAD_LIMIT_BYTES)).toBe(false);
    expect(shouldRelayOcrPdf(OCR_INLINE_UPLOAD_LIMIT_BYTES + 1)).toBe(true);
  });

  it('creates a private owner-scoped temporary PDF path', () => {
    const path = createOcrStoragePath(
      '8dc2c3b3-3203-41ab-9641-7e643d071cab',
      '../../My Credit Report (final).PDF',
      'request-123',
    );

    expect(path).toBe(
      '8dc2c3b3-3203-41ab-9641-7e643d071cab/ocr-temp/request-123-My_Credit_Report_final_.PDF',
    );
    expect(isOwnedOcrStoragePath(path, '8dc2c3b3-3203-41ab-9641-7e643d071cab')).toBe(true);
  });

  it('rejects another owner and traversal-style paths', () => {
    const ownerId = '8dc2c3b3-3203-41ab-9641-7e643d071cab';
    expect(isOwnedOcrStoragePath(`another-user/ocr-temp/report.pdf`, ownerId)).toBe(false);
    expect(isOwnedOcrStoragePath(`${ownerId}/ocr-temp/../report.pdf`, ownerId)).toBe(false);
    expect(isOwnedOcrStoragePath(`${ownerId}/other/report.pdf`, ownerId)).toBe(false);
  });

  it('normalizes unsafe and missing PDF extensions', () => {
    expect(sanitizeOcrFileName(' report<>name ')).toBe('report_name_.pdf');
  });

  it('recognizes OpenAI response states that still need polling', () => {
    expect(isPendingOpenAiResponseStatus('queued')).toBe(true);
    expect(isPendingOpenAiResponseStatus('in_progress')).toBe(true);
    expect(isPendingOpenAiResponseStatus('completed')).toBe(false);
    expect(isPendingOpenAiResponseStatus('failed')).toBe(false);
  });

  it('accepts only safe OpenAI response IDs', () => {
    expect(isValidOpenAiResponseId('resp_12345678')).toBe(true);
    expect(isValidOpenAiResponseId('resp_abc-DEF_123456')).toBe(true);
    expect(isValidOpenAiResponseId('../responses/resp_12345678')).toBe(false);
    expect(isValidOpenAiResponseId('resp_short')).toBe(false);
  });

  it('reuses only complete, page-accounted SHA-256 extraction caches', () => {
    const hash = 'a'.repeat(64);
    const text = 'Experian account balance status date opened creditor payment '.repeat(4);
    const cache = {
      version: 1,
      sha256: hash,
      createdAt: new Date().toISOString(),
      text,
      totalPages: 2,
      nativePages: 0,
      ocrPages: 1,
      failedPages: 1,
      meanOcrConfidence: 88,
      nativeExtractionQuality: 0,
      extractionQuality: 90,
      processingDurationMs: 1000,
      pages: [
        { pageNumber: 1, text, source: 'ocr', quality: { characters: 100, words: 20, readableCharacterRatio: 1, creditSignals: ['bureau', 'account'], score: 90, meaningful: true } },
        { pageNumber: 2, text: '', source: 'failed', quality: { characters: 0, words: 0, readableCharacterRatio: 0, creditSignals: [], score: 0, meaningful: false } },
      ],
    };

    expect(createOcrCachePath('owner-id', hash)).toBe(`owner-id/ocr-cache/v1-${hash}.json`);
    expect(isValidCachedOcrExtraction(cache, hash)).toBe(true);
    expect(isValidCachedOcrExtraction({ ...cache, pages: cache.pages.slice(0, 1) }, hash)).toBe(false);
    expect(isValidCachedOcrExtraction(cache, 'b'.repeat(64))).toBe(false);
  });
});
