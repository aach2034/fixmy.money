import { describe, expect, it } from 'vitest';
import { ACTIVE_SUBSCRIPTION_STATUSES, hasActiveSubscription } from '@/lib/subscription/access';

describe('subscription access status', () => {
  it.each(['active', 'trialing', 'trial_active'])(
    'allows the full workspace for %s',
    (status) => {
      expect(hasActiveSubscription(status)).toBe(true);
    }
  );

  it.each([null, undefined, '', 'none', 'inactive', 'canceled', 'past_due'])(
    'keeps protected navigation hidden for %s',
    (status) => {
      expect(hasActiveSubscription(status)).toBe(false);
    }
  );

  it('keeps the shared server and sidebar status set explicit', () => {
    expect([...ACTIVE_SUBSCRIPTION_STATUSES]).toEqual(['active', 'trialing', 'trial_active']);
  });
});
