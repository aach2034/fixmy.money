# September 30 release test evidence

Evidence date: 2026-09-21

## Current local results

| Gate | Result | Evidence |
|---|---|---|
| TypeScript | PASS | `tsc --noEmit` exited 0. |
| Lint | PASS | ESLint exited 0: 0 errors, 38 pre-existing warnings (threshold 50). |
| Unit and source security | PASS | Vitest: 72 files, 1,376 tests passed. |
| Stripe configuration safety | PASS | Exact active USD monthly licensed product/amount validation; missing, inactive, annual, metered, unexpanded, and amount-mismatch cases fail closed. |
| D1 migration replay | PASS | Two migrations applied to a clean local D1 database and then applied again successfully. |
| Production build | PASS | Vinext production build completed. |
| Asset budgets | PASS | Client 36,081,342/39,845,888 bytes; server 11,370,749/157,286,400; public 33,040,384/37,748,736. |
| Chromium public/accessibility/shutdown | PASS after verified selector repair | 141/145 passed in the comprehensive run; the only four failures were the same strict-selector duplicate. The repaired focused suite then passed 9/9. |
| Supabase security advisor | PASS with intentional findings | Five authenticated `SECURITY DEFINER` RPCs inspected; authenticated-only ACLs, fixed search paths, and identity/membership or invitation predicates confirmed. Seven RLS/no-policy server-only tables remain fail-closed. |
| Production health | PASS | `https://fixmy.money/api/health` returned HTTP 200 and expected security headers. |

## Required final CI

The branch workflow is authoritative for gates that require Docker, an isolated Supabase stack, seeded synthetic identities, Stripe test mode, and multiple browser engines:

- quality: typecheck, lint, unit, revenue path, D1 replay, audit, build, budgets;
- migration replay: two clean Supabase resets, pgTAP, DB lint;
- integration: auth lifecycle, cross-tenant access, private storage boundary, Stripe test mode;
- browser: Chromium, Firefox, WebKit, and 390px mobile WebKit;
- aggregate release gate: every job must succeed.

No production credentials or customer records are used by the isolated integration/browser jobs.

## Launch-day evidence still required

- immutable release commit and successful required workflow URL/run number;
- live Stripe product/price/trial/webhook verification;
- private preview synthetic journey;
- final production Sites version and served commit;
- post-deploy smoke, health, mobile, authentication, signup, billing, and monitoring results.
