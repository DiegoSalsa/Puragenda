import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { sendTrialExpiringEmail, sendTrialExpiredEmail } from "@/server/email/send";
import { runBillingReconciliation } from "@/server/services/subscription-dunning.service";
import { authorizeCronRequest } from "@/server/auth/cron";

// ── Vercel Cron: runs daily at 13:00 UTC (09:00 AM Chile) ──
// Handles two tasks:
// 1. Send warning emails to users whose trial expires in 3 days
// 2. Expire trials that have passed their trialEndsAt date.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // ── Auth: verify the request comes from Vercel Cron ──
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const now = new Date();
    const results = { warned: 0, expired: 0, promoExpired: 0, errors: [] as string[] };

    // ═══════════════════════════════════════════
    // 1. WARN: trials expiring in 3 days
    // ═══════════════════════════════════════════
    // Absolute instants avoid depending on the server's local timezone.
    const warningStart = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const warningEnd = new Date(now.getTime() + 96 * 60 * 60 * 1000);

    const aboutToExpire = await prisma.subscription.findMany({
      where: {
        status: "TRIALING",
        isTrial: true,
        trialEndsAt: { gte: warningStart, lt: warningEnd },
        trialWarningEmailSent: false,
      },
      include: {
        business: {
          select: {
            name: true,
            owner: { select: { email: true, name: true } },
          },
        },
      },
    });

    for (const sub of aboutToExpire) {
      try {
        if (sub.business.owner?.email) {
          // Claim the one-shot flag before sending so overlapping cron runs cannot duplicate it.
          const claimed = await prisma.subscription.updateMany({
            where: {
              id: sub.id,
              status: "TRIALING",
              isTrial: true,
              trialEndsAt: { gte: warningStart, lt: warningEnd },
              trialWarningEmailSent: false,
            },
            data: { trialWarningEmailSent: true },
          });
          if (claimed.count === 0) continue;

          const sent = await sendTrialExpiringEmail({
            ownerEmail: sub.business.owner.email,
            ownerName: sub.business.owner.name,
            businessName: sub.business.name,
            plan: sub.plan,
            daysLeft: 3,
          });
          if (sent) {
            results.warned++;
          } else {
            await prisma.subscription.updateMany({
              where: { id: sub.id, status: "TRIALING", trialWarningEmailSent: true },
              data: { trialWarningEmailSent: false },
            });
            results.errors.push(`warn-${sub.id}: email delivery failed`);
          }
        }
      } catch (err) {
        results.errors.push(`warn-${sub.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ═══════════════════════════════════════════
    // 2. EXPIRE: trials past their trialEndsAt
    // ═══════════════════════════════════════════
    const expiredTrials = await prisma.subscription.findMany({
      where: {
        status: "TRIALING",
        isTrial: true,
        trialEndsAt: { lte: now },
      },
      include: {
        business: {
          select: {
            name: true,
            owner: { select: { email: true, name: true } },
          },
        },
      },
    });

    for (const sub of expiredTrials) {
      try {
        // Conditional transition prevents a stale cron read from overwriting webhook ACTIVE.
        const transitioned = await prisma.subscription.updateMany({
          where: { id: sub.id, status: "TRIALING", isTrial: true, trialEndsAt: { lte: now } },
          data: { status: "INACTIVE", isTrial: false },
        });
        if (transitioned.count === 0) continue;

        // Send expiration email
        if (sub.business.owner?.email) {
          const sent = await sendTrialExpiredEmail({
            ownerEmail: sub.business.owner.email,
            ownerName: sub.business.owner.name,
            businessName: sub.business.name,
            plan: sub.plan,
          });
          if (!sent) results.errors.push(`expire-${sub.id}: email delivery failed`);
        }

        results.expired++;
      } catch (err) {
        results.errors.push(`expire-${sub.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const expiredNoCardPromos = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        mpSubscriptionId: null,
        currentPeriodEnd: { lte: now },
        promoName: { not: null },
      },
      include: {
        business: {
          select: {
            name: true,
            owner: { select: { email: true, name: true } },
          },
        },
      },
    });

    for (const sub of expiredNoCardPromos) {
      try {
        const hasPendingDiscount = (sub.promoDiscountMonthsRemaining ?? 0) > 0;
        const transitioned = await prisma.subscription.updateMany({
          where: {
            id: sub.id,
            status: "ACTIVE",
            mpSubscriptionId: null,
            currentPeriodEnd: { lte: now },
            promoName: { not: null },
          },
          data: {
            status: "INACTIVE",
            currentPeriodEnd: null,
            promoName: hasPendingDiscount ? sub.promoName : null,
            promoDiscountPercentage: hasPendingDiscount ? sub.promoDiscountPercentage : null,
            promoDiscountMonthsRemaining: hasPendingDiscount ? sub.promoDiscountMonthsRemaining : 0,
          },
        });
        if (transitioned.count === 0) continue;

        if (sub.business.owner?.email) {
          const sent = await sendTrialExpiredEmail({
            ownerEmail: sub.business.owner.email,
            ownerName: sub.business.owner.name,
            businessName: sub.business.name,
            plan: sub.plan,
          });
          if (!sent) results.errors.push(`promo-expire-${sub.id}: email delivery failed`);
        }

        results.promoExpired++;
      } catch (err) {
        results.errors.push(`promo-expire-${sub.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    let billingReconciliation = null;
    try {
      billingReconciliation = await runBillingReconciliation(now);
    } catch (error) {
      results.errors.push(
        `billing-reconciliation: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const ok = results.errors.length === 0;
    return NextResponse.json({
      ok,
      message: `Trial expiry check: ${results.warned} warned, ${results.expired} expired, ${results.promoExpired} promo expired`,
      ...results,
      billingReconciliation,
    }, { status: ok ? 200 : 500 });
  } catch (err) {
    console.error("[Cron Trial-Expiry] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
