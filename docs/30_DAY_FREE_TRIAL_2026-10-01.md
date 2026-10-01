# 30-day application trial

## Customer contract

- New self-serve acquisition remains business-only: Start (`professional`) and Grow (`agency`).
- The trial starts exactly once, after email verification and successful onboarding.
- The selected plan's existing feature and usage limits apply for 30 days.
- No Stripe customer, subscription, invoice, payment method, charge, or debt is created by trial activation.
- At the exact expiration timestamp, feature pages and direct feature APIs fail closed. Login, billing/account access, and retained data remain; expiration does not delete customer data.
- Paid billing is a separate owner action. Checkout shows the monthly price, always collects a payment method, and creates no Stripe trial. The release-controlled signup and paid-Checkout flags remain separate and default closed.

## Server authority

`20261001120000_application_free_trial.sql` adds immutable trial timestamps, a one-claim-per-user/workspace ledger, and a service-role-only atomic activation function. Activation verifies confirmed email, completed onboarding, workspace ownership, an active workspace, and an eligible B2B plan. Repeated activation is idempotent only for the same claim; plan changes, timestamp changes, and a second claim fail closed.

Legacy Stripe trials and paid subscriptions keep their existing mapping. Application-trial history remains after conversion so signing out, repeating onboarding, or changing plans cannot restart it.

## Release controls

The code is deployable only after the existing migration, privacy, seller, billing, CI, preview, and rollback gates in the authoritative launch tracker pass. `PUBLIC_SIGNUP_ENABLED` and `NEW_PAID_CHECKOUT_ENABLED` must be approved and enabled independently. Neither flag is changed by this implementation.
