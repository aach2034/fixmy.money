#!/usr/bin/env tsx

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY || "";
const email = process.env.TRIAL_E2E_EMAIL || "";

if (!secretKey.startsWith("sk_test_")) {
  throw new Error("TRIAL_E2E_REQUIRES_STRIPE_TEST_KEY");
}
if (!email.endsWith("@test.invalid"))
  throw new Error("TRIAL_E2E_RESERVED_EMAIL_REQUIRED");

const stripe = new Stripe(secretKey);
const failures: string[] = [];

for (const customer of (await stripe.customers.list({ email, limit: 100 }))
  .data) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 100,
  });
  for (const subscription of subscriptions.data) {
    if (subscription.status !== "canceled") {
      await stripe.subscriptions.cancel(subscription.id).catch(() => {
        failures.push("subscription_cancel");
      });
    }
  }
  const sessions = await stripe.checkout.sessions.list({
    customer: customer.id,
    limit: 100,
  });
  for (const session of sessions.data) {
    if (session.status === "open") {
      await stripe.checkout.sessions.expire(session.id).catch(() => {
        failures.push("checkout_expire");
      });
    }
  }
  await stripe.customers
    .del(customer.id)
    .catch(() => failures.push("customer_delete"));
}

for (const priceId of (process.env.TRIAL_E2E_PRICE_IDS || "")
  .split(",")
  .filter(Boolean)) {
  await stripe.prices
    .update(priceId, { active: false })
    .catch(() => failures.push("price_disable"));
}
for (const productId of (process.env.TRIAL_E2E_PRODUCT_IDS || "")
  .split(",")
  .filter(Boolean)) {
  await stripe.products
    .update(productId, { active: false })
    .catch(() => failures.push("product_disable"));
}

if (failures.length) {
  throw new Error(
    `TRIAL_E2E_CLEANUP_FAILED:${[...new Set(failures)].join(",")}`,
  );
}
console.log("Disposed isolated Stripe test-mode resources.");
