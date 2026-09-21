import type { PlanConfig } from './plans';

export type CheckoutPriceSnapshot = {
  active: boolean;
  currency: string;
  type: string;
  unit_amount: number | null;
  recurring: {
    interval: string;
    interval_count: number;
    usage_type: string;
  } | null;
  product: string | { active?: boolean; deleted?: unknown };
};

export function validateCheckoutPrice(
  price: CheckoutPriceSnapshot,
  plan: PlanConfig,
): string | null {
  if (!price.active) return 'PRICE_INACTIVE';
  if (price.currency !== 'usd') return 'PRICE_CURRENCY_MISMATCH';
  if (price.type !== 'recurring' || !price.recurring) return 'PRICE_NOT_RECURRING';
  if (price.recurring.interval !== 'month' || price.recurring.interval_count !== 1) {
    return 'PRICE_INTERVAL_MISMATCH';
  }
  if (price.recurring.usage_type !== 'licensed') return 'PRICE_USAGE_TYPE_MISMATCH';
  if (price.unit_amount !== plan.stripeAmountCents) return 'PRICE_AMOUNT_MISMATCH';
  if (typeof price.product === 'string') return 'PRICE_PRODUCT_NOT_EXPANDED';
  if (price.product.deleted || price.product.active !== true) return 'PRICE_PRODUCT_INACTIVE';
  return null;
}
