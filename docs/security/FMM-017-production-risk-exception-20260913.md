# FMM-017 production status and owner-accepted hosting-platform risk exception

**Effective date:** 2026-09-13 UTC

**Release status:** **OPERATIONAL — CLOSED WITH A DEFERRED CONTROL**

**Deferred control:** Immutable one-year browser caching for verified content-fingerprinted assets

**Control disposition:** **DEFERRED — HOSTING-PLATFORM LIMITATION**

## Owner decision and exact exception language

FMM-017 is operational in production on Sites version 188. The homepage, pricing page, and login page meet the approved mobile Web Vitals budgets, build-size budgets remain satisfied, and the current asset-delivery behavior is stable.

The owner accepts the residual performance risk caused by the absence of immutable browser caching for content-fingerprinted assets. This exception does not claim that immutable production caching passed, was satisfied, or was replaced by an equivalent control.

Two independently validated implementations applied the intended immutable policy at the application and final packaged-Worker layers. Production deployments of those implementations nevertheless returned `Cache-Control: public, max-age=0, must-revalidate` for representative fingerprinted CSS, JavaScript, and nested Vinext WOFF2 assets because the authoritative Sites/CDN asset layer overrode or ignored the packaged policy. Both deployments were rolled back, and Sites version 188 remains the healthy production version.

ETag-based conditional revalidation and content-addressed asset filenames remain operational safeguards. Fingerprinted and stable assets retain ETags, conditional requests return HTTP 304 with the same validators, stable assets remain revalidating, missing assets return HTTP 404, and security headers remain intact.

No further Cloudflare zone-rule work, filename relocation, Worker cache workaround, hosting migration, or production cache deployment attempt is authorized within FMM-017.

Reevaluate this deferred control only when Sites exposes an authoritative cache-control mechanism for deployed assets or FixMy.Money changes hosting platforms.

This exception is documentation-only. It does not authorize or make changes to application code, cache rules, production configuration, Sites versions, databases, Supabase, Auth, billing, customer data, or any deployed resource.

## Production evidence at acceptance

- Sites version 188, source `4db38ef1e57c14b11dcfaabfe032b61722941402`, is healthy and remains deployed; the production health endpoint returns HTTP 200.
- Homepage mobile results: LCP **1,396 ms**, CLS **0**, INP **32 ms**.
- Pricing mobile results: LCP **440 ms**, CLS **0**, INP **32 ms**.
- Login mobile results: LCP **1,392 ms**, CLS **0**, INP **less than 16 ms**. The interaction remained below Chromium's 16 ms Event Timing reporting floor.
- Approved budgets: LCP <= 2,500 ms; CLS <= 0.10; INP <= 200 ms.
- Representative fingerprinted CSS, JavaScript, and nested Vinext WOFF2 assets return HTTP 200, retain ETags, and safely revalidate with `public, max-age=0, must-revalidate`.
- Conditional requests for representative fingerprinted and stable assets return HTTP 304 with unchanged ETags and revalidation policy.
- Representative stable image and OCR assets remain revalidating and retain ETags.
- A missing representative asset returns HTTP 404.
- Required production CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, Referrer-Policy, and Permissions-Policy headers remain intact.
- The exact version-188 build passes its size budgets: client **35,357,882 / 39,845,888 bytes**; server **11,285,826 / 157,286,400 bytes**; public **32,305,587 / 37,748,736 bytes**.
- The two cache-delivery attempts were rolled back after the hosting layer did not honor the validated immutable policy. No production data or configuration changed during acceptance validation.

## Residual risk and compensating safeguards

The accepted residual risk is additional conditional-request latency and bandwidth compared with long-lived immutable browser caching. This is a performance risk, not an accepted weakening of authentication, authorization, tenant isolation, data protection, or another security control.

The following safeguards remain mandatory:

- Retain content-addressed filenames for generated assets.
- Retain ETags and conditional revalidation.
- Keep stable filenames, HTML, dynamic routes, optimized-image routes, OCR assets, and missing assets non-immutable.
- Preserve the approved build-size and mobile Web Vitals budgets.
- Preserve all existing security headers.
- Do not pursue additional production cache work solely to close this exception before an authoritative hosting mechanism becomes available.

## Reevaluation and exit criteria

Reevaluate this exception only after one of these conditions occurs:

1. Sites provides a documented, authoritative per-asset cache-control mechanism; or
2. FixMy.Money changes hosting platforms.

Close the exception only after production evidence confirms all of the following:

1. Verified content-fingerprinted CSS, JavaScript, and WOFF2 assets receive long-lived immutable caching.
2. Conditional responses preserve the intended cache policy and ETags.
3. Stable assets, OCR assets, optimized-image routes, HTML, dynamic routes, and missing assets do not receive immutable caching.
4. Security headers, build-size budgets, and representative mobile Web Vitals remain within their approved limits.
