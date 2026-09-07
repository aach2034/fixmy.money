# FMM-011 local remediation — 2026-09-03

Status: **PASS locally / NOT DEPLOYED**

- Replaced browser-side report/item/client multi-writes with a bounded authenticated server endpoint and one tenant-authorized Postgres transaction.
- Made direct saves idempotent and concurrency-safe with a scoped commit key, unique index, and advisory transaction lock.
- Made tag/finalize persistence atomic across items, snapshot, parsed-report state, and import state.
- Privileged RPCs are service-role only; tenant, selected membership, role, client, workspace, payload type, item count, and body size are validated fail-closed.
- Focused import/parser tests: 66/66 PASS. Revenue-path gate: 125/125 PASS. TypeScript, targeted ESLint, and production build: PASS.

Remaining production gate: restorable backup, exact migration hash verification, migration application, isolated synthetic atomicity/idempotency/cross-tenant/failure rollback checks, focused report-import smoke test, customer-data preservation, and synthetic cleanup.
