# FixMy.Money launch ledger — September 30, 2026

Last updated: 2026-09-21

Release candidate: `codex/fmm-reopening-main-integration` at `c63436d2f2fc0beccb5ed40e92caa33d6396e805` (subject to the launch fixes and evidence recorded below)

Production: `https://fixmy.money` on ChatGPT Sites project `appgprj_6a5ad9918cc48191a7f98216d16add39`

This ledger is evidence-first. `PASS` means the cited gate ran against the named revision or the connected production system. Historical evidence is not treated as a current pass when a fresh check is required.

| Area | Status | Evidence | Next action |
|---|---|---|---|
| Authoritative source | IN PROGRESS | GitHub `aach2034/fixmy.money`, default branch `main`; PR #22 is mergeable and its required workflow run 63 passed at `c63436d`; local release checkout is clean. | Apply remaining launch fixes to PR #22, rerun required gates, then merge the verified head. |
| Production artifact alignment | BLOCKED | Sites reports public production version 196 at commit `10e15c0566edf6953b935e250fb299f6cc168d35`; this commit is not present in the local GitHub object graph. Production is not the PR #22 candidate. | Reconcile the deployed artifact, publish only the final verified GitHub release commit, and retain v196 as the immediate application rollback target. |
| Domain and hosting | PASS | Sites reports `fixmy.money` and `www.fixmy.money` active with active TLS; public health endpoint returned HTTP 200 with `status=alive`; CSP, HSTS, frame denial, MIME sniffing protection, and no-store health caching were present. | Recheck immediately before and after launch deployment. |
| Public routes and reopening copy | IN PROGRESS | Candidate contains the September 30 reopening flow and approved $39/$99/$199 monthly plan model. Static audit found remaining stale product claims in customer-visible blog, affiliate, terms, and guide content. `/demo-mode` is explicitly excluded from edits. | Correct remaining public copy, verify every required route, metadata, sitemap, robots policy, and intended 2026 articles. |
| Signup transition | IN PROGRESS | Candidate keeps account creation closed, preserves existing-customer login/recovery, and routes reservations to `/reopen`; PR #22 browser/unit evidence passed. | Add a date-driven launch activation that cannot open before September 30, then test closed and open states. Do not send reopening email without owner approval. |
| Stripe products and entitlements | BLOCKED | Runtime variable names for the three price IDs and Stripe credentials are registered; source uses $39/$99/$199. Stripe account connector returned no accessible account, so live prices, $1/14-day trial, webhook endpoint, and entitlement mapping are not independently verified. Live production currently advertises unsupported annual billing in cached/rendered pricing content. | Verify live-mode products/prices and trial behavior through the existing Stripe account; keep checkout closed and remove unsupported public claims until verified. |
| Supabase project | PASS | Connected project `agxzfdyvewptjwdfuvwq` is `FixMyMoney Production`, `ACTIVE_HEALTHY`, region `us-east-2`. | Recheck health before launch. Never touch the Partix project. |
| Migration alignment | IN PROGRESS | Production reports 32 applied migrations through `20260913234809`; source has 51 replay files and includes the same latest release migration. Historical production/local filenames differ and are reconciled by prior migration-history work; the release candidate adds no migration. | Run clean and repeat local replay plus pgTAP; document exact comparison. Confirm a fresh recoverable production backup at launch time. |
| Database security advisors | BLOCKED | Current advisor results: 5 signed-in-executable `SECURITY DEFINER` findings (WARN), 7 RLS-without-policy findings (INFO), one multiple-permissive-policy warning, and four duplicate-index warnings. | Classify every security finding against intended access and remediate any callable privileged path that lacks an explicit authorization boundary. Re-run advisors. |
| Storage boundary / FMM-006 / storage FMM-009 | IN PROGRESS | Production migration `20260912105022_fmm_006_009_server_only_client_document_storage` is applied; historical production verification says same-tenant access and cross-tenant denial passed. Candidate has dedicated route and pgTAP coverage. | Re-run current storage/tenant gates and verify there is no direct browser mutation path. |
| Analyzer / FMM-005 | IN PROGRESS | Production closure evidence records a verified deterministic analyzer with supported-format and bureau fixtures; candidate contains fail-safe tests. External report AI remains separately fail-closed. | Re-run current analyzer fixtures and complete the synthetic end-to-end journey. |
| Core synthetic journey | BLOCKED | No current end-to-end evidence yet for acquisition through onboarding, import, analysis, dispute, letter preview/save, dashboard return, and subscription enforcement on the final release commit. | Run the complete journey with synthetic data after local gates pass. |
| Admin MFA and recovery | ACCEPTED RISK | Existing evidence records Adam's AAL2/TOTP path and the accepted temporary single-administrator recovery risk; Daniel remains inactive. | Re-run non-destructive role/AAL2/revocation checks. Preserve the accepted risk unless conditions materially change. |
| Monitoring / FMM-020 | IN PROGRESS | Existing monitoring closure documents privacy-safe health and alerting; production health is live. FMM-023 retains an owner-accepted exception for proof of first organic Worker-to-monitor delivery. | Verify configured monitor/alert paths without manufacturing production abuse traffic; retain the existing organic-event exception. |
| Performance / FMM-017 / FMM-019 | IN PROGRESS | FMM-017 has an accepted Sites cache limitation and browser budget coverage. FMM-019 source artifacts are not yet part of GitHub `main`; production advisor still reports RLS/index performance warnings. | Validate budgets on the final commit. Do not apply FMM-019 migration without clean replay, exact production comparison, backup, and rollback proof. |
| Accessibility and browsers | IN PROGRESS | PR #22 required workflow passed Chromium, Firefox, WebKit, and mobile WebKit 390 projects. | Re-run the full required workflow after final fixes and retain job evidence. |
| SEO and discovery | BLOCKED | Live rendered pages show inconsistent CTAs/trial statements and unsupported annual pricing. Candidate has centralized SEO tests but has not yet passed a fresh crawl/render audit. | Correct source, run SEO audit, validate robots, sitemap, canonicals, metadata, structured data, and authenticated noindex behavior. |
| Rollback readiness | IN PROGRESS | Sites v196 is a saved deployed artifact. Older security records preserve database rollback guidance and saved Sites versions. | Write launch-specific rollback instructions, identify the final pre-launch Sites version, and confirm a fresh database restore point before any production mutation. |

## Confirmed complete

- Hosting project, public custom domains, and Supabase production project identity are verified from connected systems.
- The connected Supabase production project is healthy.
- GitHub PR #22 is mergeable and its required quality workflow passed at `c63436d2f2fc0beccb5ed40e92caa33d6396e805`.
- The approved candidate pricing model is Personal $39/month, Start $99/month, and Grow $199/month, with no published annual prices.
- `/features` intentionally redirects to `/product-tour` in the existing route suite.
- `/demo-mode` remains outside rollout changes and reporting unless a shared launch-critical defect is found.

## Launch blockers

1. Production is serving an artifact that is not the current GitHub release candidate.
2. Live Stripe product, price, trial, webhook, and entitlement mappings are not independently verified.
3. Current Supabase security-advisor `SECURITY DEFINER` warnings require classification and any unsafe callable path must be fixed.
4. Customer-visible stale/unsupported pricing and trial claims remain in source and on the live site.
5. No current full synthetic customer-journey result exists for the final release commit.
6. Required gates, migration replay, and production smoke tests have not yet run against the final release commit.

## Accepted risks

- Temporary single-administrator recovery risk documented in `docs/security/FMM-015-production-risk-exception-20260912.md`.
- Sites immutable-cache limitation documented in `docs/security/FMM-017-production-risk-exception-20260913.md`.
- First organic FMM-023 alert-delivery evidence exception documented in `docs/security/FMM-023-production-risk-exception-20260913.md`.

## Post-launch candidates

- FMM-002 external report-AI processing remains deferred and fail-closed.
- Stripe Connect remains disabled and deferred.
- Noncritical unused/duplicate index cleanup after workload evidence and a separate migration review.
- Optional integrations and broad visual redesign.

## Evidence index

- Required workflow: GitHub Actions run 63 for PR #22 / `c63436d2f2fc0beccb5ed40e92caa33d6396e805`.
- Production monitoring: `docs/security/FMM-020-production-monitoring-closure-20260913.md`.
- Storage boundary: `rocket/audit_report/fmm_006_production_deployment_20260903.md`.
- Analyzer: `rocket/audit_report/fmm_005_production_deployment_20260903.md`.
- Tenancy: `rocket/audit_report/fmm_007_production_verification_20260903.md`.
- Billing/entitlements: `rocket/audit_report/fmm_004_production_closure_20260903.md` and `rocket/audit_report/fmm_009_production_deployment_20260903.md`.
- Incident response: `rocket/runbooks/observability_incident_response.md`.
