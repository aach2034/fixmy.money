import { describe, expect, it } from 'vitest';
import {
  OCR_INLINE_UPLOAD_LIMIT_BYTES,
  createOcrStoragePath,
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
});
