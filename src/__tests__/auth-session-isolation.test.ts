import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}));

import { GET as authCallback } from '@/app/auth/callback/route';
import {
  getSafeCallbackPath,
  includeCookieInVary,
  isSupabaseAuthCookie,
} from '@/lib/auth/session-isolation';
import { isSupabaseAuthStorageKey } from '@/lib/supabase/client';
import { proxy } from '@/proxy';

const oldAuthCookie = 'sb-testproject-auth-token';

function request(path: string, withOldSession = true) {
  return new NextRequest(`https://fixmy.money${path}`, {
    headers: withOldSession ? { cookie: `${oldAuthCookie}=old-session-value` } : undefined,
  });
}

function createMockClient({
  exchangeUserId,
  verifiedUserId = exchangeUserId,
  exchangeError = null,
  onboardingCompleted = false,
}: {
  exchangeUserId?: string;
  verifiedUserId?: string;
  exchangeError?: Error | null;
  onboardingCompleted?: boolean;
}) {
  const exchangeCodeForSession = vi.fn();
  const verifyOtp = vi.fn();
  const getUser = vi.fn().mockResolvedValue({
    data: { user: verifiedUserId ? { id: verifiedUserId } : null },
    error: null,
  });
  const single = vi.fn().mockResolvedValue({
    data: { onboarding_completed: onboardingCompleted },
    error: null,
  });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  mocks.createServerClient.mockImplementation((_url, _key, options) => {
    const establishSession = async () => {
      if (exchangeError) {
        return { data: { session: null }, error: exchangeError };
      }

      options.cookies.setAll(
        [
          {
            name: oldAuthCookie,
            value: 'new-session-value',
            options: { path: '/', secure: true },
          },
        ],
        {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
          Expires: '0',
          Pragma: 'no-cache',
        }
      );
      return {
        data: exchangeUserId
          ? {
              session: {
                access_token: 'new-access-token',
                user: { id: exchangeUserId },
              },
            }
          : { session: null },
        error: null,
      };
    };
    exchangeCodeForSession.mockImplementation(establishSession);
    verifyOtp.mockImplementation(establishSession);

    return {
      auth: { exchangeCodeForSession, verifyOtp, getUser },
      from,
    };
  });

  return { exchangeCodeForSession, verifyOtp, getUser };
}

describe('signup callback session isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testproject.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('fails closed and clears an unrelated local session when the PKCE code is missing', async () => {
    const response = await authCallback(request('/auth/callback?type=signup'));

    expect(response.headers.get('location')).toBe(
      'https://fixmy.money/login?auth_transition=verification_failed'
    );
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toBe('Cookie');
    expect(response.headers.get('set-cookie')).toContain(`${oldAuthCookie}=`);
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it('fails closed when the code cannot establish the new session', async () => {
    createMockClient({ exchangeError: new Error('PKCE verifier missing') });
    const response = await authCallback(request('/auth/callback?type=signup&code=bad-code'));

    expect(response.headers.get('location')).toContain('auth_transition=verification_failed');
    expect(response.headers.get('set-cookie')).not.toContain('new-session-value');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('rejects an exchanged token whose verified identity does not match', async () => {
    const client = createMockClient({ exchangeUserId: 'new-user', verifiedUserId: 'other-user' });
    const response = await authCallback(
      request('/auth/callback?type=signup&code=valid-looking-code')
    );

    expect(client.getUser).toHaveBeenCalledWith('new-access-token');
    expect(response.headers.get('location')).toContain('auth_transition=verification_failed');
    expect(response.headers.get('set-cookie')).not.toContain('new-session-value');
  });

  it('redirects only after the exchanged session is bound to the verified new identity', async () => {
    const client = createMockClient({ exchangeUserId: 'new-user' });
    const response = await authCallback(
      request('/auth/callback?type=signup&plan=starter&code=valid-code')
    );

    expect(client.getUser).toHaveBeenCalledWith('new-access-token');
    expect(response.headers.get('location')).toBe(
      'https://fixmy.money/checkout?plan=starter&verified=1'
    );
    expect(response.headers.get('set-cookie')).toContain('new-session-value');
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('establishes the verified new identity from a token hash in a different browser', async () => {
    const client = createMockClient({ exchangeUserId: 'new-user' });
    const response = await authCallback(
      request('/auth/callback?type=signup&plan=starter&token_hash=new-user-token-hash')
    );

    expect(client.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'new-user-token-hash',
      type: 'email',
    });
    expect(client.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(client.getUser).toHaveBeenCalledWith('new-access-token');
    expect(response.headers.get('location')).toBe(
      'https://fixmy.money/checkout?plan=starter&verified=1'
    );
    expect(response.headers.get('set-cookie')).toContain('new-session-value');
  });

  it('accepts only local callback destinations and recognized plans', async () => {
    expect(getSafeCallbackPath('/dashboard?tab=activity')).toBe('/dashboard?tab=activity');
    expect(getSafeCallbackPath('//attacker.example')).toBe('/onboarding');
    expect(getSafeCallbackPath('/\\attacker.example')).toBe('/onboarding');

    createMockClient({ exchangeUserId: 'new-user' });
    const response = await authCallback(
      request('/auth/callback?type=signup&plan=unknown&code=valid-code')
    );
    expect(response.headers.get('location')).toBe(
      'https://fixmy.money/checkout?plan=professional&verified=1'
    );
  });

  it('targets only Supabase auth cookies and storage keys for local clearing', () => {
    expect(isSupabaseAuthCookie(oldAuthCookie)).toBe(true);
    expect(isSupabaseAuthCookie('sb-testproject-auth-token.0')).toBe(true);
    expect(isSupabaseAuthStorageKey(`sb_${oldAuthCookie}`)).toBe(true);
    expect(isSupabaseAuthStorageKey('customer-preferences')).toBe(false);
    expect(isSupabaseAuthStorageKey('sb_testproject-settings')).toBe(false);
    expect(includeCookieInVary('RSC, Next-Router-State-Tree')).toBe(
      'RSC, Next-Router-State-Tree, Cookie'
    );
  });

  it('routes client-portal signup confirmation through the identity-bound callback', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/client-portal/components/ClientPortalLoginContent.tsx'),
      'utf8'
    );

    expect(source).toContain('/auth/callback?type=client_signup&next=');
    expect(source).not.toContain(
      'emailRedirectTo: `${window.location.origin}/client-portal/login?invite='
    );
  });

  it('keeps the production confirmation template on the cross-browser token-hash flow', () => {
    const template = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/templates/confirmation.html'),
      'utf8'
    );
    const staffSignup = fs.readFileSync(
      path.resolve(process.cwd(), 'src/contexts/AuthContext.tsx'),
      'utf8'
    );
    const clientSignup = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/client-portal/components/ClientPortalLoginContent.tsx'),
      'utf8'
    );

    expect(template).toContain('{{ .RedirectTo }}&token_hash={{ .TokenHash }}');
    expect(template).not.toContain('{{ .ConfirmationURL }}');
    expect(staffSignup).toContain('/auth/callback?type=signup&plan=');
    expect(clientSignup).toContain('/auth/callback?type=client_signup&next=');
  });
});

describe('proxy auth response isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testproject.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('carries refreshed auth cookies and mandatory no-cache headers onto redirects', async () => {
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll(
        [{ name: oldAuthCookie, value: 'refreshed-value', options: { path: '/' } }],
        {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
          Expires: '0',
          Pragma: 'no-cache',
        }
      );
      return {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      };
    });

    const response = await proxy(request('/dashboard'));

    expect(response.headers.get('location')).toContain('/login?redirect=%2Fdashboard');
    expect(response.headers.get('set-cookie')).toContain('refreshed-value');
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toBe('Cookie');
  });
});
