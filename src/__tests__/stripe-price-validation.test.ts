import { describe, expect, it } from 'vitest';
import { PLANS } from '@/lib/stripe/plans';
import {
  validateCheckoutPrice,
  type CheckoutPriceSnapshot,
} from '@/lib/stripe/priceValidation';

const validPrice: CheckoutPriceSnapshot = {
  active: true,
  currency: 'usd',
  type: 'recurring',
  unit_amount: 3900,
  recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
  product: { active: true },
};

describe('approved Stripe recurring price validation', () => {
  it('accepts the exact active monthly price for the selected plan', () => {
    expect(validateCheckoutPrice(validPrice, PLANS.starter)).toBeNull();
  });

  it.each([
    [{ ...validPrice, active: false }, 'PRICE_INACTIVE'],
    [{ ...validPrice, currency: 'eur' }, 'PRICE_CURRENCY_MISMATCH'],
    [{ ...validPrice, type: 'one_time', recurring: null }, 'PRICE_NOT_RECURRING'],
    [{ ...validPrice, recurring: { ...validPrice.recurring!, interval: 'year' } }, 'PRICE_INTERVAL_MISMATCH'],
    [{ ...validPrice, recurring: { ...validPrice.recurring!, usage_type: 'metered' } }, 'PRICE_USAGE_TYPE_MISMATCH'],
    [{ ...validPrice, unit_amount: 4900 }, 'PRICE_AMOUNT_MISMATCH'],
    [{ ...validPrice, product: 'prod_unexpanded' }, 'PRICE_PRODUCT_NOT_EXPANDED'],
    [{ ...validPrice, product: { active: false } }, 'PRICE_PRODUCT_INACTIVE'],
  ] as const)('rejects an unsafe production price', (price, reason) => {
    expect(validateCheckoutPrice(price, PLANS.starter)).toBe(reason);
  });
});
