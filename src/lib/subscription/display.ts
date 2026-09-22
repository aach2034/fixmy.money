export type SubscriptionDisplayState = {
  state: "active" | "trial" | "grace" | "expired";
  stripeStatus: string;
  trialEndsAt: string | null;
};

/**
 * Return a trial end only when Stripe's server-verified state says the
 * subscription is currently trialing and the supplied end is still valid.
 */
export function trialEndForDisplay(
  subscription: SubscriptionDisplayState | null,
  now: Date = new Date(),
): string | null {
  if (
    !subscription ||
    subscription.state !== "trial" ||
    subscription.stripeStatus !== "trialing" ||
    !subscription.trialEndsAt
  ) {
    return null;
  }

  const trialEnd = new Date(subscription.trialEndsAt);
  if (Number.isNaN(trialEnd.getTime()) || trialEnd.getTime() <= now.getTime()) {
    return null;
  }

  return subscription.trialEndsAt;
}
