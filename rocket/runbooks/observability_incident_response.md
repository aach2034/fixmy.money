# Observability and incident response

## Signals

- Public liveness: `GET /api/health` (no dependency or configuration detail).
- Authenticated readiness: `GET /api/health?ready=1` with `X-Healthcheck-Secret`; both database and Stripe must pass.
- Application logs are structured JSON with a content-free request ID. Never log credentials, cookies, report content, prompts, contact details, or payment details.

## Alert policy

- Page the operator after two consecutive readiness failures or five minutes of sustained HTTP 5xx responses.
- Treat Stripe readiness failure, webhook dead-letter growth, or entitlement reconciliation failure as revenue-path severity. Stop deployments; do not alter customer subscriptions while diagnosing.
- Treat database readiness loss as a write freeze. Preserve evidence and use the latest verified recovery checkpoint.

## Triage and recovery

1. Record request IDs, deployment/version, start time, and affected dependency without copying customer content.
2. Stop the active deployment wave. If it caused the failure, redeploy the prior saved Sites version and use the migration-specific rollback plan.
3. Verify legitimate checkout, webhook recognition, billing portal, renewal state, and paid/trial entitlement behavior using non-destructive fixtures only.
4. Escalate unresolved dependency failures to the named database or Stripe operator.
5. Close only after readiness and the revenue-path regression gate pass and an independent verifier records the result.
