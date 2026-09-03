# FMM-009 local remediation evidence

Status: **PASS locally — NOT DEPLOYED**

FMM-009 now extends the FMM-004 Stripe-verified workspace entitlement authority with one versioned plan catalog and a centralized fail-closed authorization service.

Implemented controls:

- Added immutable catalog version `2026-09-03.v1` with client, seat, storage, and feature allowances for every supported plan.
- Routed client creation, client-document allocation, and AI access through one server authorization guard.
- Moved client creation from a direct browser insert to an authenticated, selected-workspace server route.
- Added database triggers for client, team-seat, and storage allocations so direct or concurrent writes cannot bypass limits. Per-workspace advisory transaction locks serialize competing allocations.
- Preserved existing data on downgrade: excess existing usage is retained, while new allocation fails closed until usage is below the current plan limit.
- Reused FMM-004 active, trial, fixed grace-period, cancellation, stale-state, upgrade/downgrade, and out-of-order Stripe reconciliation behavior.
- Unknown plans, catalog mismatches, stale/denied entitlement, unavailable usage, over-limit allocation, and excluded features all fail closed.

Focused verification:

- FMM-009 policy plus reused FMM-004 lifecycle, subscription-access, and pricing suites: **119/119 passed**.
- TypeScript (`tsc --noEmit`): **PASS**.
- Targeted ESLint on changed TypeScript/TSX: **PASS**.
- Vinext production build (5/5 stages): **PASS**.

Remaining risk and production gate:

- The migration was statically verified locally; this host has no disposable local Postgres runtime for executing its triggers. Production authorization must require a schema backup, migration review/application, and isolated transactional fixtures.
- Production verification must prove in-limit success and over-limit denial for clients, seats, storage, and excluded features; concurrent allocation serialization; and correct upgrade, downgrade, cancellation, and fixed grace-period behavior without deleting customer data.
- No production deployment, schema/configuration change, or data mutation occurred.
