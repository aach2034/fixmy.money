# B2B software model — September 28, 2026

Owner direction: model FixMy.Money as business software, following the discussion of Credit Repair Cloud. This supersedes the Personal launch offer in earlier planning documents. The owner states the LLC is filed; this release does not independently verify that filing or treat missing filing evidence as a reason to stop development.

## Offer

- New purchasers: businesses and their authorized representatives managing client-service operations.
- Start: $99/month, 300 active clients, 3 team members, 25 GB.
- Grow: $199/month, 600 active clients, 6 team members, 100 GB.
- What is sold: access to software, not consumer credit-repair performance, deletions, scores, earnings, or a business opportunity.
- Personal: removed from new acquisition. Historical identifiers, prices, entitlements, subscriptions, client-portal access, and recovery remain intact. No customer is automatically migrated or charged more.

## Implemented in this change

Business-only catalog, homepage, pricing comparison, referral and mortgage pages, metadata, and waitlist messaging. `/individuals` explains retirement and preserves existing-customer sign-in/support. Signup rejects nonbusiness plan IDs rather than substituting a higher-priced plan, and requires current business-use and terms declarations. Stale Personal email links do not select a business plan. The Business Use Policy separates software fees from consumer service fees, prohibits misleading claims and unlawful fee collection, and provides a misuse-reporting contact. Two articles no longer recommend monthly consumer charges or label particular consumer fee models compliant.

The declaration stored with signup is user-editable metadata, NOT verified business eligibility, an immutable agreement record, legal approval, or an entitlement. The API changes do not claim to prevent direct hosted-auth account creation. Hosted signup settings and application paid-access controls remain necessary. No business has been marked verified by this change.

## Launch scope change

Remove new Personal purchases, Personal service-completion packets, consumer self-service paid activation, and Personal post-completion billing from the B2B launch critical path. Preserve any obligations to existing customers. Do not use a global historical blocker count to imply these retired deliverables are still required for this offer.

Still relevant: secure client-data handling and tenant isolation; accurate product/marketing claims; operational ownership and support; actual business purchaser review before opening the held paid path; agreed software terms, tax configuration, and processor eligibility; and release verification. The new business model does not automatically complete those checks.

## Before new paid activation

1. Reconcile the release candidate and review this B2B offer and contract text. Consumer fee guidance elsewhere remains subject to a full content review; this change is not a legal audit of the entire library.
2. Implement and test authoritative business eligibility, evidence/decision records, and a review/restriction workflow. Do not use a company-name field, signup checkbox, editable metadata, or email verification as the authorization decision. Reuse the separate prototype only after review; it is not included here.
3. Confirm the software subscription's tax/processor configuration and release readiness. Open hosted signup and payment only through the explicit release process. The current API still returns `NEW_PAID_CHECKOUT_ON_HOLD` without calling Stripe.

No production deployment, database migration, Stripe change, email campaign, purchase, or customer suspension is part of this commit.

## Local verification

- All 77 unit-test files passed: 1,414 tests, including legacy entitlement preservation, business-only signup validation, declaration requirements, callback session isolation, and sitemap/offer consistency.
- TypeScript passed. Repository lint passed with 38 pre-existing warnings and zero errors.
- Production build completed. Dependencies were reused from the existing local installation; this is not a new frozen-lockfile CI attestation.
- Fourteen focused Chromium checks passed across the B2B offer, homepage/share, signup hold, plan cards, and navigation suites. An initial waitlist test encountered a dev-preview hydration timing failure and passed when its six-test suite was rerun serially. The first preview attempt lacked local auth configuration; corrected checks used dummy local-only settings and mocked form submissions. No live accounts were created.
- Desktop homepage and mobile pricing screenshots were visually reviewed. `/demo-mode` source, production data, Stripe objects, and the pinned PR #29 candidate were not changed.
- The temporary preview server and dummy settings were removed after verification. No hosted preview or full remote release gate was run for this branch.

## Why this is not a copy of CRC's legal setup

CRC sells software subscriptions, but its own [pricing page](https://www.creditrepaircloud.com/pricing) also advertises a Personal tier. We are choosing a narrower B2B offer. The [CFPB enforcement action](https://www.consumerfinance.gov/enforcement/actions/daniel-a-rosen-inc-dba-credit-repair-cloud-and-daniel-rosen/) and its [2024 stipulated order](https://files.consumerfinance.gov/f/documents/cfpb_credit-repair-cloud-stipulated-final-judgment-and-order_2024-08.pdf) address assistance with unlawful advance fees and impose specific obligations on the named defendants. Those provisions are not automatically FixMy.Money's obligations, and CRC operating is not proof that every similar model is compliant. Use the software/service distinction and responsible-use controls, not a blanket legal exemption or CRC's branding/content.
