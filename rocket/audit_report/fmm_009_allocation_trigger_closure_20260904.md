# FMM-009 allocation-trigger row-safety closure — 2026-09-04

- Status: **PASS / CLOSED**
- Independent verifier: **Craig Frankel**
- Source commit: `907b707d4869244be0aaa7920a29525b19f9b167`
- Authorized migration: `20260904020000_fmm_009_allocation_trigger_row_safety.sql`
- Migration SHA-256: `85e5ecb4f715e834350e52941a299fb787b3bc3130d3e8979edaedbe44a6ff37`
- Production migration-history entry: `20260904124210_fmm_009_allocation_trigger_row_safety`
- Application deployment: none required; production Sites application was unchanged.

Independent production verification confirmed:

- `private.enforce_workspace_plan_allocation()` branches before reading table-specific trigger fields. `NEW.role` is read only for `public.workspace_memberships`; `public.staff_clients` uses `NEW.case_stage` and has no `role` column.
- The three intended allocation triggers remain enabled, unexpected trigger-table attachment fails closed, and function execution remains restricted to `postgres`.
- Normal entitled client creation passed. A serialized concurrent allocation reached the Starter limit while the competing request failed with `CLIENTS_LIMIT_REACHED` and persisted no row.
- Cross-tenant insertion failed closed and persisted no row. An unsupported entitlement plan failed with `PLAN_NOT_CONFIGURED` and left the prior entitlement unchanged.
- Legacy `growth` resolved to canonical `professional` limits. The four legitimate stored `growth` rows retained the exact pre-verification fingerprint and were not rewritten.
- FMM-011 atomic persistence and idempotent replay produced one report and one item. A forced mid-transaction enum failure left neither a report nor an item.
- Revenue-path smoke passed: production health was healthy, signup remained reachable, authenticated checkout/dashboard routing remained active, billing/webhook persistence objects remained present, and unresolved webhook failures remained zero.

Synthetic verification created two users, two workspaces, two entitlements, four clients, one report, one item, and associated membership rows. All were removed. Post-cleanup checks found zero synthetic residue.

Legitimate production counts and fingerprints matched the independent preflight exactly after cleanup: 31 workspaces, 31 memberships, 30 entitlements, 14 clients, 38 reports, 1,114 negative items, one snapshot, and three imports. The allocation-trigger row-safety remediation is formally **PASS / CLOSED**.
