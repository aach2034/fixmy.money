/**
 * AI Data Redaction Tests
 *
 * Proves that outgoing AI payloads do not contain full SSNs or full account numbers.
 * These tests MUST pass before any credit report data is sent to an AI provider.
 *
 * Run: npx vitest run src/__tests__/ai-redaction.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  maskSSN,
  maskAccountNumbers,
  redactPII,
  validateNoFullPII,
} from '../lib/ai/redaction';

// ─── SSN Masking ──────────────────────────────────────────────────────────────

describe('SSN Masking', () => {
  it('masks a hyphenated SSN', () => {
    const result = maskSSN('SSN: 123-45-6789');
    expect(result)?.toBe('SSN: XXX-XX-6789');
    expect(result)?.not?.toContain('123-45');
  });

  it('masks a plain 9-digit SSN', () => {
    const result = maskSSN('Social Security: 123456789');
    expect(result)?.not?.toContain('12345');
    expect(result)?.toContain('XXX-XX-');
  });

  it('masks a space-separated SSN', () => {
    const result = maskSSN('SSN 123 45 6789');
    expect(result)?.not?.toContain('123 45');
  });

  it('does not mask short numbers that are not SSNs', () => {
    const result = maskSSN('Account: 1234');
    expect(result)?.toBe('Account: 1234');
  });

  it('masks multiple SSNs in one string', () => {
    const result = maskSSN('Client A: 111-22-3333, Client B: 444-55-6666');
    expect(result)?.not?.toContain('111-22');
    expect(result)?.not?.toContain('444-55');
    expect(result)?.toContain('XXX-XX-3333');
    expect(result)?.toContain('XXX-XX-6666');
  });

  it('does not modify already-masked SSNs', () => {
    const alreadyMasked = 'SSN: XXX-XX-6789';
    const result = maskSSN(alreadyMasked);
    // Should not double-mask
    expect(result)?.toBe(alreadyMasked);
  });
});

// ─── Account Number Masking ───────────────────────────────────────────────────

describe('Account Number Masking', () => {
  it('masks a full account number (8+ digits)', () => {
    const result = maskAccountNumbers('Account: 1234567890');
    expect(result)?.not?.toContain('12345678');
    expect(result)?.toContain('****7890');
  });

  it('masks a 16-digit card number', () => {
    const result = maskAccountNumbers('Card: 4111111111111111');
    expect(result)?.not?.toContain('411111111');
    expect(result)?.toContain('****1111');
  });

  it('does not mask short numbers (< 8 digits)', () => {
    const result = maskAccountNumbers('Score: 720, Year: 2026');
    expect(result)?.toBe('Score: 720, Year: 2026');
  });

  it('masks multiple account numbers', () => {
    const result = maskAccountNumbers('Acct1: 12345678, Acct2: 87654321');
    expect(result)?.not?.toContain('12345678');
    expect(result)?.not?.toContain('87654321');
    expect(result)?.toContain('****5678');
    expect(result)?.toContain('****4321');
  });
});

// ─── Full PII Redaction ───────────────────────────────────────────────────────

describe('Full PII Redaction (redactPII)', () => {
  it('redacts SSN and account number in combined text', () => {
    const input = 'Client SSN: 123-45-6789, Account: 9876543210';
    const result = redactPII(input);
    expect(result)?.not?.toContain('123-45');
    expect(result)?.not?.toContain('987654321');
    expect(result)?.toContain('XXX-XX-6789');
    expect(result)?.toContain('****3210');
  });

  it('redacts date of birth', () => {
    const input = 'Date of Birth: 01/15/1985';
    const result = redactPII(input);
    expect(result)?.not?.toContain('01/15/1985');
    expect(result)?.toContain('[DOB REDACTED]');
  });

  it('redacts driver license', () => {
    const input = "Driver's License: A1234567";
    const result = redactPII(input);
    expect(result)?.not?.toContain('A1234567');
    expect(result)?.toContain('[DL REDACTED]');
  });

  it('handles empty string', () => {
    expect(redactPII(''))?.toBe('');
  });

  it('handles text with no PII', () => {
    const clean = 'This is a general credit dispute letter regarding late payments.';
    expect(redactPII(clean))?.toBe(clean);
  });

  it('can selectively disable redactions', () => {
    const input = 'SSN: 123-45-6789, DOB: 01/15/1985';
    const result = redactPII(input, { maskSSNs: true, redactDOB: false });
    expect(result)?.not?.toContain('123-45');
    expect(result)?.toContain('01/15/1985'); // DOB not redacted when disabled
  });
});

// ─── Payload Validation ───────────────────────────────────────────────────────

describe('validateNoFullPII — outgoing AI payload validation', () => {
  it('detects full SSN in payload', () => {
    const payload = 'Analyzing credit report for SSN 123-45-6789';
    const result = validateNoFullPII(payload);
    expect(result?.safe)?.toBe(false);
    expect(result?.violations?.length)?.toBeGreaterThan(0);
    expect(result?.violations?.[0])?.toContain('SSN');
  });

  it('detects full account number in payload', () => {
    const payload = 'Account number: 1234567890 is past due';
    const result = validateNoFullPII(payload);
    expect(result?.safe)?.toBe(false);
    expect(result?.violations?.length)?.toBeGreaterThan(0);
  });

  it('passes clean payload', () => {
    const payload = 'Analyzing credit report. Account: ****7890. SSN: XXX-XX-6789.';
    const result = validateNoFullPII(payload);
    expect(result?.safe)?.toBe(true);
    expect(result?.violations)?.toHaveLength(0);
  });

  it('passes payload with no PII', () => {
    const payload = 'The client has 3 late payments and 1 collection account.';
    const result = validateNoFullPII(payload);
    expect(result?.safe)?.toBe(true);
  });

  it('CRITICAL: redacted payload passes validation', () => {
    const rawInput = 'SSN: 123-45-6789, Account: 9876543210, DOB: 01/15/1985';
    const redacted = redactPII(rawInput);
    const validation = validateNoFullPII(redacted);
    expect(validation?.safe)?.toBe(true);
    expect(validation?.violations)?.toHaveLength(0);
  });
});

// ─── Integration: Credit Report Analyze Route ─────────────────────────────────

describe('Credit report analyze route — PII redaction integration', () => {
  it('redactPII applied to user-supplied text produces safe payload', () => {
    // Simulate a credit report text that might be extracted from a PDF
    const creditReportText = `
      CREDIT REPORT SUMMARY
      Consumer: John Doe
      SSN: 456-78-9012
      Date of Birth: March 15, 1980
      
      NEGATIVE ACCOUNTS:
      Creditor: ABC Collections
      Account Number: 4532015112830366
      Balance: $1,250
      Status: Collection
      
      Creditor: XYZ Bank
      Account Number: 6011000990139424
      Balance: $3,400
      Status: Charge-off
    `;

    const redacted = redactPII(creditReportText);
    const validation = validateNoFullPII(redacted);

    // The redacted payload must be safe
    expect(validation?.safe)?.toBe(true);
    expect(redacted)?.not?.toContain('456-78-9012');
    expect(redacted)?.not?.toContain('4532015112830366');
    expect(redacted)?.not?.toContain('6011000990139424');
    // Last 4 digits should be preserved for identification
    expect(redacted)?.toContain('XXX-XX-9012');
    expect(redacted)?.toContain('****0366');
    expect(redacted)?.toContain('****9424');
  });
});
