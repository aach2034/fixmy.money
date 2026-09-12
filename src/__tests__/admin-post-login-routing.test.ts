import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getPlatformAdminRole: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

vi.mock('@/lib/admin/authorization', () => ({
  getPlatformAdminRole: mocks.getPlatformAdminRole,
}));

import { GET as getAdministratorDestinationRoute } from '@/app/api/auth/administrator-destination/route';
import {
  getAdministratorDestination,
  resolvePostLoginDestination,
} from '@/lib/auth/post-login';

describe('administrator post-login routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'verified-administrator' } },
          error: null,
        }),
      },
    });
  });

  it('routes an active superadministrator such as Adam directly to /admin', async () => {
    mocks.getPlatformAdminRole.mockResolvedValue('platform_superadmin');

    const response = await getAdministratorDestinationRoute();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ destination: '/admin' });
    expect(mocks.getPlatformAdminRole).toHaveBeenCalledWith('verified-administrator');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('routes an active standard administrator directly to /admin', async () => {
    mocks.getPlatformAdminRole.mockResolvedValue('platform_admin');

    const response = await getAdministratorDestinationRoute();

    await expect(response.json()).resolves.toEqual({ destination: '/admin' });
  });

  it('fails closed for an inactive administrator or ordinary user', async () => {
    mocks.getPlatformAdminRole.mockResolvedValue(null);

    const response = await getAdministratorDestinationRoute();

    await expect(response.json()).resolves.toEqual({ destination: null });
  });

  it('does not resolve administrator state without a verified Auth identity', async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('missing') }),
      },
    });

    const response = await getAdministratorDestinationRoute();

    expect(response.status).toBe(401);
    expect(mocks.getPlatformAdminRole).not.toHaveBeenCalled();
  });

  it('does not call profile, entitlement, subscription, or Stripe paths for an administrator', async () => {
    const getProfile = vi.fn();
    const getEntitlement = vi.fn();

    const destination = await resolvePostLoginDestination({
      redirectTo: '/dashboard',
      getAdministratorDestination: vi.fn().mockResolvedValue('/admin'),
      getProfile,
      getEntitlement,
    });

    expect(destination).toBe('/admin');
    expect(getProfile).not.toHaveBeenCalled();
    expect(getEntitlement).not.toHaveBeenCalled();
  });

  it('preserves ordinary-user entitlement and onboarding routing', async () => {
    const activeCustomer = await resolvePostLoginDestination({
      redirectTo: '',
      getAdministratorDestination: vi.fn().mockResolvedValue(null),
      getProfile: vi.fn().mockResolvedValue({ onboarding_completed: true }),
      getEntitlement: vi.fn().mockResolvedValue({ canAccess: true }),
    });
    const onboardingCustomer = await resolvePostLoginDestination({
      redirectTo: '',
      getAdministratorDestination: vi.fn().mockResolvedValue(null),
      getProfile: vi.fn().mockResolvedValue({ onboarding_completed: false }),
      getEntitlement: vi.fn().mockResolvedValue({ canAccess: true }),
    });
    const customerWithoutEntitlement = await resolvePostLoginDestination({
      redirectTo: '',
      getAdministratorDestination: vi.fn().mockResolvedValue(null),
      getProfile: vi.fn().mockResolvedValue({ onboarding_completed: true }),
      getEntitlement: vi.fn().mockResolvedValue({ canAccess: false }),
    });

    expect(activeCustomer).toBe('/dashboard');
    expect(onboardingCustomer).toBe('/onboarding');
    expect(customerWithoutEntitlement).toBe('/billing-subscriptions');
  });

  it('accepts only the exact server-issued /admin destination', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ destination: 'https://attacker.example' }), { status: 200 })
    );

    await expect(getAdministratorDestination(fetcher)).resolves.toBeNull();
  });
});
