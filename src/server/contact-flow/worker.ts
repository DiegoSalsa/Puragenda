import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createPuriContext } from "@/server/puri/context";
import { createGrowthScope } from "@/server/puri/growth/access";
import { approvedGrowthHandoff } from "@/server/puri/growth/recommendations";
import {
  assertContactLab,
  addressHash,
  backoff,
  contactLock,
  requireContactScope,
  syntheticAddress,
} from "./policy";
import { consentEligibility } from "./consent";
import { reserveContactQuota, settleContactQuota } from "./quotas";
import { enrollmentToken } from "./tokens";
import { settleInterruptedDelivery } from "./interruption";
import { evaluateCommercialEntitlements } from "@/core/commercial-entitlements";
import { SimulatedContactProvider, type DeliveryResult } from "./providers";

const includeJob = {
  message: {
    include: {
      enrollment: {
        include: { client: true, version: { include: { campaign: true } } },
      },
    },
  },
} satisfies Prisma.CfOutboxInclude;
type Job = Prisma.CfOutboxGetPayload<{ include: typeof includeJob }>;
export type ContactClaim = { id: string; fence: number; leaseOwner: string };
export async function claimContactJob(
  worker: string = randomUUID(),
  now = new Date(),
  businessId?: string,
): Promise<ContactClaim | null> {
  assertContactLab();
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >(Prisma.sql`SELECT o.id FROM "CfOutbox" o JOIN "CfMessage" m ON m.id=o."messageId"
      JOIN "CfEnrollment" e ON e.id=m."enrollmentId" JOIN "CfVersion" v ON v.id=e."versionId" JOIN "CfCampaign" c ON c.id=v."campaignId"
      WHERE c.status IN ('READY','RUNNING') AND c."currentVersion"=v.version AND ${businessId ? Prisma.sql`o."businessId"=${businessId}` : Prisma.sql`true`}
      AND ((o.state='PENDING' AND o."nextAttemptAt"<=${now}) OR (o.state IN ('LEASED','SENDING') AND o."leaseUntil"<${now}))
      ORDER BY o."nextAttemptAt",o.id FOR UPDATE OF o SKIP LOCKED LIMIT 1`);
    if (!rows[0]) return null;
    const row = await tx.cfOutbox.update({
      where: { id: rows[0].id },
      data: {
        state: "LEASED",
        leaseOwner: worker,
        leaseUntil: new Date(+now + 30000),
        fence: { increment: 1 },
      },
    });
    return { id: row.id, fence: row.fence, leaseOwner: worker };
  });
}
function matches(job: Job, claim: ContactClaim, now: Date) {
  return (
    job.fence === claim.fence &&
    job.leaseOwner === claim.leaseOwner &&
    job.leaseUntil &&
    job.leaseUntil > now &&
    ["LEASED", "SENDING"].includes(job.state)
  );
}
async function checkJob(tx: Prisma.TransactionClient, job: Job, now: Date) {
  const m = job.message,
    e = m.enrollment,
    v = e.version,
    c = v.campaign;
  if (!["READY", "RUNNING"].includes(c.status))
    return c.status === "PAUSED" ? "CAMPAIGN_PAUSED" : "CAMPAIGN_CANCELLED";
  if (c.currentVersion !== v.version) return "CAMPAIGN_VERSION_CONFLICT";
  if (v.expiresAt <= now || m.expiresAt <= now) return "MESSAGE_EXPIRED";
  if (v.startsAt > now) return "WINDOW_NOT_STARTED";
  if (!e.eligible || !e.consentId) return "NO_VERIFIED_CONSENT";
  const auth = await tx.cfAuthorization.findFirst({
    where: {
      businessId: m.businessId,
      versionId: v.id,
      contentHash: v.contentHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
  });
  if (!auth) return "AUTHORIZATION_EXPIRED";
  const business = await tx.business.findUnique({
    where: { id: m.businessId },
    select: {
      ownerId: true,
      name: true,
      slug: true,
      currencyCode: true,
      address: true,
      deletedAt: true,
      commercialSubscription: {
        select: {
          planCode: true,
          status: true,
          professionalTotal: true,
          periodStart: true,
          periodEnd: true,
          trialEnd: true,
          gracePeriodEndsAt: true,
          lastPaymentStatus: true,
          lastPaymentAt: true,
          lastPaymentEventId: true,
        },
      },
    },
  });
  const actor = await tx.user.findUnique({
      where: { id: auth.actorId },
      select: { deletedAt: true },
    }),
    sub = business?.commercialSubscription;
  const entitlement =
    sub && evaluateCommercialEntitlements({ ...sub, plan: sub.planCode }, now);
  if (
    !business ||
    business.deletedAt ||
    business.ownerId !== auth.actorId ||
    !actor ||
    actor.deletedAt
  )
    return "AUTHORIZER_ACCESS_CHANGED";
  if (
    !sub ||
    sub.planCode !== "PURAGENDA_PLUS" ||
    !["ACTIVE", "SCHEDULED_CHANGE", "PAST_DUE_GRACE"].includes(sub.status) ||
    !sub.periodStart ||
    sub.periodStart > now ||
    !sub.periodEnd ||
    sub.lastPaymentStatus !== "CONFIRMED" ||
    !sub.lastPaymentAt ||
    sub.lastPaymentAt > now ||
    !sub.lastPaymentEventId ||
    !entitlement?.commercialAccess ||
    !entitlement.capabilities.includes("puri.plus")
  )
    return "PLUS_ENTITLEMENT_REQUIRED";
  if (
    c.locationId &&
    !(await tx.businessLocation.findFirst({
      where: { id: c.locationId, businessId: m.businessId, isActive: true },
      select: { id: true },
    }))
  )
    return "LOCATION_FORBIDDEN";
  const service = await tx.service.findFirst({
    where: {
      id: v.serviceId,
      businessId: m.businessId,
      name: v.serviceName,
      price: v.servicePrice,
    },
  });
  if (!service) return "CATALOG_CHANGED";
  if (
    c.locationId &&
    !(await tx.locationService.findUnique({
      where: {
        locationId_serviceId: {
          locationId: c.locationId,
          serviceId: v.serviceId,
        },
      },
    }))
  )
    return "SERVICE_LOCATION_FORBIDDEN";
  if (
    business.name !== v.businessName ||
    business.slug !== v.businessSlug ||
    business.currencyCode !== v.currencyCode
  )
    return "CATALOG_CHANGED";
  if (business.address !== v.businessAddress) return "CATALOG_CHANGED";
  if (
    !syntheticAddress(e.client.email) ||
    addressHash(m.businessId, e.client.email) !== e.addressHash
  )
    return "ADDRESS_CHANGED";
  const eligible = await consentEligibility(
    tx,
    m.businessId,
    e.clientId,
    e.addressHash,
    now,
  );
  if (eligible.reason) return eligible.reason;
  if (
    await tx.appointment.findFirst({
      where: {
        businessId: m.businessId,
        clientId: e.clientId,
        startTime: { gte: now },
        status: {
          in: ["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CHECKED_IN"],
        },
      },
      select: { id: true },
    })
  )
    return "FUTURE_BOOKING";
  const policies = await tx.cfPolicy.findMany({
    where: { key: { in: ["GLOBAL", m.businessId] } },
  });
  if (policies.length !== 2) return "CONTACT_POLICY_REQUIRED";
  if (policies.some((p) => p.killed)) return "KILL_SWITCH";
  if (policies.some((p) => !p.emailEnabled)) return "CHANNEL_DISABLED";
  if (
    policies.find((p) => p.businessId === m.businessId)?.senderEmail !==
    v.senderEmail
  )
    return "CONTACT_POLICY_CHANGED";
  return null;
}
const deferred = new Set([
  "KILL_SWITCH",
  "CHANNEL_DISABLED",
  "QUOTA_EXHAUSTED",
  "CAMPAIGN_PAUSED",
  "WINDOW_NOT_STARTED",
  "CONTACT_POLICY_REQUIRED",
]);
async function stopJob(
  tx: Prisma.TransactionClient,
  job: Job,
  code: string,
  now: Date,
) {
  const recovered = await settleInterruptedDelivery(tx, job.messageId, now);
  const retry = !recovered && deferred.has(code);
  await tx.cfOutbox.update({
    where: { id: job.id },
    data: {
      state: recovered === "UNKNOWN" ? "UNKNOWN" : retry ? "PENDING" : "DONE",
      lastError: code,
      nextAttemptAt: new Date(+now + 60000),
      leaseUntil: null,
    },
  });
  if (!retry) {
    if (!recovered) {
      await tx.cfMessage.update({
        where: { id: job.messageId },
        data: { state: code === "MESSAGE_EXPIRED" ? "EXPIRED" : "EXCLUDED" },
      });
      await settleContactQuota(tx, job.messageId, "RELEASED", now);
    }
    const v = job.message.enrollment.version;
    if (
      !(await tx.cfOutbox.count({
        where: {
          message: { enrollment: { versionId: v.id } },
          state: { in: ["PENDING", "LEASED", "SENDING"] },
        },
      }))
    )
      await tx.cfCampaign.updateMany({
        where: { id: v.campaignId, status: { in: ["READY", "RUNNING"] } },
        data: { status: "COMPLETED" },
      });
  }
  return { state: recovered ?? (retry ? "DEFERRED" : "EXCLUDED"), code };
}

export async function dispatchContactClaim(
  claim: ContactClaim,
  now = new Date(),
) {
  assertContactLab();
  const initial = await prisma.cfOutbox.findUniqueOrThrow({
    where: { id: claim.id },
    include: includeJob,
  });
  if (!matches(initial, claim, now)) return { state: "FENCED" };
  const m = initial.message,
    v = m.enrollment.version,
    c = v.campaign;
  const auth = await prisma.cfAuthorization.findFirst({
    where: { versionId: v.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  try {
    if (!auth) throw new Error("AUTHORIZATION_EXPIRED");
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: auth.actorId },
    });
    const location = c.locationId
      ? await prisma.businessLocation.findUniqueOrThrow({
          where: { id: c.locationId },
          select: { slug: true },
        })
      : null;
    const context = await createPuriContext(user, {
      pathname: "/internal/puri-plus",
      locale: "es",
      locationSlug: location?.slug,
    });
    const scope = await createGrowthScope(context, !c.locationId, now);
    await requireContactScope(scope, true);
    if (scope.businessId !== c.businessId || scope.scopeKey !== c.scopeKey)
      throw new Error("AUTHORIZER_SCOPE_CHANGED");
    await approvedGrowthHandoff(
      scope,
      c.recommendationId,
      v.recommendationHash,
      v.recommendationVersion,
      now,
    );
  } catch (error) {
    const code =
      error instanceof Error && /^[A-Z_]+$/.test(error.message)
        ? error.message
        : "AUTHORIZER_ACCESS_CHANGED";
    return prisma.$transaction(async (tx) => {
      await contactLock(tx);
      const j = await tx.cfOutbox.findUniqueOrThrow({
        where: { id: claim.id },
        include: includeJob,
      });
      if (!matches(j, claim, now)) return { state: "FENCED" };
      return stopJob(tx, j, code, now);
    });
  }
  const begun = await prisma.$transaction(async (tx) => {
    await contactLock(tx);
    const j = await tx.cfOutbox.findUniqueOrThrow({
      where: { id: claim.id },
      include: includeJob,
    });
    if (!matches(j, claim, now)) return { state: "FENCED" };
    if (j.message.state !== "QUEUED") {
      await tx.cfOutbox.update({
        where: { id: j.id },
        data: {
          state: j.message.state === "UNKNOWN" ? "UNKNOWN" : "DONE",
          leaseUntil: null,
        },
      });
      return { state: "ALREADY_FINALIZED" };
    }
    const acknowledged = await tx.cfSimulatedReceipt.findUnique({
      where: { messageId: j.messageId },
    });
    if (acknowledged) {
      await tx.cfMessage.update({
        where: { id: j.messageId },
        data: {
          state: "ACCEPTED",
          providerId: acknowledged.providerId,
          acceptedAt: acknowledged.createdAt,
        },
      });
      await tx.cfOutbox.update({
        where: { id: j.id },
        data: { state: "DONE", leaseUntil: null, lastError: null },
      });
      await settleContactQuota(tx, j.messageId, "CONSUMED", now);
      return { state: "ACCEPTED", simulated: true, reconciled: true };
    }
    const reason = await checkJob(tx, j, now);
    if (reason) return stopJob(tx, j, reason, now);
    if (
      j.attempts >= 5 ||
      (j.firstAttemptAt && +now - +j.firstAttemptAt >= 23 * 3600000)
    ) {
      await tx.cfMessage.update({
        where: { id: j.messageId },
        data: { state: "UNKNOWN" },
      });
      await tx.cfOutbox.update({
        where: { id: j.id },
        data: {
          state: "UNKNOWN",
          lastError: "RECONCILIATION_REQUIRED",
          leaseUntil: null,
        },
      });
      await settleContactQuota(tx, j.messageId, "CONSUMED", now);
      return { state: "UNKNOWN" };
    }
    // A previous STARTED attempt might have reached a provider. No-idempotency
    // providers may never recover that lease by blindly resending.
    if (j.attempts > 0 && j.message.simulation === "NO_IDEMPOTENCY_TIMEOUT") {
      await tx.cfMessage.update({
        where: { id: j.messageId },
        data: { state: "UNKNOWN" },
      });
      await tx.cfOutbox.update({
        where: { id: j.id },
        data: {
          state: "UNKNOWN",
          lastError: "RECONCILIATION_REQUIRED",
          leaseUntil: null,
        },
      });
      await settleContactQuota(tx, j.messageId, "CONSUMED", now);
      return { state: "UNKNOWN" };
    }
    const quota = await reserveContactQuota(
      tx,
      j.message,
      j.message.enrollment,
      j.message.enrollment.version,
      now,
    );
    if (quota) return stopJob(tx, j, quota, now);
    const number = j.attempts + 1;
    await tx.cfAttempt.create({
      data: {
        businessId: j.businessId,
        messageId: j.messageId,
        number,
        fence: j.fence,
        outcome: "STARTED",
        createdAt: now,
      },
    });
    await tx.cfOutbox.update({
      where: { id: j.id },
      data: {
        state: "SENDING",
        attempts: number,
        firstAttemptAt: j.firstAttemptAt ?? now,
      },
    });
    await tx.cfCampaign.update({
      where: { id: c.id },
      data: { status: "RUNNING" },
    });
    return { state: "STARTED", number };
  });
  if (begun.state !== "STARTED" || !("number" in begun) || !begun.number)
    return begun;
  const number = begun.number;
  let result: DeliveryResult;
  // Durable STARTED is committed before touching the provider. A crash after
  // acceptance leaves a recoverable lease and a stable idempotency key.
  try {
    const delivery = await prisma.$transaction(
      async (tx) => {
        await contactLock(tx);
        const j = await tx.cfOutbox.findUniqueOrThrow({
          where: { id: claim.id },
          include: includeJob,
        });
        const at = new Date(Math.max(+now, Date.now()));
        if (!matches(j, claim, at)) return { blocked: "FENCED" };
        const reason = await checkJob(tx, j, at);
        if (reason) {
          await stopJob(tx, j, reason, at);
          return { blocked: reason };
        }
        const policy = await tx.cfPolicy.findUniqueOrThrow({
          where: { key: j.businessId },
        });
        const unsub = await enrollmentToken(
          tx,
          m.enrollmentId,
          m.businessId,
          "UNSUBSCRIBE",
          new Date(+v.expiresAt + 10 * 365 * 86400000),
        );
        const booking = await enrollmentToken(
          tx,
          m.enrollmentId,
          m.businessId,
          "BOOKING",
          new Date(+v.expiresAt + 30 * 86400000),
        );
        const base =
          process.env.CONTACT_FLOW_PUBLIC_ORIGIN ?? "http://127.0.0.1:3119";
        const origin = new URL(base);
        if (
          !["127.0.0.1", "localhost"].includes(origin.hostname) ||
          origin.protocol !== "http:"
        )
          throw new Error("LAB_ORIGIN_REQUIRED");
        const payload = {
          to: j.message.enrollment.client.email,
          from: v.senderEmail,
          subject: v.subject,
          text: `${v.body}\nSolicitudes de baja: ${policy.senderEmail}`,
          unsubscribeUrl: `${origin.origin}/contact-flow/unsubscribe?token=${encodeURIComponent(unsub)}`,
          bookingUrl: `${origin.origin}/contact-flow/r?token=${encodeURIComponent(booking)}`,
        };
        return {
          result: await new SimulatedContactProvider().send(
            tx,
            j.message,
            payload,
            number,
            AbortSignal.timeout(2000),
          ),
        };
      },
      { timeout: 5000 },
    );
    if ("blocked" in delivery)
      return { state: "BLOCKED", code: delivery.blocked };
    result = delivery.result;
  } catch {
    result = {
      outcome: "UNKNOWN",
      code: "PROVIDER_TIMEOUT_OR_ERROR",
      idempotent: m.simulation !== "NO_IDEMPOTENCY_TIMEOUT",
    };
  }
  return prisma.$transaction(async (tx) => {
    await contactLock(tx);
    const j = await tx.cfOutbox.findUniqueOrThrow({
      where: { id: claim.id },
      include: includeJob,
    });
    // Fencing guards acknowledgements as well as claims. Late workers cannot
    // overwrite a newer delivery, cancellation, or reconciliation.
    if (
      !matches(j, claim, new Date(Math.max(+now, Date.now()))) ||
      j.state !== "SENDING"
    )
      return { state: "FENCED" };
    await tx.cfAttempt.update({
      where: { messageId_number: { messageId: m.id, number } },
      data: { outcome: result.outcome, code: result.code },
    });
    const retry =
      (result.outcome === "TEMPORARY" ||
        (result.outcome === "UNKNOWN" && result.idempotent)) &&
      number < 5;
    const state =
      result.outcome === "ACCEPTED"
        ? "ACCEPTED"
        : result.outcome === "PERMANENT"
          ? "FAILED"
          : retry
            ? "QUEUED"
            : "UNKNOWN";
    await tx.cfMessage.update({
      where: { id: m.id },
      data: {
        state,
        ...(result.providerId ? { providerId: result.providerId } : {}),
        ...(state === "ACCEPTED" ? { acceptedAt: now } : {}),
      },
    });
    await tx.cfOutbox.update({
      where: { id: j.id },
      data: {
        state: retry ? "PENDING" : state === "UNKNOWN" ? "UNKNOWN" : "DONE",
        leaseUntil: null,
        lastError: result.code ?? null,
        nextAttemptAt: new Date(
          +now + backoff(number, m.idempotencyKey, result.retryAfterMs),
        ),
      },
    });
    if (!retry)
      await settleContactQuota(
        tx,
        m.id,
        state === "FAILED" ? "RELEASED" : "CONSUMED",
        now,
      );
    const pending = await tx.cfOutbox.count({
      where: {
        message: { enrollment: { versionId: v.id } },
        state: { in: ["PENDING", "LEASED", "SENDING"] },
      },
    });
    if (!pending)
      await tx.cfCampaign.updateMany({
        where: { id: c.id, status: "RUNNING" },
        data: { status: "COMPLETED" },
      });
    return { state, simulated: true, code: result.code };
  });
}
export async function runContactWorker(
  options: { businessId?: string; limit?: number; now?: Date } = {},
) {
  assertContactLab();
  const limit = Math.min(20, Math.max(1, options.limit ?? 5)),
    results = [];
  for (let i = 0; i < limit; i++) {
    const claim = await claimContactJob(
      randomUUID(),
      options.now,
      options.businessId,
    );
    if (!claim) break;
    results.push(await dispatchContactClaim(claim, options.now));
  }
  return {
    processed: results.length,
    results,
    simulated: true,
    externalBlocked: true,
  };
}
