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

  return { success: true as const, affiliateBusinessName: affiliate.business.name };
}

/**
 * Increment paid referrals for an affiliate.
 * Called when a referred business becomes a paying customer
 * (either TRIALING → ACTIVE transition, or direct ACTIVE registration without trial).
 *
 * At 10 paid referrals, activates a 15% discount on the affiliate's next billing.
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

  // Check if they've reached the threshold for discount
  if (affiliate.paidReferrals >= 10) {
    await prisma.subscription.updateMany({
      where: { businessId: affiliate.businessId },
      data: { pendingDiscountPercentage: 15 },
    });
  }
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
