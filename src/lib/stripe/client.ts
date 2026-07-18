import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export function createClient(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: createClient is not implemented yet.', args);
  return null;
}
