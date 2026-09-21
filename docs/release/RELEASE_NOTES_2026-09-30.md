# FixMy.Money September 30, 2026 release notes

## Customer-facing changes

- Reopening date standardized to September 30, 2026.
- Published plans standardized to Personal $39/month, Start $99/month, and Grow $199/month.
- Public annual pricing and unsupported promotional/performance claims removed.
- Public signup prepared for a controlled launch-day activation while existing-customer access remains available.
- Security and storage wording updated to match verified current controls.

## Reliability and security

- Checkout now retrieves and validates the configured Stripe Price before creating a session and fails closed on any mismatch.
- Recurring Stripe prices are never synthesized from application copy.
- Signup, callback, and new-customer checkout share a server-side date-and-flag gate.
- Public signup uses email verification, a minimum 12-character password, generic anti-enumeration success responses, and Supabase/Turnstile abuse controls when configured.
- Current Sites production source was reconciled into the release branch so the deployment is traceable and rollbackable.

## Intentionally unchanged or deferred

- `/demo-mode` behavior/content is unchanged.
- No Supabase migration is included.
- Stripe Connect and external report-AI processing remain disabled.
- No customer email is sent as part of this release without separate approval.
