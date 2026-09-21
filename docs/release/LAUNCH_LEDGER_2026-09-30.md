# FixMy.Money launch ledger — September 30, 2026

Last updated: 2026-09-21

Release branch: `codex/fmm-reopening-main-integration` (final immutable commit recorded after required CI)

Production: `https://fixmy.money`, ChatGPT Sites project `appgprj_6a5ad9918cc48191a7f98216d16add39`, version 196 at `10e15c0566edf6953b935e250fb299f6cc168d35`

`PASS` below means current evidence exists. Historical evidence is used only as supporting context.

| Area | Status | Evidence | Next action |
|---|---|---|---|
| Source alignment | PASS | The exact Sites v196 source commit was fetched from `origin/main` and merged into the launch branch at `db14c2e`; stricter reopening controls and production fixes were reconciled. | Push the final candidate, require CI, and merge only the verified head. |
| Domain and hosting | PASS | Sites reports `fixmy.money` and `www.fixmy.money` active with active TLS. `/api/health` returned 200 with CSP, HSTS, frame denial, MIME protection, and no-store caching. | Recheck before and after the single launch deployment. |
| Date, pricing, and public accuracy | PASS | Customer source uses September 30, 2026 and Personal $39, Start $99, Grow $199 monthly. Unsupported annual billing, affiliate earnings/testimonials, response-time promises, and stale containment copy were removed or redirected. The old October 25 value remains only as an explicitly stable waitlist deduplication key. | Verify rendered preview and final production pages. |
| Signup transition | PASS | Public signup requires both `PUBLIC_SIGNUP_ENABLED=true` and the launch instant `2026-09-30T00:00:00-04:00`. Callback and checkout use the same gate. Before launch, `/signup` remains the reopening list and existing login/recovery remain available. | Keep the flag false until launch-day dependency checks pass. Enable only during the launch deployment. |
| Stripe prices and trial | BLOCKED | Source fails closed unless Stripe returns an active USD monthly licensed price with the exact configured amount; no recurring price is synthesized. The installed Stripe connection exposes no account, so live price objects, the $1/14-day trial, webhook destination, and live entitlement path cannot yet be independently verified. | Owner must connect or authenticate the existing FixMy.Money Stripe account; no charge or configuration change is requested. |
| Supabase project | PASS | Project `agxzfdyvewptjwdfuvwq` is `FixMyMoney Production`, `ACTIVE_HEALTHY`, in `us-east-2`. Plan catalog limits match source. Partix was not accessed. | Recheck health on launch day. |
| Database security | PASS | Fresh advisors report five authenticated `SECURITY DEFINER` RPC warnings. Read-only inspection confirms all five have fixed empty search paths, authenticated-only grants, and explicit `auth.uid()` identity/membership or invitation checks. Seven no-policy tables are deliberately fail-closed server-only tables. | Retain warnings as documented intentional access; rerun advisors after future DDL. |
| Migrations | PASS | Candidate adds no Supabase migration. D1 clean and repeat replay passed for both migrations. Production reports 32 applied Supabase migrations through `20260913234809`; prior history reconciliation is retained. | Required CI must repeat Supabase reset twice, pgTAP, and DB lint. No production DB migration is planned for this release. |
| Unit, type, lint, build | PASS | Typecheck passed; lint passed with 0 errors/38 existing warnings; 72 files/1,376 unit tests passed; production build and asset budgets passed. | Repeat fast gates on the immutable release commit September 30. |
| Accessibility and browser | IN PROGRESS | Local Chromium public/accessibility/shutdown suite passed 141/145, with the four failures isolated to one stale duplicate-text selector; the corrected focused homepage suite passed 9/9. WCAG serious/critical checks and 375/390/768 responsive checks passed. | Required CI must pass Chromium, Firefox, WebKit, and 390px mobile WebKit on the final commit. |
| Core journey and tenancy | IN PROGRESS | Current unit coverage passes analyzer, cross-bureau evidence, canonical persistence, dispute reason/letter quality, storage boundary, entitlement, admin authorization, and session isolation. | Required isolated-Supabase integration/browser jobs must pass the full synthetic journey and cross-tenant mutations on the final commit. |
| Monitoring | PASS | Existing privacy-safe health/alerting closure remains configured; production health is live. The accepted first-organic-event exception for FMM-023 remains unchanged. | Check worker logs/health immediately after deployment; do not generate abusive production traffic. |
| Rollback | PASS | Sites v196 is the pre-launch application rollback target. This release contains no DB migration. Incident-specific stop/rollback steps are in `ROLLBACK_2026-09-30.md`. | Confirm v196 remains available immediately before launch. |

## Launch blockers

1. Connect/authenticate the existing FixMy.Money Stripe account so live prices, trial, webhook, and entitlement mappings can be read and verified.
2. Required GitHub jobs must pass on the final candidate: quality, migration replay/pgTAP, integration/tenancy, and Chromium/Firefox/WebKit/mobile WebKit.
3. Run one private preview and complete the synthetic customer journey before production activation.
4. On September 30, rerun fast gates and confirm all production dependencies before enabling signup and deploying.

## Accepted risks

- Temporary single-administrator recovery risk: `docs/security/FMM-015-production-risk-exception-20260912.md`.
- Sites immutable-cache limitation: `docs/security/FMM-017-production-risk-exception-20260913.md`.
- First organic FMM-023 alert-delivery evidence exception: `docs/security/FMM-023-production-risk-exception-20260913.md`.

## Deferred after launch

- FMM-002 external report-AI processing remains fail-closed.
- Stripe Connect remains disabled.
- FMM-019 and noncritical index cleanup remain separate, benchmarked migrations; current release adds no DB migration.
- Existing lint warnings, optional integrations, and broad visual redesign.

## Evidence

- [Test evidence](./TEST_EVIDENCE_2026-09-30.md)
- [Release notes](./RELEASE_NOTES_2026-09-30.md)
- [Rollback and incident procedure](./ROLLBACK_2026-09-30.md)
- Production monitoring: `docs/security/FMM-020-production-monitoring-closure-20260913.md`
- Storage boundary: `rocket/audit_report/fmm_006_production_deployment_20260903.md`
- Analyzer: `rocket/audit_report/fmm_005_production_deployment_20260903.md`
- Tenancy: `rocket/audit_report/fmm_007_production_verification_20260903.md`
- Billing/entitlements: `rocket/audit_report/fmm_004_production_closure_20260903.md` and `rocket/audit_report/fmm_009_production_deployment_20260903.md`
