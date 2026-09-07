import type Stripe from 'stripe';

export const STRIPE_INTEGRATION_API_VERSION = '2025-05-28.basil' as const;
export const LOCAL_PASSWORD_RESET_REDIRECT_URL =
  'http://127.0.0.1:4028/auth/callback';

export function buildTestSubscriptionParams(
  customerId: string,
  priceId: string,
): Stripe.SubscriptionCreateParams {
  return {
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: 14,
  };
}

export function buildTestPortalConfigurationParams(): Stripe.BillingPortal.ConfigurationCreateParams {
  return {
    default_return_url: 'http://127.0.0.1:4028/dashboard',
    business_profile: {
      headline: 'FixMy.Money test portal',
    },
    features: {
      subscription_cancel: { enabled: true },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
    },
  };
}
