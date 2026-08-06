import { describe, expect, it } from 'vitest';
import { isFalseFutureDateClaim } from '../lib/creditReport/dateValidation';

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
});
