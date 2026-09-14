import {
  getSubscriptionAccessState,
  type OperationalSubscription,
} from "@/core/subscription-access";

export type DashboardPaymentWallReason = "pending" | "past_due";

export function getDashboardPaymentWallReason(
  subscription: OperationalSubscription | null | undefined,
  now = new Date(),
): DashboardPaymentWallReason | null {
  const state = getSubscriptionAccessState(subscription, now);
  if (state === "ACTIVE" || state === "TRIAL_ACTIVE" || state === "PAST_DUE_GRACE") {
    return null;
  }
  return state === "PAST_DUE_EXPIRED" ? "past_due" : "pending";
}
