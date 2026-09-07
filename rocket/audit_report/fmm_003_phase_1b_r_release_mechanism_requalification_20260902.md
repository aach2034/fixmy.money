# FMM-003 Phase 1B-R: release-mechanism requalification

Review time: 2026-09-02 05:07 UTC  
Phase 1B-R2 evidence window: 2026-09-02 05:53–07:43 UTC  
Release-control update: 2026-09-02 08:01 UTC  
Production project: `agxzfdyvewptjwdfuvwq`  
Production Sites baseline: v159 at `a0088ee117e893fa62fa0d8449da64ce02499015`

## 1. PHASE 1B-R verdict

**PASS / GO for a separate production-deployment authorization decision.** Backup evidence, emergency access, Strategy A packaging, pinned-CLI dry run, disposable forward application, timeout behavior, exact rollback, CLI reapplication, metadata restoration, row preservation, pgTAP, hosted Auth/Data API, security-advisor, log, and human-accountability gates all passed. Adam Hamilton is explicitly assigned as the production database operator, Craig Frankel is explicitly assigned as the independent verifier, and the qualified timeout preflight and mandatory restoration are authorized for the eventual production runbook. This readiness verdict does not itself authorize a production change.

## 2. Rollback identity

`supabase/cleanup/fmm_003_phase_1b_rollback.sql`

SHA-256: `5a138406ce8dfc4c33a778edfbb1f4506419a46dc579b3cc322f4200099554c8`

The file is byte-identical to the Phase 1B-qualified artifact at commit `1a6488c27ddf29255188430f5f1ba449c751accf`. The only source correction was restoration of the qualified trailing newline after `COMMIT;`; no executable SQL changed.

## 3. Backup/PITR evidence

**PASS.** An authenticated Supabase dashboard session for production project `agxzfdyvewptjwdfuvwq` showed a restorable physical backup at **2026-09-02 04:10:27 UTC**. The scheduled-backup page exposed `Restore` controls for eight daily physical restore points from 2026-08-26 through 2026-09-02; the immediately preceding point is 2026-09-01 04:12:08 UTC.

The separate Point in Time page states that PITR is available as an add-on and offers `Enable add-on`, proving PITR is **not enabled** for this project. The verified 2026-09-02 physical backup, not an inferred Pro-plan entitlement, is the release recovery basis. No restore or other production mutation was initiated.

## 4. Named operational roles

- Production database operator: **PASS — Adam Hamilton, explicitly assigned for the eventual authorized production database change.** The authenticated account is Adam Hamilton, and all eight current production migration rows identify `adamchamilton@gmail.com` as `created_by`.
- Independent verifier: **PASS — Craig Frankel, explicitly assigned to independently observe and verify the eventual authorized production database change.**
- Sites rollback operator: **Adam Hamilton**, verified as the current Sites owner. Saved rollback v158 remains available at `f5c5d52b1cad9b9a3be406307fcb479acc17d620`.

The connected database mechanism can act as PostgreSQL `postgres`. Adam Hamilton is accountable for executing the eventual authorized change; Craig Frankel is accountable for independently verifying it.

## 5. Emergency connection test

**Technical mechanism: PASS. Operational ownership: PASS.**

Read-only production query result:

- `current_database()`: `postgres`
- `current_user`: `postgres`
- `supabase_migrations.schema_migrations`: 8 rows

Failure-on-error probe:

```sql
BEGIN TRANSACTION READ ONLY;
SELECT 1 AS before_error;
SELECT 1 / 0 AS intentional_read_only_error;
SELECT 2 AS must_not_run;
COMMIT;
```

The mechanism stopped at SQLSTATE `22012` (`division by zero`). A follow-up harmless read succeeded and confirmed the migration ledger still had eight rows. No DDL or DML was executed.

## 6. Migration-history strategy

**PASS: Strategy A — version-aligned release manifest.**

`scripts/build-fmm-003-release-manifest.sh` is a fail-closed builder that:

- verifies the qualified hashes of both forward migrations and the rollback;
- refuses to overwrite an existing output directory;
- writes exactly eight inert production-version placeholders;
- copies only the two authorized FMM-003 migration files;
- rejects any manifest other than the exact ten-file set; and
- verifies that the source has 31 migrations, exactly two overlap the manifest, and the other 29 are excluded.

A fresh R2 packaging run passed with `migration_files=10`, `production_placeholders=8`, `authorized_source_migrations=2`, and `excluded_source_migrations=29`. The builder does not connect to a database or invoke the Supabase CLI. Both CLI dry runs and both CLI applications used only this generated manifest.

Strategy B was not accepted. MCP `apply_migration` can constrain execution to supplied SQL bodies, but its generated remote versions would permanently diverge from the two source filenames. Strategy A preserves the qualified source filenames and provides the durable fail-closed release control required for this rollout.

## 7. Pinned tool, disposable target, and timeout behavior

Pinned stable CLI: Supabase CLI `2.116.0` (2026-08-26).  
Official Darwin arm64 archive SHA-256: `8b750455d7b02c989cec0c6c26599d28b0aefcbeedf20a315bb1d5215a185a83`.  
Downloaded binary reported `2.116.0`.

Verified command surfaces:

```text
supabase db push --help
supabase migration list --help
supabase link --help
```

The credentialed disposable sequence executed against preview project `kzrmnqpbdbvsziqkqnsl`:

```text
supabase migration list --db-url <DISPOSABLE_DATABASE_URL> --workdir <TEN_ENTRY_MANIFEST>
supabase db push --dry-run --db-url <DISPOSABLE_DATABASE_URL> --workdir <TEN_ENTRY_MANIFEST>
supabase db push --db-url <DISPOSABLE_DATABASE_URL> --workdir <TEN_ENTRY_MANIFEST>
```

Supabase branch `fmm-003-phase-1b-r2-rehearsal-20260902` was created with production-data copying disabled at the acknowledged price of $0.01344/hour. It initially had zero public tables and zero migration rows. The production-shaped prestate was reconstructed from read-only catalog metadata, not customer rows, then populated only with the existing `.invalid` synthetic fixture. The branch was deleted after qualification; the final branch listing contained only production `main`.

Official CLI documentation says `db push --dry-run` lists pending files and compares local migration timestamps with the remote ledger. The pinned CLI source applies an ordinary migration file and its history insert in one batch transaction. The same source runs `RESET ALL` before each migration. The two FMM files contain no top-level transaction boundary and no pipeline-incompatible statement (`CREATE/DROP INDEX CONCURRENTLY`, `REINDEX ... CONCURRENTLY`, `VACUUM`, `ALTER SYSTEM`, or `CLUSTER`).

The pinned CLI exposes no lock-timeout or statement-timeout flag and runs `RESET ALL` before each migration. R2 configured disposable database-role defaults of `lock_timeout=5s` and `statement_timeout=60s`; a fresh session executed `RESET ALL` and still reported `5s` and `1min`. Both CLI applications completed with those defaults. The qualified SQL bodies were not edited.

Production's read-only `RESET ALL` preflight currently reports `lock_timeout=0` and `statement_timeout=2min`. The release owner has authorized the eventual production runbook to temporarily set the reviewed database-role defaults to `lock_timeout=5s` and `statement_timeout=60s` before `db push`. The runbook must first record and verify the existing `0`/`2min` values, verify the temporary `5s`/`60s` values in a fresh session after `RESET ALL`, and immediately restore and independently verify `0`/`2min` after the migration attempt, including after any error or rollback. Timeout restoration is a mandatory postcondition. No timeout or other production configuration mutation was made during R2.

The current Supabase changelog was reviewed again at the 2026-09-02 08:01 UTC release-control update. No listed breaking change alters this fixed CLI `2.116.0` Strategy A migration procedure or the verified timeout control.

## 8. Dry-run output

**PASS.** The pinned CLI migration list showed eight exact local/remote matches and only these two local-only versions:

- `20260902032551_fmm_003_rls_reconciliation.sql`
- `20260902034124_fmm_003_production_schema_history_reconciliation.sql`

`supabase db push --dry-run` then reported exactly those two files and no seeds or roles. After exact rollback and resetting only the two disposable ledger rows, a second dry run produced the same two-file result.

## 9. Migration history before and after rehearsal

Current read-only production history, unchanged:

1. `20260805161853_public_content_seo`
2. `20260812034808_harden_function_paths_and_rls_roles`
3. `20260812034953_optimize_core_tenant_rls_checks`
4. `20260812035104_revoke_public_trigger_function_execution`
5. `20260813221718_evidence_driven_dispute_engine`
6. `20260813221952_harden_evidence_engine_privileges_and_indexes`
7. `20260823190143_retention_queue_cleanup`
8. `20260829214723_product_acquisition_analytics`

Disposable before-state: the same eight versions and names listed above.

Disposable after each pinned-CLI application: exactly ten rows, with only:

9. `20260902032551_fmm_003_rls_reconciliation`
10. `20260902034124_fmm_003_production_schema_history_reconciliation`

No unexpected migration row appeared. A final read-only production query still returned eight rows.

## 10. Other historical migrations

The Strategy A manifest contained only eight inert already-recorded placeholders and the two authorized source migrations. Both CLI dry runs named only the two FMM files; both CLI applications logged only those two files. None of the other 29 source migration files was present in the CLI workdir or executed by the CLI.

## 11. Forward/rollback/reapply timing

- First CLI forward window: 2026-09-02 06:21:18.486–06:21:42.815 UTC; CLI command wall time 7.1 seconds.
- Exact rollback: 1.639 seconds.
- Second CLI reapplication window: 2026-09-02 07:39:20.522–07:39:44.656 UTC; CLI command wall time 5.6 seconds.
- Both applications completed without a migration error or unexpected file.

## 12. Database/RLS/Auth/Data API totals

- First CLI-applied state: Phase 1A pgTAP 70/70; production-shaped pgTAP 80/80; hosted Auth/Data API 33/33.
- After exact rollback and second CLI application: Phase 1A pgTAP 70/70; production-shaped pgTAP 80/80; hosted Auth/Data API 33/33.
- Total R2 pgTAP: 300/300 across the two forward states.
- Security advisor after final reapplication: zero findings.
- Auth logs: zero error-class events.
- Postgres/API error-class events were only the expected negative-access probes: anonymous workspace denial (401), authenticated server-only analytics denial (403), and corresponding PostgreSQL permission-denied entries.

## 13. Row-content preservation

The disposable fixture contained six synthetic Auth users, six synthetic identities, 59 synthetic application rows across 25 public tables, one private empty bucket definition, and zero storage objects. Canonical per-table row counts and JSONB hashes had zero differences:

- after the first CLI forward application;
- after exact rollback; and
- after the second CLI application.

The rollback restored matching production fingerprints for tables, indexes, policies, triggers, functions, constraints, public table grants, and storage policies.

## 14. Final executable-artifact hashes

- Migration 1: `a58572662478c98c43a71bf5fd193d80427292c51f2103273047b33b09649ee1`
- Migration 2: `ba1cd13261ab19501135127d3f1346a793a1cd5216939996d62485553951c1b9`
- Rollback: `5a138406ce8dfc4c33a778edfbb1f4506419a46dc579b3cc322f4200099554c8`
- Phase 1A pgTAP: `13469be8ee7e10b6fdb73b22051207940bc322abb01878ac106bc2c842ea416b`
- Production-shaped pgTAP: `26db89af4af29807782a0f0bb0e32cb352fc30a1c7c577aad6a042bd08834eb3`
- Production-shaped fixture: `69c25c79f7c9e42f737fae485fce24fb9dad4bff138914a75795949b0920c263`
- Manifest builder: `b83ff733aac2bdf6cfbdd18b6bc82ad409192be91695d4b3684f91720af7185c`

## 15. Release-control closure

No Phase 1B-R2 gate remains open:

- Production database operator: **Adam Hamilton — PASS.**
- Independent verifier: **Craig Frankel — PASS.**
- Temporary timeout procedure and mandatory restoration: **AUTHORIZED / PASS.**
- All disposable technical, backup, rollback, packaging, rehearsal, test, security, and unchanged-production controls: **PASS.**

## 16. Exact production plan and rollback controls

The eventual production plan, if separately authorized, is:

1. Keep Sites v159 containment and maintenance mode in place. Reconfirm production is v159 at `a0088ee117e893fa62fa0d8449da64ce02499015` and that saved Sites v158 remains available.
2. Reconfirm a specific current physical restore point and emergency SQL access. Reconfirm the production migration ledger has the same eight exact rows listed in section 9.
3. Rebuild Strategy A with the qualified hashes in section 14. Use only pinned Supabase CLI `2.116.0`; require `migration list` and `db push --dry-run` to show eight exact matches and exactly the two FMM-003 files pending.
4. Adam Hamilton executes while Craig Frankel independently observes and verifies. Record and verify production's existing `lock_timeout=0` and `statement_timeout=2min`, temporarily set database-role defaults to `5s`/`60s`, and prove a fresh `RESET ALL` session sees those temporary values.
5. Apply the two authorized files once from the ten-entry Strategy A manifest. The only permitted ledger transition is **8 → 10**, adding `20260902032551_fmm_003_rls_reconciliation` and `20260902034124_fmm_003_production_schema_history_reconciliation` in that order. None of the other 29 source migrations may be present or execute.
6. Run the qualified non-mutating ledger, metadata, RLS, pgTAP, hosted Auth/Data API, security-advisor, and log verification. Do not perform application-data, Auth-user, Storage-object, billing, or Sites mutations.
7. Immediately restore database-role defaults to `lock_timeout=0` and `statement_timeout=2min`, including after an error or rollback, and have the independent verifier prove the restored values in a fresh session. This is a mandatory postcondition.

Abort before execution, or execute the exact qualified rollback if a migration has begun, on any of these triggers:

- backup, emergency-access, Sites baseline, migration-ledger, file-hash, CLI-version, manifest, or two-file dry-run mismatch;
- inability to set or verify the temporary `5s`/`60s` timeouts;
- lock timeout, statement timeout, deadlock, migration error, unexpected pending file, unexpected ledger row, or a ledger result other than the permitted transition;
- metadata, grant, policy, RLS, pgTAP, hosted API, security-advisor, or log verification failure;
- unexpected production-data, Auth, Storage, billing, maintenance, or Sites mutation;
- new security/privacy exposure, widespread error, or inability to restore and verify `0`/`2min` immediately afterward.

If execution has started, stop further rollout work, keep containment active, preserve all evidence, and run only the exact rollback SQL with SHA-256 `5a138406ce8dfc4c33a778edfbb1f4506419a46dc579b3cc322f4200099554c8` through the proven fail-closed emergency connection. Verify the restored schema and RLS state and the timeout postcondition. Record whatever migration-ledger rows actually committed; do not automatically delete, repair, replay, force-push, or rewrite history. Any follow-up ledger disposition requires a separately reviewed recovery plan.

## 17. Final release-readiness checklist

1. All required controls: **PASS.**
2. Exact production migration plan and expected ledger transition: **PASS — documented in sections 9 and 16; exactly two files, 8 → 10.**
3. Pre-deployment backup/rollback verification: **PASS for current readiness evidence — physical restore point and exact rollback artifact verified. A fresh restore-point check remains a mandatory execution-time preflight.**
4. Named operator and independent verifier: **PASS — Adam Hamilton is the production database operator; Craig Frankel is the independent verifier.**
5. Timeout restoration as a mandatory verified postcondition: **PASS — authorized and documented.**
6. Explicit rollback triggers: **PASS — documented in section 16.**
7. Production still unchanged: **PASS — eight migration rows, `0`/`2min` timeout defaults, Sites v159 containment, and no production mutation.**
8. Final recommendation: **GO to request a separate, explicit production-deployment authorization under the exact controls in this report.** This is not deployment authorization.

## Production-change confirmation and stop condition

Production received only harmless reads and a read-only intentional-error probe. No DDL, DML, Auth mutation, Storage operation, billing change, migration-history change, Sites deployment, or maintenance change occurred. Production remains at eight database migrations and Sites v159; saved Sites v158 remains available. Phase 1D and all other Phase 1 work remain stopped.

## Final FMM-003 GO/NO-GO authorization review

**GO for a separate production-deployment authorization decision.** Engineering remediation, Strategy A, backup and rollback readiness, the named production operator, the independent verifier, and the timeout preflight/restoration control are qualified. This report does **not** authorize deployment: production remains unchanged, containment remains active, and a separate explicit production authorization is required before executing the runbook. This is containment/release preparation only, not launch approval. Do not begin Phase 1D.
