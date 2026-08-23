import type { SubscriptionPlan } from "@/core/entities";

/**
 * Individual accounts have one bookable professional, so the business/location
 * schedule is their single source of availability. Team schedules are kept as
 * an additional per-professional constraint.
 */
export function usesBusinessScheduleOnly(
  plan: SubscriptionPlan | null | undefined,
) {
  return (plan ?? "INDIVIDUAL") === "INDIVIDUAL";
}
