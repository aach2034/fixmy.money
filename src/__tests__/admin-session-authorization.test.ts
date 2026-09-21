import { describe, expect, it, vi } from 'vitest';
import { getAuthenticatedPlatformAdminRole } from '@/lib/admin/authorization';

function authenticatedClient(result: { data: { role: string; active: boolean } | null; error: Error | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const activeEquals = vi.fn().mockReturnValue({ maybeSingle });
  const userEquals = vi.fn().mockReturnValue({ eq: activeEquals });
  const select = vi.fn().mockReturnValue({ eq: userEquals });
  const from = vi.fn().mockReturnValue({ select });

  return {
    client: { from } as unknown as Parameters<typeof getAuthenticatedPlatformAdminRole>[0],
    from,
    select,
    userEquals,
    activeEquals,
  };
}

describe('database-authoritative administrator session authorization', () => {
  it('accepts an active AAL2 administrator exposed by authenticated RLS', async () => {
    const query = authenticatedClient({
      data: { role: 'platform_superadmin', active: true },
      error: null,
    });

    await expect(
      getAuthenticatedPlatformAdminRole(query.client, 'verified-administrator')
    ).resolves.toBe('platform_superadmin');
    expect(query.from).toHaveBeenCalledWith('platform_admins');
    expect(query.select).toHaveBeenCalledWith('role, active');
    expect(query.userEquals).toHaveBeenCalledWith('user_id', 'verified-administrator');
    expect(query.activeEquals).toHaveBeenCalledWith('active', true);
  });

  it.each([
    ['ordinary user', null, null],
    ['inactive administrator hidden by RLS', null, null],
    ['database error', null, new Error('denied')],
    ['unexpected role', { role: 'owner', active: true }, null],
  ])('fails closed for %s', async (_label, data, error) => {
    const query = authenticatedClient({ data, error });

    await expect(
      getAuthenticatedPlatformAdminRole(query.client, 'unprivileged-user')
    ).resolves.toBeNull();
  });
});
