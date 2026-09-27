# Stripe Tax configuration follow-up

Last updated: 2026-09-26
Status: **PAYMENT GATE BLOCKED — automatic tax and Checkout remain off**

## Read-only evidence

- The approved monthly prices remain Personal $39, Start $99, and Grow $199.
- The existing production checkout configuration maps those plans to their current Stripe price identifiers; no Stripe prices, subscriptions, or tax settings were changed during the public-site work.
- Stripe Tax settings report `pending` because a head-office address is not configured.
- There are no active Stripe Tax registrations.
- The inspected products use tax code `txcd_10103001`, and their prices use exclusive tax behavior.
- The Checkout Session creation path does not enable `automatic_tax`.
- The production launch tracker records the three configured live monthly
  prices as active at $39/$99/$199 and the live webhook ledger as 42/42
  succeeded with no webhook dead letters. Those checks do not resolve tax or
  legal eligibility for a new sale.

## Exact owner and adviser decision packet

Before any new paid Checkout is enabled, the owner must give a qualified tax
adviser the following business records outside the repository:

1. the LLC's exact legal name, EIN/IRS identity evidence, and Stripe legal-entity
   and payout-account identity for reconciliation;
2. the actual business head-office address and any other business locations;
3. the intended launch states, sales channels, and a signed all-channel sales
   and nexus schedule, including any existing registrations;
4. the precise Personal, Start, and Grow deliverables, current product tax code
   `txcd_10103001`, exclusive price behavior, invoice/receipt treatment, and
   refund treatment; and
5. the proposed purchaser boundary. Personal is consumer-facing; Start/Grow
   still lack a server-verified business-eligibility boundary and cannot be
   treated as B2B merely from a checkbox or self-entered company name.

The written decision must identify each authorized launch jurisdiction,
taxability and sourcing of each offer, required registrations, approved product
classification/tax code, invoice display, and whether automatic tax should be
enabled. Counsel must separately approve the offer and purchaser boundary.

Until both decisions are recorded, leave Stripe Tax `pending`, keep
`automatic_tax` off, and keep Checkout universally held. Do not enter an
unverified address or create a registration simply to clear the Dashboard
status.

## Completion proof

The payment tax gate passes only when the owner has recorded the written
tax/counsel decisions, required registrations are active, the head-office and
product classifications match those decisions, and one approved test-mode
Checkout/invoice/refund case shows the expected tax result. Production Checkout
remains blocked until the separate release gate authorizes it.

This item does not change the approved displayed prices, plan entitlements, checkout identifiers, or the scope of the current site release.
