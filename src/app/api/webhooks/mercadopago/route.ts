import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { addDays } from "date-fns";
import { PRICING, EXTRA_STAFF_COST } from "@/core/constants";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

/**
 * Webhook endpoint for MercadoPago subscription notifications.
 * Receives silent notifications and updates subscription status accordingly.
 *
 * MercadoPago sends: { id, type, data: { id }, ... }
 * We only care about type === "subscription_preapproval"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const notificationType = body.type as string | undefined;
    const resourceId = body.data?.id as string | undefined;

    // Only process subscription_preapproval notifications
    if (notificationType !== "subscription_preapproval" || !resourceId) {
      // Return 200 OK so MercadoPago doesn't retry irrelevant notifications
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Query MercadoPago for the real subscription status
    const preapproval = new PreApproval(mpClient);
    const mpSubscription = await preapproval.get({ id: resourceId });

    if (!mpSubscription || !mpSubscription.id) {
      console.error("[webhook/mp] Could not fetch preapproval:", resourceId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const mpStatus = mpSubscription.status; // "authorized" | "paused" | "cancelled" | "pending"
    const mpSubscriptionId = mpSubscription.id;

    // Find the subscription in our database
    const subscription = await prisma.subscription.findFirst({
      where: { mpSubscriptionId },
    });

    if (!subscription) {
      console.warn("[webhook/mp] No subscription found for mpSubscriptionId:", mpSubscriptionId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Update subscription based on MercadoPago status
    if (mpStatus === "authorized") {
      // If the subscription had a pending discount, the payment was already charged with it.
      // We must now revert the MP subscription transaction_amount to the base price for the NEXT month.
      if (subscription.pendingDiscountPercentage !== null) {
        try {
          const basePrice = PRICING[subscription.plan].monthly;
          let totalBasePrice = basePrice;
          if (subscription.plan === "EQUIPO" && subscription.extraStaffCount > 0) {
            totalBasePrice += subscription.extraStaffCount * EXTRA_STAFF_COST.EQUIPO;
          }

          await preapproval.update({
            id: mpSubscriptionId,
            body: {
              auto_recurring: {
                transaction_amount: totalBasePrice,
                currency_id: "CLP",
              },
            },
          });
          console.log(`[webhook/mp] Reverted discount for subscription ${mpSubscriptionId} back to ${totalBasePrice}`);
        } catch (error) {
          console.error(`[webhook/mp] Failed to revert discount for ${mpSubscriptionId}:`, error);
        }
      }

      // Payment successful — upgrade to ACTIVE and clear the discount flag
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          isTrial: false,
          currentPeriodEnd: addDays(new Date(), 30),
          pendingDiscountPercentage: null, // Clean up the discount
        },
      });
      console.log(`[webhook/mp] Subscription ${mpSubscriptionId} activated for business ${subscription.businessId}`);
    } else if (mpStatus === "cancelled") {
      // Subscription cancelled — downgrade
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "CANCELLED",
          plan: "INDIVIDUAL",
        },
      });
      console.log(`[webhook/mp] Subscription ${mpSubscriptionId} cancelled for business ${subscription.businessId}`);
    } else if (mpStatus === "paused") {
      // Subscription paused
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "INACTIVE",
        },
      });
      console.log(`[webhook/mp] Subscription ${mpSubscriptionId} paused for business ${subscription.businessId}`);
    }
    // For "pending" and other statuses, we don't change anything

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[webhook/mp] Error processing notification:", error);
    // Always return 200 to prevent MercadoPago from retrying
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
