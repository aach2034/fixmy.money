import { describe, expect, it } from 'vitest';
import {
  extractCreditReportDate,
  isFalseFutureDateClaim,
  isUnsupportedMissingReportingDateClaim,
  normalizeCreditReportDate,
} from '../lib/creditReport/dateValidation';

describe('credit report date validation', () => {
  it('rejects a future-date claim for a reporting date on or before today', () => {
    expect(isFalseFutureDateClaim(
      '2026-08-04',
      'Yendo appears to have a reporting date in the future.',
      '2026-08-06',
    )).toBe(true);
  });

  it('allows a future-date claim only when the reporting date is actually later than today', () => {
    expect(isFalseFutureDateClaim(
      '2026-08-07',
      'The account is future-dated.',
      '2026-08-06',
    )).toBe(false);
  });

  it('does not reject unrelated date explanations', () => {
    expect(isFalseFutureDateClaim(
      '2026-08-04',
      'Review the reported balance for accuracy.',
      '2026-08-06',
    )).toBe(false);
  });

  it('normalizes common credit-report date formats without timezone conversion', () => {
    expect(normalizeCreditReportDate('07/07/2026')).toBe('2026-07-07');
    expect(normalizeCreditReportDate('July 7, 2026')).toBe('2026-07-07');
    expect(normalizeCreditReportDate('2026-07-07')).toBe('2026-07-07');
  });

  it('extracts and normalizes a labeled report date instead of an unrelated date', () => {
    const report = `Date of Birth: 01/02/1980\nReport Date: 07/07/2026\nDate Opened: 08/01/2026`;
    expect(extractCreditReportDate(report)).toBe('2026-07-07');
  });

  it('rejects false future claims when the saved reporting date uses US format', () => {
    expect(isFalseFutureDateClaim(
      '07/07/2026',
      'The account has a reporting date in the future.',
      '2026-08-12',
    )).toBe(true);
  });

  it('rejects missing-reporting-date rationales as unsupported dispute claims', () => {
    expect(isUnsupportedMissingReportingDateClaim('The reporting date is missing, making the information unverifiable.')).toBe(true);
    expect(isUnsupportedMissingReportingDateClaim('No date reported appears for this account.')).toBe(true);
    expect(isUnsupportedMissingReportingDateClaim('The date last active differs from the consumer statement.')).toBe(false);
  });
});
