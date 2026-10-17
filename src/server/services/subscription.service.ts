import { prisma } from "@/server/db/prisma";
import { PRICING, EXTRA_STAFF_COST, ANNUAL_MULTIPLIER } from "@/core/constants";
import { getStaffLimit } from "@/core/subscription-plan";
import type { SubscriptionPlan, BillingCycle } from "@/core/entities";

/**
 * Check if a business can add more staff based on their plan.
 */
export function canAddStaff(
  plan: SubscriptionPlan,
  currentStaffCount: number,
  extraStaffCount: number,
  staffLimitOverride?: number | null,
): { allowed: boolean; reason?: string } {
  const maxAllowed = getStaffLimit({ plan, extraStaffCount, staffLimitOverride });
  if (currentStaffCount >= maxAllowed) {
    return { allowed: false, reason: `Has alcanzado el límite de ${maxAllowed} profesional(es) activos de tu suscripción.` };
  }
  return { allowed: true };
}

/**
 * Calculate the total monthly price for a subscription.
 */
export function calculatePrice(
  plan: SubscriptionPlan,
  billingCycle: BillingCycle,
  extraStaffCount: number
): { basePrice: number; extraCost: number; total: number; label: string } {
  const planPricing = PRICING[plan];
  const basePrice = planPricing.monthly;

  let extraCost = 0;
  if (plan === "EQUIPO" && extraStaffCount > 0) {
    extraCost = EXTRA_STAFF_COST.EQUIPO * extraStaffCount;
  }

  let total = basePrice + extraCost;
  let label = `$${total.toLocaleString("es-CL")}/mes`;

  if (billingCycle === "ANNUAL") {
    total = (basePrice + extraCost) * ANNUAL_MULTIPLIER;
    label = `$${total.toLocaleString("es-CL")}/año (10 meses)`;
  }

  return { basePrice, extraCost, total, label };
}

/**
 * Get subscription with business for a business ID.
 */
export async function getSubscriptionByBusinessId(businessId: string) {
  return prisma.subscription.findUnique({
    where: { businessId },
  });
}
