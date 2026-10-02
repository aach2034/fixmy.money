export type AdministratorDestination = '/admin' | '/admin/security' | null;

type ProfileState = { onboarding_completed: boolean } | null;
type EntitlementState = { canAccess?: boolean } | null;

export async function getAdministratorDestination(
  fetcher: typeof fetch = fetch
): Promise<AdministratorDestination> {
  try {
    const response = await fetcher('/api/auth/administrator-destination', {
      method: 'GET',
      cache: 'no-store',
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { destination?: unknown };
    return body.destination === '/admin' || body.destination === '/admin/security'
      ? body.destination
      : null;
  } catch {
    return null;
  }
}

export async function resolvePostLoginDestination(input: {
  redirectTo: string;
  getAdministratorDestination: () => Promise<AdministratorDestination>;
  getProfile: () => Promise<ProfileState>;
  getEntitlement: () => Promise<EntitlementState>;
}): Promise<string> {
  const administratorDestination = await input.getAdministratorDestination();
  if (administratorDestination) return administratorDestination;

  const [profile, entitlement] = await Promise.all([
    input.getProfile(),
    input.getEntitlement(),
  ]);

  if (profile && !profile.onboarding_completed) return '/onboarding';
  if (profile && entitlement?.canAccess) return input.redirectTo || '/dashboard';

  return '/billing-subscriptions';
}
