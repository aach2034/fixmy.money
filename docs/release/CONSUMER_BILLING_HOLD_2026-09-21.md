# Consumer billing hold — 2026-09-21

This note supplements, and does not replace, the September 30 launch ledger and v196 rollback evidence. It records a local candidate only; no production configuration, Stripe object, Supabase object, or Sites deployment was changed.

## Classification and prior flow

- `starter` / **Personal** is consumer-facing: `src/lib/stripe/plans.ts` describes reviewing one's own profile and up to three friends or family members. Treating every purchaser as a business merely because signup asks for a company name would be unsafe.
- `professional` / **Start** and `agency` / **Grow** are marketed to credit professionals and agencies, respectively. The repository does **not** enforce verified business eligibility before a purchaser can select either plan. The same signup, checkout route, Stripe customer creation, subscription metadata, and entitlement/webhook code served all three.
- Before this candidate, `TRIAL_CONFIG` specified a $1 charge today and a 14-day period; `create-checkout` created an inline $1 one-time Checkout line item plus a monthly subscription Price, `trial_period_days: 14`, and `payment_method_collection: 'always'`. Checkout thus collected a card and would start the monthly subscription after 14 days unless canceled. Stripe's saved monthly Prices did not themselves define a trial.
- The application grants paid/trial access from verified Stripe subscription state, not merely from signup or a Checkout success URL. Consumer service in the paid workspace therefore required the prior paid Checkout, while free public tools and the reopening list were separate.
- Existing customer entitlement reconciliation, signed webhooks, billing portal, and subscription lifecycle processing remain intact. The new hold prevents creating **new** sessions; it does not cancel, refund, or downgrade existing customers.

## Candidate correction

- `POST /api/stripe/create-checkout` returns `503 NEW_PAID_CHECKOUT_ON_HOLD` with `Cache-Control: no-store` for every plan before any Stripe call. Personal cannot fall through to a B2B path. The former $1 line item and automatic trial setup are removed, not replaced with another fee or a free trial that silently converts to paid.
- Checkout and in-account plan selection present the hold rather than collecting payment or a card. Published $39/$99/$199 monthly prices remain for reference; structured-data offers point to pricing and are marked unavailable.
- Consumer-facing signup and public copy no longer promise the $1/14-day offer. No payment is collected for joining the reopening list. Consumer paid activation remains blocked pending final legal approval of the billing event and service-completion standard.
- Start/Grow paid checkout remains blocked until the app has a server-verified business-purchaser boundary that cannot be satisfied by a checkbox, a plan choice, or a self-entered company name. Then each B2B path needs dedicated eligibility, terms, and marketing review before re-enablement.
- These changes are risk containment, **not** a legal-compliance determination. The Credit Repair Organizations Act generally prohibits a covered credit-repair organization from charging or receiving payment for an agreed consumer service before it is fully performed; counsel must decide the correct model and required disclosures. See [15 U.S.C. § 1679b(b)](https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title15-section1679b).

## Read-only production findings

- Stripe live account: `fixmymoney` (`acct_1TuMH96scmm1R60B`), charges and payouts enabled, no currently/past-due account requirements or disabled reason visible. This is **not** evidence of Stripe approval for a particular credit-repair business model; that status is **NOT VERIFIED**.
- Configured Sites runtime Price IDs exactly match active USD licensed monthly Stripe Prices with one-month intervals: Personal $39 `price_1U0pLH6scmm1R60BUsEZcBvm`, Start $99 `price_1U0pP06scmm1R60Bvez6KnmW`, Grow $199 `price_1U0pQW6scmm1R60B862U1Ea7`. The saved Prices have no `trial_period_days` and blank metadata; session/subscription metadata was set by the old application route. No saved $1 Price, coupon, or active Payment Link was found. Three older active monthly Prices ($49/$129/$249) remain on the same products; they are **not** referenced by Sites runtime configuration and should not be mutated during this task.
- One enabled live webhook endpoint exists at `https://fixmy.money/api/stripe/webhook`, subscribed to `checkout.session.completed`, subscription created/updated/deleted, invoice payment succeeded/failed, and other lifecycle events. Recent delivery success/failure could not be read through the connected API and is **NOT VERIFIED**. There is no second webhook endpoint in the returned list.
- Supabase project `agxzfdyvewptjwdfuvwq` (**FixMyMoney Production**) reports `ACTIVE_HEALTHY`. Read-only Auth settings: `disable_signup=true`, `external.anonymous_users=false`, email enabled, phone and all listed social/OAuth providers disabled, email autoconfirm disabled. Auth CAPTCHA configuration is not exposed in this settings response and is **NOT VERIFIED**. No Partix project was accessed.

## Launch impact and smallest safe next steps

1. Replace the previously saved Sites v197 artifact after final code approval; v197 represents pre-hold commit `3f97c8d` and must **not** be deployed. Keep live v196 as rollback target.
2. Obtain counsel's approval of the Personal consumer billing/service-completion model and make the explicit, reviewed implementation before allowing consumer paid activation. Do not infer that a renamed trial, a card-on-file, or a delayed automatic charge is acceptable.
3. Implement and test a trustworthy server-side B2B eligibility boundary and separate B2B marketing/terms before enabling Start/Grow self-serve paid checkout. The approved $99/$199 monthly Prices can remain unchanged.
4. Review Stripe webhook delivery health and business-category status in the existing account; verify Supabase Auth CAPTCHA in the dashboard before any future signup opening. No paid service, new charge, production configuration change, customer email, or deployment is authorized by this note.

Stripe Tax remains a separate billing review item: if future charges are enabled, confirm applicable registrations before enabling automatic tax collection.
