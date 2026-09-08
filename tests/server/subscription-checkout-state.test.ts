import { describe, expect, it } from "vitest";
import {
  pendingCheckoutSubscriptionState,
  stateForCancelledProviderSubscription,
} from "@/server/services/subscription-billing.service";

describe("pendingCheckoutSubscriptionState", () => {
  it("keeps an active trial instead of flipping the account to pending payment", () => {
    expect(
      pendingCheckoutSubscriptionState({
        status: "TRIALING",
        isTrial: true,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }),
    ).toEqual({ status: "TRIALING", isTrial: true });
  });

  it("marks first-time checkout as inactive when there is no live trial", () => {
    expect(
      pendingCheckoutSubscriptionState({
        status: "INACTIVE",
        isTrial: false,
        trialEndsAt: null,
      }),
    ).toEqual({ status: "INACTIVE", isTrial: false });
  });

  it("does not revive an expired trial if the user clicks pay", () => {
    expect(
      pendingCheckoutSubscriptionState({
        status: "TRIALING",
        isTrial: true,
        trialEndsAt: new Date(Date.now() - 60 * 1000),
      }),
    ).toEqual({ status: "INACTIVE", isTrial: false });
  });
});

describe("stateForCancelledProviderSubscription", () => {
  it("does not cancel a trial when MercadoPago abandons a pending preapproval", () => {
    expect(
      stateForCancelledProviderSubscription({ status: "TRIALING", isTrial: true }),
    ).toEqual({ status: "TRIALING", isTrial: true, clearProviderIds: true });
  });

  it("lets an unpaid pending checkout retry instead of marking the account cancelled", () => {
    expect(
      stateForCancelledProviderSubscription({ status: "INACTIVE", isTrial: false }),
    ).toEqual({ status: "INACTIVE", isTrial: false, clearProviderIds: true });
  });

  it("cancels a paid subscription when the provider reports cancellation", () => {
    expect(
      stateForCancelledProviderSubscription({ status: "ACTIVE", isTrial: false }),
    ).toEqual({ status: "CANCELLED", isTrial: false, clearProviderIds: false });
  });
});
