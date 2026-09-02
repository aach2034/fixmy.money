# FMM-003 Phase 1B: production-shaped forward-upgrade rehearsal

Date: 2026-09-02
Production baseline: Sites v159 at `a0088ee117e893fa62fa0d8449da64ce02499015`
Phase 1A source commit: `ff4acdf74c7598fd2b593537f139c1afd47b80f2`
Phase 1B correction commit: `fdb4a21` (`Fix FMM-003 production-shaped upgrades`)
Source branch: `codex/fmm-003-rls-reconciliation`

## Outcome

The corrected FMM-003 migration pair passed a production-shaped forward upgrade, existing-row preservation checks, 150 database/RLS assertions, 33 real Auth/Data API checks, an exact rollback restoration, a second forward application, and a clean 31-migration replay.

This result supports advancing the candidate to a separately authorized Phase 1C production-application review. It does **not** authorize a production migration, remove maintenance mode, begin FMM-004 or FMM-007, or approve launch.

Production was read only. No production row, Auth identity, storage object, configuration value, Stripe record, billing state, Sites deployment, or maintenance setting changed.

## Controls and environment

- Work started from the exact Phase 1A commit on the existing FMM-003 branch.
- Production access was limited to catalog, policy, grant, function, trigger, storage metadata, migration history, and advisor reads.
- The isolated branch contained no production customer rows and was created with data copying disabled.
- The only test records were deterministic synthetic identities and rows using `.invalid` email addresses.
- No AI provider, Stripe, email, or external mutation path was invoked.
- Every database mutation occurred only in the disposable Supabase branch named `fmm-003-phase-1b-forward-upgrade`.
- The disposable branch cost shown before creation was $0.01344/hour.
- The branch was positively identified before every reset, migration application, rollback, and destructive cleanup.

The hosted branch's automatic migration stage reported `MIGRATIONS_FAILED` and left the application schema empty. Rather than treating an empty schema as a production upgrade rehearsal, the test harness reconstructed the exact live pre-FMM-003 metadata snapshot before loading synthetic rows.

## Read-only production prestate

The live prestate contained:

- 63 public tables, all with RLS enabled.
- 244 public table constraints.
- 183 non-constraint public indexes.
- 18 public functions, including eight `SECURITY DEFINER` functions.
- 27 relevant public/Auth triggers.
- 102 public policies and four storage policies.
- 173 aggregated public-table grants for `anon`, `authenticated`, and `service_role`.
- One private, empty-by-rehearsal `evidence-documents` bucket definition.
- Eight Supabase application migration-history rows and no FMM-003 row.
- No public view, materialized view, or sequence.
- No `workspace_members` relation or other authoritative same-workspace membership model.
- No live `certified_mailings` table or `update_certified_mailings_updated_at()` function, even though both exist later in source history.

Nine production metadata fingerprints were captured:

| Object set | MD5 |
|---|---|
| Tables | `df40ceb7fd3566eebe60c31cf5888f32` |
| Indexes | `1287ae289a023c1864279c999762c941` |
| Policies | `073b0c04d46dc531c99b9664e51ecd66` |
| Triggers | `101a421789968118ec5311cf661271b4` |
| Functions | `630b31d9d3f280e8e4e07626008155f5` |
| Constraints | `8e69328168ff554de1a6f4bf1d1af45c` |
| Table grants | `55f78d92c5d92ebb630e8d3c4d19dcab` |
| Storage policies | `c06092c9ad4c2a9514e43ef3314ba5bb` |
| Migration history | `d8d3df82a43e92c5e3a8659401ecf75` |

Before each final forward run, independently generated DDL for tables, constraints, functions, indexes, triggers, policies, table grants, storage policies, and migration history compared with the captured production definitions with zero mismatches.

## Production-shaped fixtures

The fixture transaction created six synthetic Auth identities:

- Owner A and Owner B.
- Member candidate C.
- Portal A and Portal B.
- Active platform admin F.

It created 59 application rows across 25 tables, including owner-isolated workspaces, clients, reports, letters, billing and AI-usage metadata, portal records, chats, documents, provider settings, and an active admin record. It created no storage object.

Production has no membership relation, so member C owns only its own synthetic workspace and is required to fail closed for Owner A. The rehearsal does not invent FMM-007 behavior.

Every non-empty public table received a canonical count and row-content hash before migration. The same 63-table manifest was collected after each forward application and after rollback. All 59 rows remained byte-for-byte unchanged.

## Defects found and narrow corrections

### 1. Production-shaped forward upgrade failure

The original Phase 1A migration failed safely and transactionally after 3.827 seconds:

`function public.update_certified_mailings_updated_at() does not exist`

The migration assumed the source-only `certified_mailings` objects were already live. Production does not have them.

The correction conditionally hardens and grants the trigger function only when `to_regprocedure` finds it, and conditionally grants the table only when `to_regclass` finds it. Clean replay still exercises the objects because the earlier source migration creates them.

### 2. Recursive active-admin policy

Existing-row testing found:

`infinite recursion detected in policy for relation platform_admins`

The original `platform_admins_select` policy queried `platform_admins` from its own predicate. The correction adds `private.is_active_platform_admin()`, a stable `SECURITY DEFINER` helper with an empty fixed `search_path`, revokes public/anonymous execution, and binds evaluation to `auth.uid()`.

### 3. Synthetic GoTrue seed compatibility

The first real password login returned HTTP 500 because direct synthetic seeds left GoTrue token text columns as `NULL`. Auth logs identified:

`converting NULL to string is unsupported`

The fixture-only correction writes empty strings to the required token columns, matching GoTrue v2.196's representation. The full rehearsal was reset and repeated after this change. The final run had no new Auth, API, or Postgres errors.

### 4. Test-fixture state-code collision

The Phase 1A pgTAP fixture used state code `ZZ`, which is intentionally occupied by the production-shaped fixture. That isolated test value moved to `ZY`; the production-shaped fixture retained `ZZ`.

No correction changed application behavior, customer data, billing, Stripe, maintenance, or Sites.

## Final forward-upgrade application

The final corrected run began from the exact 63-table production-shaped prestate with six synthetic users, 59 application rows, eight production migration-history rows, and no `certified_mailings` object.

| Migration | Start (UTC) | End (UTC) | Duration | Result | Waiting locks |
|---|---|---|---:|---|---:|
| `fmm_003_rls_reconciliation` | 2026-09-02 04:22:17.904 | 2026-09-02 04:22:20.342 | 2.433 s | Pass | 0 |
| `fmm_003_production_schema_history_reconciliation` | 2026-09-02 04:22:20.417 | 2026-09-02 04:22:22.493 | 2.076 s | Pass | 0 |

No deadlock, blocker, partial application, or long-running wait was observed. Each migration used the normal Supabase migration application path and recorded one new migration-history row.

After both migrations:

- Public tables: 63.
- Public policies: 103.
- Storage policies: four.
- Migration-history rows: ten.
- RLS-disabled public tables: zero.
- Exact-`TRUE` public policy predicates: zero.
- Anonymous public-table grants: zero.
- Synthetic users: six.
- Missing live `certified_mailings`: handled without failure and remained absent.
- Existing application-row differences: zero.

## Policy and grant diff

The policy diff was narrow and explicit:

- 102 public policies before; 103 after.
- One policy added: `product_analytics_events_server_only`.
- No policy removed.
- 29 existing policies changed to add or tighten owner, portal, admin, or immutable-event predicates, including required `WITH CHECK` clauses.

The grant diff was:

- 173 aggregated app-role table grants before; 124 after.
- 49 role/table grant sets removed: 48 anonymous paths and the unsupported authenticated `webhook_failures` path.
- 47 authenticated table grant sets narrowed to operations supported by RLS.
- Service-role table grants remained unchanged.
- Anonymous table privileges after migration: zero.
- Authenticated `TRUNCATE`, `REFERENCES`, and `TRIGGER` privileges after migration: zero.

Six specialist ownership helpers moved out of the exposed `public` schema. The active-admin helper also lives in `private`. The private schema is unavailable to anonymous callers, and callable helper privileges are limited to the roles required for policy evaluation.

## Authorization and isolation results

### Database assertions

- Phase 1A pgTAP: 70/70 passed.
- Phase 1B existing-row pgTAP: 80/80 passed.
- After rollback and reapplication: 70/70 and 80/80 passed again.

Covered behavior includes:

- Anonymous callers cannot read public application tables.
- Owners A and B see only their own profiles, workspaces, clients, reports, dashboard, letters, billing metadata, AI usage, provider settings, leads, and acquisition rows.
- Cross-tenant ownership reassignment and cross-tenant insertion fail.
- Valid own-row updates succeed.
- Member C cannot read Owner A's workspace, client, or dashboard and therefore fails closed.
- Portal A and Portal B can read only their matching account/dispute/document/chat chains.
- An active platform admin can read the supported admin role and note rows without recursion.
- A non-admin cannot read admin role or note rows.
- Service role retains the required cross-tenant and server-only paths.
- Storage policies remain four authenticated owner-folder policies on a private bucket.

### Real Auth/Data API smoke

The read-only HTTPS smoke used the disposable branch URL and its publishable key; no secret or access token was written to source or the report.

All 33 checks passed:

- Anonymous public-table read: HTTP 401.
- Six synthetic password sign-ins: HTTP 200.
- Owner-isolated Data API reads: HTTP 200 with exactly one visible row per two-tenant fixture.
- Member candidate lookup of Owner A workspace: HTTP 200 with zero rows.
- Portal account, dispute, document, conversation, and message isolation: HTTP 200 with exactly one visible row.
- Active-admin role and note reads: HTTP 200 with exactly one row.
- Authenticated access to server-only analytics: HTTP 403.

No write request was sent through the application API. Auth, API, and Postgres logs contained no error after the corrected final run.

## Advisors and current Supabase behavior

Security advisor findings after the production-shaped forward upgrade: zero.

The performance advisor reported 230 non-security items:

- 26 unindexed foreign keys.
- 14 Auth RLS init-plan opportunities.
- 164 unused indexes in the short-lived rehearsal environment.
- 21 multiple-permissive-policy findings.
- Four duplicate indexes.
- One fixed Auth database-connection allocation notice.

These are documented optimization debt, not authorization failures. Multiple permissive policies intentionally represent separate specialist and portal personas; changing that identity model belongs with FMM-007. No performance rewrite was added to FMM-003.

Current Supabase guidance confirms that database branches do not copy production data, grants and RLS are separate controls, update policies require both visibility and check predicates, and current hosted behavior no longer assumes automatic API table exposure. The migration explicitly grants only the operations supported by its policies.

## Rollback rehearsal

Rollback artifact:

`supabase/cleanup/fmm_003_phase_1b_rollback.sql`

It is intentionally outside `supabase/migrations`, carries a do-not-run-automatically warning, and requires separate target identification and authorization. It does not drop application tables or rewrite Git history.

Rollback began at 2026-09-02 04:24:23.809 UTC and completed at 04:24:25.786 UTC in 1.977 seconds. Waiting locks: zero.

The rollback restored, with exact definition comparisons:

- 63 public tables.
- 244 constraints.
- 183 non-constraint indexes.
- 18 public functions.
- 27 relevant triggers.
- 102 public policies.
- 173 app-role table grants.
- Four storage policies.
- RLS enabled on every public table.
- No `private` schema.
- All 59 application rows unchanged.

The rollback does not delete FMM-003 migration-history rows. That is deliberate: rewriting production migration bookkeeping during an emergency rollback would obscure what actually ran. In the disposable branch only, the two history rows were removed after exact rollback verification so the corrected migrations could be reapplied. Both reapplied successfully, and both pgTAP suites passed again.

If production application is ever authorized and a rollback is required, keep containment active, preserve the applied history and evidence, run only the separately reviewed rollback artifact, and create a forward corrective migration before any future retry.

## Clean source-history replay

The disposable application state was then cleared completely:

- Zero public tables.
- Zero application migration-history rows.
- Zero synthetic users.
- Zero storage policies.
- No evidence bucket.

All 31 repository migrations applied in filename order from 2026-09-02 04:26:23.965 UTC to 04:27:18.283 UTC.

Final clean-replay state:

- 31/31 migrations applied.
- 64 public tables, including source-only `certified_mailings`.
- 31 migration-history rows.
- Zero RLS-disabled public tables.
- Zero anonymous public-table grants.
- One private `evidence-documents` bucket.
- Phase 1A pgTAP: 70/70.
- Security advisor findings: zero.

This proves the conditional production-shape correction did not weaken or skip the clean-install path.

## Application repository gates

- TypeScript typecheck: pass.
- ESLint: pass with zero errors and 56 existing warnings.
- Production vinext build: pass across all five build stages; standalone output generated.
- Unit suite: 960/963 passed.

The same three baseline failures recorded in Phase 1A remain:

1. Evidence-specific paid-balance letter wording.
2. Cross-bureau status conflict display.
3. Explicit save-to-audit versus audit-to-dispute action text.

No FMM-003 file participates in those failures, and their names/counts are unchanged from the starting evidence.

## Source artifacts

- Corrected migration: `supabase/migrations/20260902032551_fmm_003_rls_reconciliation.sql`
- Schema-history migration: `supabase/migrations/20260902034124_fmm_003_production_schema_history_reconciliation.sql`
- Phase 1A pgTAP: `supabase/tests/database/fmm_003_rls_reconciliation.test.sql`
- Production-shaped pgTAP: `supabase/tests/database/fmm_003_phase_1b_forward_upgrade.test.sql`
- Synthetic fixtures: `supabase/tests/fixtures/fmm_003_phase_1b_production_shaped.sql`
- Read-only API smoke: `scripts/fmm-003-phase-1b-api-smoke.mjs`
- Tested rollback: `supabase/cleanup/fmm_003_phase_1b_rollback.sql`

The migration correction and its Phase 1A fixture adjustment are isolated in commit `fdb4a21`. Phase 1B fixtures, integration smoke, rollback, and this report are evidence-only artifacts committed separately.

## Remaining risks and recommendation

Remaining known issues:

- Same-workspace member semantics are still blocked by the absence of an authoritative membership relation and remain FMM-007.
- The performance-advisor debt above remains out of scope.
- Three unrelated application unit assertions remain at their documented baseline.
- A production change window still needs fresh backup/PITR confirmation, metadata fingerprint confirmation, and explicit Phase 1C authorization.

Recommendation: the corrected FMM-003 candidate is suitable for Phase 1C production-application review because the production-shaped upgrade, existing-row preservation, RLS matrix, real Auth/Data API, rollback, reapplication, clean replay, build, and security gates passed. Do not apply it to production from this report alone.

## Stop condition

Production remains Sites v159 at `a0088ee117e893fa62fa0d8449da64ce02499015`, in maintenance mode, with no FMM-003 migration applied. No Phase 1C, FMM-004, FMM-007, Sites deployment, or launch work began.

After all evidence was committed, the disposable `fmm-003-phase-1b-forward-upgrade` branch was deleted successfully. A final branch listing contained only the production project's default `main` branch.
