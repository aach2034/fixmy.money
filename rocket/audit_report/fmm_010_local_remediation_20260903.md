# FMM-010 local remediation evidence — 2026-09-03

Status: **PASS locally / NOT DEPLOYED**

FMM-010 replaces browser-authoritative onboarding completion with a server-owned workflow:

- `GET /api/onboarding` derives company, completion, selected-workspace, and Connect state on the server with no caching.
- `PUT /api/onboarding` validates company input and saves workspace/profile state atomically through a service-role-only database function after selected-owner verification.
- `POST /api/onboarding` re-evaluates every prerequisite and durably marks completion through the server only.
- A database trigger rejects browser attempts to set either company setup or onboarding completion flags.
- Existing completed users are compatibly marked as having completed company setup; no customer field is deleted or overwritten.
- Stripe Connect remains accurately unavailable and optional. `STRIPE_CONNECT_ENABLED=true` fails closed until a separately authorized authoritative Accounts v2 status integration exists; no simulated success is possible.

## Verification

- Focused FMM-010, onboarding-gate, and containment tests: **30/30 passed**.
- TypeScript: **PASS**.
- Targeted ESLint: **PASS**.
- Production build: **PASS**.
- Migration SHA-256: `6b9aaeb80a6cc9cfa7a0456f604cd7ea2d7544b77d9faa40e08383aa91cfe0f8`.

## Production gate

Production requires fresh authorization to create a schema backup; verify and apply only `20260903235900_fmm_010_server_authoritative_onboarding.sql` with the recorded hash; deploy the exact remediation commit; keep `STRIPE_CONNECT_ENABLED=false`; and run focused synthetic verification for incomplete, failed, resumed, and completed onboarding, selected-workspace/owner enforcement, direct browser-write denial, existing-completed-user compatibility, durable company saves, and synthetic cleanup. Do not enable Stripe Connect or change Stripe production configuration under that authorization.
