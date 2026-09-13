# FMM-020 production monitoring closure

Date: 2026-09-13

Status: Closed in production; monitoring active

Provider: Better Stack

Production application: Sites v188, source `4db38ef1e57c14b11dcfaabfe032b61722941402`

## Production monitors

| Monitor | ID | URL | Interval | Timeout | Incident confirmation | Recovery | Coverage |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| `fixmy.money` | `4898718` | `https://fixmy.money/` | 3 minutes | 30 seconds | 5 minutes | 3 minutes | Europe, North America, Asia, Australia |
| `FixMy.Money production readiness` | `4898742` | `https://fixmy.money/api/health?ready=1` | 1 minute | 30 seconds | 1 minute | Immediate | Europe, North America, Asia, Australia |

The homepage monitor has TLS verification enabled. TLS-certificate-expiration and domain-expiration warnings are both configured for 30 days. Adam Hamilton is the owner and primary responder for both monitors, with the existing Better Stack email notification path enabled. This configuration uses the existing plan and adds no monthly cost.

## Protected readiness contract

The readiness monitor uses `GET` and sends the protected `X-Healthcheck-Secret` header on every check. The secret was rotated in a coordinated Sites/Better Stack update on 2026-09-13; its value was neither displayed nor recorded. The monitor URL contains no credential.

The owner has accepted this authenticated response shape:

- `status`: the fixed health state `ready` or `degraded`;
- `request_id`: a privacy-safe correlation identifier; and
- `dependencies`: exactly the fixed names `database` and `stripe`, each with a boolean health value.

Source review confirmed that the dependency object cannot serialize URLs, credentials, identifiers, latency, exception messages, customer data, database details, account information, or internal traces. A controlled post-rotation check returned HTTP 200 before the monitor was unpaused. The response used `Cache-Control: no-store` and the production API policy applied `X-Robots-Tag: noindex, nofollow, noarchive`.

After unpausing, the first genuine scheduled regional check completed successfully by 2026-09-13 21:07 UTC. Monitor `4898742` remained Up and opened no incident. Monitor `4898718` also remained active and Up. The old Better Stack sample incident was acknowledged and resolved administratively; Better Stack showed no open incidents afterward.

## Operations and privacy

Sites Worker logs are the current application-error source. Operators may correlate an incident using the request ID, but must not record credentials, customer data, email addresses, raw IP addresses, tokens, request bodies, dependency internals, or exception traces in monitoring evidence.

Readiness is bounded and read-only. It checks database and Stripe availability without creating Supabase, Stripe, D1, Auth, billing, lead, or customer records. Missing or invalid readiness credentials fail closed with the same not-found response.

## Deferred control retained from FMM-023

**Live Worker-to-Better-Stack alert delivery verification — DEFERRED, NOT PASSED.**

The first organic privacy-safe structured Worker event must be checked for Better Stack receipt and the configured responder notification. Do not manufacture production abuse traffic solely to close this evidence gap. If the first organic event fails delivery, reopen FMM-023 immediately.

No application deployment or production data/configuration change is required by this documentation record.
