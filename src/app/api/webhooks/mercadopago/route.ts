import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { PreApproval } from "mercadopago";
import { mpClient } from "@/server/lib/mercadopago";
import { addDays } from "date-fns";
import { PRICING, EXTRA_STAFF_COST } from "@/core/constants";
import { incrementPaidReferrals } from "@/server/services/affiliate.service";
import { markPlatformDiscountApplied } from "@/server/services/platform-discount.service";
import crypto from "crypto";

/**
 * Verify MercadoPago webhook signature.
 * MercadoPago sends x-signature header with format: "ts=TIMESTAMP,v1=HASH"
 * The hash is HMAC-SHA256 of a manifest string using the webhook secret.
 *
 * @see https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks#verificarsignature
 */
function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | undefined
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  // If no secret configured, skip verification (log warning)
  if (!secret) {
    console.warn("[webhook/mp] MERCADOPAGO_WEBHOOK_SECRET not set — skipping signature verification");
    return true;
  }

  if (!xSignature || !xRequestId) return false;

  // Parse "ts=...,v1=..." format
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key && valueParts.length > 0) {
      parts[key] = valueParts.join("=");
    }
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Build manifest and compute HMAC
  const manifest = `id:${dataId || ""};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return hmac === v1;
}

/**
 * Webhook endpoint for MercadoPago subscription notifications.
 * Receives silent notifications and updates subscription status accordingly.
 *
 * MercadoPago sends: { id, type, data: { id }, ... }
 * We only care about type === "subscription_preapproval"
 */
export async function POST(request: NextRequest) {
  try {
    // Read body as text first for signature verification
    const rawBody = await request.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(rawBody);
    } catch (error) {
      console.error("[route] Error:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // ── Verify webhook signature ──
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");
    const dataId = (body.data as Record<string, unknown>)?.id as string | undefined;

    if (!verifyWebhookSignature(xSignature, xRequestId, dataId)) {
      console.error("[webhook/mp] Invalid signature — rejecting request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const notificationType = body.type as string | undefined;
    const resourceId = dataId;

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
      const basePrice = PRICING[subscription.plan].monthly;
      let totalBasePrice = basePrice;
      if (subscription.plan === "EQUIPO" && subscription.extraStaffCount > 0) {
        totalBasePrice += subscription.extraStaffCount * EXTRA_STAFF_COST.EQUIPO;
      }

      if (subscription.pendingDiscountPercentage !== null) {
        // Check if there are free months remaining — if so, keep minimum price
        if (subscription.freeMonthsRemaining > 0) {
          try {
            await preapproval.update({
              id: mpSubscriptionId,
              body: {
                auto_recurring: {
                  transaction_amount: 10, // Minimum CLP
                  currency_id: "CLP",
                },
              },
            });
            console.log(`[webhook/mp] Free months remaining: ${subscription.freeMonthsRemaining - 1}, keeping minimum price for ${mpSubscriptionId}`);
          } catch (error) {
            console.error(`[webhook/mp] Failed to keep minimum price for ${mpSubscriptionId}:`, error);
          }
        } else {
          // No free months — revert to full price
          try {
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
      }

      // Consume active prize if exists (ACTIVE → USED)
      const updateData: Record<string, unknown> = {
        status: "ACTIVE",
        isTrial: false,
        currentPeriodEnd: addDays(new Date(), 30),
        pendingDiscountPercentage: subscription.freeMonthsRemaining > 0 ? 100 : null,
        hasCountedAsPaidReferral: true,
        freeMonthsRemaining: subscription.freeMonthsRemaining > 0
          ? subscription.freeMonthsRemaining - 1
          : 0,
      };

      // If there was an active prize and no more free months, mark it used
      if (subscription.activePrizeId && subscription.freeMonthsRemaining <= 0) {
        await prisma.prize.update({
          where: { id: subscription.activePrizeId },
          data: { status: "USED" },
        });
        updateData.activePrizeId = null;
        updateData.pendingDiscountPercentage = null;
      } else if (subscription.activePrizeId && subscription.freeMonthsRemaining > 0) {
        // Keep the prize active for remaining free months
        updateData.pendingDiscountPercentage = 100;
      }

      // Payment successful — upgrade to ACTIVE and clean up
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: updateData,
      });

      await markPlatformDiscountApplied(subscription.id);

      // If it's the first time they pay, count it for the affiliate
      if (!subscription.hasCountedAsPaidReferral) {
        await incrementPaidReferrals(subscription.businessId);
      }

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
