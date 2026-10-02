# 30-day application trial

## Customer contract

- New self-serve acquisition remains business-only: Start (`professional`) and Grow (`agency`).
- New Personal registration and Personal trials remain intentionally unavailable. Historical Personal accounts, subscriptions, mappings, and support are preserved; they are not evidence of new-Personal eligibility.
- The trial starts exactly once, after email verification and successful onboarding.
- The selected plan's existing feature and usage limits apply for 30 days.
- No Stripe customer, subscription, invoice, payment method, charge, or debt is created by trial activation.
- At the exact expiration timestamp, feature pages and direct feature APIs fail closed. Login, billing/account access, and retained data remain; expiration does not delete customer data.
- Paid billing is a separate owner action. Checkout shows the monthly price, always collects a payment method, and creates no Stripe trial. The release-controlled signup and paid-Checkout flags remain separate and default closed.

## Server authority

`20261001120000_application_free_trial.sql` adds immutable trial timestamps, a one-claim-per-user/workspace ledger, and a service-role-only atomic activation function. Activation verifies confirmed email, completed onboarding, workspace ownership, an active workspace, and an eligible B2B plan. Repeated activation is idempotent only for the same claim; plan changes, timestamp changes, and a second claim fail closed.

Legacy Stripe trials and paid subscriptions keep their existing mapping. Application-trial history remains after conversion so signing out, repeating onboarding, or changing plans cannot restart it.

## Isolated release validation

The required GitHub release gate includes a dedicated local-stack Chromium journey. It enables signup and Checkout only inside an ephemeral Supabase environment, confirms a signup email through the local mail sink, completes onboarding, verifies the immutable no-card application trial, rejects new Personal acquisition, exercises exact expiration with a separate synthetic account, submits a declined Stripe test card without granting paid access, and completes an explicit Start subscription with Stripe test mode and a signed local webhook. It then verifies paid access survives a new sign-in and disposes the remote test-mode customer, subscription, prices, and products.

The ordinary isolated integration job also creates an immediately paid test-mode subscription without `trial_period_days`. Neither job targets production, sends customer email, or makes a live charge. D-06 and the seller/counsel/tax controls remain production release gates; they do not prohibit isolated local Supabase or Stripe test-mode validation.

## Release controls

The code is deployable only after the existing migration, privacy, seller, billing, CI, preview, and rollback gates in the authoritative launch tracker pass. `PUBLIC_SIGNUP_ENABLED` and `NEW_PAID_CHECKOUT_ENABLED` must be approved and enabled independently. Neither flag is changed by this implementation.
