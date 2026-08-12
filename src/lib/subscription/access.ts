export const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
  'trial_active',
]);

export function hasActiveSubscription(status: string | null | undefined): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.has((status || '').toLowerCase());
}
