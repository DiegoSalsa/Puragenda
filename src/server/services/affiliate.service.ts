import { prisma } from "@/server/db/prisma";
import crypto from "crypto";

/**
 * Generate a unique referral code (format: PG-XXXXXX)
 */
function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "PG-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
}

/**
 * Get or create an affiliate record for a business.
 */
export async function getOrCreateAffiliate(businessId: string) {
  const existing = await prisma.affiliate.findUnique({ where: { businessId } });
  if (existing) return existing;

  // Generate unique code (retry if collision)
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const clash = await prisma.affiliate.findUnique({ where: { referralCode: code } });
    if (!clash) break;
    code = generateReferralCode();
    attempts++;
  }

  return prisma.affiliate.create({
    data: { businessId, referralCode: code },
  });
}

/**
 * Find an affiliate by referral code.
 */
export async function findAffiliateByCode(referralCode: string) {
  return prisma.affiliate.findUnique({
    where: { referralCode: referralCode.toUpperCase().trim() },
    include: { business: { select: { id: true, name: true, slug: true } } },
  });
}

/**
 * Apply referral code to a newly created business.
 */
export async function applyReferralCode(newBusinessId: string, referralCode: string) {
  const affiliate = await findAffiliateByCode(referralCode);
  if (!affiliate) return { success: false as const, error: "Código de referido no válido" };

  // Don't allow self-referral
  if (affiliate.businessId === newBusinessId) {
    return { success: false as const, error: "No puedes usar tu propio código de referido" };
  }

  await prisma.business.update({
    where: { id: newBusinessId },
    data: { referredByAffiliateId: affiliate.id },
  });

  // Give the new business a 25% discount on their first payment
  await prisma.subscription.updateMany({
    where: { businessId: newBusinessId },
    data: { pendingDiscountPercentage: 25 },
  });

  return { success: true as const, affiliateBusinessName: affiliate.business.name };
}

/**
 * Increment paid referrals for an affiliate.
 * Called when a referred business becomes a paying customer
 * (either TRIALING → ACTIVE transition, or direct ACTIVE registration without trial).
 *
 * Every 3 paid referrals, activates a 50% discount on the affiliate's next billing.
 */
export async function incrementPaidReferrals(businessId: string) {
  // Find the business and check if it was referred
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { referredByAffiliateId: true },
  });

  if (!business?.referredByAffiliateId) return;

  const affiliate = await prisma.affiliate.update({
    where: { id: business.referredByAffiliateId },
    data: { paidReferrals: { increment: 1 } },
  });

  // Check if a new reward threshold was reached
  const earned = calculateEarnedRewards(affiliate.paidReferrals);
  const available = earned - affiliate.redeemedRewards;
  if (available > 0) {
    console.log(
      `[affiliate] Affiliate ${affiliate.id} reached threshold: ${earned} earned, ${available} available to redeem`
    );
    // Rewards are redeemed manually from the affiliate dashboard.
    // Future enhancement: send notification email here.
  }
}

import { applyDiscount } from "@/server/services/discount.service";

/**
 * Calculates how many 50% discount rewards have been earned based on paid referrals.
 * Thresholds: 3, 5, 10, 15, and every 15 after that (30, 45, 60...).
 */
export function calculateEarnedRewards(paidReferrals: number) {
  let earned = 0;
  if (paidReferrals >= 3) earned++;
  if (paidReferrals >= 5) earned++;
  if (paidReferrals >= 10) earned++;
  if (paidReferrals >= 15) {
    earned++;
    const beyond15 = paidReferrals - 15;
    if (beyond15 > 0) {
      earned += Math.floor(beyond15 / 15);
    }
  }
  return earned;
}

export function getNextThreshold(paidReferrals: number) {
  if (paidReferrals < 3) return 3;
  if (paidReferrals < 5) return 5;
  if (paidReferrals < 10) return 10;
  if (paidReferrals < 15) return 15;
  
  return Math.floor(paidReferrals / 15) * 15 + 15;
}

export function getPreviousThreshold(paidReferrals: number) {
  if (paidReferrals < 3) return 0;
  if (paidReferrals < 5) return 3;
  if (paidReferrals < 10) return 5;
  if (paidReferrals < 15) return 10;
  
  return Math.floor(paidReferrals / 15) * 15;
}

/**
 * Redeem an earned affiliate reward (50% discount)
 */
export async function redeemAffiliateReward(businessId: string) {
  const affiliate = await prisma.affiliate.findUnique({ where: { businessId } });
  if (!affiliate) return { success: false, error: "Afiliado no encontrado" };

  const earned = calculateEarnedRewards(affiliate.paidReferrals);
  const available = earned - affiliate.redeemedRewards;

  if (available <= 0) {
    return { success: false, error: "No tienes recompensas disponibles" };
  }

  // Check if they already have a pending discount
  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription) return { success: false, error: "No tienes una suscripción activa" };
  if (subscription.pendingDiscountPercentage !== null) {
    return { success: false, error: "Ya tienes un descuento activo para el próximo cobro" };
  }

  // Apply the 50% discount
  const result = await applyDiscount(businessId, 50);
  if (!result.success) return result;

  // Mark reward as redeemed
  await prisma.affiliate.update({
    where: { id: affiliate.id },
    data: { redeemedRewards: { increment: 1 } },
  });

  return { success: true };
}

/**
 * Get affiliate info for a business (dashboard display).
 */
export async function getAffiliateInfo(businessId: string) {
  const affiliate = await prisma.affiliate.findUnique({
    where: { businessId },
    include: {
      referredBusinesses: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          subscription: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return affiliate;
}
