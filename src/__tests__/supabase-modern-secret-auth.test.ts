import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('routes every privileged API through the modern-key-aware admin client', () => {
    const routes = [
      'src/app/api/credit-report/evidence-engine/route.ts',
      'src/app/api/credit-report/import-upload/route.ts',
      'src/app/api/credit-report/parse-report/route.ts',
      'src/app/api/credit-report/save-atomic/route.ts',
      'src/app/api/credit-report/tag-and-save/route.ts',
      'src/app/api/workspaces/client-invitations/route.ts',
    ];

    for (const route of routes) {
      const source = readFileSync(route, 'utf8');
      expect(source, route).toContain('getAdminClient()');
      expect(source, route).not.toContain("createClient(");
    }
  });

  it('prefers the publishable key for server-side auth flows', () => {
    for (const route of [
      'src/app/auth/callback/route.ts',
      'src/app/api/auth/password-recovery/route.ts',
      'src/app/api/auth/signup/route.ts',
    ]) {
      const source = readFileSync(route, 'utf8');
      expect(source, route).toContain('getSupabasePublicConfig()');
      expect(source, route).not.toContain('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
  });

  it('treats the publishable key as required and the legacy anon key as optional', () => {
    const source = readFileSync('src/app/admin/health/components/AdminHealthContent.tsx', 'utf8');
    const requiredVariables = source.match(/const required = \[([^\]]+)\]/)?.[1] ?? '';
    expect(requiredVariables).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    expect(requiredVariables).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });
});
