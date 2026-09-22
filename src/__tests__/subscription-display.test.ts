import { describe, expect, it } from "vitest";
import { trialEndForDisplay } from "@/lib/subscription/display";

const NOW = new Date("2026-09-22T12:00:00.000Z");

describe("trialEndForDisplay", () => {
  it("suppresses a stale trial end for an active subscription", () => {
    expect(
      trialEndForDisplay(
        {
          state: "active",
          stripeStatus: "active",
          trialEndsAt: "2026-09-17T12:00:00.000Z",
        },
        NOW,
      ),
    ).toBeNull();
  });

  it("preserves a valid future trial end for a trialing subscription", () => {
    const trialEndsAt = "2026-09-30T12:00:00.000Z";
    expect(
      trialEndForDisplay(
        { state: "trial", stripeStatus: "trialing", trialEndsAt },
        NOW,
      ),
    ).toBe(trialEndsAt);
  });

  it.each(["canceled", "past_due"])(
    "suppresses trial language when Stripe reports %s",
    (stripeStatus) => {
      expect(
        trialEndForDisplay(
          {
            state: stripeStatus === "past_due" ? "grace" : "expired",
            stripeStatus,
            trialEndsAt: "2026-09-30T12:00:00.000Z",
          },
          NOW,
        ),
      ).toBeNull();
    },
  );

  it("suppresses trial language when the subscription is missing", () => {
    expect(trialEndForDisplay(null, NOW)).toBeNull();
  });

  it("suppresses an expired or invalid trial end even while trialing", () => {
    expect(
      trialEndForDisplay(
        {
          state: "trial",
          stripeStatus: "trialing",
          trialEndsAt: "2026-09-17T12:00:00.000Z",
        },
        NOW,
      ),
    ).toBeNull();
  });
});
