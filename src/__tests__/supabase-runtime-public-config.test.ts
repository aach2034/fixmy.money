import { afterEach, describe, expect, it } from 'vitest';
import { getSupabasePublicConfig } from '@/lib/supabase/public-config';
import {
  addSupabasePublicAttributesToHtml,
  getSupabasePublicAttributes,
} from '../../worker/runtime-public-config';

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
});

describe('Sites runtime Supabase public configuration', () => {
  it('injects the runtime public configuration into HTML', () => {
    const attributes = getSupabasePublicAttributes({
        NEXT_PUBLIC_SUPABASE_URL: 'https://local-test.supabase.invalid',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
    });
    const html = addSupabasePublicAttributesToHtml(
      '<!doctype html><html lang="en"><head><script src="/app.js"></script></head></html>',
      attributes,
    );
    expect(html).toContain('data-supabase-url="https://local-test.supabase.invalid"');
    expect(html).toContain('data-supabase-publishable-key="synthetic-public-key"');
    expect(html).toContain('<script src="/app.js"></script>');
  });

  it('uses the injected configuration when browser build-time values are absent', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: {
          dataset: {
            supabaseUrl: 'https://local-test.supabase.invalid',
            supabasePublishableKey: 'synthetic-public-key',
          },
        },
      },
    });

    expect(getSupabasePublicConfig()).toEqual({
      url: 'https://local-test.supabase.invalid',
      publishableKey: 'synthetic-public-key',
    });
  });
});
