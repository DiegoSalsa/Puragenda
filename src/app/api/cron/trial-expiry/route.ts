import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { sendTrialExpiringEmail, sendTrialExpiredEmail } from "@/server/email/send";

// ── Vercel Cron: runs daily at 13:00 UTC (09:00 AM Chile) ──
// Handles two tasks:
// 1. Send warning emails to users whose trial expires in 3 days
// 2. Expire trials that have passed their trialEndsAt date

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // ── Auth: verify the request comes from Vercel Cron ──
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = { warned: 0, expired: 0, errors: [] as string[] };

    // ═══════════════════════════════════════════
    // 1. WARN: trials expiring in 3 days
    // ═══════════════════════════════════════════
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const warningStart = new Date(threeDaysFromNow);
    warningStart.setHours(0, 0, 0, 0);
    const warningEnd = new Date(threeDaysFromNow);
    warningEnd.setHours(23, 59, 59, 999);

    const aboutToExpire = await prisma.subscription.findMany({
      where: {
        status: "TRIALING",
        isTrial: true,
        trialEndsAt: { gte: warningStart, lte: warningEnd },
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
          await sendTrialExpiringEmail({
            ownerEmail: sub.business.owner.email,
            ownerName: sub.business.owner.name,
            businessName: sub.business.name,
            plan: sub.plan,
            daysLeft: 3,
          });

          await prisma.subscription.update({
            where: { id: sub.id },
            data: { trialWarningEmailSent: true },
          });

          results.warned++;
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
        trialEndsAt: { lt: now },
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
        // Change status to INACTIVE — PaymentWall will kick in
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "INACTIVE", isTrial: false },
        });

        // Send expiration email
        if (sub.business.owner?.email) {
          await sendTrialExpiredEmail({
            ownerEmail: sub.business.owner.email,
            ownerName: sub.business.owner.name,
            businessName: sub.business.name,
            plan: sub.plan,
          });
        }

        results.expired++;
      } catch (err) {
        results.errors.push(`expire-${sub.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Trial expiry check: ${results.warned} warned, ${results.expired} expired`,
      ...results,
    });
  } catch (err) {
    console.error("[Cron Trial-Expiry] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
