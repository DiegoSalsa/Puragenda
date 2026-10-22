import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { GrowthScope } from "@/server/puri/growth/access";
import { requireContactScope } from "./policy";

export async function contactResults(scope: GrowthScope, campaignId: string) {
  await requireContactScope(scope);
  const c = await prisma.cfCampaign.findFirstOrThrow({
    where: {
      id: campaignId,
      businessId: scope.businessId,
      scopeKey: scope.scopeKey,
    },
  });
  const where = {
    businessId: scope.businessId,
    enrollment: { version: { campaignId: c.id } },
  };
  const [
    states,
    attempted,
    unsubscribed,
    bookings,
    accepted,
    confirmed,
    enrollments,
    providers,
  ] = await Promise.all([
    prisma.cfMessage.groupBy({ by: ["state"], where, _count: true }),
    prisma.cfAttempt.count({ where: { message: where } }),
    prisma.cfToken.count({
      where: {
        businessId: scope.businessId,
        kind: "UNSUBSCRIBE",
        usedAt: { not: null },
        enrollment: { version: { campaignId: c.id } },
      },
    }),
    prisma.$queryRaw<
      {
        reservations: number;
        completed: number;
        cancelled: number;
        refunded: number;
        knownRevenue: number;
        unknownAmounts: number;
      }[]
    >(Prisma.sql`WITH receipts AS (
      SELECT a.id,a.status,a."totalPrice",a."settledAt",greatest(0,CASE WHEN a."paymentStatus"='APPROVED' THEN coalesce(a."depositAmount",0) ELSE 0 END)+greatest(0,a."giftCardPaidAmount")+
      coalesce((SELECT sum(greatest(0,p.amount)) FROM "PosPayment" p WHERE p."appointmentId"=a.id AND p."businessId"=a."businessId" AND p.status='APPROVED' AND p.currency=${scope.currencyCode}),0) AS paid,
      EXISTS(SELECT 1 FROM "PosPayment" p WHERE p."appointmentId"=a.id AND p."businessId"=a."businessId" AND p.status='REFUNDED') AS refunded,
      coalesce((SELECT sum(greatest(0,p.amount)) FROM "PosPayment" p WHERE p."appointmentId"=a.id AND p."businessId"=a."businessId" AND p.status='REFUNDED' AND p.currency=${scope.currencyCode}),0) AS refunds
      FROM "CfAttribution" t JOIN "CfEnrollment" e ON e.id=t."enrollmentId" AND e."businessId"=t."businessId" JOIN "CfVersion" v ON v.id=e."versionId" JOIN "Appointment" a ON a.id=t."appointmentId" AND a."businessId"=t."businessId" WHERE t."businessId"=${scope.businessId} AND v."campaignId"=${c.id}
    ) SELECT count(*)::int AS reservations,count(*) FILTER(WHERE status='COMPLETED')::int AS completed,count(*) FILTER(WHERE status='CANCELLED')::int AS cancelled,count(*) FILTER(WHERE refunded)::int AS refunded,
      coalesce(sum(CASE WHEN status IN ('CANCELLED','NO_SHOW','AWAITING_PAYMENT') THEN 0 WHEN "totalPrice" IS NULL THEN 0 WHEN "settledAt" IS NOT NULL THEN greatest(0,"totalPrice"-refunds) ELSE least(greatest(0,"totalPrice"),paid) END),0)::float8 AS "knownRevenue",
      count(*) FILTER(WHERE "totalPrice" IS NULL AND ("settledAt" IS NOT NULL OR paid>0 OR refunds>0))::int AS "unknownAmounts" FROM receipts`),
    prisma.cfMessage.count({ where: { ...where, acceptedAt: { not: null } } }),
    prisma.cfProviderEvent.findMany({
      where: {
        message: where,
        kind: { in: ["DELIVERED", "BOUNCED", "COMPLAINED"] },
      },
      distinct: ["messageId", "kind"],
      select: { kind: true },
    }),
    prisma.cfEnrollment.groupBy({
      by: ["eligible", "exclusion"],
      where: {
        businessId: scope.businessId,
        version: { campaignId: c.id, version: c.currentVersion },
      },
      _count: true,
    }),
    prisma.cfMessage.groupBy({ by: ["provider"], where, _count: true }),
  ]);
  const financial = bookings[0];
  return {
    campaignId: c.id,
    mode: providers.some(p => p.provider === "RESEND") ? "CONTROLLED_RESEND_TEST" : "SIMULATED_ONLY",
    providers: Object.fromEntries(providers.map(p => [p.provider, p._count])),
    states: Object.fromEntries(states.map((s) => [s.state, s._count])),
    attempts: attempted,
    accepted,
    confirmedDeliveries: confirmed.filter((e) => e.kind === "DELIVERED").length,
    bounces: confirmed.filter((e) => e.kind === "BOUNCED").length,
    complaints: confirmed.filter((e) => e.kind === "COMPLAINED").length,
    eligible: enrollments
      .filter((e) => e.eligible)
      .reduce((sum, e) => sum + e._count, 0),
    excluded: enrollments
      .filter((e) => !e.eligible)
      .reduce((sum, e) => sum + e._count, 0),
    exclusions: Object.fromEntries(
      enrollments
        .filter((e) => e.exclusion)
        .map((e) => [e.exclusion!, e._count]),
    ),
    unsubscribed,
    reservations: financial.reservations,
    completed: financial.completed,
    cancelled: financial.cancelled,
    refunded: financial.refunded,
    ...(scope.canMoney
      ? {
          knownRevenue: financial.knownRevenue,
          recordedRevenue: financial.unknownAmounts
            ? null
            : financial.knownRevenue,
          unknownAmounts: financial.unknownAmounts,
          currency: scope.currencyCode,
        }
      : {}),
    clicks: null,
    incrementality: null,
    attribution: "TECHNICAL_ASSOCIATION_ONLY",
    note: "Asociación verificable; no demuestra reservas incrementales ni liquidación bancaria. Clics no medidos.",
  };
}
