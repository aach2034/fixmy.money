# FixMy.Money Stripe setup

Existing FixMy.Money subscriptions use verified Stripe webhooks and the hosted customer portal. New paid Checkout is held for all plans pending consumer-billing legal approval and verified business-purchaser separation; see `docs/release/CONSUMER_BILLING_HOLD_2026-09-21.md`.

## 1. Create recurring products in Stripe test mode

Create three monthly recurring prices:

- Personal (`starter`) — $39 USD per month
- Start (`professional`) — $99 USD per month
- Grow (`agency`) — $199 USD per month

Copy each `price_...` identifier.

## 2. Configure test environment values

Set these values in the hosting environment. Never put secret values in browser-visible variables or commit them to source control.

```text
NEXT_PUBLIC_SITE_URL=https://fixmy.money
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PROFESSIONAL_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...
```

## 3. Create the webhook

Create a Stripe webhook endpoint at:

```text
https://fixmy.money/api/stripe/webhook
```

Subscribe it to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.created`
- `invoice.finalized`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.upcoming`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

Reveal the endpoint signing secret and save it as `STRIPE_WEBHOOK_SECRET=whsec_...` in the hosting environment.

## 4. Configure the customer portal

In Stripe's customer portal settings, enable:

- Update payment methods
- View invoice history
- Cancel subscriptions
- Switch plans only if the corresponding products and prices are configured

Set the business name, support email, privacy policy URL, and terms URL.

## 5. Test before live mode

Before any future paid-checkout re-enablement, verify in test mode that:

- The present route returns `503 NEW_PAID_CHECKOUT_ON_HOLD` for Personal, Start, and Grow without making a Stripe call.
- Any future approved route preserves duplicate-checkout protection and never lets Personal fall through to B2B billing.
- Billing management opens only for the signed-in account.
- Subscription cancellation updates the account through the webhook.
- A failed payment changes the account to `past_due`.
- Duplicate webhook deliveries do not create duplicate billing-event records.

## 6. Switch to live mode

The existing live-mode account already has monthly products, Prices, and a webhook. Do not create replacement live objects, run a live transaction, or enable new checkout under this hold. Verify existing customer lifecycle and obtain the required legal and product approvals first.

This documentation is not a determination that any consumer billing flow complies with credit-repair law.
