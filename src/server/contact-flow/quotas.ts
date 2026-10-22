import type {
  Prisma,
  CfMessage,
  CfEnrollment,
  CfVersion,
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { z } from "zod";
import { dateKeyInTimezone } from "@/lib/date";
import { assertContactLab, contactLock, syntheticAddress } from "./policy";

const policyInput = z
  .object({
    dailyLimit: z.number().int().min(0).max(100000),
    monthlyLimit: z.number().int().min(0).max(1000000),
    contactDays: z.number().int().min(1).max(365),
    senderEmail: z.email(),
    killed: z.boolean(),
    emailEnabled: z.boolean(),
  })
  .strict();
// Server configuration only. No plan's future allowance is inferred here.
export async function configureContactPolicy(key: string, input: unknown) {
  assertContactLab();
  const a = policyInput.parse(input);
  if (!syntheticAddress(a.senderEmail))
    throw new Error("SYNTHETIC_SENDER_REQUIRED");
  return prisma.$transaction(async (tx) => {
    await contactLock(tx);
    return tx.cfPolicy.upsert({
      where: { key },
      create: { key, businessId: key === "GLOBAL" ? null : key, ...a },
      update: a,
    });
  });
}
export async function settleContactQuota(
  tx: Prisma.TransactionClient,
  messageId: string,
  state: "CONSUMED" | "RELEASED",
  now: Date,
) {
  const r = await tx.cfQuotaReservation.findUnique({
    where: { messageId },
    include: { allocations: true },
  });
  if (!r || r.state !== "RESERVED") return;
  for (const a of r.allocations)
    await tx.cfQuotaBucket.update({
      where: { key: a.bucketKey },
      data: {
        reserved: { decrement: 1 },
        ...(state === "CONSUMED" ? { consumed: { increment: 1 } } : {}),
      },
    });
  await tx.cfQuotaReservation.update({
    where: { id: r.id },
    data: { state, settledAt: now },
  });
}
export async function reserveContactQuota(
  tx: Prisma.TransactionClient,
  m: CfMessage,
  e: CfEnrollment,
  v: CfVersion,
  now: Date,
) {
  const policies = await tx.cfPolicy.findMany({
    where: { key: { in: ["GLOBAL", m.businessId] } },
  });
  const global = policies.find((p) => p.key === "GLOBAL"),
    business = policies.find((p) => p.key === m.businessId);
  if (!global || !business) return "CONTACT_POLICY_REQUIRED";
  if (global.killed || business.killed) return "KILL_SWITCH";
  if (!global.emailEnabled || !business.emailEnabled) return "CHANNEL_DISABLED";
  const day = now.toISOString().slice(0, 10),
    month = day.slice(0, 7);
  const businessDay = dateKeyInTimezone(now, v.timezone),
    businessMonth = businessDay.slice(0, 7);
  const keys = [
    {
      key: `global:day:${day}`,
      kind: "GLOBAL_DAY",
      period: day,
      businessId: null,
      limit: global.dailyLimit,
    },
    {
      key: `global:month:${month}`,
      kind: "GLOBAL_MONTH",
      period: month,
      businessId: null,
      limit: global.monthlyLimit,
    },
    {
      key: `${m.businessId}:day:${businessDay}`,
      kind: "BUSINESS_DAY",
      period: businessDay,
      businessId: m.businessId,
      limit: business.dailyLimit,
    },
    {
      key: `${m.businessId}:month:${businessMonth}`,
      kind: "BUSINESS_MONTH",
      period: businessMonth,
      businessId: m.businessId,
      limit: business.monthlyLimit,
    },
    {
      key: `campaign:${v.campaignId}`,
      kind: "CAMPAIGN",
      period: "ALL",
      businessId: m.businessId,
      limit: v.maxContacts,
    },
    {
      key: `campaign:${v.campaignId}:day:${businessDay}`,
      kind: "CAMPAIGN_DAY",
      period: businessDay,
      businessId: m.businessId,
      limit: v.dailyLimit,
    },
    {
      key: `contact:${m.businessId}:${e.addressHash}:day:${businessDay}`,
      kind: "CONTACT_DAY",
      period: businessDay,
      businessId: m.businessId,
      limit: 1,
    },
  ];
  const previous = await tx.cfQuotaReservation.findUnique({
    where: { messageId: m.id },
    include: { allocations: true },
  });
  if (previous?.state === "CONSUMED") return "ALREADY_CONSUMED";
  if (
    previous?.state === "RESERVED" &&
    previous.allocations.length === keys.length &&
    keys.every((k) => previous.allocations.some((a) => a.bucketKey === k.key))
  ) {
    for (const k of keys) {
      const bucket = await tx.cfQuotaBucket.findUniqueOrThrow({
        where: { key: k.key },
      });
      if (bucket.reserved + bucket.consumed > k.limit) return "QUOTA_EXHAUSTED";
    }
    return null;
  }
  if (previous) {
    await settleContactQuota(tx, m.id, "RELEASED", now);
    await tx.cfQuotaAllocation.deleteMany({
      where: { reservationId: previous.id },
    });
    await tx.cfQuotaReservation.delete({ where: { id: previous.id } });
  }
  const recent = await tx.cfQuotaReservation.findFirst({
    where: {
      businessId: m.businessId,
      state: { in: ["RESERVED", "CONSUMED"] },
      createdAt: { gte: new Date(+now - business.contactDays * 86400000) },
      message: { enrollment: { addressHash: e.addressHash } },
    },
  });
  if (recent) return "RECENT_CONTACT";
  for (const k of keys) {
    const bucket = await tx.cfQuotaBucket.upsert({
      where: { key: k.key },
      create: k,
      update: {},
    });
    // Re-read server policy on every attempt, including reductions.
    if (bucket.reserved + bucket.consumed >= k.limit) return "QUOTA_EXHAUSTED";
  }
  const r = await tx.cfQuotaReservation.create({
    data: { businessId: m.businessId, messageId: m.id, createdAt: now },
  });
  for (const k of keys) {
    await tx.cfQuotaBucket.update({
      where: { key: k.key },
      data: { reserved: { increment: 1 }, limit: k.limit },
    });
    await tx.cfQuotaAllocation.create({
      data: { reservationId: r.id, bucketKey: k.key },
    });
  }
  return null;
}
