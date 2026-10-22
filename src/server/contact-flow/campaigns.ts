import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { commercialHash } from "@/server/services/commercial-internal";
import type { GrowthScope } from "@/server/puri/growth/access";
import { approvedGrowthHandoff } from "@/server/puri/growth/recommendations";
import { growthWindow } from "@/server/puri/growth/contracts";
import { appointmentSqlScope } from "@/server/puri/growth/evidence";
import {
  campaignInput,
  contactLock,
  requireContactScope,
  addressHash,
  syntheticAddress,
} from "./policy";
import { consentEligibility } from "./consent";
import { cohortClients } from "./cohort";
import { contactAddressAllowed, contactProviderMode } from "./resend-test";
import { settleContactQuota } from "./quotas";
import { settleInterruptedDelivery } from "./interruption";

export function campaignText(
  objective: string,
  business: string,
  service: string,
  price: number,
  currency: string,
) {
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    /[\r\n\x00-\x1f]/.test(business + service) ||
    business.length > 150 ||
    service.length > 150
  )
    throw new Error("INVALID_PUBLIC_CONTENT");
  const subject =
    objective === "RECOVERY"
      ? `Te esperamos en ${business}`
      : objective === "FILL_AVAILABLE_TIME"
        ? `Consulta disponibilidad en ${business}`
        : `Conoce ${service} en ${business}`;
  const intro =
    objective === "RECOVERY"
      ? "Si quieres volver a reservar, puedes consultar los horarios disponibles."
      : objective === "FILL_AVAILABLE_TIME"
        ? "Puedes consultar nuestra disponibilidad actual. Los horarios se confirman al reservar."
        : "Puedes revisar este servicio y consultar su disponibilidad actual.";
  return {
    subject,
    body: `${intro}\n${service}: ${new Intl.NumberFormat("es-CL", { style: "currency", currency }).format(price)}. Precio del catálogo revisado; confirma las condiciones al reservar.\nComunicación comercial de ${business}. Puedes solicitar la baja en cualquier momento.`,
  };
}
export async function scopedCampaign(scope: GrowthScope, id: string) {
  await requireContactScope(scope);
  return prisma.cfCampaign.findFirstOrThrow({
    where: { id, businessId: scope.businessId, scopeKey: scope.scopeKey },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
}
export async function prepareCampaign(
  scope: GrowthScope,
  input: unknown,
  now = new Date(),
  replaceId?: string,
) {
  await requireContactScope(scope);
  const a = campaignInput.parse(input);
  if (!scope.locationId) throw new Error("LOCATION_REQUIRED");
  const handoff = await approvedGrowthHandoff(
    scope,
    a.recommendationId,
    a.recommendationHash,
    a.recommendationVersion,
    now,
  );
  const startsAt = new Date(a.startsAt),
    expiresAt = new Date(a.expiresAt);
  if (
    expiresAt <= startsAt ||
    expiresAt <= now ||
    startsAt.getTime() < now.getTime() - 60000 ||
    expiresAt > handoff.expiresAt ||
    +expiresAt - +startsAt > handoff.strategy.durationDays * 86400000 ||
    a.maxContacts > handoff.strategy.monthlyLimit ||
    a.dailyLimit > handoff.strategy.dailyLimit ||
    a.dailyLimit > a.maxContacts
  )
    throw new Error("INVALID_CAMPAIGN_WINDOW_OR_LIMIT");
  const rec = await prisma.puriGrowthRecommendation.findFirstOrThrow({
    where: {
      id: a.recommendationId,
      businessId: scope.businessId,
      scopeKey: scope.scopeKey,
    },
    select: { evidence: true },
  });
  const service = await prisma.service.findFirstOrThrow({
    where: {
      id: a.serviceId,
      businessId: scope.businessId,
      bookingMode: "APPOINTMENT",
    },
  });
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: scope.businessId },
    select: { name: true, slug: true, address: true },
  });
  const text = campaignText(
    handoff.strategy.objective,
    business.name,
    service.name,
    service.price,
    scope.currencyCode,
  );
  if (!business.address?.trim())
    throw new Error("PUBLIC_BUSINESS_ADDRESS_REQUIRED");
  const businessAddress = business.address;
  text.body += `\nDirección del negocio: ${business.address}.\nRecibes esta comunicación porque registraste consentimiento comercial para este negocio.`;
  return prisma.$transaction(
    async (tx) => {
      await contactLock(tx);
      const prior = await tx.cfCampaign.findUnique({
        where: {
          businessId_scopeKey_recommendationId: {
            businessId: scope.businessId,
            scopeKey: scope.scopeKey,
            recommendationId: a.recommendationId,
          },
        },
      });
      if (prior && !replaceId) return prior;
      if (
        replaceId &&
        (!prior || prior.id !== replaceId || prior.status !== "DRAFT")
      )
        throw new Error("CAMPAIGN_IMMUTABLE_AFTER_AUTHORIZATION");
      if (scope.locationId) {
        if (
          !(await tx.locationService.findUnique({
            where: {
              locationId_serviceId: {
                locationId: scope.locationId,
                serviceId: service.id,
              },
            },
          }))
        )
          throw new Error("SERVICE_LOCATION_FORBIDDEN");
      }
      if (handoff.strategy.objective === "REVIEW_DEMAND") {
        const w = growthWindow(
          scope.timezone,
          handoff.strategy.cohort.rules,
          now,
        );
        const [counts] = await tx.$queryRaw<
          { current: number; previous: number }[]
        >(
          Prisma.sql`SELECT count(*) FILTER(WHERE a."startTime">=${w.start})::int AS current,count(*) FILTER(WHERE a."startTime"<${w.start})::int AS previous FROM "Appointment" a WHERE ${appointmentSqlScope(scope)} AND a."serviceId"=${service.id} AND a.status NOT IN ('CANCELLED','NO_SHOW','AWAITING_PAYMENT') AND a."startTime">=${w.previousStart} AND a."startTime"<${w.end}`,
        );
        if (
          counts.previous < handoff.strategy.cohort.rules.minimumSample ||
          ((counts.previous - counts.current) * 100) / counts.previous <
            handoff.strategy.cohort.rules.trendDropPercent
        )
          throw new Error("SERVICE_OUTSIDE_RECOMMENDATION");
      }
      const clients = await cohortClients(
        tx,
        scope,
        handoff.strategy.cohort.rules,
        handoff.strategy.objective,
        service.id,
        now,
      );
      if (clients.length > 1000) throw new Error("COHORT_LIMIT");
      const policy = await tx.cfPolicy.findUnique({
        where: { key: scope.businessId },
      });
      if (!policy) throw new Error("CONTACT_POLICY_REQUIRED");
      const rows = [];
      let included = 0;
      for (const c of clients) {
        const hash = addressHash(scope.businessId, c.email),
          eligibility = await consentEligibility(
            tx,
            scope.businessId,
            c.id,
            hash,
            now,
          );
        const recent = await tx.cfMessage.count({
          where: {
            businessId: scope.businessId,
            enrollment: { clientId: c.id },
            state: {
              in: ["ACCEPTED", "DELIVERED", "UNKNOWN", "BOUNCED", "COMPLAINED"],
            },
            createdAt: { gte: new Date(+now - policy.contactDays * 86400000) },
          },
        });
        const exclusion = !contactAddressAllowed(scope.businessId, c.email)
          ? "INVALID_ADDRESS"
          : (eligibility.reason ??
            (recent
              ? "RECENT_CONTACT"
              : included >= a.maxContacts
                ? "CAMPAIGN_LIMIT"
                : null));
        if (!exclusion) included++;
        rows.push({
          clientId: c.id,
          addressHash: hash,
          consentId: eligibility.consentId,
          eligible: !exclusion,
          exclusion,
        });
      }
      const campaign =
        prior ??
        (await tx.cfCampaign.create({
          data: {
            businessId: scope.businessId,
            scopeKey: scope.scopeKey,
            locationId: scope.locationId,
            staffId: scope.staffId,
            recommendationId: a.recommendationId,
            createdById: scope.actorId,
          },
        }));
      const version = prior ? prior.currentVersion + 1 : 1;
      if (version > 20) throw new Error("CAMPAIGN_VERSION_LIMIT");
      const data = {
        senderEmail: policy.senderEmail,
        businessAddress,
        timezone: scope.timezone,
        campaignId: campaign.id,
        businessId: scope.businessId,
        version,
        recommendationVersion: handoff.version,
        recommendationHash: handoff.contentHash,
        evidenceHash: handoff.evidenceHash,
        evidence: rec.evidence as Prisma.InputJsonValue,
        rules: handoff.strategy.cohort.rules as Prisma.InputJsonValue,
        objective: handoff.strategy.objective,
        template: `cf-v1-${handoff.strategy.objective}`,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        businessName: business.name,
        businessSlug: business.slug,
        currencyCode: scope.currencyCode,
        ...text,
        cohortHash: commercialHash(rows),
        startsAt,
        expiresAt,
        maxContacts: a.maxContacts,
        dailyLimit: a.dailyLimit,
      };
      const v = await tx.cfVersion.create({
        data: { ...data, contentHash: commercialHash(data) },
      });
      if (rows.length)
        await tx.cfEnrollment.createMany({
          data: rows.map((r) => ({
            ...r,
            businessId: scope.businessId,
            versionId: v.id,
          })),
        });
      await tx.cfCampaign.update({
        where: { id: campaign.id },
        data: { currentVersion: version },
      });
      await tx.cfAuthorization.updateMany({
        where: { version: { campaignId: campaign.id }, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.cfAudit.create({
        data: {
          businessId: scope.businessId,
          campaignId: campaign.id,
          actorId: scope.actorId,
          event: "PREPARED",
          key: `prepared:${v.id}`,
          details: {
            version,
            hash: v.contentHash,
            eligible: included,
            total: rows.length,
          },
        },
      });
      return { ...campaign, currentVersion: version };
    },
    { timeout: 20000 },
  );
}

export async function authorizeCampaign(
  scope: GrowthScope,
  id: string,
  hash: string,
  version: number,
  explicit: boolean,
  now = new Date(),
) {
  await requireContactScope(scope, true);
  if (explicit !== true)
    throw new Error("EXPLICIT_EXECUTION_AUTHORIZATION_REQUIRED");
  const c = await scopedCampaign(scope, id),
    v = c.versions[0];
  if (
    !v ||
    v.version !== version ||
    v.contentHash !== hash ||
    v.expiresAt <= now
  )
    throw new Error("CAMPAIGN_VERSION_CONFLICT");
  await approvedGrowthHandoff(
    scope,
    c.recommendationId,
    v.recommendationHash,
    v.recommendationVersion,
    now,
  );
  return prisma.$transaction(async (tx) => {
    await contactLock(tx);
    const current = await tx.cfCampaign.findUniqueOrThrow({
      where: { id: c.id },
    });
    if (
      current.currentVersion !== version ||
      !["DRAFT", "READY"].includes(current.status)
    )
      throw new Error("CAMPAIGN_STATE_CONFLICT");
    if (
      await tx.cfAuthorization.findFirst({
        where: { versionId: v.id, contentHash: hash, revokedAt: null },
      })
    )
      return current;
    const service = await tx.service.findFirst({
      where: {
        id: v.serviceId,
        businessId: scope.businessId,
        price: v.servicePrice,
        name: v.serviceName,
      },
    });
    if (!service) throw new Error("CATALOG_CHANGED");
    const enrollments = await tx.cfEnrollment.findMany({
      where: { versionId: v.id, eligible: true },
      include: { client: { select: { email: true } } },
    });
    if (!enrollments.length) throw new Error("NO_ELIGIBLE_RECIPIENTS");
    for (const e of enrollments) {
      if (
        addressHash(scope.businessId, e.client.email) !== e.addressHash ||
        (
          await consentEligibility(
            tx,
            scope.businessId,
            e.clientId,
            e.addressHash,
            now,
          )
        ).reason
      )
        throw new Error("COHORT_CHANGED_REVIEW_REQUIRED");
    }
    await tx.cfAuthorization.create({
      data: {
        businessId: scope.businessId,
        versionId: v.id,
        actorId: scope.actorId,
        contentHash: hash,
        expiresAt: v.expiresAt,
      },
    });
    for (const e of enrollments) {
      const m = await tx.cfMessage.create({
        data: {
          businessId: scope.businessId,
          enrollmentId: e.id,
          provider: syntheticAddress(e.client.email) ? "SIMULATED" : "RESEND",
          idempotencyKey: commercialHash({
            campaign: c.id,
            version,
            client: e.clientId,
            channel: "EMAIL",
          }),
          expiresAt: v.expiresAt,
        },
      });
      await tx.cfOutbox.create({
        data: {
          businessId: scope.businessId,
          messageId: m.id,
          nextAttemptAt: v.startsAt,
        },
      });
    }
    await tx.cfAudit.create({
      data: {
        businessId: scope.businessId,
        campaignId: c.id,
        actorId: scope.actorId,
        event: "EXECUTION_AUTHORIZED",
        key: `authorized:${v.id}`,
        details: {
          version,
          hash,
          mode: contactProviderMode(scope.businessId),
          volume: enrollments.length,
        },
      },
    });
    return tx.cfCampaign.update({
      where: { id: c.id },
      data: { status: "READY" },
    });
  });
}

export async function controlCampaign(
  scope: GrowthScope,
  id: string,
  action: "PAUSE" | "RESUME" | "CANCEL",
  now = new Date(),
) {
  await requireContactScope(scope, true);
  const c = await scopedCampaign(scope, id);
  return prisma.$transaction(async (tx) => {
    await contactLock(tx);
    const current = await tx.cfCampaign.findUniqueOrThrow({
      where: { id: c.id },
    });
    const target =
      action === "PAUSE"
        ? "PAUSED"
        : action === "RESUME"
          ? "READY"
          : "CANCELLED";
    if (current.status === target) return current;
    if (
      action === "CANCEL"
        ? ["COMPLETED", "CANCELLED"].includes(current.status)
        : action === "PAUSE"
          ? !["READY", "RUNNING"].includes(current.status)
          : current.status !== "PAUSED"
    )
      throw new Error("CAMPAIGN_STATE_CONFLICT");
    if (
      action === "RESUME" &&
      !(await tx.cfAuthorization.findFirst({
        where: {
          versionId: c.versions[0].id,
          revokedAt: null,
          expiresAt: { gt: now },
        },
      }))
    )
      throw new Error("AUTHORIZATION_EXPIRED");
    if (action === "CANCEL") {
      const queued = await tx.cfMessage.findMany({
        where: {
          enrollment: { version: { campaignId: c.id } },
          state: "QUEUED",
        },
        select: { id: true },
        take: 100,
      });
      for (const m of queued) {
        const recovered = await settleInterruptedDelivery(tx, m.id, now);
        if (recovered)
          await tx.cfOutbox.updateMany({
            where: {
              messageId: m.id,
              state: { in: ["PENDING", "LEASED", "SENDING"] },
            },
            data: {
              state: recovered === "UNKNOWN" ? "UNKNOWN" : "DONE",
              leaseUntil: null,
              lastError:
                recovered === "UNKNOWN" ? "RECONCILIATION_REQUIRED" : null,
            },
          });
        else await settleContactQuota(tx, m.id, "RELEASED", now);
      }
      await tx.cfAuthorization.updateMany({
        where: { version: { campaignId: c.id }, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.cfMessage.updateMany({
        where: {
          enrollment: { version: { campaignId: c.id } },
          state: "QUEUED",
        },
        data: { state: "EXCLUDED" },
      });
      await tx.cfOutbox.updateMany({
        where: {
          message: { enrollment: { version: { campaignId: c.id } } },
          state: { in: ["PENDING", "LEASED"] },
        },
        data: {
          state: "DONE",
          lastError: "CAMPAIGN_CANCELLED",
          leaseUntil: null,
        },
      });
    }
    const r = await tx.cfCampaign.update({
      where: { id: c.id },
      data: { status: target },
    });
    await tx.cfAudit.create({
      data: {
        businessId: scope.businessId,
        campaignId: c.id,
        actorId: scope.actorId,
        event: action,
        key: `control:${c.id}:${action}:${current.updatedAt.toISOString()}`,
      },
    });
    return r;
  });
}

export async function contactSnapshot(scope: GrowthScope) {
  await requireContactScope(scope);
  const campaigns = await prisma.cfCampaign.findMany({
    where: { businessId: scope.businessId, scopeKey: scope.scopeKey },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          authorizations: {
            where: { revokedAt: null },
            select: { actorId: true, createdAt: true, contentHash: true },
          },
          enrollments: {
            select: {
              eligible: true,
              exclusion: true,
              message: {
                select: {
                  state: true,
                  outbox: { select: { lastError: true, attempts: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  const policy = await prisma.cfPolicy.findUnique({
    where: { key: scope.businessId },
    select: {
      killed: true,
      emailEnabled: true,
      dailyLimit: true,
      monthlyLimit: true,
      contactDays: true,
    },
  });
  const global = await prisma.cfPolicy.findUnique({
    where: { key: "GLOBAL" },
    select: { killed: true, emailEnabled: true },
  });
  return {
    mode: contactProviderMode(scope.businessId),
    externalBlocked: true,
    policy,
    global,
    campaigns: campaigns.map((c) => {
      const v = c.versions[0],
        exclusions: Record<string, number> = {},
        states: Record<string, number> = {},
        errors: Record<string, number> = {};
      for (const e of v?.enrollments ?? []) {
        if (e.exclusion)
          exclusions[e.exclusion] = (exclusions[e.exclusion] ?? 0) + 1;
        if (e.message) {
          states[e.message.state] = (states[e.message.state] ?? 0) + 1;
          const code = e.message.outbox?.lastError;
          if (code) errors[code] = (errors[code] ?? 0) + 1;
        }
      }
      const { enrollments, ...version } = v;
      return {
        id: c.id,
        status: c.status,
        recommendationId: c.recommendationId,
        version,
        eligible: enrollments.filter((e) => e.eligible).length,
        excluded: enrollments.filter((e) => !e.eligible).length,
        exclusions,
        states,
        errors,
      };
    }),
    quotas: await prisma.cfQuotaBucket.findMany({
      where: { OR: [{ businessId: scope.businessId }, { businessId: null }] },
      select: {
        kind: true,
        period: true,
        limit: true,
        reserved: true,
        consumed: true,
      },
      take: 100,
    }),
    services: await prisma.service.findMany({
      where: { businessId: scope.businessId, bookingMode: "APPOINTMENT" },
      select: { id: true, name: true, price: true },
      orderBy: { id: "asc" },
      take: 100,
    }),
  };
}
