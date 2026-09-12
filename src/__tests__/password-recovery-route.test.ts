import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  verifyPasswordRecoveryState: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock('@/lib/auth/password-recovery-state', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/auth/password-recovery-state')>();
  return {
    ...original,
    verifyPasswordRecoveryState: mocks.verifyPasswordRecoveryState,
  };
});

import { GET, POST } from '@/app/api/auth/password-recovery/route';
import { PASSWORD_RECOVERY_COOKIE } from '@/lib/auth/password-recovery-state';

const authCookie = 'sb-testproject-auth-token';

function request(method: 'GET' | 'POST', body?: object, includeRecovery = true) {
  const cookies = [`${authCookie}=authenticated-session`];
  if (includeRecovery) cookies.push(`${PASSWORD_RECOVERY_COOKIE}=signed-recovery-state`);
  return new NextRequest('https://fixmy.money/api/auth/password-recovery', {
    method,
    headers: {
      cookie: cookies.join('; '),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function mockSupabase() {
  const getSession = vi.fn().mockResolvedValue({
    data: { session: { access_token: 'recovery-access-token' } },
    error: null,
  });
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'recovery-user' } },
    error: null,
  });
  const updateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  mocks.createServerClient.mockReturnValue({
    auth: { getSession, getUser, updateUser, signOut },
  });
  return { getSession, getUser, updateUser, signOut };
}

describe('password recovery route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testproject.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  it('requires a valid server-signed recovery state before showing the password form', async () => {
    mockSupabase();
    mocks.verifyPasswordRecoveryState.mockResolvedValue(false);

    const response = await GET(request('GET'));

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toContain(`${PASSWORD_RECOVERY_COOKIE}=`);
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
  });

  it('fails closed when the recovery cookie is missing', async () => {
    const client = mockSupabase();

    const response = await GET(request('GET', undefined, false));

    expect(response.status).toBe(401);
    expect(client.getSession).not.toHaveBeenCalled();
    expect(mocks.verifyPasswordRecoveryState).not.toHaveBeenCalled();
  });

  it('accepts only a recovery state bound to the current verified session', async () => {
    const client = mockSupabase();
    mocks.verifyPasswordRecoveryState.mockResolvedValue(true);

    const response = await GET(request('GET'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ valid: true });
    expect(client.getUser).toHaveBeenCalledWith('recovery-access-token');
    expect(mocks.verifyPasswordRecoveryState).toHaveBeenCalledWith(expect.objectContaining({
      state: 'signed-recovery-state',
      accessToken: 'recovery-access-token',
      userId: 'recovery-user',
    }));
  });

  it('updates the password once, revokes sessions, and clears recovery and auth cookies', async () => {
    const client = mockSupabase();
    mocks.verifyPasswordRecoveryState.mockResolvedValue(true);

    const response = await POST(request('POST', {
      password: 'New-safe-password-483!',
      confirmation: 'New-safe-password-483!',
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      redirectTo: '/login?password_reset=1',
    });
    expect(client.updateUser).toHaveBeenCalledTimes(1);
    expect(client.signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(response.headers.get('set-cookie')).toContain(PASSWORD_RECOVERY_COOKIE);
    expect(response.headers.get('set-cookie')).toContain(authCookie);
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
  });

  it('fails closed and clears local recovery material if session revocation fails', async () => {
    const client = mockSupabase();
    client.signOut.mockResolvedValue({ error: new Error('revocation failed') });
    mocks.verifyPasswordRecoveryState.mockResolvedValue(true);

    const response = await POST(request('POST', {
      password: 'New-safe-password-483!',
      confirmation: 'New-safe-password-483!',
    }));

    expect(response.status).toBe(500);
    expect(client.updateUser).toHaveBeenCalledTimes(1);
    expect(response.headers.get('set-cookie')).toContain(PASSWORD_RECOVERY_COOKIE);
    expect(response.headers.get('set-cookie')).toContain(authCookie);
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0/i);
  });

  it('does not update a password for an expired, reused, or tampered recovery state', async () => {
    const client = mockSupabase();
    mocks.verifyPasswordRecoveryState.mockResolvedValue(false);

    const response = await POST(request('POST', {
      password: 'New-safe-password-483!',
      confirmation: 'New-safe-password-483!',
    }));

    expect(response.status).toBe(401);
    expect(client.updateUser).not.toHaveBeenCalled();
    expect(client.signOut).not.toHaveBeenCalled();
  });

  it('validates password length and confirmation before any Auth mutation', async () => {
    const client = mockSupabase();
    const response = await POST(request('POST', {
      password: 'short',
      confirmation: 'different',
    }));

    expect(response.status).toBe(400);
    expect(client.updateUser).not.toHaveBeenCalled();
    expect(mocks.verifyPasswordRecoveryState).not.toHaveBeenCalled();
  });
});
