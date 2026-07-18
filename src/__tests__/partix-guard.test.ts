/**
 * Partix Database Contamination Guard Tests
 *
 * Verifies that FixMy.Money refuses to start when NEXT_PUBLIC_SUPABASE_URL
 * points to the Partix production database (qpgkbbtamfnodbbcqykd).
 */

import { describe, it, expect, afterEach } from 'vitest';

const PARTIX_URL = 'https://qpgkbbtamfnodbbcqykd.supabase.co';
const FIXMYMONEY_URL = 'https://somefixmymoneyref.supabase.co';

describe('Partix Database Contamination Guard', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL contains the Partix project ref', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PARTIX_URL;
    // Re-import to pick up env change
    const { validateNotPartixDatabase } = await import('@/lib/supabase/partix-guard');
    expect(() => validateNotPartixDatabase()).toThrow(
      'FixMy.Money is configured to use the Partix Supabase project.'
    );
  });

  it('does not throw when NEXT_PUBLIC_SUPABASE_URL is a different project', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = FIXMYMONEY_URL;
    const { validateNotPartixDatabase } = await import('@/lib/supabase/partix-guard');
    expect(() => validateNotPartixDatabase()).not.toThrow();
  });

  it('isPartixDatabase returns true for the Partix URL', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PARTIX_URL;
    const { isPartixDatabase } = await import('@/lib/supabase/partix-guard');
    expect(isPartixDatabase()).toBe(true);
  });

  it('isPartixDatabase returns false for a different URL', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = FIXMYMONEY_URL;
    const { isPartixDatabase } = await import('@/lib/supabase/partix-guard');
    expect(isPartixDatabase()).toBe(false);
  });

  it('getConnectedProjectRef extracts the project ref correctly', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PARTIX_URL;
    const { getConnectedProjectRef } = await import('@/lib/supabase/partix-guard');
    expect(getConnectedProjectRef()).toBe('qpgkbbtamfnodbbcqykd');
  });

  it('getConnectedProjectRef returns null for an invalid URL', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-valid-url';
    const { getConnectedProjectRef } = await import('@/lib/supabase/partix-guard');
    expect(getConnectedProjectRef()).toBeNull();
  });

  it('error message matches the exact required text', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PARTIX_URL;
    const { validateNotPartixDatabase } = await import('@/lib/supabase/partix-guard');
    let caught: Error | null = null;
    try {
      validateNotPartixDatabase();
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught!.message).toBe(
      'FixMy.Money is configured to use the Partix Supabase project. ' + 'Update the FixMy.Money Supabase environment variables before continuing.'
    );
  });
});
