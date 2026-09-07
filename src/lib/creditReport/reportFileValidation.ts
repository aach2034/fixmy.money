export const MAX_CREDIT_REPORT_FILE_BYTES = 25 * 1024 * 1024;
export const SUPPORTED_CREDIT_REPORT_FORMATS_LABEL = 'PDF, TXT, HTML, JSON';

export type SupportedCreditReportFormat = 'pdf' | 'text' | 'html' | 'json';

type FormatRule = {
  format: SupportedCreditReportFormat;
  mimeTypes: readonly string[];
};

const FORMAT_BY_EXTENSION: Record<string, FormatRule> = {
  '.pdf': { format: 'pdf', mimeTypes: ['application/pdf'] },
  '.txt': { format: 'text', mimeTypes: ['text/plain'] },
  '.html': { format: 'html', mimeTypes: ['text/html'] },
  '.htm': { format: 'html', mimeTypes: ['text/html'] },
  '.json': { format: 'json', mimeTypes: ['application/json', 'text/json'] },
};

export type CreditReportFileValidation =
  | { valid: true; format: SupportedCreditReportFormat; extension: string; mimeType: string }
  | { valid: false; code: 'EMPTY_FILE' | 'FILE_TOO_LARGE' | 'UNSUPPORTED_EXTENSION' | 'UNSUPPORTED_FILE_TYPE' | 'MIME_EXTENSION_MISMATCH' | 'EXECUTABLE_REJECTED' | 'INVALID_FILE_SIGNATURE' | 'INVALID_TEXT_CONTENT' | 'INVALID_JSON'; message: string };

function normalizedExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? '';
}

export function validateCreditReportFileMetadata(input: {
  fileName: string;
  mimeType: string;
  size: number;
}): CreditReportFileValidation {
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { valid: false, code: 'EMPTY_FILE', message: 'The report file is empty.' };
  }
  if (input.size > MAX_CREDIT_REPORT_FILE_BYTES) {
    return {
      valid: false,
      code: 'FILE_TOO_LARGE',
      message: `File must be between 1 byte and ${MAX_CREDIT_REPORT_FILE_BYTES / 1024 / 1024}MB.`,
    };
  }

  const extension = normalizedExtension(input.fileName);
  const rule = FORMAT_BY_EXTENSION[extension];
  if (!rule) {
    return { valid: false, code: 'UNSUPPORTED_EXTENSION', message: `Supported formats: ${SUPPORTED_CREDIT_REPORT_FORMATS_LABEL}.` };
  }

  const mimeType = input.mimeType.toLowerCase().split(';')[0].trim();
  if (!mimeType) {
    return { valid: false, code: 'UNSUPPORTED_FILE_TYPE', message: 'The file type could not be verified.' };
  }
  if (!rule.mimeTypes.includes(mimeType)) {
    return {
      valid: false,
      code: 'MIME_EXTENSION_MISMATCH',
      message: `The ${extension} extension does not match the reported file type ${mimeType}.`,
    };
  }

  return { valid: true, format: rule.format, extension, mimeType };
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function validateCreditReportFileContent(
  metadata: Extract<CreditReportFileValidation, { valid: true }>,
  bytes: Uint8Array,
): CreditReportFileValidation & { text?: string } {
  if (
    startsWith(bytes, [0x4d, 0x5a])
    || startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])
    || startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe])
  ) {
    return { valid: false, code: 'EXECUTABLE_REJECTED', message: 'Executable content is not a supported report format.' };
  }

  if (metadata.format === 'pdf') {
    return startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
      ? metadata
      : { valid: false, code: 'INVALID_FILE_SIGNATURE', message: 'The file is not a valid PDF.' };
  }

  if (bytes.some(byte => byte === 0)) {
    return { valid: false, code: 'INVALID_TEXT_CONTENT', message: 'Binary content is not supported for text report formats.' };
  }

  const text = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true }).decode(bytes).trim();
  if (text.length < 20) {
    return { valid: false, code: 'INVALID_TEXT_CONTENT', message: 'The report file is empty or does not contain enough readable text.' };
  }

  if (metadata.format === 'html' && !/<(?:!doctype|html|body|table|div|section|p|dl|tr)\b/i.test(text)) {
    return { valid: false, code: 'INVALID_FILE_SIGNATURE', message: 'The file does not contain recognizable HTML report content.' };
  }

  if (metadata.format === 'json') {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') throw new Error('JSON report must be an object or array.');
    } catch {
      return { valid: false, code: 'INVALID_JSON', message: 'The report is not valid JSON.' };
    }
  }

  return { ...metadata, text };
}
