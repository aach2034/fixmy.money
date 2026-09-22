# FixMy.Money counsel-review packet — COUNSEL REVIEW PENDING

Status: `OWNER_AUTHORIZED_COUNSEL_REVIEW_PENDING`. This is a proposed product and technical design, **not** an attorney opinion, legal approval, billing authorization, or launch approval. Production remains Sites v196 with signup closed. Never deploy stale v197.

## Products and promised work

| Plan | Published price | Buyer and proposed promise |
| --- | ---: | --- |
| Personal (`starter`) | $39/month | Consumer-directed Personal Credit Review and Action Packet **for each completed service cycle**. No outcome, score increase, removal, bureau response, mailing, representation, or continuous monitoring is promised. |
| Start (`professional`) | $99/month | B2B software for verified credit professionals managing up to 300 active clients: Personal platform features plus lead/affiliate tools, structured report review, named verification/approval, templates, response tracking, agency dashboard, priority email support. |
| Grow (`agency`) | $199/month | B2B software for verified agencies managing up to 600 active clients: Start features plus export, onboarding assistance, priority support. |

Published feature lists are in `src/lib/stripe/plans.ts`. Start/Grow are software subscriptions; they are **not** classified B2B merely because the buyer selected a tier. Reviewer must confirm business formation, identifier, address, representative authority, intended use, and applicable registration/license/bond or an explained exemption. Raw EIN is not stored; an identifier type/last four and evidence reference are retained. A platform administrator with MFA records the decision and evidence. New checkout remains disabled even after verification until Stripe category and webhook health checks and a separate activation authorization.

## Personal deliverable: one packet per distinct 30-day cycle

Owner-defined packet components:

1. Review consumer-supplied readable credit information; normalize available account and bureau data; identify apparent inconsistencies without calling automated flags verified errors.
2. Deliver a dated written findings report identifying sources, plain-language findings, and the distinction between source facts, detected inconsistencies, and system inferences; include a no-findings report when applicable.
3. Deliver a prioritized consumer action plan, supporting-document requests, and free actions available directly to the consumer. No outcome promise.
4. Deliver consumer-directed dispute drafts only where supported by a good-faith factual basis, or an explicit no-supported-dispute conclusion. The consumer decides whether to send; the service does not mail or submit disputes.
5. Store the final packet in the consumer's secure account, verify server-side access, record a neutral notification, and retain access after any future paid-tool suspension.

The owner excludes score increases, removal of accurate information, guaranteed investigation/credit outcomes, bureau cooperation, credit approval, continuous monitoring, legal advice/representation, dispute transmission, and results within a stated time.

## Proposed lifecycle and completion standard

`cancellation_period` → `active_unbilled_service` → `service_completion_pending` → `invoice_eligible` → (only after separate legal and production authorization, a real itemized invoice) `invoice_due` → `paid_completed_cycle` or, after approved grace, `suspended_nonpayment` → `paid_completed_cycle`.

`compliance_hold` and `closed` are separate terminal/safety states. No credit-repair work, card authorization, invoice, or charge occurs during cancellation. A 30-day period is a **minimum service window**, not proof of work. No updated consumer input means no subsequent paid cycle. A completed packet requires successful source processing, every component above, artifact IDs and SHA-256 hashes, engine/ruleset versions, completion timestamps, secure storage, delivery verification, neutral notification event, immutable audit event, and contract/disclosure versions. Manual correction must be separately recorded; a login, upload, automated flag, draft, or day 30 alone does not meet the standard.

`preparePersonalInvoice` produces only an in-memory $39 completed-period description; it does not call Stripe. The schema reserves one invoice per cycle and unique idempotency key. Actual invoice creation/automatic payment is **not implemented or enabled**. Counsel must approve any automatic-payment consent, timing, payment-method storage, and payment-dispute process before design finalization. Payment, if later allowed, settles the **completed prior packet**, never prepays a new period.

Nonpayment suspension is permitted only if a valid completed-service invoice is open and its documented due date and grace deadline have passed. It cannot arise from account age or an existing customer without such an invoice. Future analyses, dispute generation, new paid work, monitoring, and premium tools pause. Signed agreements, disclosures, invoices/receipts, prior packets/documents, imported data, privacy/export/deletion controls, billing disputes, and support stay available. No prior work is deleted for nonpayment. Paying restores normal navigation, but a new Personal cycle remains on legal hold.

## Current contracts, public claims, and launch geography

- Current public Terms pages conflict: `/terms` says “not a credit repair organization” and describes a business-only platform (June 2026), while `/terms-of-service` acknowledges consumer-facing Personal (July 2026). Neither defines the new packet, fee timing, cancellation notice, or completion proof. **Counsel must supply/approve replacement agreement and disclosure versions before activation.** The review schema deliberately uses no fabricated version.
- `/individuals` calls the product consumer software and offers “Reserve One Month Free”; `/pricing` publishes $39/$99/$199 and reopening-list messaging; `/croa-workflow` previously implied Active status made billing eligible, corrected in this review branch. Audit all claims about AI, disputes, trials/free periods, timelines, fees, credit results, and automatic processing before release.
- Launch jurisdictions **not chosen/approved**. No state is implicitly approved. Counsel must decide registration, bonding, required notices, cancellation method/clock, refund/dispute terms, telemarketing/TSR treatment, and whether this Personal model can legally launch at all. Separate tax adviser must confirm any Stripe Tax registration and product classification before tax collection is enabled.

## Counsel approval checklist — decision required in writing

No earlier verbatim “lawyer approval checklist” was found in the supplied attachments or repository. The owner should attach it to this packet before submitting to counsel; the following checklist captures the known decision points without claiming to reproduce an unavailable document.

- [ ] Identify covered entity/entities and whether each Personal promise is a covered credit-repair service under CROA, TSR, and each intended state's law.
- [ ] Approve exact packet deliverables, objective full-performance evidence, no-findings/no-dispute completion, corrections, and manual exceptions.
- [ ] Approve service agreement and disclosure text/versions, cancellation notice, three-business-day calculation, delivery/acknowledgment proof, and no-work/no-charge period.
- [ ] Decide whether each 30-day cycle and a subsequent updated-input cycle are permissible; no assumed renewal merely from ongoing access.
- [ ] Approve the $39 completed-service invoice line item, timing, due date, grace period, collection method, consent, dispute rights, refunds, and prohibition on advance payment.
- [ ] Decide whether automatic payment may be used at all and, if so, how consent/notice/authorization is obtained after completion.
- [ ] Approve nonpayment suspension scope, restoration, historical-record access, retention, privacy/export/deletion rights, and customer support continuity.
- [ ] Review Personal/Start/Grow classification, business verification evidence, license/bond requirements, purchaser authority, and terms separation.
- [ ] Review public website, SEO, AI, dispute, free-month/trial, price, timeline and results claims against actual behavior.
- [ ] Specify launch states/jurisdictions, state registrations/bonds, sales-channel restrictions, and any per-state variations.
- [ ] Review Stripe business-category status, payment processing restrictions, webhook health, invoice/charge flow, and Stripe Tax with a qualified tax adviser.
- [ ] Issue a signed written opinion with attorney, firm, scope, conditions, effective/review date, agreement/disclosure versions, and reviewer identity. Conditions must be separately evidenced as satisfied.
- [ ] Require a second explicit production deployment/configuration authorization; counsel approval alone does not open charging, checkout, signup, migrations, or launch.

## Technical review and release hold

The migration adds server-only cycle, append-only audit, immutable pending approval, invoice-reference, business-verification tables, plus a private packet bucket. It adds no existing-user rows or suspension backfill. `anon` and `authenticated` have no table grants; service-role access is server-only. Direct inserts cannot seed billable cycle states; completion, eligibility, counsel approval mutation, and invoice activation are database-held until separately authorized migrations. A signed historical-packet URL route is user-bound, access-audited, and independent of payment entitlement. The new B2B application always enters manual review; only an MFA-verified platform administrator with recent step-up can mark it verified with check evidence. A deliberately hard-off Stripe operation guard and existing checkout 503 prevent new charges.

The packet generation/delivery integration, source/packet artifact verification, itemized invoice executor, approved grace-period policy, consumer-tool suspension wiring, and notification sender are **not yet connected**. Do not interpret the schema or tests as a working billable consumer service. The schema is unapplied to production. Rollback before application: revert the PR. After any later authorized migration, preserve records; disable feature paths first, then use a counsel-reviewed data-retention migration rather than dropping audit or packet data.
