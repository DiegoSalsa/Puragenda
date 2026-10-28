import type { Prisma } from "@prisma/client";
import { getStaffLimit } from "@/core/subscription-plan";
import { getCommercialPlanAccess, isV2Plan } from "./commercial-plan-access";
import { prisma } from "@/server/db/prisma";

type CapacityReader = Pick<Prisma.TransactionClient, "subscription" | "staff" | "business">;

export async function getStaffLimitInfo(businessId: string, db: CapacityReader = prisma) {
  const [subscription, currentCount] = await Promise.all([
    db.subscription.findUnique({ where: { businessId } }),
    db.staff.count({ where: { businessId, isActive: true } }),
  ]);
  const plan = subscription?.plan ?? "INDIVIDUAL";
  const maxAllowed = isV2Plan(plan) ? (await getCommercialPlanAccess(businessId, new Date(), db)).professionalTotal : getStaffLimit(subscription);
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
