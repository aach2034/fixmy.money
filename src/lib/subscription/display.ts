export type SubscriptionDisplayState = {
  state: "active" | "trial" | "grace" | "expired";
  stripeStatus: string;
  trialSource?: string;
  trialEndsAt: string | null;
};

/**
 * Return a trial end only when the server-authoritative entitlement says the
 * application or legacy Stripe trial is current.
 */
export function trialEndForDisplay(
  subscription: SubscriptionDisplayState | null,
  now: Date = new Date(),
): string | null {
  if (
    !subscription ||
    subscription.state !== "trial" ||
    !(
      (subscription.trialSource === "application" && subscription.stripeStatus === "none") ||
      (subscription.trialSource !== "application" && subscription.stripeStatus === "trialing")
    ) ||
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

export function trialDaysRemaining(trialEndsAt: string | null, now: Date = new Date()): number | null {
  if (!trialEndsAt) return null;
  const remaining = new Date(trialEndsAt).getTime() - now.getTime();
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  return Math.ceil(remaining / 86_400_000);
}
