import { prisma } from "@/server/db/prisma";
import { PreApproval } from "mercadopago";
import { mpClient } from "@/server/lib/mercadopago";
import { PRICING, EXTRA_STAFF_COST } from "@/core/constants";

/**
 * Applies a one-time percentage discount to the next billing cycle of a subscription.
 *
 * @param businessId The ID of the business
 * @param percentage The discount percentage (e.g., 15, 30, 50)
 */
export async function applyDiscount(businessId: string, percentage: number) {
  // 1. Find active subscription
  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
    include: { business: true },
  });

  if (!subscription) {
    return { success: false, error: "No se encontró una suscripción activa." };
  }

  if (!subscription.mpSubscriptionId) {
    return { success: false, error: "La suscripción no está enlazada con MercadoPago." };
  }

  // 2. Validate pending discount
  if (subscription.pendingDiscountPercentage !== null) {
    return { success: false, error: "Ya existe un descuento pendiente para el próximo mes." };
  }

  // 3. Calculate new price
  const basePrice = PRICING[subscription.plan].monthly;
  let totalBasePrice = basePrice;

  // Add extra staff costs if applicable
  if (subscription.plan === "EQUIPO" && subscription.extraStaffCount > 0) {
    totalBasePrice += subscription.extraStaffCount * EXTRA_STAFF_COST.EQUIPO;
  }

  const discountedPrice = Math.round(totalBasePrice * (1 - percentage / 100));

  try {
    // 4. Update MercadoPago Preapproval
    const preapproval = new PreApproval(mpClient);
    await preapproval.update({
      id: subscription.mpSubscriptionId,
      body: {
        auto_recurring: {
          transaction_amount: discountedPrice,
          currency_id: "CLP", // Optional, but good practice
        },
      },
    });

    // 5. Update Prisma
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { pendingDiscountPercentage: percentage },
    });

    return { success: true, discountedPrice, originalPrice: totalBasePrice };
  } catch (error) {
    console.error("[discount.service] Error applying discount via MP:", error);
    return { success: false, error: "Error al aplicar el descuento en MercadoPago." };
  }
}
