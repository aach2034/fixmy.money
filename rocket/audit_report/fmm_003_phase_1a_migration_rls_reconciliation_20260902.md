# FMM-003 Phase 1A: migration and RLS reconciliation

Date: 2026-09-02

Baseline: `a0088ee117e893fa62fa0d8449da64ce02499015`

Source branch: `codex/fmm-003-rls-reconciliation`

## Outcome

FMM-003 Phase 1A is complete in source and in a disposable isolated Supabase environment. The complete 31-file migration history replays from an empty public schema, all 70 pgTAP assertions pass, and the isolated security advisor reports no findings.

Nothing in this work was applied to production. Production was queried only for schema, policy, privilege, function, migration-history, storage, and advisor metadata. No production table rows or Auth identities were exported, inserted, updated, or deleted. No production storage, billing, Stripe, maintenance, or Sites state changed.

This is a migration/RLS reconciliation candidate for review. It is not production application authorization, Phase 1B authorization, or launch approval.

## Scope and controls

- Work began from the exact containment commit shown above on a dedicated branch.
- Production access remained read-only throughout.
- All DDL and synthetic authorization tests ran only in a disposable Supabase branch without production data.
- No migration was marked applied in production.
- No existing migration was edited or renumbered.
- No application feature work, billing work, Stripe work, production-data work, or Phase 1B work was included.

## Production metadata baseline

The read-only baseline found:

- 63 public tables and eight storage tables.
- RLS enabled on every public table.
- 106 policies across the public and storage schemas.
- No public views or materialized views.
- One private `evidence-documents` bucket with four authenticated, owner-folder policies on `storage.objects`.
- Eight recorded production migrations. Several production hardening changes were therefore not reproducible from the committed source history.
- Ten public tables present in production but absent from the prior source replay: `audit_logs`, `cancellation_periods`, `compliance_disclosures`, `compliance_overrides`, `consumer_contracts`, `consumer_disclosures`, `consumer_services`, `croa_contracts`, `leads`, and `state_compliance_configs`.
- One source table, `certified_mailings`, not yet present in production.
- Production security advisor output contained only the informational no-policy notice for the intentionally server-only `product_analytics_events` table.

Production policy, constraint, column, enum, index, role-grant, function, and trigger metadata was read to reconstruct the intended state. Production customer records and request content were not read.

## Reconciliation migrations

### `20260902032551_fmm_003_rls_reconciliation.sql`

This migration:

- Removes exact-`TRUE`, implicit-`PUBLIC`, and obsolete globally permissive policies.
- Adds both `USING` and `WITH CHECK` to mutable owner policies.
- Limits launch, outreach, social, UTM, affiliate, provider-setting, billing, AI-usage, admin, and portal access to explicit authenticated ownership or server-only paths.
- Preserves the current client-portal email-claim model without inventing the workspace-membership model deferred to FMM-007.
- Moves six `SECURITY DEFINER` ownership helpers from the exposed `public` schema to a non-exposed `private` schema, fixes their `search_path`, and narrows execution privileges.
- Fixes trigger-function `search_path` settings and removes browser execution privileges.
- Removes all anonymous public-table grants and replaces broad authenticated grants with the operations supported by RLS.
- Records an explicit authenticated-deny policy for the server-only product analytics stream.
- Adds catalog guards that abort if a public table lacks RLS or if a broad/implicit-public policy is reintroduced.

### `20260902034124_fmm_003_production_schema_history_reconciliation.sql`

This migration reconstructs the ten production-only tables and the `lead_status`, `croa_pipeline_stage`, `contract_status`, and `audit_action` enums from production catalog metadata. It preserves production columns, defaults, constraints, foreign keys, and indexes, while strengthening four owner policies that lacked `WITH CHECK` in production.

The migration explicitly enables RLS, grants no anonymous access, grants authenticated callers only RLS-supported operations, keeps audit events authenticated append/read-only, and grants service-role access for server workflows. It includes the same global RLS policy guards as the primary correction.

## Authorization matrix

| Principal | Intended access after replay | Verification |
|---|---|---|
| Anonymous | No public application-table privileges. | Direct reads of workspace, chat, analytics, and reconstructed lead data fail. |
| Authenticated owner | CRUD only on rows owned through `auth.uid()`, an owned workspace, or the established specialist ownership chain. | Own-row read/write passes; unrelated-tenant reads return zero; cross-tenant inserts and ownership reassignment fail. |
| Authenticated portal client | Access only through the current account-email/JWT-email chain for account, dispute, timeline, update, document metadata, and chat rows. | Matching portal rows are visible; another portal account's rows are hidden; cross-tenant chat insertion fails. |
| Active platform admin | Existing active-admin policies remain limited to the explicitly supported admin tables and operations. | Dangerous authenticated grants (`TRUNCATE`, `REFERENCES`, `TRIGGER`) are absent. |
| Unrelated authenticated tenant | No visibility or mutation path to another tenant's owner-scoped rows. | Cross-tenant selects return zero and mutation attempts fail or affect zero rows. |
| Service role | Server-wide path for server workflows and server-only event streams. | Cross-tenant reads and server-only event insertion pass in isolation. |
| Same-workspace member | Not implemented because no `workspace_members` relation or authoritative membership model exists. | Catalog assertion documents this as the FMM-007 blocker; no speculative policy was introduced. |

Multiple permissive policies remain on some portal tables because client and specialist access are separate authenticated personas with distinct predicates. Consolidating those branches would change the identity model and belongs with FMM-007, not this reconciliation.

## Isolated verification

- Disposable environment began without production data.
- Public/private application schemas were cleared before the final replay; existing isolated storage bucket metadata was retained, and its policies were cleared so the storage migration had to recreate them.
- All 31 source migrations applied successfully in filename order from the empty public schema.
- Both FMM-003 migrations were separately reapplied successfully before the clean replay to verify idempotency.
- pgTAP: 70 passed, zero failed.
- Final isolated catalog:
  - 64 public tables.
  - 108 public/storage policies.
  - zero public tables without RLS.
  - zero exact-`TRUE` or implicit-`PUBLIC` public policies.
  - zero public `UPDATE` policies without `WITH CHECK`.
  - zero anonymous public-table grants.
  - zero dangerous authenticated grants.
  - all ten production-only historical tables restored.
  - zero remaining synthetic Auth rows after transaction rollback.
- Supabase security advisor: zero findings.

The isolated performance advisor still reports informational/warning-level historical optimization debt, including unindexed foreign keys, multiple permissive client/specialist policy branches, and duplicate indexes. The reconstructed `audit_logs` table intentionally reproduces production's duplicate `created_at` indexes; other duplicates predate FMM-003. These are not security failures and were not silently widened into this authorization task. Reference: [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies), and [duplicate indexes](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index).

## Application verification

No application source changed during Phase 1A. Verification against the unchanged application source produced:

- TypeScript typecheck: pass.
- ESLint: zero errors, 56 existing warnings.
- Production build: pass, including all five vinext stages and standalone output.
- Unit suite: 960 passed and three known baseline failures remained unchanged:
  - credit audit evidence-specific letter language.
  - cross-bureau status conflict display.
  - explicit save-to-audit versus audit-to-dispute action text.

Those three failures are unrelated to the database migration/RLS changes and were already present at the starting commit.

## Drift after source replay

| Object set | Production | Isolated source replay | Interpretation |
|---|---:|---:|---|
| Public tables | 63 | 64 | The ten missing production tables are now reproducible. `certified_mailings` is the only source-only table. |
| Public/storage policies | 106 | 108 | The two additional policies belong to source-only `certified_mailings`; broad/implicit-public policy count is zero. |
| FMM-003 migrations recorded | 0 | 2 | Expected: production was not changed. |

## Proposed production rollout plan

A separate production authorization is required before any step below:

1. Reconfirm the production migration history and metadata fingerprint with read-only queries.
2. Confirm current backups/PITR and an approved maintenance/change window.
3. Review and approve the single source commit containing both additive migrations, the pgTAP test, and this report.
4. Apply the two migrations in filename order using the normal Supabase migration mechanism. Do not edit or mark historical migrations manually.
5. Run read-only post-apply catalog checks for RLS coverage, policy roles/predicates, grants, helper locations/search paths, storage policies, and migration-history entries.
6. Run non-mutating application smoke tests under the existing containment posture.
7. Preserve maintenance mode and do not begin Phase 1B until a separate decision is made.

## Rollback strategy

The production-only tables already exist, so the schema-history migration is additive/idempotent for production. The material production change would be the RLS/function/grant correction.

If post-apply verification fails, keep containment active and use a new forward corrective migration to restore the last reviewed production policy/function/grant definitions. Do not drop customer tables, rewrite Supabase migration history, reset Git, or force-push. Preserve the failed migration, catalog evidence, and logs for diagnosis. If safe restoration cannot be demonstrated immediately, keep affected application paths disabled rather than weakening RLS.

## Stop condition

Production remains unchanged and still records no FMM-003 source migration. The disposable test environment can be deleted after preserving this source evidence. Stop here: do not apply to production and do not begin FMM-004, FMM-007, Phase 1B, or later work.
