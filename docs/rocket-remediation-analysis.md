# FixMy.Money Technical Remediation Analysis

## Executive summary

FixMy.Money required substantial corrective engineering after its initial Rocket-generated implementation. This was not a cosmetic cleanup. The remediation replaced or hardened core production concerns across the database, tenant isolation, authentication boundaries, billing, webhook processing, deployment compatibility, dependency security, observability, asset delivery, SEO, and quality assurance.

The database was rebuilt from scratch. That reconstruction is represented in the repository by a sequence of explicit Supabase migrations rather than an undocumented production schema. The resulting model establishes workspace ownership, client and staff records, credit-report processing, dispute workflows, billing events, audit history, portal data, chat, affiliate settings, and related access policies.

The current system is therefore best understood as a recovered and re-engineered application that retained useful product concepts while replacing unsafe, incomplete, or production-incompatible implementation details.

## Scope and evidence

This analysis is based on:

- the current application source;
- the Supabase migration history;
- automated security, tenancy, onboarding, billing, parser, and workflow tests;
- production build and dependency-audit results;
- production UAT conducted against `fixmy.money`; and
- the project owner's statement that the production database had to be rebuilt from scratch.

Where the repository cannot prove the historical condition of Rocket's hosted systems, this report describes the corrective work performed without asserting undocumented intent or causes.

## 1. Database reconstruction

The most consequential remediation was rebuilding the application database as an explicit, reproducible schema.

### What had to be established

- User profiles and business workspaces.
- Workspace ownership and tenant boundaries.
- Staff-side clients, disputes, letters, dashboard metrics, and bureau tracking.
- Client portal accounts, documents, updates, timeline events, and client-visible disputes.
- Credit-report uploads, analyses, recommendations, parsed reports, negative items, and import workflow state.
- Subscription status, payment tracking, billing events, webhook failures, and administrative billing controls.
- Live-chat conversations and messages.
- Affiliate link tracking and report-provider settings.
- Audit-oriented timestamps, update triggers, indexes, foreign keys, uniqueness rules, and lifecycle fields.

### Why migrations mattered

The rebuilt database is encoded in ordered SQL migrations under `supabase/migrations`. This changed the database from an opaque external dependency into version-controlled infrastructure that can be reviewed, reproduced, tested, and promoted safely.

The migration sequence also documents later hardening work. Examples include:

- tenant-isolation policies across application tables;
- billing-event and audit-log row-level security;
- webhook-failure persistence;
- Stripe event idempotency fields and uniqueness constraints;
- parser and credit-import workflow state;
- removal of legacy production seed data; and
- explicit separation of fictional demo data from production records.

### Tenant isolation

Multi-tenant financial software cannot rely on UI filtering for data separation. Row Level Security was enabled and policies were created so authenticated users can access only records associated with their workspace or authorized client account.

Additional application guards were added to prevent the application from silently pointing at the wrong Supabase project. Server-side administrative access is isolated from the public browser client, and service-role credentials are reserved for trusted server operations such as webhooks.

## 2. Authentication and authorization recovery

Authentication had to be treated as a full lifecycle rather than a login screen.

Corrective work included:

- creating user profiles and workspaces during onboarding;
- enforcing onboarding and subscription gates server-side;
- protecting application routes;
- separating public marketing pages from authenticated product surfaces;
- establishing client-portal access policies;
- restricting administrative database access to server-only code; and
- adding tests for authentication lifecycle and cross-tenant access.

This prevents a common generated-code failure mode: pages that appear protected while the underlying data APIs remain insufficiently scoped.

## 3. Stripe billing and webhook correction

Stripe integration required both schema work and runtime correction.

The production webhook handler used Stripe's synchronous signature-verification method. That method was incompatible with the Cloudflare production runtime and caused legitimate signed webhook requests to fail. The handler was changed to `constructEventAsync`, preserving signature verification while using the runtime-compatible cryptographic path.

Billing remediation also established:

- server-side resolution of workspace identity;
- event idempotency using Stripe event identifiers;
- durable billing-event records;
- payment, invoice, customer, and subscription references;
- webhook-failure records for operational recovery;
- subscription-state gating; and
- tests covering invalid signatures, secret handling, checkout, portal configuration, and billing invariants.

The browser is never trusted to provide the authoritative workspace for a webhook event.

## 4. Production runtime and deployment compatibility

The application had to be adapted from generated Next.js assumptions to the actual Sites/Cloudflare runtime.

The corrected deployment now:

- builds as a Cloudflare-compatible vinext application;
- uses runtime-compatible Stripe cryptography;
- packages the exact validated source revision;
- avoids leaking local filesystem paths into production assets;
- disables production browser source maps;
- applies production security headers at the Worker boundary; and
- keeps deployment metadata and runtime configuration separate from source secrets.

## 5. Dependency and build-system remediation

The production dependency audit initially reported multiple known vulnerabilities, including high-severity findings. The dependency graph and lockfile were updated, vulnerable transitive packages were overridden where necessary, and unused Rocket/DhiWise build tooling was removed.

Specific corrective themes included:

- updating Next.js and build dependencies;
- updating native image-processing dependencies;
- removing an unused component-tagging loader;
- pinning safe transitive versions for affected packages;
- restoring strict TypeScript and build failure behavior; and
- eliminating configuration that ignored type or lint errors during production builds.

After remediation, the production dependency audit reported zero known vulnerabilities.

## 6. Asset and typography correction

The generated production bundle contained font references tied to a developer's local filesystem. Those paths could never resolve in production and caused failed font requests.

Google-hosted build-time font loading was replaced with a self-hosted Plus Jakarta Sans package. The CSS font stack now references the bundled font asset, removing the machine-specific path and making typography deterministic across local builds and production.

## 7. Security hardening

The deployed application lacked a complete production header policy. Security headers were added at the Worker response boundary so they apply consistently to pages and API responses.

The policy includes:

- Content Security Policy;
- HTTP Strict Transport Security;
- MIME-sniffing prevention;
- clickjacking protection;
- a strict referrer policy; and
- a restrictive permissions policy.

The Content Security Policy limits scripts, connections, frames, fonts, images, and form destinations to the services the product actually uses: FixMy.Money, Supabase, Stripe, Google Tag Manager, and Google Analytics.

Removing Rocket analytics allowed its script and connection origins to be removed from the policy, reducing both console noise and third-party execution surface.

## 8. Removal of Rocket production instrumentation

Rocket injected two production scripts:

- `rocket-web.js`, connected to Rocket's application-analytics backend; and
- `rocket-shot.js`, a Rocket capture/instrumentation script.

Production UAT showed repeated Rocket dashboard-load errors originating from that third-party script. The application itself remained functional, but the failures polluted the console, complicated incident diagnosis, and created an unnecessary external dependency.

The corrective action removed:

- both Rocket scripts from the root application layout;
- Rocket domains from the Content Security Policy;
- the Rocket preview origin from development configuration; and
- obsolete Rocket attribution from the project README.

Google Tag Manager and GA4 remain as the intentional analytics stack.

## 9. SEO and public-route correction

Protected routes had been included in the public sitemap even though anonymous requests were redirected to authentication. Those entries were removed so search engines receive a sitemap containing public, indexable content.

Additional validation covered:

- canonical URLs;
- page titles and headings;
- public legal and trust pages;
- blog routes;
- image loading;
- responsive overflow; and
- trial-to-sign-in navigation.

## 10. Test and QA recovery

Generated tests and audit rules contained brittle assumptions, including an exact article count and broad text matching that produced false positives. These were corrected to test the intended business rules instead of incidental content.

The final deterministic suite covers hundreds of checks across:

- tenant isolation;
- authentication and onboarding;
- billing invariants;
- report parsing and audit items;
- dispute workflows;
- production seed isolation;
- public content; and
- application utilities.

Production UAT then exercised the deployed primary domain across desktop and mobile layouts, core marketing routes, navigation, FAQ behavior, trial entry, analytics loading, forms, images, and browser console health.

## Root-cause assessment

The recurring pattern was not one isolated defect. The original generated implementation treated several production-critical concerns as if they were page-level features:

- schema design was not a reproducible infrastructure contract;
- tenant isolation needed database enforcement;
- billing needed event durability and idempotency;
- runtime-specific APIs were not validated against Cloudflare;
- build configuration suppressed failures;
- generated dependencies and scripts remained after their value had ended;
- production assets referenced a local machine; and
- observability included a failing third-party instrumentation layer.

Generated code can accelerate prototypes, but it does not replace architecture, threat modeling, migration design, production-runtime validation, or operational ownership.

## Current state

Following remediation:

- the database schema is migration-driven and reproducible;
- application data is workspace-scoped with Row Level Security;
- production seed data is excluded;
- Stripe webhooks use the compatible asynchronous verifier;
- billing events are durable and idempotent;
- known production dependency vulnerabilities are cleared;
- fonts are self-hosted;
- security headers are active;
- public sitemap entries align with public routes;
- GTM and GA4 are the intentional analytics stack;
- Rocket production instrumentation is removed; and
- the application passes its deterministic automated suite and production UAT.

## Recommended operating controls

To prevent regression:

1. Require every database change to ship as a reviewed migration.
2. Test every new table with tenant-isolation and cross-tenant denial cases.
3. Keep Stripe webhook replay and idempotency tests in release checks.
4. Fail builds on TypeScript, test, dependency-audit, or migration errors.
5. Review all third-party scripts before adding them to the root layout or CSP.
6. Keep production and demo data physically and logically separated.
7. Run a focused UAT after every production deployment.
8. Maintain an incident log for payment, authentication, and data-isolation failures.
9. Periodically reconcile the deployed database schema against the migration history.
10. Treat low-code or generated output as untrusted scaffolding until it passes the same review as hand-written production code.
