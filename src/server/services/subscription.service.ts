import { prisma } from "@/server/db/prisma";
import { PRICING, EXTRA_STAFF_COST, ANNUAL_MULTIPLIER, STAFF_LIMITS } from "@/core/constants";
import type { SubscriptionPlan, BillingCycle } from "@/core/entities";

/**
 * Check if a business can add more staff based on their plan.
 */
export function canAddStaff(
  plan: SubscriptionPlan,
  currentStaffCount: number,
  extraStaffCount: number
): { allowed: boolean; reason?: string } {
  if (plan === "INDIVIDUAL") {
    if (currentStaffCount >= STAFF_LIMITS.INDIVIDUAL) {
      return { allowed: false, reason: "El plan Individual permite máximo 1 profesional. Sube a Base o Pro para añadir más." };
    }
    return { allowed: true };
  }

  // BASIC and PRO: 1 included + extras purchased
  const maxAllowed = 1 + extraStaffCount;
  if (currentStaffCount >= maxAllowed) {
    return { allowed: false, reason: `Has alcanzado el límite de ${maxAllowed} profesional(es). Compra slots adicionales desde Configuración.` };
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
  if (plan === "BASIC" && extraStaffCount > 0) {
    extraCost = EXTRA_STAFF_COST.BASIC * extraStaffCount;
  } else if (plan === "PRO" && extraStaffCount > 0) {
    extraCost = EXTRA_STAFF_COST.PRO * extraStaffCount;
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
