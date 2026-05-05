import { prisma } from "@/server/db/prisma";
import { MARKETING_LIMITS } from "@/core/constants";
import type { SubscriptionPlan } from "@/core/entities";

// ═══════════════════════════════════════════
// MARKETING SERVICE
// ═══════════════════════════════════════════

/**
 * Get the marketing limits for a given subscription plan.
 */
export function getMarketingLimits(plan: SubscriptionPlan) {
  return MARKETING_LIMITS[plan] ?? MARKETING_LIMITS.INDIVIDUAL;
}

/**
 * Count how many campaigns this business has sent in the current calendar month.
 */
export async function getCampaignsThisMonth(businessId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return prisma.marketingCampaign.count({
    where: {
      businessId,
      sentAt: {
        gte: startOfMonth,
        lt: endOfMonth,
      },
    },
  });
}

/**
 * Get the last campaign sent by a business (for display purposes).
 */
export async function getLastCampaign(businessId: string) {
  return prisma.marketingCampaign.findFirst({
    where: { businessId },
    orderBy: { sentAt: "desc" },
    select: {
      subject: true,
      audienceSize: true,
      sentAt: true,
    },
  });
}

/**
 * Win-Back audience: clients who accept marketing, ordered by their LAST
 * completed appointment date ascending (least recent first → most inactive).
 * Clients with NO appointments appear first (they never came).
 */
export async function getWinBackAudience(businessId: string, limit: number) {
  // Use raw query for the ordering by subquery (last appointment date)
  const clients = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      email: string;
      last_appointment: Date | null;
    }>
  >`
    SELECT
      c."id",
      c."name",
      c."email",
      (
        SELECT MAX(a."startTime")
        FROM "Appointment" a
        WHERE a."clientId" = c."id"
          AND a."status" IN ('CHECKED_IN', 'COMPLETED', 'CONFIRMED')
      ) AS last_appointment
    FROM "Client" c
    WHERE c."businessId" = ${businessId}
      AND c."acceptsMarketing" = true
    ORDER BY last_appointment ASC NULLS FIRST
    LIMIT ${limit}
  `;

  return clients;
}

/**
 * Record a sent campaign in the database.
 */
export async function recordCampaign(
  businessId: string,
  subject: string,
  body: string,
  audienceSize: number
) {
  return prisma.marketingCampaign.create({
    data: {
      businessId,
      subject,
      body,
      audienceSize,
    },
  });
}

/**
 * Get all campaigns for a business, ordered by most recent first.
 */
export async function getCampaignHistory(businessId: string) {
  return prisma.marketingCampaign.findMany({
    where: { businessId },
    orderBy: { sentAt: "desc" },
    take: 12,
    select: {
      id: true,
      subject: true,
      audienceSize: true,
      sentAt: true,
    },
  });
}
