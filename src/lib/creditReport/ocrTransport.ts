export const OCR_STORAGE_BUCKET = 'evidence-documents';
export const OCR_INLINE_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

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
