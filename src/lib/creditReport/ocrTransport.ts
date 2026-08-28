export const OCR_STORAGE_BUCKET = 'evidence-documents';
export const OCR_INLINE_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;
export const OCR_CACHE_VERSION = 1;

export interface CachedOcrExtraction {
  version: number;
  sha256: string;
  createdAt: string;
  text: string;
  totalPages: number;
  nativePages: number;
  ocrPages: number;
  failedPages: number;
  meanOcrConfidence: number | null;
  nativeExtractionQuality: number;
  extractionQuality: number;
  processingDurationMs: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    source: 'native' | 'ocr' | 'failed';
    ocrConfidence?: number;
    rotation?: number;
    quality: {
      characters: number;
      words: number;
      readableCharacterRatio: number;
      creditSignals: string[];
      score: number;
      meaningful: boolean;
    };
    extraction?: {
      pageNumber: number;
      nativeTextAvailable: boolean;
      nativeCharacterCount: number;
      renderedSuccessfully: boolean;
      preprocessingApplied: string[];
      primaryOcrAttempted: boolean;
      primaryOcrSucceeded: boolean;
      primaryOcrConfidence: number | null;
      retryAttempted: boolean;
      retryRecovered: boolean;
      fallbackOcrAttempted: boolean;
      fallbackOcrSucceeded: boolean;
      fallbackOcrConfidence: number | null;
      extractedCharacterCount: number;
      finalStatus: 'native_text' | 'ocr_primary' | 'ocr_retry' | 'ocr_fallback' | 'unreadable';
      failureReason: string | null;
      engine?: string;
    };
  }>;
  pageResults?: Array<{
    pageNumber: number;
    nativeTextAvailable: boolean;
    nativeCharacterCount: number;
    renderedSuccessfully: boolean;
    preprocessingApplied: string[];
    primaryOcrAttempted: boolean;
    primaryOcrSucceeded: boolean;
    primaryOcrConfidence: number | null;
    retryAttempted: boolean;
    retryRecovered: boolean;
    fallbackOcrAttempted: boolean;
    fallbackOcrSucceeded: boolean;
    fallbackOcrConfidence: number | null;
    extractedCharacterCount: number;
    finalStatus: 'native_text' | 'ocr_primary' | 'ocr_retry' | 'ocr_fallback' | 'unreadable';
    failureReason: string | null;
    engine?: string;
  }>;
  primaryOcrSuccesses?: number;
  primaryOcrFailures?: number;
  retryRecoveries?: number;
  fallbackRecoveries?: number;
  capability?: {
    nativePdfExtraction: boolean;
    pageRendering: boolean;
    primaryOcr: boolean;
    fallbackOcr: boolean;
    reasons: Record<string, string | undefined>;
  };
}

export function createOcrCachePath(userId: string, sha256: string): string {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid PDF SHA-256');
  return `${userId}/ocr-cache/v${OCR_CACHE_VERSION}-${sha256}.json`;
}

export function isValidCachedOcrExtraction(
  value: unknown,
  expectedSha256: string,
): value is CachedOcrExtraction {
  if (!value || typeof value !== 'object') return false;
  const cache = value as Partial<CachedOcrExtraction>;
  if (
    cache.version !== OCR_CACHE_VERSION
    || cache.sha256 !== expectedSha256
    || typeof cache.text !== 'string'
    || cache.text.length < 120
    || !Number.isInteger(cache.totalPages)
    || (cache.totalPages ?? 0) < 1
    || !Array.isArray(cache.pages)
    || cache.pages.length !== cache.totalPages
    || !Number.isInteger(cache.nativePages)
    || !Number.isInteger(cache.ocrPages)
    || !Number.isInteger(cache.failedPages)
  ) return false;

  return (cache.nativePages ?? 0) + (cache.ocrPages ?? 0) + (cache.failedPages ?? 0) === cache.totalPages
    && cache.pages.every((page, index) => page?.pageNumber === index + 1);
}

export function isPendingOpenAiResponseStatus(status: unknown): boolean {
  return status === 'queued' || status === 'in_progress';
}

export function isValidOpenAiResponseId(responseId: string): boolean {
  return /^resp_[a-zA-Z0-9_-]{8,200}$/.test(responseId);
}

export function shouldRelayOcrPdf(fileSize: number): boolean {
  return fileSize > OCR_INLINE_UPLOAD_LIMIT_BYTES;
}

export function sanitizeOcrFileName(fileName: string): string {
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\.]+/, '')
    .slice(-160);

  const baseName = sanitized || 'credit-report.pdf';
  return baseName.toLowerCase().endsWith('.pdf') ? baseName : `${baseName}.pdf`;
}

export function createOcrStoragePath(
  userId: string,
  fileName: string,
  requestId = crypto.randomUUID(),
): string {
  const safeRequestId = requestId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  return `${userId}/ocr-temp/${safeRequestId}-${sanitizeOcrFileName(fileName)}`;
}

export function isOwnedOcrStoragePath(storagePath: string, userId: string): boolean {
  if (!storagePath || storagePath.length > 512 || storagePath.includes('..')) return false;
  const segments = storagePath.split('/');
  return segments.length === 3
    && segments[0] === userId
    && segments[1] === 'ocr-temp'
    && segments[2].length > 4
    && segments[2].toLowerCase().endsWith('.pdf');
}
