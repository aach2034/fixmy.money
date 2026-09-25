import { describe, expect, it, vi } from 'vitest';
import { createSupabaseAdminFetch } from '@/lib/supabase/admin';

describe('Supabase admin authentication', () => {
  it('sends modern secret keys only through apikey', async () => {
    const key = 'sb_secret_example';
    const baseFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const adminFetch = createSupabaseAdminFetch(key, baseFetch);

    await adminFetch('https://example.supabase.co/rest/v1/rpc/test', {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    const headers = new Headers(baseFetch.mock.calls[0][1]?.headers);
    expect(headers.get('apikey')).toBe(key);
    expect(headers.has('Authorization')).toBe(false);
  });

  it('preserves user JWTs and legacy service-role authorization', async () => {
    const baseFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const modernFetch = createSupabaseAdminFetch('sb_secret_example', baseFetch);
    const legacyFetch = createSupabaseAdminFetch('legacy-service-role-jwt', baseFetch);

    await modernFetch('https://example.supabase.co/rest/v1/test', {
      headers: { Authorization: 'Bearer user-jwt' },
    });
    await legacyFetch('https://example.supabase.co/rest/v1/test', {
      headers: { Authorization: 'Bearer legacy-service-role-jwt' },
    });

    expect(new Headers(baseFetch.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer user-jwt');
    expect(new Headers(baseFetch.mock.calls[1][1]?.headers).get('Authorization')).toBe(
      'Bearer legacy-service-role-jwt'
    );
  });
});
