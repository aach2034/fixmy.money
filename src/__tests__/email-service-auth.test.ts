import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

async function loadEmailService() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-legacy-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-modern-secret-key';
  return import('@/lib/email/emailService');
}

describe('sendTransactionalEmail authorization', () => {
  it('uses a server secret only as the apikey for service calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test-message' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { sendTransactionalEmail } = await loadEmailService();

    await expect(
      sendTransactionalEmail({ type: 'analysis_complete', to: 'owner@example.com' })
    ).resolves.toBe(true);

    const request = fetchMock.mock.calls[0][1];
    expect(request.headers.apikey).toBe('test-modern-secret-key');
    expect(request.headers.Authorization).toBeUndefined();
  });

  it('uses a publishable apikey with the user JWT for user calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test-message' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { sendTransactionalEmail } = await loadEmailService();

    await expect(
      sendTransactionalEmail(
        { type: 'analysis_complete', to: 'owner@example.com' },
        'test-user-jwt'
      )
    ).resolves.toBe(true);

    const request = fetchMock.mock.calls[0][1];
    expect(request.headers.apikey).toBe('test-publishable-key');
    expect(request.headers.Authorization).toBe('Bearer test-user-jwt');
  });
});
