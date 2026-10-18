import type { SubscriptionPlan } from "@/core/entities";
import { STAFF_LIMITS } from "@/core/constants";

export type StaffCapacitySubscription = {
  plan: SubscriptionPlan;
  extraStaffCount?: number;
  staffLimitOverride?: number | null;
};

/** The commercial override is an absolute cap, not another bundle of slots. */
export function getStaffLimit(subscription?: StaffCapacitySubscription | null): number {
  const override = subscription?.staffLimitOverride;
  if (override !== null && override !== undefined) {
    if (!Number.isSafeInteger(override) || override < 1) {
      throw new Error("El límite personalizado debe ser un entero positivo");
    }
    return override;
  }
  const plan = subscription?.plan ?? "INDIVIDUAL";
  return STAFF_LIMITS[plan] + (plan === "EQUIPO" ? Math.max(0, subscription?.extraStaffCount ?? 0) : 0);
}

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
