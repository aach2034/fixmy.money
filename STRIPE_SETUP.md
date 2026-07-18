# FixMy.Money Stripe setup

FixMy.Money uses Stripe Checkout for SaaS subscriptions, verified webhooks for subscription state, and Stripe's hosted customer portal.

## 1. Create recurring products in Stripe test mode

Create three monthly recurring prices:

- Starter — $49 USD per month
- Professional — $129 USD per month
- Agency — $249 USD per month

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

Use a Stripe test card, complete Checkout, and confirm:

- The account receives `trial_active` status.
- A duplicate checkout is blocked.
- Billing management opens only for the signed-in account.
- Subscription cancellation updates the account through the webhook.
- A failed payment changes the account to `past_due`.
- Duplicate webhook deliveries do not create duplicate billing-event records.

## 6. Switch to live mode

Create live-mode products and prices, replace every test key and price ID with its live equivalent, create a separate live webhook endpoint, and use that endpoint's live signing secret. Test a low-risk real transaction and refund before announcing billing as live.

FixMy.Money subscription charges are for access to business software, not for consumer credit-repair results.
