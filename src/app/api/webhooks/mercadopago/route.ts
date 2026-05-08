import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { addDays } from "date-fns";

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
      // Payment successful — upgrade to EQUIPO ACTIVE
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          isTrial: false,
          currentPeriodEnd: addDays(new Date(), 30),
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
