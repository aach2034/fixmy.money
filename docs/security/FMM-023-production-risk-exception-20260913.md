# FMM-023 production status and temporary owner-accepted risk exception

**Effective date:** 2026-09-13 UTC

**Release status:** **OPERATIONAL — CLOSED WITH A DEFERRED CONTROL**

**Deferred control:** Live Worker-to-Better-Stack alert delivery verification

**Control disposition:** **DEFERRED — NOT PASSED**

## Owner decision and exact exception language

FMM-023 is operational in production. The owner accepts a temporary evidence exception limited to live Worker-to-Better-Stack delivery proof. This exception records that the production abuse controls and alert transport are deployed; it does not claim that end-to-end delivery of an FMM-023 production event has passed.

The available manufactured production test would require 21 lead-abuse requests from a Cloudflare-controlled source IP. That test could throttle legitimate traffic sharing the rate bucket and would create a D1 rate-limit row that the authorized tooling cannot remove immediately. The owner does not authorize that test and accepts deferral of its live-delivery evidence.

Do not manufacture production rate-limit traffic, Turnstile configuration failure, lead-persistence failure, or cleanup failure solely to close this evidence gap. The first organically occurring FMM-023 structured event must be checked for delivery from the production Worker to the Better Stack receiver and through Adam Hamilton's configured notification path, using only privacy-safe event type and timestamp evidence and without recording customer content or secret values.

If the first organic FMM-023 event is not received and accepted end to end, reopen FMM-023 immediately, preserve privacy-safe failure evidence, and handle the transport failure as an incident.

This exception ends only after one organic production event verifies Worker-to-Better-Stack delivery and the configured recipient path. A local test, configuration inspection, or provider-originated test does not satisfy that requirement.

## Production evidence at acceptance

- PRs #12 and #13 passed all required CI and are contained in merge commit `b21057d84d37d75beb2f593d39f5eddea8f01550`.
- The reconciled production source `4db38ef1e57c14b11dcfaabfe032b61722941402` preserves production-only fixes and contains only the approved FMM-023 release scope on top of Sites version 187.
- Sites version 188 deployed successfully with the hourly cleanup trigger packaged as `0 * * * *`.
- The homepage, login, public health route, and waitlist form respond successfully.
- A streamed request body larger than 4 KiB is rejected with HTTP 413 before parsing or D1 access.
- The public Turnstile site key is present through runtime-public configuration.
- `TURNSTILE_SECRET_KEY`, `MONITORING_ALERT_WEBHOOK_URL`, and `HEALTHCHECK_SECRET` remain protected and absent from browser artifacts.
- Existing focused tests and required CI verify the soft and hard thresholds, `Retry-After` behavior, normalized-email-and-offer deduplication, cleanup scope, and privacy-safe alert payload.
- The Better Stack receiver and Adam Hamilton's notification path were configured before deployment; live production Worker delivery remains unverified under this exception.
- No synthetic lead, rate-limit bucket, alert, or D1 fixture was created for acceptance.
- Sites version 187 remains available for rollback.

## Residual risk and compensating safeguards

The accepted residual risk is that a production FMM-023 event could fail to reach Better Stack or Adam Hamilton's configured notification path even though the application, transport, receiver, secret registration, and local validation are configured correctly.

The following safeguards remain mandatory during the exception:

- Keep the Better Stack receiver enabled and `MONITORING_ALERT_WEBHOOK_URL` protected.
- Keep FMM-023 structured payloads privacy-safe; never include email addresses, raw IP addresses, tokens, request bodies, Turnstile responses, webhook URLs, or secret values.
- Review the first organic FMM-023 structured event for matching Worker and Better Stack timestamps and recipient-path acceptance.
- Do not generate abusive production traffic merely to obtain delivery evidence.
- Reopen FMM-023 immediately if the first organic event is not delivered end to end.
- Preserve Sites version 187 for application rollback while this exception remains open.

## Exit criteria

Close this exception only after all of the following are verified:

1. A naturally occurring FMM-023 structured event is emitted by the production Worker.
2. Exactly one corresponding HTTPS POST is accepted by the Better Stack receiver.
3. Adam Hamilton's configured notification path accepts the resulting alert.
4. The observed payload is confirmed privacy-safe without recording customer content or secret values.

If any step fails, FMM-023 must be reopened immediately.
