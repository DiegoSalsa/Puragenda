import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { materializeCommercialEntitlements } from "@/server/services/commercial-subscription-v2.service";
import { isRegistrationV2Contract } from "@/server/services/commercial-plan-access";

export const MP_V2_RENEWAL_GRACE_HOURS = 48;
/** A bounded recovery grant for previously paid automatic contracts only.
 * Anchored to the paid boundary, never to a retry, notification or worker clock.
 * Called even on provider outage; no remote state can extend this deadline. */
export async function refreshMpV2DunningInTransaction(tx: Prisma.TransactionClient, businessId: string, now = new Date()) {
  const sub = await tx.commercialSubscription.findUnique({where:{businessId}});
  if (!sub || !isRegistrationV2Contract(sub) || sub.provider !== "MERCADO_PAGO" || !sub.externalSubscriptionId
    || sub.renewalCancellationStatus || sub.lastPaymentStatus !== "CONFIRMED" || !sub.lastPaymentEventId
    || !sub.lastPaymentAt || sub.lastPaymentAt > now || !sub.periodEnd || sub.periodEnd > now
    || !["ACTIVE","SCHEDULED_CHANGE","PAST_DUE_GRACE","PAST_DUE_BLOCKED"].includes(sub.status)) return;
  const maximum = new Date(+sub.periodEnd + MP_V2_RENEWAL_GRACE_HOURS * 3600000);
  const deadline = sub.gracePeriodEndsAt && sub.gracePeriodEndsAt < maximum ? sub.gracePeriodEndsAt : maximum;
  const status = deadline > now ? "PAST_DUE_GRACE" : "PAST_DUE_BLOCKED";
  if (sub.status === status && +sub.gracePeriodEndsAt! === +deadline) return;
  const updated=await tx.commercialSubscription.update({where:{id:sub.id},data:{status,gracePeriodEndsAt:deadline}});
  await tx.commercialEvent.upsert({where:{source_eventId:{source:"mp_v2_dunning",eventId:`${sub.id}:${sub.periodEnd.toISOString()}:${status}`}},update:{},create:{businessId,subscriptionId:sub.id,source:"mp_v2_dunning",eventId:`${sub.id}:${sub.periodEnd.toISOString()}:${status}`,operation:"RENEWAL_RECOVERY",outcome:"APPLIED",occurredAt:now,details:{paidThrough:sub.periodEnd.toISOString(),graceEndsAt:deadline.toISOString(),hours:MP_V2_RENEWAL_GRACE_HOURS}}});
  await materializeCommercialEntitlements(tx,updated,now);
}
export async function refreshMpV2Dunning(businessId: string, now = new Date()) {
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR UPDATE`;
    await refreshMpV2DunningInTransaction(tx,businessId,now);
  });
}
