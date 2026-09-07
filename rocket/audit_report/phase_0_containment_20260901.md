# Phase 0 Immediate Containment — September 1, 2026

## Scope and source state

- Audit basis: Sites v157 at commit `81f2d9ecdafe81e000b86bf2e86205f81de1614d`.
- Release base and immediate rollback target: Sites v158 at commit `f5c5d52b1cad9b9a3be406307fcb479acc17d620` (`Add site-wide maintenance notice`).
- Source branch: `codex/phase-0-containment`.
- The containment branch descends directly from v158. The Phase 0 release diff is reviewed strictly from v158 to the containment candidate; stale local `main` is not used as the production source.
- The v158 maintenance commit differs from v157 only in `src/proxy.ts` and `src/app/maintenance/page.tsx`.
- This phase does not mutate production data, change Stripe customers or subscriptions, create storage buckets, or run database commands.

## Containment status

| Finding | Before | Phase 0 behavior | Status |
| --- | --- | --- | --- |
| FMM-001 | Authenticated callers could control provider, model, messages, and protected parameters through a generic AI proxy. | The generic AI and usage endpoints return deterministic HTTP 503 responses without parsing the request or calling a provider. | Contained; bounded AI operations remain deferred. |
| FMM-002 | Raw credit-report bytes could be transmitted to an external AI provider. | Credit-report AI analysis returns HTTP 503 before reading the request; no report is transmitted or logged. | Contained; governed minimum-necessary analysis remains deferred. |
| FMM-004 | Historical Checkout sessions could create local paid-trial entitlement. | Purchase restoration returns HTTP 503 and performs no Stripe, Supabase, or entitlement operation. | Restoration vector contained; broader entitlement reconciliation remains open. |
| FMM-005 | A broken analyzer could fail or return a false-safe result. | Analyzer UI and endpoint are unavailable and fail closed. | Risk contained; analyzer implementation remains open. |
| FMM-006 | Client upload could report success after storage failure and contemplated public URLs. | Upload controls and storage writes are removed; the portal displays a temporary-unavailability state. | Risk contained; private storage workflow remains open. |
| FMM-010 | Onboarding simulated Stripe success and workspace switching was not enforced. | Stripe Connect is accurately unavailable; workspace mutation/switch controls and navigation are disabled. | Misleading behavior contained; full workspace architecture remains open. |
| FMM-012 | Stored letter content was interpolated into `document.write()` in a same-origin window. | One shared renderer builds the print document and assigns all user-controlled content through `textContent`; the opener is detached. | Remediated in source with hostile-payload regression coverage. |
| FMM-016 | Marketing displayed unsupported product/security capabilities and duplicated plan presentation. | Unsupported AI, analytics, team, quota, workspace, billing, and portal claims/routes are removed or redirected; homepage prices read the verified central catalog. | Contained for the scoped claims; pricing values and billing terms are unchanged. |
| FMM-022 | The production portal login exposed public demo credentials. | Demo credentials and their interface are removed. No user or record was changed. | Public exposure contained; invitation workflow remains open. |

### v158 compatibility correction

The maintenance proxy now explicitly passes `/api/*`, `/auth/callback`, `/forgot-password`, and `/reset-password` through without an HTML maintenance redirect. This preserves the v158 site-wide notice while ensuring API containment responses, Stripe webhooks, health checks, and password recovery cannot be replaced with maintenance HTML. No request body is read or logged.

## Temporarily disabled

- Generic AI chat/proxy and AI usage tracking endpoints.
- Raw-file AI credit-report analysis and AI analyzer/coach/chatbot surfaces.
- Automatic AI letter drafting.
- Session-based purchase restoration.
- Client-portal document upload.
- Simulated Stripe Connect setup.
- Workspace creation, switching, renaming, and deletion UI.
- Marketing/navigation surfaces for nonexistent analytics, team, client billing, audit log, white-label portal, and related unsupported capabilities.

## Verification evidence

- Typecheck: passed.
- Lint: passed with 56 warnings and 0 errors. The audited baseline had 61 warnings.
- Production build: passed all five vinext build stages and generated standalone output.
- Focused containment/XSS/SEO/maintenance tests: 37 passed, 0 failed.
- Full unit suite: 960 passed and 3 failed. All three failures existed in the audited baseline:
  - generic paid-balance evidence wording mismatch;
  - missing Experian value in a cross-bureau status conflict;
  - Experian reported-amount flow contract mismatch.
- The audited pricing-consistency failure now passes because homepage pricing uses the central plan catalog.
- Direct local HTTP checks with maintenance active: generic AI POST, credit-report AI POST, AI usage GET/POST, and restore-purchase POST all returned HTTP 503 JSON with `Cache-Control: no-store`, stable containment codes, and no request-body echo—even when the client sent `Accept: text/html`. An unsigned Stripe webhook returned JSON 400 rather than maintenance HTML; auth recovery paths remained reachable; required CSS, JavaScript, and image assets returned 200. The server emitted no request content to its output.
- Final diff check: no whitespace errors. A changed-line scan found no live/restricted provider secrets, private keys, production identifiers, or PII.

## Remaining Critical and High findings

- **Critical:** FMM-003 remains unresolved and requires the separately authorized migration/RLS replay task. FMM-004 remains open beyond the contained restoration endpoint until entitlement derivation is reconciled and tested. FMM-001 and FMM-002 are contained through feature shutdown, not fully reimplemented.
- **High:** FMM-005 and FMM-006 are contained by disabling affected features but need full implementations. FMM-007, FMM-008, FMM-009, FMM-011, FMM-013, FMM-014, and FMM-015 remain unresolved. FMM-010's misleading UI is contained, but its multi-workspace architecture remains unresolved. FMM-012 is remediated in source pending normal review and release.

## Release and rollback

This branch is suitable only as a controlled containment candidate on top of v158. It is not a production-readiness or launch approval: an unresolved Critical database finding, broader billing authorization work, multiple High findings, and three baseline unit failures remain.

The immediate rollback target is Sites v158 at `f5c5d52b1cad9b9a3be406307fcb479acc17d620`. Roll back by redeploying that exact saved Sites version; do not rewrite shared Git history or revert the maintenance commit.
