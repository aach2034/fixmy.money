# Stripe Tax configuration follow-up

Date: 2026-09-15
Status: **UNRESOLVED — separate from the public-site and pricing release**

## Read-only evidence

- The approved monthly prices remain Personal $39, Start $99, and Grow $199.
- The existing production checkout configuration maps those plans to their current Stripe price identifiers; no Stripe prices, subscriptions, or tax settings were changed during the public-site work.
- Stripe Tax settings report `pending` because a head-office address is not configured.
- There are no active Stripe Tax registrations.
- The inspected products use tax code `txcd_10103001`, and their prices use exclusive tax behavior.
- The Checkout Session creation path does not enable `automatic_tax`.

## Required follow-up

Treat tax configuration as a separate operational and legal decision. Before enabling automatic tax, an authorized owner should confirm the head-office address, applicable registrations, and product tax treatment with a qualified tax adviser. Only then should a separately reviewed Stripe change enable and verify tax calculation in the relevant jurisdictions.

This item does not change the approved displayed prices, plan entitlements, checkout identifiers, or the scope of the current site release.
