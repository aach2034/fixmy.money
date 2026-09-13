# Observability and incident response

## Signals

- Public liveness: `GET /api/health` (no dependency or configuration detail).
- Authenticated readiness: `GET /api/health?ready=1` with `X-Healthcheck-Secret`; both database and Stripe must pass.
- Application logs are structured JSON with a content-free request ID. Never log credentials, cookies, report content, prompts, contact details, or payment details.

## Alert policy

- Page the operator after two consecutive readiness failures or five minutes of sustained HTTP 5xx responses.
- Treat Stripe readiness failure, webhook dead-letter growth, or entitlement reconciliation failure as revenue-path severity. Stop deployments; do not alter customer subscriptions while diagnosing.
- Treat database readiness loss as a write freeze. Preserve evidence and use the latest verified recovery checkpoint.

## Production routing decision

- Better Stack is the production uptime and readiness provider. Monitor `4898718` checks `https://fixmy.money/` every three minutes with a 30-second timeout, five-minute incident confirmation, three-minute recovery confirmation, TLS verification, and checks from Europe, North America, Asia, and Australia. TLS-certificate and domain-expiration warnings are set to 30 days.
- Better Stack monitor `4898742` checks `GET https://fixmy.money/api/health?ready=1` every minute with a 30-second timeout, one-minute incident confirmation, immediate recovery, and the same four regions. It sends the protected `X-Healthcheck-Secret` header. The credential must never be copied into this runbook, a URL, logs, browser artifacts, or source control.
- Adam Hamilton owns both monitors and is the primary responder through the existing Better Stack email notification path. Changes to ownership or escalation require an explicit operational handoff.
- The protected readiness body contains only `status`, a content-free `request_id`, and fixed `database` and `stripe` dependency names with boolean health values. It must not expose URLs, credentials, latency, exception text, customer or account data, database details, or internal traces.
- Sites Worker logs are the current source for application-error investigation. Correlate using the privacy-safe request ID; do not copy protected readiness credentials or customer content.
- The provider-agnostic alert adapter uses the protected `MONITORING_ALERT_WEBHOOK_URL`. Live Worker-to-Better-Stack alert delivery remains deferred under the FMM-023 owner risk exception: verify the first organic structured event and reopen FMM-023 immediately if delivery fails. Do not manufacture production abuse traffic solely to close that evidence gap.

## Triage and recovery

1. Record request IDs, deployment/version, start time, and affected dependency without copying customer content.
2. Stop the active deployment wave. If it caused the failure, redeploy the prior saved Sites version and use the migration-specific rollback plan.
3. Verify legitimate checkout, webhook recognition, billing portal, renewal state, and paid/trial entitlement behavior using non-destructive fixtures only.
4. Escalate unresolved dependency failures to the named database or Stripe operator.
5. Close only after readiness and the revenue-path regression gate pass and an independent verifier records the result.
