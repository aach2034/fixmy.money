# FMM-003 production closure

Closure date: 2026-09-02  
Production project: `agxzfdyvewptjwdfuvwq`  
Production Sites baseline: v159 at `a0088ee117e893fa62fa0d8449da64ce02499015`  
Production database operator: Adam Hamilton  
Independent verifier: Craig Frankel

## Final status

**CLOSED — PASS.** FMM-003 engineering remediation, release qualification, controlled production deployment, post-deployment validation, and independent-verifier sign-off are complete. No rollback was required.

This closure applies only to FMM-003. It is not launch approval, does not remove maintenance mode, and does not authorize Phase 1D or any other remediation or production work.

## Authorized migrations applied

Only the following two qualified migrations were applied, in order:

1. `20260902032551_fmm_003_rls_reconciliation`
   - SHA-256: `a58572662478c98c43a71bf5fd193d80427292c51f2103273047b33b09649ee1`
2. `20260902034124_fmm_003_production_schema_history_reconciliation`
   - SHA-256: `ba1cd13261ab19501135127d3f1346a793a1cd5216939996d62485553951c1b9`

The production migration ledger transitioned exactly **8 to 10**. No other source migration executed.

## Deployment evidence accepted

- Pinned Supabase CLI `2.116.0` and the validated Strategy A release package were used.
- Migration execution completed successfully without a lock timeout, statement timeout, deadlock, or unexpected pending file.
- The temporary production timeout values were limited to `lock_timeout = 5s` and `statement_timeout = 60s` for the authorized execution.
- Production timeout values were restored and independently verified as exactly `lock_timeout = 0` and `statement_timeout = 2min`.
- The complete approved post-deployment validation suite passed, including 70/70 production pgTAP assertions, Auth/Data API probes, catalog/RLS/security checks, integrity checks, and security-advisor review.
- Production retained RLS on all 63 public tables, with zero broad or exact-`TRUE` public policies, zero anonymous public-table grants, zero dangerous Auth grants, and zero publicly executable `SECURITY DEFINER` functions.
- Anonymous workspace access continued to fail closed with the expected HTTP 401 / PostgreSQL `42501` result.
- The protected-state comparison covered 67 tables and 2,175 rows. Required protected data remained unchanged during the deployment window.
- Storage remained at one bucket and 13 objects; the 84 billing-event rows remained unchanged.
- No application, Sites, maintenance, Stripe, Auth-user, Storage-object, or unrelated schema change was included.
- Deployment and application logs showed no new error-class event attributable to the migration.
- A current physical backup and the exact qualified rollback artifact were available. The rollback SQL SHA-256 remains `5a138406ce8dfc4c33a778edfbb1f4506419a46dc579b3cc322f4200099554c8`.

## Independent-verifier attestation

Craig Frankel provided the following sign-off after reviewing the production deployment report and evidence:

> I, Craig Frankel, independently reviewed the FMM-003 production deployment report and evidence. I confirm the 8→10 migration transition, successful validation, timeout restoration, unchanged protected production state, and no rollback requirement. I accept the deployment result as PASS.

The independent-verifier gate is therefore **PASS**.

## Final production state

- Database migration ledger: **10 rows**
- FMM-003 deployment verdict: **PASS**
- Rollback required: **No**
- Sites: **v159** at `a0088ee117e893fa62fa0d8449da64ce02499015`
- Maintenance mode: **Still active**
- General-availability status: **NO-GO** pending the remaining remediation tasks and launch gates
- Phase 1D: **Not started and not authorized**

## Remaining items explicitly outside FMM-003

FMM-003 does not close the authoritative workspace-membership work in FMM-007, the policy/index performance debt in FMM-019, any contained-but-not-remediated AI, entitlement, upload, demo-access, privacy, or legal-output finding, or any required launch gate. Those items require their own scope, evidence, authorization, and acceptance decision.

## Closure decision

FMM-003 is formally closed. Preserve the forward migrations, rollback artifact, release-manifest controls, deployment evidence, and this attestation. Do not perform additional FMM-003 production work unless new evidence establishes a regression and a separate response is authorized.
