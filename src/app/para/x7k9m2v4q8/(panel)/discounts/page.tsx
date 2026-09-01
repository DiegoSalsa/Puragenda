import { prisma } from "@/server/db/prisma";
import { DiscountsClient } from "./discounts-client";

export const dynamic = "force-dynamic";

export default async function DiscountsPage() {
  const codes = await prisma.platformDiscountCode.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
    },
  });

  return (
    <DiscountsClient
      codes={codes.map((code) => ({
        id: code.id,
        code: code.code,
        name: code.name,
        discountType: code.discountType,
        discountValue: code.discountValue,
        maxRedemptions: code.maxRedemptions,
        redeemedCount: code.redeemedCount,
        expiresAt: code.expiresAt?.toISOString() ?? null,
        trialEndsAtFrom: code.trialEndsAtFrom?.toISOString() ?? null,
        trialEndsAtTo: code.trialEndsAtTo?.toISOString() ?? null,
        isActive: code.isActive,
        appliesToPlans: code.appliesToPlans,
        createdAt: code.createdAt.toISOString(),
        createdByName: code.createdBy?.name ?? null,
      }))}
    />
  );
}
