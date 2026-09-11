# FMM-015 local administrator-security candidate — 2026-09-08

Status: **LOCAL CANDIDATE ONLY — NOT DEPLOYED**

Baseline: GitHub `main` commit `59f6a54de720965423abcc6e26fb8d8f93943015`, verified after fetching the `github` remote. The existing `codex/fmm-015-admin-mfa` worktree was already based on that commit, so no reset, rebase, branch deletion, or worktree replacement was performed.

## Controls in this candidate

- Every ordinary `/admin` page and server action requires a current Supabase user, an active database-backed `platform_admins` role, a verified TOTP factor, and an `aal2` session.
- `/admin/security` is the only bootstrap exception. It still requires the current user and active administrator role, and it exposes only enrollment and challenge controls—not customer or billing data.
- Sensitive administrator classification/retention mutations retain the signed 15-minute user/session-bound step-up. Destructive operations use a separate two-minute authorization bound to exact action, target, material parameters, user, session, and a cryptographically random nonce that the database consumes once.
- Opening Stripe billing management requires primary authentication no older than 15 minutes. Stale sessions are redirected through an explicit password reauthentication flow before any Stripe session is created.
- Factor removal requires a fresh AAL2 challenge plus one-time exact-factor authorization and is performed by the server. A trigger on the supported `auth.audit_log_entries` table consumes factor-removal events into application-owned registered-factor state; an idempotent server fallback covers the normal application flow without duplicate revocation audits.
- Session revocation uses database time and deny-lists every current Supabase session ID before global sign-out. Both the application and MFA-aware RLS reject those IDs independent of JWT timestamps or clock skew.
- Administrator role membership and verified-factor state are checked on every protected request. Missing or unavailable assurance evidence fails closed.
- HTML responses receive a random CSP nonce; all script elements are rewritten with that nonce, and `script-src` no longer permits `unsafe-inline`.
- The hard-coded legacy Supabase URL/JWT fallback is removed. Environments may migrate to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the existing environment variable remains compatibility-only until rollout.
- Security audit records contain only fixed event names and coarse result/reason fields. They never contain OTPs, factor IDs, access/refresh tokens, cookies, secrets, or recovery material.
- The parser debugger, previously protected only by the generic signed-in route proxy, now performs the same server-side administrator/MFA gate as every other admin page.
- The operational recovery and two-person break-glass procedure is documented in `docs/security/FMM-015-admin-mfa-break-glass.md`.
- Repository-local Supabase Auth now enables TOTP enrollment and verification, allowing the same project configuration to exercise real MFA/AAL2 flows without any hosted Supabase credentials.

## Destructive-action inventory

- Current platform-admin customer mutations: retention state and customer classification. Both call `requireRecentPlatformAdmin(...)` before a service-role client is obtained.
- Current self-service billing/subscription mutation entrypoint: Stripe Billing Portal creation. It requires a workspace owner and a primary authentication method no older than 15 minutes before Stripe is called; token refresh `iat` is explicitly not accepted as authentication.
- Current administrator MFA mutations—factor removal and global session revocation—require fresh AAL2 plus a one-time action/target/material-bound authorization. Factor removal is server-mediated; both paths record database-authoritative revocation before global sign-out.
- No platform-admin customer deletion, refund issuance, subscription mutation, billing mutation, data-deletion, or administrator-role mutation endpoint exists in this source baseline. The `DestructiveAdminAction` type reserves every category, and any future implementation must consume `requireOneTimePlatformAdmin(...)` with the exact action, target, and material parameters before its first side effect.

## Production prerequisites and stop conditions

**STOP** before any production enforcement unless all of the following are independently verified:

1. At least **two independently controlled**, active administrator or break-glass identities exist.
2. Both identities have verified TOTP factors and can complete sign-in, AAL2 challenge, and a protected administrator request from separate devices.
3. A new random `ADMIN_STEP_UP_SECRET` of at least 32 characters is installed through the production secret manager. It must not be placed in source, logs, build output, or operator notes.
4. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is configured and verified for the correct FixMy.Money project before retiring the compatibility variable. No live key rotation is part of this source candidate.
5. Current production configuration, active administrator aggregates, CSP headers, and the saved Sites rollback target are recorded without reading customer content.
6. The deployment is staged with one verified administrator kept active while the other verifies enrollment, challenge, recent-auth expiry, billing reauthentication, and global sign-out.
7. Supabase access-token lifetime is confirmed short enough for the incident-response objective. Global sign-out revokes refresh tokens; the application revocation epoch provides immediate denial for administrator access tokens until their provider expiry.

Stop immediately on an ambiguous administrator identity, fewer than two working factors, unavailable Auth assurance APIs, audit-write failure, CSP-blocked required application script, cross-session token acceptance, or any unexpected customer/production change.

## Local verification evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Source baseline | PASS | Local candidate and fetched `github/main` both resolve to `59f6a54de720965423abcc6e26fb8d8f93943015`. |
| Focused security/unit tests | PASS | Latest blocker-focused suite passed 18/18. The earlier 48/48 aggregate was not repeated because the cost guardrail restricts reruns to affected coverage. |
| Full unit suite | PASS | 56 files and 1,196/1,196 tests passed. |
| TypeScript | PASS | Full no-emit typecheck completed successfully. |
| Lint policy | PASS WITH EXISTING WARNINGS | Zero errors; 45 warnings in pre-existing unrelated source. No new FMM-015 lint errors were accepted. |
| Production build | PASS | OCR assets prepared and `vinext build` completed using synthetic local environment values only. No live credentials were read. |
| Build-size policy | PASS | Client 35,356,367/39,845,888 bytes; server 11,292,069/157,286,400; public 32,305,587/37,748,736. |
| D1 migration replay | PASS | Both local D1 migrations applied twice successfully to a disposable local database. |
| Browser security coverage | PASS | 56/56 Playwright checks passed across Chromium, Firefox, WebKit, mobile Chrome, mobile WebKit, and tablet projects. Coverage includes unauthenticated denial for every administrator page and the forced-reauthentication UI. |
| Diff hygiene | PASS | `git diff --check` completed without errors; generated TypeScript build state was restored and is not part of the candidate. |
| Affected isolated integration | PASS | The changed Auth lifecycle file passed 14/14 with loopback-only Supabase credentials held in process memory. It proved that a real `factor_unenrolled` Auth audit event clears registered-factor eligibility, revokes the session, and denies its still-AAL2 JWT. Stripe code was unchanged and the prior complete 44/44 suite was not repeated. |
| Real local MFA lifecycle | PASS | 12/12 assertions passed with 0 failed and 0 skipped against the loopback Supabase Auth service: password/AAL1 denial, TOTP enrollment and verification, AAL2 establishment, active-admin allow, inactive-admin and ordinary-customer denial, revocation, new authentication, factor removal, and recovery request. Synthetic identities were deleted. |
| Supabase clean replay and pgTAP | PASS LOCALLY | Docker-backed Supabase CLI 2.117.0 replayed all 48 migrations from scratch, including both FMM-015 migrations. The affected FMM-015 database file passed 36/36 assertions, including Auth-audit compatibility, stale-AAL2 denial, server-fallback deduplication, and retry idempotency. The prior complete 105/105 database run was not repeated. |

Independent-review blocker remediation verdict: **LOCAL BLOCKER TESTS PASS; ISOLATED HOSTED SUPABASE COMPATIBILITY STILL PENDING**. The only permitted hosted inventory attempt stopped before project access because the Supabase CLI had no access token. The candidate remains local, uncommitted, undeployed, and is not authorized for merge or production rollout.

## Remaining risks and required independent checks

- The production rollout remains blocked until the additive schema/function preparation can be separated from MFA-aware enforcement. Do not apply the current combined migration as a database-first production sequence: deploy bootstrap-capable application support, establish and verify two independent AAL2 administrators, and only then activate MFA-aware RLS enforcement.
- Validate the `auth.audit_log_entries` trigger exactly once in an existing isolated hosted project and confirm Postgres Auth audit storage is enabled before requesting re-review. No isolated hosted project was accessible from this task because the Supabase CLI was not authenticated.
- Independently verify that Supabase JWT `amr`, `aal`, and `session_id` claims have the expected shape for password, OAuth, OTP, and recovery flows in the project configuration.
- Confirm the two-person administrator enrollment and break-glass drill before enabling enforcement in any deployed environment.
- Review the CSP nonce fallback in both the Cloudflare runtime and the standalone Node test runtime before release.

## Rollback

Roll back to the captured prior Sites version and restore the prior CSP/key environment configuration. Do not delete factors or administrator identities during rollback. If all administrators are locked out, stop application changes and use the independently tested break-glass procedure; do not weaken authorization or bypass the release gate.

No production mutation, customer-data access, live credential retrieval/rotation, administrator enrollment, deployment, or release-gate change was authorized or performed by this local candidate.
