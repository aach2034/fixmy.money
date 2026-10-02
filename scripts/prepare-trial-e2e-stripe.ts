#!/usr/bin/env tsx

import { appendFileSync } from "node:fs";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY || "";
const githubEnv = process.env.GITHUB_ENV;
const runId = process.env.TRIAL_E2E_RUN_ID || "local";

if (!secretKey.startsWith("sk_test_")) {
  throw new Error("TRIAL_E2E_REQUIRES_STRIPE_TEST_KEY");
}
if (!githubEnv) throw new Error("GITHUB_ENV_REQUIRED");

const stripe = new Stripe(secretKey);
const metadata = { fmm_isolated_trial_journey: runId };
const resources: Array<{ productId: string; priceId: string }> = [];

async function createPlan(name: string, amount: number) {
  const product = await stripe.products.create({ name, metadata });
  try {
    const price = await stripe.prices.create({
      currency: "usd",
      product: product.id,
      unit_amount: amount,
      recurring: { interval: "month" },
      metadata,
    });
    resources.push({ productId: product.id, priceId: price.id });
    return { product, price };
  } catch (error) {
    await stripe.products
      .update(product.id, { active: false })
      .catch(() => undefined);
    throw error;
  }
}

try {
  const start = await createPlan(`FMM Start isolated ${runId}`, 9_900);
  const grow = await createPlan(`FMM Grow isolated ${runId}`, 19_900);
  appendFileSync(
    githubEnv,
    [
      `STRIPE_PROFESSIONAL_PRICE_ID=${start.price.id}`,
      `STRIPE_AGENCY_PRICE_ID=${grow.price.id}`,
      `TRIAL_E2E_PRICE_IDS=${resources.map((resource) => resource.priceId).join(",")}`,
      `TRIAL_E2E_PRODUCT_IDS=${resources.map((resource) => resource.productId).join(",")}`,
      "",
    ].join("\n"),
  );
  console.log("Prepared isolated Stripe test-mode plan catalog.");
} catch (error) {
  for (const resource of resources.reverse()) {
    await stripe.prices
      .update(resource.priceId, { active: false })
      .catch(() => undefined);
    await stripe.products
      .update(resource.productId, { active: false })
      .catch(() => undefined);
  }
  throw error;
}
