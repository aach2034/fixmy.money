import { describe, expect, it } from 'vitest';
import {
  buildTestPortalConfigurationParams,
  buildTestSubscriptionParams,
  LOCAL_PASSWORD_RESET_REDIRECT_URL,
  STRIPE_INTEGRATION_API_VERSION,
} from '../../scripts/integration-test-contracts';

describe('isolated integration API contracts', () => {
  it('pins Stripe integration tests without changing the production Stripe client', () => {
    expect(STRIPE_INTEGRATION_API_VERSION).toBe('2025-05-28.basil');
  });

  it('creates subscriptions from an isolated recurring Price ID', () => {
    const params = buildTestSubscriptionParams('cus_test', 'price_test');

    expect(params).toEqual({
      customer: 'cus_test',
      items: [{ price: 'price_test' }],
      trial_period_days: 14,
    });
    expect(params.items?.[0]).not.toHaveProperty('price_data');
  });

  it('puts the portal return URL on the supported top-level field', () => {
    const params = buildTestPortalConfigurationParams();

    expect(params.default_return_url).toBe('http://127.0.0.1:4028/dashboard');
    expect(params.business_profile).not.toHaveProperty('return_url');
  });

  it('keeps password-reset integration callbacks on loopback', () => {
    const redirect = new URL(LOCAL_PASSWORD_RESET_REDIRECT_URL);

    expect(redirect.protocol).toBe('http:');
    expect(redirect.hostname).toBe('127.0.0.1');
  });
});
