import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { prisma } from "@/server/db/prisma";
import { growthFixture, deleteGrowthFixture } from "../fixtures/puri-growth";
import {
  createGrowthScope,
  revalidateGrowthScope,
} from "@/server/puri/growth/access";
import {
  analyzeGrowth,
  expireGrowthRecords,
} from "@/server/puri/growth/analysis";
import {
  collectGrowthEvidence,
  detectGrowthSignals,
} from "@/server/puri/growth/evidence";
import {
  DEFAULT_GROWTH_RULES,
  strategySchema,
} from "@/server/puri/growth/contracts";
import {
  draftGrowthRecommendation,
  prepareGrowthStrategy,
  transitionGrowthRecommendation,
  approvedGrowthHandoff,
} from "@/server/puri/growth/recommendations";
import { purgeExpiredGrowthHistory } from "@/server/puri/growth/retention";
import {
  configureGrowthBudget,
  reserveGrowthUsage,
  settleGrowthUsage,
  budgetKeys,
  recoverAbandonedGrowthUsage,
} from "@/server/puri/growth/budgets";
import { executeGrowthTool } from "@/server/puri/growth/tools";
import {
  answerWithGrowthPuri,
  createGrowthExtension,
} from "@/server/puri/growth/runtime";
import { runGrowthScheduler } from "@/server/puri/growth/proactive";
import { growthPlatformMetrics } from "@/server/puri/growth/monitoring";
import { DASHBOARD_PERMISSIONS as P } from "@/core/permissions";
const suite = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
const fixtures: Awaited<ReturnType<typeof growthFixture>>[] = [];
async function fixture(options: Parameters<typeof growthFixture>[0] = {}) {
  const f = await growthFixture(options);
  fixtures.push(f);
  return f;
}
async function prepared(f: Awaited<ReturnType<typeof fixture>>) {
  const a = await analyzeGrowth(f.scope);
  const s = a.signals.find((s) => s.kind === "INACTIVE_CLIENTS")!;
  const r = await draftGrowthRecommendation(f.scope, s.id);
  return prepareGrowthStrategy(f.scope, r.id, r.contentHash, r.version);
}
suite(
  "Puri+ on isolated PostgreSQL: real evidence, authorization and concurrent writes",
  () => {
    afterEach(() => vi.unstubAllEnvs());
    afterAll(async () => {
      for (const f of fixtures) await deleteGrowthFixture(f);
      await prisma.$disconnect();
    });
    it("detects reproducible inactivity, excludes future booking and never selects legacy consent or personal details", async () => {
      const f = await fixture(),
        a = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES),
        b = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(a.hash).toBe(b.hash);
      expect(a.evidence.cohort).toMatchObject({
        inactive: 5,
        clients: 6,
        basis: "CONFIGURED_FALLBACK",
        thresholdDays: 45,
      });
      expect(JSON.stringify(a)).not.toMatch(
        /PRIVATE_|private-\d|acceptsMarketing|customerEmail|privateNotes/,
      );
      expect(detectGrowthSignals(a.evidence).map((s) => s.kind)).toEqual(
        expect.arrayContaining([
          "INACTIVE_CLIENTS",
          "DEMAND_DECLINE",
          "LOW_OCCUPANCY",
          "SERVICE_TREND",
        ]),
      );
    });
    it("learns personal cadence from distinct completed visit days rather than duplicate appointments", async () => {
      const f = await fixture({ history: false });
      const c = await prisma.client.create({
        data: {
          businessId: f.businessId,
          name: "Synthetic",
          email: `${randomUUID()}@example.invalid`,
        },
      });
      for (const ago of [120, 110, 100, 90])
        await f.appointment(ago, { clientId: c.id });
      await f.appointment(90, {
        clientId: c.id,
        startTime: f.day(90, 11),
        endTime: f.day(90, 12),
      });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.cohort).toMatchObject({
        inactive: 1,
        basis: "PERSONAL_CADENCE",
        thresholdDays: 20,
        gaps: 3,
      });
    });
    it("removes a client who returned today even though the comparison window ends at midnight", async () => {
      const f = await fixture(),
        client = await prisma.client.findFirstOrThrow({
          where: {
            businessId: f.businessId,
            email: "private-0@example.invalid",
          },
        });
      await f.appointment(0, {
        clientId: client.id,
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() - 1800000),
      });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.cohort?.inactive).toBe(4);
      expect(e.evidence.counts.current).toBe(2);
    });
    it("distinguishes recorded collection from nominal booking value, includes settlement, caps payments, excludes cancelled amounts", async () => {
      const f = await fixture();
      const appt = await f.appointment(4, {
        totalPrice: 10000,
        paymentStatus: "APPROVED",
        depositAmount: 2000,
      });
      await prisma.posPayment.create({
        data: {
          businessId: f.businessId,
          appointmentId: appt.id,
          amount: 1000,
          currency: "CLP",
          status: "APPROVED",
          externalReference: randomUUID(),
          idempotencyKey: randomUUID(),
        },
      });
      const capped = await f.appointment(2, { totalPrice: 10000 });
      await prisma.posPayment.create({
        data: {
          businessId: f.businessId,
          appointmentId: capped.id,
          amount: 100000,
          currency: "CLP",
          status: "APPROVED",
          externalReference: randomUUID(),
          idempotencyKey: randomUUID(),
        },
      });
      await prisma.posPayment.create({
        data: {
          businessId: f.businessId,
          appointmentId: appt.id,
          amount: 100000,
          currency: "USD",
          status: "APPROVED",
          externalReference: randomUUID(),
          idempotencyKey: randomUUID(),
        },
      });
      await f.appointment(3, {
        status: "CANCELLED",
        totalPrice: 90000,
        settledAt: f.day(3),
      });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.money).toMatchObject({
        collected: 25500,
        nominal: 40000,
      });
      expect(e.evidence.counts.cancelled).toBe(1);
    });
    it("counts capacity excluding breaks, blocked dates and closed overrides", async () => {
      const f = await fixture();
      await prisma.blockedDate.create({
        data: {
          businessId: f.businessId,
          date: new Date(f.day(5).toISOString().slice(0, 10)),
        },
      });
      await prisma.locationScheduleOverride.create({
        data: {
          locationId: f.location.id,
          date: new Date(f.day(6).toISOString().slice(0, 10)),
          isOpen: false,
        },
      });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.occupancy.availableMinutes).toBe(26 * 420);
      expect(e.evidence.occupancy.occupiedMinutes).toBe(60);
    });
    it("does not substitute the current service price for an unknown historical settlement amount", async () => {
      const f = await fixture({ history: false });
      await f.appointment(2, { totalPrice: null, settledAt: f.day(2) });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.money).toMatchObject({
        collected: null,
        knownCollected: 0,
        nominal: 10000,
        unknownCollectionAppointments: 1,
        estimatedNominalAppointments: 1,
      });
      expect(e.evidence.services[0].collected).toBeNull();
    });
    it("applies all business staff blocks to the single Individual agenda", async () => {
      const f = await fixture({ history: false }),
        staff = await prisma.staff.create({
          data: { businessId: f.businessId, name: "Synthetic sole agenda" },
        });
      await prisma.scheduleBlock.create({
        data: {
          staffId: staff.id,
          startTime: f.day(2, 9),
          endTime: f.day(2, 11),
          type: "UNAVAILABLE",
        },
      });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.occupancy.availableMinutes).toBe(28 * 420 - 120);
    });
    it("unions overlapping appointments and does not add recurring bookings a second time", async () => {
      const f = await fixture({ history: false });
      const first = await f.appointment(2);
      // Explicit historical-import fixture: the current booking trigger correctly prevents new overlaps.
      // Transaction-local replication mode restores automatically and is never used by the analyzer.
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL session_replication_role = replica`;
        await tx.appointment.create({
          data: {
            businessId: f.businessId,
            locationId: f.location.id,
            serviceId: f.service.id,
            customerName: "Synthetic import",
            customerEmail: "synthetic@example.invalid",
            startTime: first.startTime,
            endTime: first.endTime,
            status: "COMPLETED",
          },
        });
      });
      await f.appointment(2, { status: "CANCELLED" });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.occupancy.occupiedMinutes).toBe(60);
      expect(e.evidence.counts.current).toBe(2);
    });
    it("has no invented capacity when no schedule exists", async () => {
      const f = await fixture();
      await prisma.locationHours.deleteMany({
        where: { locationId: f.location.id },
      });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.occupancy).toMatchObject({
        availableMinutes: 0,
        percent: null,
        complete: false,
      });
      expect(
        detectGrowthSignals(e.evidence).some((s) => s.kind === "LOW_OCCUPANCY"),
      ).toBe(false);
    });
    it("unions a shared professional across locations, and labels branch attribution uncertainty", async () => {
      const f = await fixture({ team: true }),
        other = await prisma.businessLocation.create({
          data: {
            businessId: f.businessId,
            name: "Synthetic secondary",
            slug: "secondary",
            timezone: "UTC",
            isActive: true,
            createdAt: f.day(400),
          },
        });
      await prisma.staffLocation.create({
        data: { staffId: f.staff!.id, locationId: other.id },
      });
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++)
        await prisma.locationHours.create({
          data: {
            locationId: other.id,
            dayOfWeek,
            startTime: "09:00",
            endTime: "17:00",
            breakStart: "12:00",
            breakEnd: "13:00",
          },
        });
      const all = await createGrowthScope(f.context, true),
        e = await collectGrowthEvidence(all, DEFAULT_GROWTH_RULES),
        branch = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.occupancy.availableMinutes).toBe(28 * 420);
      expect(branch.evidence.occupancy.warnings).toContain(
        "SHARED_STAFF_BRANCH_CAPACITY_UNCERTAIN",
      );
      expect(branch.evidence.occupancy.complete).toBe(false);
    });
    it("uses staff schedule blocks and released priority blocks without modifying appointments", async () => {
      const f = await fixture({ team: true, history: false });
      const start = f.day(2, 9),
        end = f.day(2, 11);
      await prisma.scheduleBlock.create({
        data: {
          staffId: f.staff!.id,
          startTime: start,
          endTime: end,
          type: "UNAVAILABLE",
        },
      });
      await prisma.scheduleBlock.create({
        data: {
          staffId: f.staff!.id,
          startTime: f.day(3, 9),
          endTime: f.day(3, 11),
          type: "PRIORITY",
          releaseAt: f.day(4, 10),
        },
      });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.occupancy.availableMinutes).toBe(28 * 420 - 120);
      expect(
        await prisma.appointment.count({ where: { businessId: f.businessId } }),
      ).toBe(0);
    });
    it("suppresses actionable capacity when external free/busy is unknown, without reading tokens or network", async () => {
      const f = await fixture();
      await prisma.googleCalendarConnection.create({
        data: {
          businessId: f.businessId,
          userId: f.user.id,
          scope: "BUSINESS",
          scopeKey: "business",
          googleEmail: "private-calendar@example.invalid",
          accessTokenEncrypted: "NEVER_READ_THIS_TOKEN",
        },
      });
      const e = await collectGrowthEvidence(f.scope, DEFAULT_GROWTH_RULES);
      expect(e.evidence.occupancy.warnings).toContain(
        "EXTERNAL_CALENDAR_NOT_RECONCILED",
      );
      expect(JSON.stringify(e)).not.toContain("NEVER_READ");
      expect(
        detectGrowthSignals(e.evidence).some((s) => s.kind === "LOW_OCCUPANCY"),
      ).toBe(false);
    });
    it.each([
      "PURAGENDA",
      "TRIALING",
      "PENDING_PAYMENT",
      "EXPIRED",
      "NO_PAYMENT",
    ])("denies premium data for %s before analysis", async (kind) => {
      const f = await fixture({ history: false });
      await prisma.commercialSubscription.update({
        where: { businessId: f.businessId },
        data:
          kind === "PURAGENDA"
            ? { planCode: "PURAGENDA" }
            : kind === "EXPIRED"
              ? { periodEnd: f.day(1) }
              : kind === "NO_PAYMENT"
                ? { lastPaymentStatus: "PENDING" }
                : { status: kind as "TRIALING" | "PENDING_PAYMENT" },
      });
      await expect(analyzeGrowth(f.scope)).rejects.toThrow(
        "PLUS_ENTITLEMENT_REQUIRED",
      );
      expect(
        await prisma.puriGrowthRun.count({
          where: { businessId: f.businessId },
        }),
      ).toBe(0);
    });
    it("rechecks staff membership, location, own agenda and financial permissions before querying", async () => {
      const f = await fixture({ team: true });
      const staffUser = await prisma.user.create({
        data: {
          name: "Synthetic staff",
          email: `${randomUUID()}@example.invalid`,
          password: "fixture",
          role: "STAFF",
        },
      });
      const profile = await prisma.accessProfile.create({
        data: {
          businessId: f.businessId,
          name: "Scoped fixture",
          permissions: [P.APPOINTMENTS_VIEW_OWN],
        },
      });
      await prisma.staff.update({
        where: { id: f.staff!.id },
        data: { userId: staffUser.id, accessProfileId: profile.id },
      });
      try {
        const scope = await createGrowthScope({
          ...f.context,
          user: staffUser,
          ownAgenda: true,
        });
        expect(scope).toMatchObject({
          canMoney: false,
          canClients: false,
          canPrepare: false,
          staffId: f.staff!.id,
        });
        const e = await collectGrowthEvidence(scope, DEFAULT_GROWTH_RULES);
        expect(e.evidence).not.toHaveProperty("money");
        expect(e.evidence).not.toHaveProperty("cohort");
        await expect(
          executeGrowthTool("get_service_performance", {}, scope),
        ).rejects.toThrow("UNKNOWN_TOOL");
        await expect(
          executeGrowthTool("prepare_contact_flow", {}, scope),
        ).rejects.toThrow("UNKNOWN_TOOL");
        const other = await prisma.businessLocation.create({
          data: {
            businessId: f.businessId,
            name: "Other",
            slug: "other",
            timezone: "UTC",
            isActive: true,
          },
        });
        await expect(
          createGrowthScope({
            ...f.context,
            user: staffUser,
            location: { ...f.context.location!, id: other.id },
          }),
        ).rejects.toThrow("LOCATION_FORBIDDEN");
        await prisma.staff.update({
          where: { id: f.staff!.id },
          data: { isActive: false },
        });
        await expect(revalidateGrowthScope(scope)).rejects.toThrow("FORBIDDEN");
      } finally {
        await prisma.staff.update({
          where: { id: f.staff!.id },
          data: { userId: null },
        });
        await prisma.user.delete({ where: { id: staffUser.id } });
      }
    });
    it("denies cross-business recommendations and forged financial scopes", async () => {
      const f = await fixture(),
        other = await fixture(),
        r = await prepared(f);
      await expect(
        prepareGrowthStrategy(other.scope, r.id, r.contentHash, r.version),
      ).rejects.toThrow();
      await expect(
        revalidateGrowthScope({ ...f.scope, businessId: other.businessId }),
      ).rejects.toThrow("FORBIDDEN");
      await expect(
        revalidateGrowthScope({ ...f.scope, canMoney: false }),
      ).rejects.toThrow("SCOPE_CHANGED");
    });
    it("claims concurrent SQL analyses only once and reuses the persisted cache", async () => {
      const f = await fixture();
      const results = await Promise.all(
        Array.from({ length: 6 }, () => analyzeGrowth(f.scope)),
      );
      expect(results.filter((r) => r.claimed)).toHaveLength(1);
      expect(
        await prisma.puriGrowthRun.count({
          where: { businessId: f.businessId },
        }),
      ).toBe(1);
      const cached = await analyzeGrowth(f.scope);
      expect(cached.cached).toBe(true);
      expect(
        await prisma.puriGrowthSignal.count({
          where: { businessId: f.businessId },
        }),
      ).toBe(4);
    });
    it("recovers a failed analysis using a new bounded SQL attempt", async () => {
      const f = await fixture();
      await configureGrowthBudget({
        businessId: f.businessId,
        category: "ANALYSIS_SQL",
        limitMicros: 0,
        limitUnits: 0,
      });
      await expect(analyzeGrowth(f.scope)).rejects.toThrow("BUDGET_EXHAUSTED");
      await configureGrowthBudget({
        businessId: f.businessId,
        category: "ANALYSIS_SQL",
        limitMicros: 0,
        limitUnits: 10,
      });
      const a = await analyzeGrowth(f.scope);
      expect(a.run).toMatchObject({ status: "COMPLETE", attempts: 2 });
    });
    it("deduplicates drafts and prepares an immutable proposal without any execution path", async () => {
      const f = await fixture(),
        a = await analyzeGrowth(f.scope),
        signal = a.signals.find((s) => s.kind === "INACTIVE_CLIENTS")!;
      const recs = await Promise.all(
        Array.from({ length: 5 }, () =>
          draftGrowthRecommendation(f.scope, signal.id),
        ),
      );
      expect(new Set(recs.map((r) => r.id)).size).toBe(1);
      const r = await prepareGrowthStrategy(
        f.scope,
        recs[0].id,
        recs[0].contentHash,
        1,
      );
      expect(r.strategy).toMatchObject({
        executable: false,
        approvalRequired: true,
        engine: "CONTACT_FLOW_NOT_IMPLEMENTED",
        estimatedAudience: 5,
      });
      await expect(
        prisma.puriGrowthRecommendation.update({
          where: { id: r.id },
          data: { explanation: "changed" },
        }),
      ).rejects.toThrow("IMMUTABLE_GROWTH_PROPOSAL");
      await expect(
        prisma.puriGrowthRecommendation.update({
          where: { id: r.id },
          data: { executable: true },
        }),
      ).rejects.toThrow();
    });
    it("requires explicit review and approval and records only one approval under concurrency", async () => {
      const f = await fixture(),
        r = await prepared(f),
        input = { id: r.id, hash: r.contentHash, version: r.version };
      await expect(
        transitionGrowthRecommendation(f.scope, {
          ...input,
          action: "APPROVE",
          explicit: false,
        }),
      ).rejects.toThrow("EXPLICIT_APPROVAL_REQUIRED");
      await expect(
        transitionGrowthRecommendation(f.scope, {
          ...input,
          action: "APPROVE",
          explicit: true,
        }),
      ).rejects.toThrow("INVALID_RECOMMENDATION_STATE");
      await transitionGrowthRecommendation(f.scope, {
        ...input,
        action: "REVIEW",
      });
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          transitionGrowthRecommendation(f.scope, {
            ...input,
            action: "APPROVE",
            explicit: true,
          }),
        ),
      );
      expect(
        results.every((r) => r.status === "APPROVED" && !r.executable),
      ).toBe(true);
      expect(
        await prisma.puriGrowthAudit.count({
          where: { recommendationId: r.id, event: "APPROVED" },
        }),
      ).toBe(1);
      expect(results[0]).toMatchObject({
        approvedById: f.user.id,
        approvedContentHash: r.contentHash,
      });
      const handoff = await approvedGrowthHandoff(
        f.scope,
        r.id,
        r.contentHash,
        r.version,
      );
      expect(handoff.executable).toBe(false);
      expect(handoff.requiredChecks).toContain("FRESH_RECIPIENT_CONSENT");
    });
    it("invalidates changed evidence even when aggregate appointment counts remain unchanged", async () => {
      const f = await fixture(),
        r = await prepared(f);
      const a = await prisma.appointment.findFirstOrThrow({
        where: { businessId: f.businessId, status: "COMPLETED" },
      });
      await prisma.appointment.update({
        where: { id: a.id },
        data: { endTime: new Date(+a.endTime + 60000) },
      });
      await expect(
        transitionGrowthRecommendation(f.scope, {
          id: r.id,
          hash: r.contentHash,
          version: r.version,
          action: "REVIEW",
        }),
      ).rejects.toThrow("EVIDENCE_CHANGED");
      expect(
        (
          await prisma.puriGrowthRecommendation.findUniqueOrThrow({
            where: { id: r.id },
          })
        ).status,
      ).toBe("STALE");
    });
    it("rejects wrong content versions and suppresses rejected evidence across repeated detection", async () => {
      const f = await fixture(),
        r = await prepared(f);
      await expect(
        transitionGrowthRecommendation(f.scope, {
          id: r.id,
          hash: r.contentHash,
          version: 99,
          action: "REJECT",
        }),
      ).rejects.toThrow("CONTENT_CHANGED");
      await transitionGrowthRecommendation(f.scope, {
        id: r.id,
        hash: r.contentHash,
        version: r.version,
        action: "REJECT",
      });
      await analyzeGrowth(f.scope, { fresh: true });
      const paid = await prisma.appointment.findFirstOrThrow({
        where: { businessId: f.businessId, totalPrice: 10000, settledAt: null },
      });
      await prisma.posPayment.create({
        data: {
          businessId: f.businessId,
          appointmentId: paid.id,
          amount: 100,
          currency: "CLP",
          status: "APPROVED",
          externalReference: randomUUID(),
          idempotencyKey: randomUUID(),
        },
      });
      await analyzeGrowth(f.scope, { fresh: true });
      expect(
        await prisma.puriGrowthSignal.count({
          where: { businessId: f.businessId, kind: "INACTIVE_CLIENTS" },
        }),
      ).toBe(1);
      expect(
        await prisma.puriGrowthRecommendation.count({
          where: { businessId: f.businessId },
        }),
      ).toBe(1);
      expect(
        (
          await prisma.puriGrowthSignal.findUniqueOrThrow({
            where: { id: r.signalId },
          })
        ).status,
      ).toBe("SUPPRESSED");
    });
    it("expires findings without erasing immutable evidence or approval audit", async () => {
      const f = await fixture(),
        r = await prepared(f),
        future = new Date(Date.now() + 8 * 86400000);
      const counts = await expireGrowthRecords(f.scope, future);
      expect(counts.recommendations).toBe(1);
      await expect(
        transitionGrowthRecommendation(
          f.scope,
          {
            id: r.id,
            hash: r.contentHash,
            version: r.version,
            action: "APPROVE",
            explicit: true,
          },
          future,
        ),
      ).rejects.toThrow("RECOMMENDATION_EXPIRED");
    });
    it("purges expired aggregate drafts in bounded local batches while preserving approved proposals and their audit", async () => {
      const f = await fixture(),
        approved = await prepared(f),
        input = {
          id: approved.id,
          hash: approved.contentHash,
          version: approved.version,
        };
      await transitionGrowthRecommendation(f.scope, {
        ...input,
        action: "REVIEW",
      });
      await transitionGrowthRecommendation(f.scope, {
        ...input,
        action: "APPROVE",
        explicit: true,
      });
      const signal = await prisma.puriGrowthSignal.findFirstOrThrow({
        where: { businessId: f.businessId, kind: "DEMAND_DECLINE" },
      });
      const draft = await draftGrowthRecommendation(f.scope, signal.id);
      const future = new Date(Date.now() + 120 * 86400000);
      await prisma.commercialSubscription.update({
        where: { businessId: f.businessId },
        data: { periodEnd: new Date(+future + 86400000) },
      });
      const purged = await purgeExpiredGrowthHistory(
        f.scope,
        { aggregateDays: 90, approvedDays: 365, batchSize: 10 },
        future,
      );
      expect(purged.recommendations).toBe(1);
      expect(
        await prisma.puriGrowthRecommendation.findUnique({
          where: { id: draft.id },
        }),
      ).toBeNull();
      expect(
        await prisma.puriGrowthRecommendation.findUnique({
          where: { id: approved.id },
        }),
      ).not.toBeNull();
      expect(
        await prisma.puriGrowthAudit.count({
          where: { recommendationId: approved.id, event: "APPROVED" },
        }),
      ).toBe(1);
    });
    it("enforces atomic category and business reservations under concurrent workers", async () => {
      const f = await fixture({ history: false });
      await configureGrowthBudget({
        businessId: f.businessId,
        category: "PLUS_INTERACTIVE",
        limitMicros: 100,
        limitUnits: 3,
      });
      const results = await Promise.allSettled(
        Array.from({ length: 12 }, (_, i) =>
          reserveGrowthUsage({
            businessId: f.businessId,
            category: "PLUS_INTERACTIVE",
            key: `concurrent:${f.businessId}:${i}`,
            inputHash: "same",
            micros: 30,
          }),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
      const b = await prisma.puriBudgetBucket.findUniqueOrThrow({
        where: { key: budgetKeys(f.businessId, "PLUS_INTERACTIVE").keys[2] },
      });
      expect(b).toMatchObject({
        reservedMicros: 90,
        reservedUnits: 3,
        alertLevel: 100,
      });
      expect(
        await prisma.puriGrowthAudit.count({
          where: {
            businessId: f.businessId,
            event: { in: ["BUDGET_50", "BUDGET_80", "BUDGET_100"] },
          },
        }),
      ).toBe(3);
    });
    it("deduplicates identical reservations and rejects conflicting retries without releasing consumed units", async () => {
      const f = await fixture({ history: false }),
        input = {
          businessId: f.businessId,
          category: "PLUS_INTERACTIVE" as const,
          key: randomUUID(),
          inputHash: "v1",
          micros: 100,
        };
      const a = await reserveGrowthUsage(input),
        b = await reserveGrowthUsage(input);
      expect(b.duplicate).toBe(true);
      expect(b.reservation.id).toBe(a.reservation.id);
      await expect(
        reserveGrowthUsage({ ...input, inputHash: "v2" }),
      ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
      await settleGrowthUsage(a.reservation.id, { actualMicros: 40 });
      await settleGrowthUsage(a.reservation.id, { actualMicros: 30 });
      const bucket = await prisma.puriBudgetBucket.findUniqueOrThrow({
        where: { key: budgetKeys(f.businessId, "PLUS_INTERACTIVE").keys[2] },
      });
      expect(bucket).toMatchObject({
        reservedMicros: 0,
        spentMicros: 40,
        spentUnits: 1,
      });
    });
    it("shares a single business ceiling across independent processing categories", async () => {
      const f = await fixture({ history: false });
      await configureGrowthBudget({
        businessId: f.businessId,
        category: "ALL",
        limitMicros: 100,
        limitUnits: 2,
      });
      const results = await Promise.allSettled(
        Array.from({ length: 8 }, (_, i) =>
          reserveGrowthUsage({
            businessId: f.businessId,
            category: i % 2 ? "ANALYSIS_SQL" : "PLUS_INTERACTIVE",
            key: randomUUID(),
            inputHash: "fixture",
            micros: 0,
          }),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    });
    it("enforces the global ceiling atomically across separate businesses", async () => {
      const a = await fixture({ history: false }),
        b = await fixture({ history: false }),
        key = budgetKeys(a.businessId, "PLUS_INTERACTIVE").keys[0];
      const global = await prisma.puriBudgetBucket.findUniqueOrThrow({
        where: { key },
      });
      await configureGrowthBudget({
        businessId: null,
        category: "ALL",
        limitMicros: 1000000,
        limitUnits: global.spentUnits + global.reservedUnits + 2,
      });
      try {
        const results = await Promise.allSettled(
          Array.from({ length: 10 }, (_, i) =>
            reserveGrowthUsage({
              businessId: i % 2 ? a.businessId : b.businessId,
              category: "PLUS_INTERACTIVE",
              key: randomUUID(),
              inputHash: "fixture",
              micros: 0,
            }),
          ),
        );
        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
      } finally {
        await configureGrowthBudget({
          businessId: null,
          category: "ALL",
          limitMicros: 1000000,
          limitUnits: 10000,
        });
      }
    });
    it("recovers an expired worker lease with a new fencing token", async () => {
      const f = await fixture(),
        a = await analyzeGrowth(f.scope);
      await prisma.puriGrowthRun.update({
        where: { id: a.run.id },
        data: {
          status: "RUNNING",
          leaseToken: "dead-worker",
          leaseUntil: new Date(Date.now() - 1000),
          completedAt: null,
        },
      });
      const recovered = await analyzeGrowth(f.scope);
      expect(recovered.run).toMatchObject({ status: "COMPLETE", attempts: 2 });
      expect(recovered.run.leaseToken).not.toBe("dead-worker");
    });
    it("binds exact cadence rules and all unique exclusions to the prepared proposal", async () => {
      const f = await fixture(),
        r = await prepared(f),
        s = strategySchema.parse(r.strategy);
      expect(s.cohort.rules).toEqual(DEFAULT_GROWTH_RULES);
      expect(s.cohort.ruleVersion).toBe("growth-v1");
      expect(
        strategySchema.safeParse({
          ...s,
          exclusionRules: Array(5).fill("NO_VERIFIED_CONSENT"),
        }).success,
      ).toBe(false);
      expect(strategySchema.safeParse({ ...s, executable: true }).success).toBe(
        false,
      );
      await transitionGrowthRecommendation(f.scope, {
        id: r.id,
        hash: r.contentHash,
        version: r.version,
        action: "VIEW",
      });
      await transitionGrowthRecommendation(f.scope, {
        id: r.id,
        hash: r.contentHash,
        version: r.version,
        action: "VIEW",
      });
      expect(
        await prisma.puriGrowthAudit.count({
          where: { recommendationId: r.id, event: "VIEWED" },
        }),
      ).toBe(1);
    });
    it("retains maximum commitment after unknown usage and fences subsequent AI spend", async () => {
      const f = await fixture({ history: false }),
        month = new Date(
          Date.UTC(f.now.getUTCFullYear(), f.now.getUTCMonth() + 1, 1),
        );
      await configureGrowthBudget({
        businessId: null,
        category: "ALL",
        limitMicros: 1000,
        limitUnits: 10,
        now: month,
      });
      for (const category of ["ALL", "PLUS_INTERACTIVE"] as const)
        await configureGrowthBudget({
          businessId: f.businessId,
          category,
          limitMicros: 1000,
          limitUnits: 10,
          now: month,
        });
      const r = await reserveGrowthUsage({
        businessId: f.businessId,
        category: "PLUS_INTERACTIVE",
        key: randomUUID(),
        inputHash: "v1",
        micros: 100,
        now: month,
      });
      const settled = await settleGrowthUsage(r.reservation.id, {
        actualMicros: null,
        errorCode: "TIMEOUT",
      });
      expect(settled).toMatchObject({ state: "UNKNOWN", actualMicros: null });
      await expect(
        reserveGrowthUsage({
          businessId: f.businessId,
          category: "PLUS_INTERACTIVE",
          key: randomUUID(),
          inputHash: "v2",
          micros: 1,
          now: month,
        }),
      ).rejects.toThrow("UNKNOWN_COST_UNRECONCILED");
      // SQL is separately controlled and still usable without network spend.
      expect((await analyzeGrowth(f.scope)).run.status).toBe("COMPLETE");
    });
    it("uses the same Puri orchestrator with deterministic fallback when AI is disabled", async () => {
      const f = await fixture(),
        transport = vi.fn();
      const result = await answerWithGrowthPuri(
        f.context,
        f.scope,
        "Explícame la oportunidad",
        { transport },
      );
      expect(result.fallback).toBe(true);
      expect(result.answer.message).toMatch(/clientes|reservas|minutos/);
      expect(transport).not.toHaveBeenCalled();
      const telemetry = await prisma.puriRequest.findFirstOrThrow({
        where: { businessId: f.businessId },
      });
      expect(telemetry.capabilityTier).toBe("PURI_PLUS_PREPARE");
      expect(telemetry.estimatedCostUsd).toBeNull();
    });
    it("does not contact the model when the exact model price is unknown", async () => {
      const f = await fixture();
      vi.stubEnv("PURI_PLUS_AI_ENABLED", "1");
      vi.stubEnv("PURI_MODEL_PRICES_USD_PER_MILLION", "{}");
      const transport = vi.fn();
      const result = await answerWithGrowthPuri(f.context, f.scope, "Analiza", {
        transport,
      });
      expect(result.errorCode).toBe("MODEL_PRICE_UNKNOWN");
      expect(transport).not.toHaveBeenCalled();
    });
    it("persists an AI explanation through the shared orchestrator using returned usage and configured fixture prices", async () => {
      const f = await fixture(),
        a = await analyzeGrowth(f.scope),
        r = await draftGrowthRecommendation(
          f.scope,
          a.signals.find((s) => s.kind === "INACTIVE_CLIENTS")!.id,
        );
      vi.stubEnv("PURI_PLUS_AI_ENABLED", "1");
      vi.stubEnv(
        "PURI_MODEL_PRICES_USD_PER_MILLION",
        JSON.stringify({
          "gpt-6-luna": { input: 1, output: 1, cachedInput: 0.5 },
        }),
      );
      const transport = vi
        .fn()
        .mockResolvedValueOnce({
          model: "gpt-6-luna",
          usage: {
            input_tokens: 100,
            output_tokens: 20,
            input_tokens_details: { cached_tokens: 0 },
          },
          output: [
            {
              type: "function_call",
              name: "get_growth_recommendations",
              arguments: "{}",
              call_id: "read",
            },
          ],
        })
        .mockResolvedValueOnce({
          model: "gpt-6-luna",
          usage: {
            input_tokens: 200,
            output_tokens: 30,
            input_tokens_details: { cached_tokens: 50 },
          },
          output: [],
          output_text:
            '{"message":"Hay cinco clientes sin próxima reserva. Podemos revisar una propuesta gradual, con consentimiento por verificar."}',
        });
      const result = await answerWithGrowthPuri(f.context, f.scope, "Explica", {
        recommendationId: r.id,
        transport,
      });
      expect(result).toMatchObject({
        fallback: false,
        costKnown: true,
        costMicros: 325,
      });
      expect(
        await prisma.puriGrowthRecommendation.findUniqueOrThrow({
          where: { id: r.id },
        }),
      ).toMatchObject({
        generation: "AI_EXPLANATION",
        inputTokens: 300,
        outputTokens: 50,
        cachedTokens: 50,
        costMicros: 325,
        costKnown: true,
      });
      expect(JSON.stringify(transport.mock.calls)).not.toMatch(
        /PRIVATE_|private-customer|privateNotes|acceptsMarketing/,
      );
    });
    it("keeps the SQL explanation when the model returns invalid structured output and still records consumed tokens", async () => {
      const f = await fixture();
      vi.stubEnv("PURI_PLUS_AI_ENABLED", "1");
      vi.stubEnv(
        "PURI_MODEL_PRICES_USD_PER_MILLION",
        JSON.stringify({ "gpt-6-luna": { input: 1, output: 1 } }),
      );
      const usage = {
        input_tokens: 100,
        output_tokens: 20,
        input_tokens_details: { cached_tokens: 0 },
      };
      const transport = vi
        .fn()
        .mockResolvedValueOnce({
          model: "gpt-6-luna",
          usage,
          output: [
            {
              type: "function_call",
              name: "get_growth_signals",
              arguments: "{}",
              call_id: "read",
            },
          ],
        })
        .mockResolvedValueOnce({
          model: "gpt-6-luna",
          usage,
          output: [],
          output_text: "not json",
        });
      const result = await answerWithGrowthPuri(f.context, f.scope, "Analiza", {
        transport,
      });
      expect(result).toMatchObject({
        fallback: true,
        errorCode: "INVALID_MODEL_RESULT",
        costKnown: true,
        costMicros: 240,
      });
      expect(result.answer.message).not.toBe("not json");
    });
    it("falls back to persisted SQL evidence when the AI category budget is exhausted", async () => {
      const f = await fixture();
      vi.stubEnv("PURI_PLUS_AI_ENABLED", "1");
      vi.stubEnv(
        "PURI_MODEL_PRICES_USD_PER_MILLION",
        JSON.stringify({ "gpt-6-luna": { input: 1, output: 1 } }),
      );
      await configureGrowthBudget({
        businessId: f.businessId,
        category: "PLUS_INTERACTIVE",
        limitMicros: 0,
        limitUnits: 10,
      });
      const transport = vi.fn();
      const result = await answerWithGrowthPuri(f.context, f.scope, "Analiza", {
        transport,
      });
      expect(result).toMatchObject({
        fallback: true,
        errorCode: "BUDGET_EXHAUSTED",
      });
      expect(transport).not.toHaveBeenCalled();
      expect(
        await prisma.puriGrowthAudit.count({
          where: { businessId: f.businessId, event: "BUDGET_DENIED" },
        }),
      ).toBe(1);
    });
    it("does not present missing model usage as zero cost or retry it automatically", async () => {
      const f = await fixture();
      vi.stubEnv("PURI_PLUS_AI_ENABLED", "1");
      vi.stubEnv(
        "PURI_MODEL_PRICES_USD_PER_MILLION",
        JSON.stringify({ "gpt-6-luna": { input: 1, output: 1 } }),
      );
      const transport = vi.fn().mockResolvedValue({
        output: [],
        output_text: '{"message":"unverified"}',
        model: "gpt-6-luna",
      });
      const result = await answerWithGrowthPuri(f.context, f.scope, "Analiza", {
        transport,
      });
      expect(result.costKnown).toBe(false);
      expect(result.costMicros).toBeNull();
      expect(transport).toHaveBeenCalledTimes(1);
      expect(
        await prisma.puriUsageReservation.count({
          where: {
            businessId: f.businessId,
            state: "UNKNOWN",
            actualMicros: null,
          },
        }),
      ).toBe(1);
    });
    it("does not retry ambiguous AI outcomes and records the unknown reservation", async () => {
      const f = await fixture();
      vi.stubEnv("PURI_PLUS_AI_ENABLED", "1");
      vi.stubEnv(
        "PURI_MODEL_PRICES_USD_PER_MILLION",
        JSON.stringify({ "gpt-6-luna": { input: 1, output: 1 } }),
      );
      const transport = vi.fn().mockRejectedValue(new Error("fixture timeout"));
      const result = await answerWithGrowthPuri(f.context, f.scope, "Analiza", {
        transport,
      });
      expect(result.fallback).toBe(true);
      expect(transport).toHaveBeenCalledTimes(1);
      expect(
        await prisma.puriUsageReservation.count({
          where: { businessId: f.businessId, state: "UNKNOWN" },
        }),
      ).toBe(1);
    });
    it("prepares proactive batches but refuses them unless the separate local flag is enabled", async () => {
      const f = await fixture();
      await prisma.puriGrowthPolicy.create({
        data: {
          businessId: f.businessId,
          proactiveEnabled: true,
          rules: DEFAULT_GROWTH_RULES,
          everyHours: 24,
        },
      });
      await expect(runGrowthScheduler()).rejects.toThrow("PROACTIVE_DISABLED");
      vi.stubEnv("PURI_PLUS_PROACTIVE_ENABLED", "1");
      const first = await runGrowthScheduler({ limit: 1 });
      expect(first.processed).toBe(1);
      const again = await runGrowthScheduler({ limit: 1 });
      expect(again.skipped).toBe(1);
      expect(
        await prisma.puriUsageReservation.count({
          where: { businessId: f.businessId, category: "PROACTIVE_SQL" },
        }),
      ).toBe(1);
      expect(
        await prisma.puriUsageReservation.count({
          where: { businessId: f.businessId, category: "RECOMMENDATION" },
        }),
      ).toBe(0);
    });
    it("deduplicates concurrent proactive runs and preserves a cursor within the business", async () => {
      const f = await fixture();
      await prisma.puriGrowthPolicy.create({
        data: {
          businessId: f.businessId,
          proactiveEnabled: true,
          rules: DEFAULT_GROWTH_RULES,
          everyHours: 24,
        },
      });
      vi.stubEnv("PURI_PLUS_PROACTIVE_ENABLED", "1");
      await Promise.all([
        runGrowthScheduler({ after: f.businessId + ":", limit: 1 }),
        runGrowthScheduler({ after: f.businessId + ":", limit: 1 }),
      ]);
      expect(
        await prisma.puriUsageReservation.count({
          where: { businessId: f.businessId, category: "PROACTIVE_SQL" },
        }),
      ).toBe(1);
      expect(
        await prisma.puriGrowthRun.count({
          where: { businessId: f.businessId, status: "COMPLETE" },
        }),
      ).toBe(1);
    });
    it("records a proactive cache reuse so the configured frequency still applies", async () => {
      const f = await fixture();
      await analyzeGrowth(f.scope);
      await prisma.puriGrowthPolicy.create({
        data: {
          businessId: f.businessId,
          proactiveEnabled: true,
          rules: DEFAULT_GROWTH_RULES,
          everyHours: 24,
        },
      });
      vi.stubEnv("PURI_PLUS_PROACTIVE_ENABLED", "1");
      const first = await runGrowthScheduler({
          after: f.businessId + ":",
          limit: 1,
        }),
        second = await runGrowthScheduler({
          after: f.businessId + ":",
          limit: 1,
        });
      expect(first.cached).toBe(1);
      expect(second.skipped).toBe(1);
      expect(
        await prisma.puriUsageReservation.count({
          where: { businessId: f.businessId, category: "PROACTIVE_SQL" },
        }),
      ).toBe(0);
    });
    it("settles abandoned SQL reservations without replaying network operations", async () => {
      const f = await fixture({ history: false }),
        r = await reserveGrowthUsage({
          businessId: f.businessId,
          category: "ANALYSIS_SQL",
          key: randomUUID(),
          inputHash: "fixture",
          micros: 0,
        });
      await prisma.puriUsageReservation.update({
        where: { id: r.reservation.id },
        data: { createdAt: new Date(Date.now() - 180000) },
      });
      await recoverAbandonedGrowthUsage();
      expect(
        await prisma.puriUsageReservation.findUniqueOrThrow({
          where: { id: r.reservation.id },
        }),
      ).toMatchObject({
        state: "SETTLED",
        actualMicros: 0,
        errorCode: "WORKER_OUTCOME_UNKNOWN",
      });
    });
    it("exposes only aggregate platform monitoring to a real Superadmin", async () => {
      const f = await fixture();
      await expect(growthPlatformMetrics(f.user.id)).rejects.toThrow(
        "SUPERADMIN_REQUIRED",
      );
      await prisma.user.update({
        where: { id: f.user.id },
        data: { isSuperAdmin: true },
      });
      const metrics = await growthPlatformMetrics(f.user.id);
      expect(metrics.attribution).toBe("NOT_IMPLEMENTED");
      expect(JSON.stringify(metrics)).not.toMatch(
        /PRIVATE_|example.invalid|Synthetic/,
      );
    });
    it("enforces RLS, revoked public grants and cross-tenant foreign keys in PostgreSQL", async () => {
      const f = await fixture(),
        other = await fixture(),
        r = await prepared(f);
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      try {
        await pool.query("SET ROLE authenticated");
        await expect(
          pool.query('SELECT * FROM "PuriGrowthRecommendation"'),
        ).rejects.toThrow(/permission denied/i);
        await pool.query("RESET ROLE");
        const rows = await pool.query(
          "SELECT relrowsecurity FROM pg_class WHERE relkind='r' AND (relname LIKE 'PuriGrowth%' OR relname IN ('PuriBudgetBucket','PuriUsageReservation'))",
        );
        expect(rows.rows).toHaveLength(7);
        expect(rows.rows.every((r) => r.relrowsecurity)).toBe(true);
      } finally {
        await pool.end();
      }
      await expect(
        prisma.puriGrowthAudit.create({
          data: {
            businessId: other.businessId,
            scopeKey: r.scopeKey,
            recommendationId: r.id,
            event: "FORGED",
            dedupeKey: randomUUID(),
          },
        }),
      ).rejects.toThrow();
    });
    it("keeps an extension transport closed when passed unknown or sensitive tools", async () => {
      const f = await fixture();
      const ext = createGrowthExtension(f.scope);
      await expect(ext.execute("send_email", {})).rejects.toThrow(
        "UNKNOWN_TOOL",
      );
      await expect(
        ext.execute("getClientSummary", { clientId: "injection" }),
      ).rejects.toThrow("UNKNOWN_TOOL");
      await expect(
        ext.execute("get_growth_signals", { businessId: "other" }),
      ).rejects.toThrow();
    });
  },
);
