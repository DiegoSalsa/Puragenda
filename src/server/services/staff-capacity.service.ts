import type { Prisma } from "@prisma/client";
import { getStaffLimit } from "@/core/subscription-plan";
import { getCommercialPlanAccess, isV2Plan } from "./commercial-plan-access";
import { prisma } from "@/server/db/prisma";

type CapacityReader = Pick<Prisma.TransactionClient, "subscription" | "staff" | "business"> & Partial<Pick<Prisma.TransactionClient, "commercialBillingOperation">>;

export async function getStaffLimitInfo(businessId: string, db: CapacityReader = prisma) {
  const [subscription, currentCount] = await Promise.all([
    db.subscription.findUnique({ where: { businessId } }),
    db.staff.count({ where: { businessId, isActive: true } }),
  ]);
  const plan = subscription?.plan ?? "INDIVIDUAL";
  let maxAllowed = isV2Plan(plan) ? (await getCommercialPlanAccess(businessId, new Date(), db)).professionalTotal : getStaffLimit(subscription);
  // A reduction is accepted only after removing surplus active professionals.
  // Reserve that boundary so a concurrent reactivation cannot invalidate its next paid invoice.
  if (isV2Plan(plan) && db.commercialBillingOperation) {
    const reduction = await db.commercialBillingOperation.findFirst({ where: { businessId, environment: { in: ["V2_SANDBOX", "V2_PRODUCTION"] },
      kind: "CONTRACT_CHANGE", strategy: "NEXT_RENEWAL", status: { in: ["PREPARED", "EXECUTING", "UNKNOWN", "SCHEDULED"] },
      targetProfessionalTotal: { lt: maxAllowed } }, select: { targetProfessionalTotal: true } });
    if (reduction) maxAllowed = reduction.targetProfessionalTotal;
  }
  return { plan, currentCount, maxAllowed, canAdd: currentCount < maxAllowed };
}

export class StaffLimitError extends Error {
  constructor(limit: number) {
    super(`Has alcanzado el límite de ${limit} profesional(es) activos de tu suscripción.`);
  }
}

export async function assertStaffCapacity(businessId: string, db: CapacityReader) {
  const info = await getStaffLimitInfo(businessId, db);
  if (!info.canAdd) throw new StaffLimitError(info.maxAllowed);
}

/** All creation/reactivation paths lock the same tenant before counting. */
export async function withStaffCapacityLock<T>(
  businessId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
    return operation(tx);
  });
}
