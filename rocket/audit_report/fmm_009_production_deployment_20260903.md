# FMM-009 corrected production deployment evidence — 2026-09-03

Status: **PASS / OPEN pending independent production verification**

- Authorized application commit: `7d9e08985204164caaad6c7079577fcdec845cdc`
- Production Sites version: `169`
- Deployment: `appgdep_6a99fe9663d881918a1e0e51b3018a5e` (`succeeded`)
- Authorized migration: `20260903224837_fmm_009_plan_entitlement_enforcement.sql`
- Verified SHA-256 before application: `427bbde4eeec8bdfd41892408c98e3c5e705e0bc9283201478df970cb6cf5eae`
- Supabase migration record: `20260903230920_fmm_009_plan_entitlement_enforcement`
- Recovery checkpoint: restorable physical backup from `2026-09-03 04:10:47 UTC` confirmed before migration.

## Focused verification

- Reused locally verified FMM-009 evidence: base `119/119` and legacy-compatibility `14/14`.
- Production catalog and enforcement triggers: PASS (four canonical plans, `growth -> professional` alias, all four FMM-009 triggers installed).
- Client, seat, storage, AI quota, feature-denial, lifecycle, upgrade/downgrade/cancellation/grace/reconciliation, and concurrency behavior: PASS using the deployed exact commit, applied production enforcement schema, and focused synthetic transaction.
- Unknown plans fail closed: PASS (`PLAN_NOT_CONFIGURED`); the verification transaction rolled back and the sampled legacy row remained `growth`.
- Legacy compatibility: PASS. All four production `growth` rows remain stored as `growth`; resolution uses the canonical `professional` catalog limits (300 clients, 3 seats, 25 GiB), features, and AI behavior without a stored-value rewrite.
- Synthetic cleanup: PASS. Zero synthetic users, workspaces, clients, documents, or AI usage events remain.
- Post-deployment customer-data counts match preflight exactly: 30 workspaces, 29 entitlements, 14 clients, 30 memberships, zero documents, zero document bytes, and zero AI usage events. The four legacy `growth` entitlements remain present.
- Post-DDL security advisor produced no new FMM-009-specific finding. Existing project advisories remain outside this deployment scope.

No legitimate production customer data was deleted or normalized. FMM-009 must not be formally closed until independent production verification reports PASS.
