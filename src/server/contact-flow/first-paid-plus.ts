import { prisma } from "@/server/db/prisma";
import { commercialHash } from "@/server/services/commercial-internal";

export const FIRST_PAID_PLUS_ALERT = { source: "contact_flow_capacity_alert", eventId: "FIRST_PAID_PLUS_PRODUCTION" };
/** Only provider-verified, reconciled production money can trigger this alert. */
export async function ensureFirstPaidPlusAlert(now = new Date()) {
  const existing = await prisma.commercialEvent.findUnique({ where: { source_eventId: FIRST_PAID_PLUS_ALERT } });
  if (existing) return existing;
  const rows = await prisma.$queryRaw<{ id: string; businessId: string; subscriptionId: string; paymentId: string; occurredAt: Date }[]>`
    SELECT p.id, p."businessId", o."subscriptionId", p."paymentId", p."occurredAt"
    FROM "CommercialPaymentEvidence" p
    JOIN "CommercialBillingOperation" o ON o.id=p."operationId" AND o."businessId"=p."businessId"
    JOIN "CommercialEvent" e ON e.id=p."eventId" AND e."businessId"=p."businessId" AND e."subscriptionId"=o."subscriptionId"
    JOIN "CommercialSubscription" s ON s.id=o."subscriptionId" AND s."businessId"=p."businessId"
    JOIN "Business" b ON b.id=p."businessId"
    WHERE p.provider='MERCADO_PAGO' AND p.status='CONFIRMED' AND p.origin='V2_PRODUCTION_PROVIDER'
      AND p."paymentId" LIKE 'V2_PRODUCTION:%' AND p."amountMinor">0 AND p."currencyCode"='CLP'
      AND o.environment='V2_PRODUCTION' AND o."targetPlanCode"='PURAGENDA_PLUS' AND o.status='APPLIED'
      AND e.source='mp_v2_payment' AND e.outcome='APPLIED' AND e.operation IN ('PAYMENT_RECONCILED','EXPANSION_PAYMENT')
      AND e.details->>'paymentState'='CONFIRMED' AND (s."lastReconciledEventId"=e.id OR s."lastReconciledAt">=p."occurredAt")
      AND p."occurredAt"<=${now} AND e."occurredAt"<=${now} AND b."deletedAt" IS NULL
    ORDER BY p."occurredAt",p.id LIMIT 1`;
  const first = rows[0];
  if (!first) return null;
  // createMany uses INSERT ... ON CONFLICT DO NOTHING. An emulated upsert can
  // race between simultaneous admin page loads and worker reconciliations.
  await prisma.commercialEvent.createMany({ skipDuplicates: true, data: [{
    ...FIRST_PAID_PLUS_ALERT, businessId: first.businessId, subscriptionId: first.subscriptionId,
    operation: "REVIEW_RESEND_PRO", outcome: "UNKNOWN", occurredAt: first.occurredAt,
    providerReference: first.paymentId, correlationId: first.id, payloadHash: commercialHash(first),
    details: { code: "FIRST_PAID_PLUS_REVIEW_RESEND_PRO", message: "Existe un primer cliente con cobro real conciliado de Puragenda+. Corresponde revisar y contratar manualmente Resend Pro.", automaticPurchase: false },
  }] });
  return prisma.commercialEvent.findUniqueOrThrow({ where: { source_eventId: FIRST_PAID_PLUS_ALERT } });
}
