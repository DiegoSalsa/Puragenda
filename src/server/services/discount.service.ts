import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { PreApproval } from "mercadopago";
import { mpClient } from "@/server/lib/mercadopago";
import { isV2Plan } from "./commercial-plan-access";
import { V2_BENEFIT_HOLD_MESSAGE } from "./commercial-benefit-hold";
import {
  calculateSubscriptionBaseAmount,
  MIN_MERCADOPAGO_AMOUNT_CLP,
} from "@/server/services/subscription-billing.service";

/**
 * Applies a one-time percentage discount to the next billing cycle of a subscription.
 *
 * @param businessId The ID of the business
 * @param percentage The discount percentage (e.g., 15, 30, 50)
 */
export async function applyDiscount(businessId: string, percentage: number, transaction?:Prisma.TransactionClient, reservedPrizeId?:string) {
  const db=transaction ?? prisma;
  // 1. Find active subscription
  const subscription = await db.subscription.findUnique({
    where: { businessId },
    include: { business: true },
  });

  if (!subscription) {
    return { success: false, error: "No se encontró una suscripción activa." };
  }
  if (isV2Plan(subscription.plan)) return {success:false,error:V2_BENEFIT_HOLD_MESSAGE};

  if (subscription.paymentMethod === "BANK_TRANSFER") {
    return { success: false, error: "Las condiciones de transferencia bancaria se gestionan manualmente." };
  }

  if (!subscription.mpSubscriptionId) {
    return { success: false, error: "La suscripción no está enlazada con MercadoPago." };
  }

  // 2. Validate pending discount
  if (subscription.pendingDiscountPercentage !== null && !(reservedPrizeId && subscription.activePrizeId===reservedPrizeId && subscription.pendingDiscountPercentage===percentage)) {
    return { success: false, error: "Ya existe un descuento pendiente para el próximo mes." };
  }

  // 3. Calculate new price
  const totalBasePrice = calculateSubscriptionBaseAmount(subscription);

  // Add extra staff costs if applicable
  

  // MercadoPago has a minimum transaction amount — enforce $10 CLP floor
  const discountedPrice = Math.max(
    Math.round(totalBasePrice * (1 - percentage / 100)),
    MIN_MERCADOPAGO_AMOUNT_CLP
  );

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
    await db.subscription.update({
      where: { id: subscription.id },
      data: { pendingDiscountPercentage: percentage },
    });

    return { success: true, discountedPrice, originalPrice: totalBasePrice };
  } catch (error) {
    void error;
    // The PUT may have succeeded remotely. Persist the reservation instead of
    // issuing another benefit or claiming a confirmed discount.
    await db.subscription.update({where:{id:subscription.id},data:{pendingDiscountPercentage:percentage,lastBillingSyncAt:new Date(),lastBillingSyncError:"El resultado del descuento requiere confirmación con Mercado Pago."}});
    return { success: false, error: "Error al aplicar el descuento en MercadoPago." };
  }
}
