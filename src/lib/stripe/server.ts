import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripeServerClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey === 'your-stripe-secret-key-here' || secretKey.trim() === '') {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  if (!stripeClient) stripeClient = new Stripe(secretKey);
  return stripeClient;
}
