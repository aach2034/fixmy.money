# Accelerated local remediation batch — 2026-09-03

Production status: **NOT DEPLOYED**

## Dependency map

- Local now: FMM-010 (completed locally), FMM-011, and shared release-engineering work for FMM-014/017/018/020/023.
- Same-subsystem batches: FMM-011 with later FMM-021 data-lifecycle work; FMM-014/017/018/020/023 as release engineering; FMM-013/016 as approved legal/public claims; FMM-015 as admin identity/CSP.
- External decisions: FMM-002 and FMM-021 require privacy/ZDR/counsel approval; FMM-013/016 require legal/product approval; FMM-015 requires the D-05 MFA/break-glass/CSP/key decision; FMM-018 final closure requires independent accessibility evidence.
- Isolated production: FMM-010 database/onboarding cutover; FMM-011 transactional import migration; FMM-019 database tuning; admin MFA/CSP; privacy deletion; release-engineering configuration.
- Remain fail-closed: FMM-002 report AI, Stripe Connect, unapproved templates, and any unconfigured readiness/lead-abuse dependency.

## Local batch changes

- FMM-014: required CI workflow for typecheck, warning-budget lint, unit/revenue tests, dependency audit, build/budget, clean migration replay/pgTAP, and Chromium/WebKit accessibility/E2E. Repaired two stale assertions so the current full-suite baseline is logically green.
- FMM-017: immutable caching for hashed/static worker assets and enforced build-size budgets.
- FMM-018: WebKit/mobile-WebKit projects, exactly one main landmark, and automated landmark regression coverage.
- FMM-020: private dependency readiness for Supabase/Stripe, public detail-free liveness, correlation IDs, PII-safe structured logging primitives, and incident/revenue-path runbook.
- FMM-023: durable privacy-safe per-IP rate buckets, soft challenge threshold, hard limit, Retry-After, content-free abuse telemetry, and retained idempotent lead persistence.

## Verification checkpoint

- New focused batch tests: **23/23 passed**.
- Full unit checkpoint: **1110/1112 passed initially**; the only two failures were stale expectations for the already-remediated FMM-005 evidence wording/status normalization. Those expectations were corrected and the affected plus revenue suites passed **133/133**.
- Revenue-path regression gate: **PASS** (checkout catalog/trial, duplicate checkout prevention, Stripe webhook recognition, entitlement lifecycle, portal ownership boundary, plan enforcement).
- TypeScript: **PASS**.
- Lint: **PASS** with 50 existing warnings and 0 errors; CI prevents warning-count regression.
- Production build and size budgets: **PASS** (`dist/client` 35,349,855 / 39,845,888 bytes; `dist/server` 11,118,371 / 157,286,400; `public` 32,305,587 / 37,748,736).

## Remaining gates

- FMM-014: repository branch protection, real CI execution, isolated service credentials/environment, dependency-advisory disposition, and authenticated E2E evidence.
- FMM-017: production cache-header verification and representative mobile/Web Vitals evidence.
- FMM-018: browser execution plus independent keyboard/screen-reader/WCAG 2.2 AA review.
- FMM-020: monitoring vendor/alert routing configuration and synthetic failure-to-page proof.
- FMM-023: D1 migration/configuration, rate-limit salt, Turnstile keys/client challenge UX, load test, retention cleanup, and production alert proof.

## Revenue protection

Stripe Connect remains disabled and separate from FixMy.Money subscription billing. Every production wave that touches auth, onboarding, billing, Stripe, entitlements, checkout, webhooks, or plans must first pass the focused revenue-path gate. Never test against or mutate a legitimate Stripe customer/subscription. Stop or roll back on any checkout, renewal, webhook-recognition, billing-portal, or paid/trial-entitlement regression.
