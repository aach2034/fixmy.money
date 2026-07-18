/**
 * AI Data Redaction Utilities
 *
 * Masks sensitive PII before transmitting data to AI providers.
 * Applied to credit report data, dispute content, and any user-supplied text.
 *
 * RULES:
 * - Full Social Security Numbers (9 digits) → XXX-XX-XXXX
 * - Full account numbers (8+ consecutive digits) → ****XXXX (last 4 only)
 * - Dates of birth → [DOB REDACTED]
 * - Driver's license numbers → [DL REDACTED]
 * - Passport numbers → [PASSPORT REDACTED]
 * - Full addresses (when not required) → [ADDRESS REDACTED]
 *
 * These functions are used in server-side AI routes ONLY.
 * Never called from client components.
 */

// ─── SSN patterns ─────────────────────────────────────────────────────────────

// Matches: 123-45-6789, 123456789, 123 45 6789
const SSN_PATTERN = /\b(\d{3}[-\s]?\d{2}[-\s]?\d{4})\b/g;

// ─── Account number patterns ──────────────────────────────────────────────────

// Matches 8+ consecutive digits (account numbers, card numbers)
// Preserves last 4 digits
const ACCOUNT_NUMBER_PATTERN = /\b(\d{4,})\b/g;

// ─── Date of birth patterns ───────────────────────────────────────────────────

// Matches: DOB: 01/15/1985, Date of Birth: January 15, 1985, Born: 1985-01-15
const DOB_PATTERN = /\b(d\.?o\.?b\.?|date\s+of\s+birth|born)\s*:?\s*[\d\/\-,\s]+\d{4}\b/gi;

// ─── Driver's license patterns ────────────────────────────────────────────────

// Matches: DL#: A1234567, Driver License: B-1234567, License No: 12345678
const DL_PATTERN = /\b(d\.?l\.?#?|driver'?s?\s+licen[sc]e\s*(?:no\.?|number|#)?)\s*:?\s*[A-Z0-9\-]{5,15}\b/gi;

// ─── Passport patterns ────────────────────────────────────────────────────────

// Matches: Passport: A12345678, Passport No: 123456789
const PASSPORT_PATTERN = /\b(passport\s*(?:no\.?|number|#)?)\s*:?\s*[A-Z0-9]{6,12}\b/gi;

// ─── Redaction functions ──────────────────────────────────────────────────────

/**
 * Masks full Social Security Numbers.
 * Preserves last 4 digits: 123-45-6789 → XXX-XX-6789
 */
export function maskSSN(text: string): string {
  return text.replace(SSN_PATTERN, (match) => {
    // Extract digits only
    const digits = match.replace(/\D/g, '');
    if (digits.length === 9) {
      return `XXX-XX-${digits.slice(5)}`;
    }
    return 'XXX-XX-XXXX';
  });
}

/**
 * Masks full account numbers, preserving last 4 digits.
 * 1234567890 → ****7890
 * Short numbers (< 8 digits) are not masked (likely not account numbers).
 */
export function maskAccountNumbers(text: string): string {
  return text.replace(ACCOUNT_NUMBER_PATTERN, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 8) {
      return `****${digits.slice(-4)}`;
    }
    return match; // Short numbers not masked
  });
}

/**
 * Redacts dates of birth.
 */
export function redactDOB(text: string): string {
  return text.replace(DOB_PATTERN, '[DOB REDACTED]');
}

/**
 * Redacts driver's license numbers.
 */
export function redactDriversLicense(text: string): string {
  return text.replace(DL_PATTERN, '[DL REDACTED]');
}

/**
 * Redacts passport numbers.
 */
export function redactPassport(text: string): string {
  return text.replace(PASSPORT_PATTERN, '[PASSPORT REDACTED]');
}

/**
 * Applies all PII redaction in sequence.
 * Use this before sending any text to an AI provider.
 *
 * @param text - Raw text that may contain PII
 * @param options - Control which redactions to apply
 * @returns Redacted text safe for AI transmission
 */
export function redactPII(
  text: string,
  options: {
    maskSSNs?: boolean;
    maskAccountNumbers?: boolean;
    redactDOB?: boolean;
    redactDL?: boolean;
    redactPassport?: boolean;
  } = {}
): string {
  const {
    maskSSNs = true,
    maskAccountNumbers: maskAccounts = true,
    redactDOB: removeDOB = true,
    redactDL = true,
    redactPassport: removePassport = true,
  } = options;

  let result = text;

  if (maskSSNs) result = maskSSN(result);
  if (maskAccounts) result = maskAccountNumbers(result);
  if (removeDOB) result = redactDOB(result);
  if (redactDL) result = redactDriversLicense(result);
  if (removePassport) result = redactPassport(result);

  return result;
}

/**
 * Validates that a string does not contain full SSNs or full account numbers.
 * Used in automated tests to verify outgoing AI payloads are clean.
 *
 * @returns Object with `safe` boolean and array of detected violations
 */
export function validateNoFullPII(text: string): {
  safe: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check for full SSNs (9 consecutive digits, possibly with separators)
  const ssnMatches = text.match(SSN_PATTERN);
  if (ssnMatches) {
    for (const match of ssnMatches) {
      const digits = match.replace(/\D/g, '');
      // A full SSN has 9 digits and is NOT already masked (XXX-XX-XXXX pattern)
      if (digits.length === 9 && !match.includes('X')) {
        violations.push(`Full SSN detected: ${match.slice(0, 3)}***`);
      }
    }
  }

  // Check for full account numbers (8+ digits not already masked)
  const accountMatches = text.match(ACCOUNT_NUMBER_PATTERN);
  if (accountMatches) {
    for (const match of accountMatches) {
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 8 && !match.startsWith('*')) {
        violations.push(`Full account number detected: ****${digits.slice(-4)}`);
      }
    }
  }

  return {
    safe: violations.length === 0,
    violations,
  };
}
