import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { commercialHash } from "@/server/services/commercial-internal";
import { usesBusinessScheduleOnly } from "@/core/subscription-plan";
import { revalidateGrowthScope, type GrowthScope } from "./access";
import {
  GROWTH_RULE_VERSION,
  growthWindow,
  type GrowthRules,
  type DetectedGrowthSignal,
} from "./contracts";
import { calculateOccupancy, type CapacityAgenda } from "./occupancy";
import type { AvailabilityScheduleOverride } from "@/core/availability";

export function appointmentSqlScope(scope: GrowthScope) {
  return Prisma.sql`a."businessId"=${scope.businessId} ${scope.locationId ? Prisma.sql`AND (a."locationId"=${scope.locationId} ${scope.includeLegacyNullLocation ? Prisma.sql`OR a."locationId" IS NULL` : Prisma.empty})` : Prisma.empty}
    ${scope.staffId ? Prisma.sql`AND a."staffId"=${scope.staffId}` : Prisma.empty}`;
}
const overrides = (
  entries: {
    date: Date;
    isOpen?: boolean;
    isWorking?: boolean;
    startTime: string | null;
    endTime: string | null;
    breakStart: string | null;
    breakEnd: string | null;
  }[],
): AvailabilityScheduleOverride[] =>
  entries.map((o) => ({
    date: o.date.toISOString().slice(0, 10),
    isOpen: o.isOpen ?? o.isWorking ?? false,
    startTime: o.startTime,
    endTime: o.endTime,
    breakStart: o.breakStart,
    breakEnd: o.breakEnd,
  }));
type Counts = {
  current: number;
  previous: number;
  cancelled: number;
  future: number;
  fingerprint: string;
};
export type Cohort = {
  inactive: number;
  clients: number;
  thresholdDays: number;
  basis: string;
  gaps: number;
  fingerprint: string;
};
type ServicePerformance = {
  service: string;
  current: number;
  previous: number;
  collected?: number | null;
  nominal?: number;
  unknownCollectionAppointments?: number;
  estimatedNominalAppointments?: number;
};
type MoneyTotals = {
  collected: number | null;
  knownCollected: number;
  nominal: number;
  unknownCollectionAppointments: number;
  estimatedNominalAppointments: number;
  fingerprint: string;
};
type Retention = {
  currentClients: number;
  newClients: number;
  repeatClients: number;
  retainedClients: number;
  previousClients: number;
};
export async function collectGrowthEvidence(
  scope: GrowthScope,
  rules: GrowthRules,
  now = new Date(),
) {
  await revalidateGrowthScope(scope, now);
  const window = growthWindow(scope.timezone, rules, now),
    filter = appointmentSqlScope(scope);
  const overrideDates = {
    gte: new Date(`${window.startKey}T00:00Z`),
    lt: new Date(`${window.endKey}T00:00Z`),
  };
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET LOCAL statement_timeout = '8000ms'`;
      const [bound] = await tx.$queryRaw<{ n: number }[]>(
        Prisma.sql`SELECT count(*)::int AS n FROM "Appointment" a WHERE ${filter} AND a."startTime">=${window.historyStart}`,
      );
      if (bound.n > 20000) throw new Error("GROWTH_DATA_LIMIT");
      const [counts] = await tx.$queryRaw<Counts[]>(Prisma.sql`SELECT
      count(*) FILTER(WHERE a."startTime">=${window.start} AND a."startTime"<${window.end} AND a.status NOT IN ('CANCELLED','NO_SHOW','AWAITING_PAYMENT'))::int AS current,
      count(*) FILTER(WHERE a."startTime">=${window.previousStart} AND a."startTime"<${window.start} AND a.status NOT IN ('CANCELLED','NO_SHOW','AWAITING_PAYMENT'))::int AS previous,
      count(*) FILTER(WHERE a."startTime">=${window.start} AND a."startTime"<${window.end} AND a.status='CANCELLED')::int AS cancelled,
      count(*) FILTER(WHERE a."startTime">=${now} AND a.status IN ('PENDING','CONFIRMED','CHECKED_IN'))::int AS future,
      coalesce(md5(string_agg(md5(concat_ws('|',a.id,a.status,a."clientId",a."staffId",a."locationId",a."serviceId",a."startTime",a."endTime",a."updatedAt")),'' ORDER BY a.id)),'empty') AS fingerprint
      FROM "Appointment" a WHERE ${filter} AND a."startTime">=${window.historyStart}`);
      const services = await tx.$queryRaw<
        ServicePerformance[]
      >(Prisma.sql`SELECT a."serviceId" AS service,
      count(*) FILTER(WHERE a."startTime">=${window.start})::int AS current,
      count(*) FILTER(WHERE a."startTime"<${window.start})::int AS previous
      FROM "Appointment" a WHERE ${filter} AND a."startTime">=${window.previousStart} AND a."startTime"<${window.end}
      AND a.status NOT IN ('CANCELLED','NO_SHOW','AWAITING_PAYMENT') GROUP BY a."serviceId" ORDER BY current DESC,a."serviceId" LIMIT 30`);
      let money: MoneyTotals | null = null;
      if (scope.canMoney) {
        const rows = await tx.$queryRaw<
          (MoneyTotals & { service: string | null })[]
        >(Prisma.sql`WITH receipts AS (
        SELECT a.id,a."serviceId",greatest(0,coalesce(a."totalPrice",s.price,0)) AS due,a."totalPrice" IS NULL AS estimated,a."settledAt",
          greatest(0,CASE WHEN a."paymentStatus"='APPROVED' THEN coalesce(a."depositAmount",0) ELSE 0 END)+greatest(0,a."giftCardPaidAmount")
          +coalesce((SELECT sum(greatest(0,p.amount)) FROM "PosPayment" p WHERE p."appointmentId"=a.id AND p."businessId"=${scope.businessId} AND p.status='APPROVED' AND p.currency=${scope.currencyCode}),0) AS recorded
        FROM "Appointment" a JOIN "Service" s ON s.id=a."serviceId" AND s."businessId"=a."businessId"
        WHERE ${filter} AND a."startTime">=${window.start} AND a."startTime"<${window.end} AND a.status NOT IN ('CANCELLED','NO_SHOW','AWAITING_PAYMENT')
      ), amounts AS (SELECT *,estimated AND ("settledAt" IS NOT NULL OR recorded>0) AS unknown,
        CASE WHEN estimated AND ("settledAt" IS NOT NULL OR recorded>0) THEN 0 WHEN "settledAt" IS NOT NULL THEN due ELSE least(due,recorded) END AS collected FROM receipts)
      SELECT "serviceId" AS service,CASE WHEN count(*) FILTER(WHERE unknown)>0 THEN NULL ELSE coalesce(sum(collected),0)::float8 END AS collected,
      coalesce(sum(collected),0)::float8 AS "knownCollected",coalesce(sum(due),0)::float8 AS nominal,
      count(*) FILTER(WHERE unknown)::int AS "unknownCollectionAppointments",count(*) FILTER(WHERE estimated)::int AS "estimatedNominalAppointments",
      coalesce(md5(string_agg(concat_ws('|',id,collected,due,estimated,unknown),'' ORDER BY id)),'empty') AS fingerprint
      FROM amounts GROUP BY GROUPING SETS((),("serviceId")) ORDER BY service NULLS FIRST`);
        money = rows.find((r) => r.service === null)!;
        for (const s of services) {
          const amount = rows.find((x) => x.service === s.service);
          s.collected = amount ? amount.collected : 0;
          s.nominal = amount?.nominal ?? 0;
          s.unknownCollectionAppointments =
            amount?.unknownCollectionAppointments ?? 0;
          s.estimatedNominalAppointments =
            amount?.estimatedNominalAppointments ?? 0;
        }
      }
      let cohort: Cohort | null = null,
        retention: Retention | null = null;
      if (scope.canClients) {
        [cohort] = await tx.$queryRaw<Cohort[]>(Prisma.sql`WITH visits AS (
        SELECT DISTINCT a."clientId" AS client,(a."startTime" AT TIME ZONE ${scope.timezone})::date AS day
        FROM "Appointment" a JOIN "Client" c ON c.id=a."clientId" AND c."businessId"=a."businessId"
        WHERE ${filter} AND a.status='COMPLETED' AND a."startTime">=${window.historyStart} AND a."startTime"<${now}
      ), gaps AS (SELECT client,day-lag(day) OVER(PARTITION BY client ORDER BY day) AS gap FROM visits),
      cadence AS (SELECT client,count(gap) AS n,percentile_cont(.5) WITHIN GROUP(ORDER BY gap) FILTER(WHERE gap>0) AS median FROM gaps GROUP BY client),
      population AS (SELECT count(gap) AS n,count(DISTINCT client) AS clients,percentile_cont(.5) WITHIN GROUP(ORDER BY gap) AS median FROM gaps WHERE gap>0),
      candidates AS (SELECT v.client,max(v.day) AS last_day,
        least(180,greatest(14,ceil(CASE WHEN c.n>=3 THEN c.median*2 WHEN p.n>=${rules.minimumFrequencyGaps} AND p.clients>=${rules.minimumClients} THEN p.median*2 ELSE ${rules.inactivityFallbackDays} END)))::int AS threshold,
        CASE WHEN c.n>=3 THEN 'PERSONAL_CADENCE' WHEN p.n>=${rules.minimumFrequencyGaps} AND p.clients>=${rules.minimumClients} THEN 'BUSINESS_CADENCE' ELSE 'CONFIGURED_FALLBACK' END AS basis
        FROM visits v JOIN cadence c ON c.client=v.client CROSS JOIN population p GROUP BY v.client,c.n,c.median,p.n,p.clients,p.median
      ), eligible AS (SELECT * FROM candidates c WHERE (${window.endKey}::date-c.last_day)>=c.threshold AND NOT EXISTS (
        SELECT 1 FROM "Appointment" f WHERE f."businessId"=${scope.businessId} AND f."clientId"=c.client AND f."startTime">=${now} AND f.status IN ('PENDING','AWAITING_PAYMENT','CONFIRMED','CHECKED_IN')))
      SELECT (SELECT count(*)::int FROM eligible) AS inactive,(SELECT count(*)::int FROM candidates) AS clients,
        coalesce((SELECT min(threshold) FROM eligible),${rules.inactivityFallbackDays})::int AS "thresholdDays",
        coalesce((SELECT CASE WHEN count(DISTINCT basis)>1 THEN 'MIXED_CADENCE' ELSE min(basis) END FROM eligible),'CONFIGURED_FALLBACK') AS basis,
        (SELECT n::int FROM population) AS gaps,coalesce((SELECT md5(string_agg(concat_ws('|',client,last_day,threshold,basis),'' ORDER BY client)) FROM eligible),'empty') AS fingerprint`);
        [retention] = await tx.$queryRaw<
          Retention[]
        >(Prisma.sql`WITH active AS (SELECT a."clientId" AS client,
        bool_or(a."startTime">=${window.start}) AS current,bool_or(a."startTime"<${window.start} AND a."startTime">=${window.previousStart}) AS previous,
        bool_or(a."startTime"<${window.start}) AS historical FROM "Appointment" a JOIN "Client" c ON c.id=a."clientId" AND c."businessId"=a."businessId" WHERE ${filter}
        AND a."startTime"<${window.end} AND a.status='COMPLETED' GROUP BY a."clientId")
        SELECT count(*) FILTER(WHERE current)::int AS "currentClients",count(*) FILTER(WHERE current AND NOT historical)::int AS "newClients",
        count(*) FILTER(WHERE current AND historical)::int AS "repeatClients",count(*) FILTER(WHERE current AND previous)::int AS "retainedClients",count(*) FILTER(WHERE previous)::int AS "previousClients" FROM active`);
      }
      const business = await tx.business.findUniqueOrThrow({
        where: { id: scope.businessId },
        select: {
          createdAt: true,
          businessHours: { orderBy: { dayOfWeek: "asc" } },
          scheduleOverrides: {
            where: { date: overrideDates },
            orderBy: { date: "asc" },
          },
          subscription: { select: { plan: true } },
        },
      });
      const locations = await tx.businessLocation.findMany({
        where: {
          businessId: scope.businessId,
          isActive: true,
          ...(scope.locationId ? { id: scope.locationId } : {}),
        },
        select: {
          id: true,
          timezone: true,
          createdAt: true,
          hours: { orderBy: { dayOfWeek: "asc" } },
          scheduleOverrides: {
            where: { date: overrideDates },
            orderBy: { date: "asc" },
          },
        },
        orderBy: { id: "asc" },
        take: 11,
      });
      if (locations.length > 10) throw new Error("GROWTH_LOCATION_LIMIT");
      const individual = usesBusinessScheduleOnly(business.subscription?.plan);
      const staff = individual
        ? []
        : await tx.staff.findMany({
            where: {
              businessId: scope.businessId,
              isActive: true,
              ...(scope.staffId ? { id: scope.staffId } : {}),
            },
            select: {
              id: true,
              createdAt: true,
              schedule: { orderBy: { dayOfWeek: "asc" } },
              scheduleOverrides: {
                where: { date: overrideDates },
                orderBy: { date: "asc" },
              },
              _count: {
                select: {
                  locations: {
                    where: {
                      isActive: true,
                      location: {
                        businessId: scope.businessId,
                        isActive: true,
                      },
                    },
                  },
                },
              },
              locations: {
                where: {
                  isActive: true,
                  location: { businessId: scope.businessId, isActive: true },
                  ...(scope.locationId ? { locationId: scope.locationId } : {}),
                },
                orderBy: { locationId: "asc" },
                select: {
                  locationId: true,
                  schedule: { orderBy: { dayOfWeek: "asc" } },
                },
              },
            },
            take: 31,
            orderBy: { id: "asc" },
          });
      if (staff.length > 30) throw new Error("GROWTH_STAFF_LIMIT");
      const agendas: CapacityAgenda[] = [];
      const warnings: string[] = [];
      if (scope.staffId && !individual)
        warnings.push("OWN_AGENDA_SHARED_BUSY_UNKNOWN");
      const bases = locations.length
        ? locations
        : [
            {
              id: null,
              timezone: scope.timezone,
              createdAt: business.createdAt,
              hours: business.businessHours,
              scheduleOverrides: business.scheduleOverrides,
            },
          ];
      for (const l of bases) {
        if (individual)
          agendas.push({
            staffId: null,
            locationId: l.id,
            timezone: l.timezone,
            createdAt: l.createdAt,
            hours: l.hours,
            overrides: overrides(l.scheduleOverrides),
          });
        else
          for (const s of staff) {
            const membership = s.locations.find((m) => m.locationId === l.id);
            if (l.id && !membership) continue;
            if (scope.locationId && s._count.locations > 1)
              warnings.push("SHARED_STAFF_BRANCH_CAPACITY_UNCERTAIN");
            agendas.push({
              staffId: s.id,
              locationId: l.id,
              timezone: l.timezone,
              createdAt: s.createdAt,
              hours: l.hours,
              overrides: overrides(l.scheduleOverrides),
              staffHours: membership?.schedule.length
                ? membership.schedule
                : s.schedule,
              staffOverrides: overrides(s.scheduleOverrides),
            });
          }
      }
      const appointments = await tx.$queryRaw<
        { startTime: Date; endTime: Date; staffId: string | null }[]
      >(Prisma.sql`SELECT a."startTime",a."endTime",${individual ? Prisma.sql`NULL::text` : Prisma.sql`a."staffId"`} AS "staffId" FROM "Appointment" a WHERE ${filter}
      AND a."startTime"<${window.end} AND a."endTime">${window.start} AND a.status NOT IN ('CANCELLED','NO_SHOW','AWAITING_PAYMENT') ORDER BY a.id LIMIT 20001`);
      if (appointments.length > 20000) throw new Error("GROWTH_DATA_LIMIT");
      const blocks = await tx.scheduleBlock.findMany({
        where: {
          staff: { businessId: scope.businessId },
          ...(!individual
            ? {
                staffId: {
                  in: agendas.flatMap((a) => (a.staffId ? [a.staffId] : [])),
                },
              }
            : {}),
          startTime: { lt: window.end },
          endTime: { gt: window.start },
          ...(scope.locationId
            ? { OR: [{ locationId: scope.locationId }, { locationId: null }] }
            : {}),
        },
        select: {
          staffId: true,
          locationId: true,
          startTime: true,
          endTime: true,
          type: true,
          releaseAt: true,
        },
        take: 2001,
        orderBy: { id: "asc" },
      });
      if (blocks.length > 2000) throw new Error("GROWTH_BLOCK_LIMIT");
      const blocked = await tx.blockedDate.findMany({
        where: {
          businessId: scope.businessId,
          date: {
            gte: new Date(`${window.startKey}T00:00Z`),
            lt: new Date(`${window.endKey}T00:00Z`),
          },
        },
        select: { date: true },
        orderBy: { date: "asc" },
      });
      const external = await tx.googleCalendarConnection.count({
        where: {
          businessId: scope.businessId,
          syncEnabled: true,
          ...(scope.staffId
            ? { OR: [{ staffId: scope.staffId }, { staffId: null }] }
            : {}),
        },
      });
      if (external) warnings.push("EXTERNAL_CALENDAR_NOT_RECONCILED");
      const occupancy = calculateOccupancy({
        window,
        agendas,
        blockedDates: blocked.map((d) => d.date.toISOString().slice(0, 10)),
        blocks: individual
          ? blocks.map((b) => ({ ...b, staffId: null }))
          : blocks,
        appointments,
        warnings,
      });
      // No customer identity, service name, notes, email, or legacy marketing flag enters evidence.
      return {
        counts,
        services: services.map((s, i) => ({
          ...s,
          service: `Servicio ${i + 1}`,
        })),
        money,
        cohort,
        retention,
        occupancy,
        sourceHash: commercialHash({
          counts: counts.fingerprint,
          cohort: cohort?.fingerprint,
          money: money?.fingerprint,
          agendas,
          blocks,
          blocked,
          external,
          services,
        }),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 20000, maxWait: 10000 },
  );
  const evidence = {
    ruleVersion: GROWTH_RULE_VERSION,
    rules,
    period: {
      start: window.start.toISOString(),
      end: window.end.toISOString(),
      previousStart: window.previousStart.toISOString(),
      timezone: scope.timezone,
      days: window.periodDays,
    },
    counts: {
      current: result.counts.current,
      previous: result.counts.previous,
      cancelled: result.counts.cancelled,
      future: result.counts.future,
    },
    services: result.services,
    cohortHash: result.cohort
      ? commercialHash(result.cohort.fingerprint)
      : null,
    ...(result.money
      ? {
          money: {
            collected: result.money.collected,
            knownCollected: result.money.knownCollected,
            nominal: result.money.nominal,
            estimatedNominalAppointments:
              result.money.estimatedNominalAppointments,
            unknownCollectionAppointments:
              result.money.unknownCollectionAppointments,
            nominalBasis: "STORED_TOTAL_ELSE_CURRENT_SERVICE_PRICE_ESTIMATE",
            currency: scope.currencyCode,
            basis: "RECORDED_FOR_APPOINTMENTS_IN_WINDOW_AS_OF_ANALYSIS",
          },
        }
      : {}),
    ...(result.cohort
      ? {
          cohort: { ...result.cohort, fingerprint: undefined },
          retention: result.retention,
        }
      : {}),
    occupancy: result.occupancy,
    sourceHash: result.sourceHash,
  };
  return {
    evidence: JSON.parse(JSON.stringify(evidence)) as typeof evidence,
    hash: commercialHash(evidence),
    window,
  };
}
export type GrowthEvidence = Awaited<
  ReturnType<typeof collectGrowthEvidence>
>["evidence"];
export function detectGrowthSignals(e: GrowthEvidence): DetectedGrowthSignal[] {
  const signals: DetectedGrowthSignal[] = [];
  const common = {
    period: e.period,
    ruleVersion: e.ruleVersion,
    counts: e.counts,
    ...(e.money?{currency:e.money.currency}:{}),
  };
  if (e.cohort && e.cohort.inactive >= e.rules.minimumClients)
    signals.push({
      kind: "INACTIVE_CLIENTS",
      title: "Clientes que podrían volver",
      confidence: e.cohort.basis === "CONFIGURED_FALLBACK" ? "LOW" : "MEDIUM",
      priority: Math.min(90, 50 + e.cohort.inactive),
      evidence: { ...common, cohort: e.cohort, consent: "NOT_VERIFIED" },
      material: {
        inactive: e.cohort.inactive,
        cohortHash: e.cohortHash,
        ruleVersion: e.ruleVersion,
      },
    });
  if (
    e.occupancy.complete &&
    e.occupancy.percent !== null &&
    e.occupancy.percent < e.rules.lowOccupancyPercent &&
    e.occupancy.availableMinutes >= 300
  )
    signals.push({
      kind: "LOW_OCCUPANCY",
      title: "Capacidad disponible para revisar",
      confidence: "MEDIUM",
      priority: Math.round(85 - e.occupancy.percent),
      evidence: { ...common, occupancy: e.occupancy },
      material: {
        percent: Math.round(e.occupancy.percent / 5) * 5,
        availableMinutes: e.occupancy.availableMinutes,
      },
    });
  const drop = e.counts.previous
    ? ((e.counts.previous - e.counts.current) / e.counts.previous) * 100
    : 0;
  if (
    e.counts.previous >= e.rules.minimumSample &&
    drop >= e.rules.trendDropPercent
  )
    signals.push({
      kind: "DEMAND_DECLINE",
      title: "Menos reservas en un período comparable",
      confidence: e.counts.previous >= 30 ? "HIGH" : "MEDIUM",
      priority: Math.min(95, Math.round(50 + drop / 2)),
      evidence: {
        ...common,
        dropPercent: Math.round(drop),
        causality: "UNKNOWN",
      },
      material: { current: e.counts.current, previous: e.counts.previous },
    });
  const trends = e.services.filter(
    (s) =>
      s.previous >= e.rules.minimumSample &&
      Math.abs(s.current - s.previous) / s.previous >=
        e.rules.trendDropPercent / 100,
  );
  if (trends.length)
    signals.push({
      kind: "SERVICE_TREND",
      title: "Cambios de demanda por servicio",
      confidence: "MEDIUM",
      priority: 55,
      evidence: { ...common, services: trends },
      material: {
        services: trends.map((s) => ({
          service: s.service,
          current: s.current,
          previous: s.previous,
        })),
      },
    });
  return signals.sort(
    (a, b) => b.priority - a.priority || a.kind.localeCompare(b.kind),
  );
}
