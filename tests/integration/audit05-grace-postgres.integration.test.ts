import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { paid, expand, businesses, users } from "../fixtures/audit05-billing";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { invoiceFor } from "../fixtures/audit05-billing";
import { reconcileMpV2Invoice, cancelMpV2Renewal } from "@/server/commercial-billing/mercadopago-v2";
import { refreshMpV2Dunning } from "@/server/commercial-billing/mercadopago-v2-dunning";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { resolveWebsiteCommercialAccess } from "@/server/websites/commercial-access";
import { commercialUsageContext } from "@/server/services/commercial-usage-policy";
import { getStaffLimitInfo } from "@/server/services/staff-capacity.service";
import { materializeCommercialEntitlements } from "@/server/services/commercial-subscription-v2.service";
import { createGrowthScope } from "@/server/puri/growth/access";
import type { PuriContext } from "@/server/puri/types";
import { getCommercialEntitlementShadow } from "@/server/services/commercial-entitlements.service";
import { getCommercialDiagnostics } from "@/server/services/commercial-observability.service";

describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL)("Audit05 worker-independent grace corrections", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  afterAll(async () => {
    await prisma.business.deleteMany({ where: { id: { in: businesses } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });
  it("05-B grants the paid-boundary grace before any worker or new webhook", async () => {
    const f = await paid(), sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
    const now = new Date(+sub.periodEnd! + 60_000);
    const access = await getCommercialPlanAccess(f.business.id, now);
    expect(access.allowed).toBe(true);
  });
  for (const cycle of ["MONTHLY", "ANNUAL"] as const) for (const worker of [false, true]) {
    it.each([-1, 0, 60000, 24 * 3600000, 48 * 3600000 - 1, 48 * 3600000, 49 * 3600000])(`05-B ${cycle} worker=${worker} offset=%i: access, projections and capabilities agree`, async offset => {
      const f = await paid(cycle); await expand(f, "PURAGENDA_PLUS", 5);
      const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
      const now = new Date(+sub.periodEnd! + offset), allowed = offset < 48 * 3600000;
      vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now);
      if (worker) await Promise.all([refreshMpV2Dunning(f.business.id, now), refreshMpV2Dunning(f.business.id, now)]);
      vi.mocked(f.port.account).mockClear(); vi.mocked(f.port.subscription).mockClear();
      const before = await prisma.commercialEvent.count({ where: { businessId: f.business.id } });
      for (let i = 0; i < 2; i++) {
        const access = await getCommercialPlanAccess(f.business.id, now);
        expect(access.allowed).toBe(allowed); expect(access.has("contact_flow")).toBe(allowed); expect(access.has("puri.plus")).toBe(allowed);
        expect((await resolveWebsiteCommercialAccess(f.business.id, now)).hosting).toBe(allowed);
        expect((await getCommercialEntitlementShadow(f.business.id, prisma, now)).commercialAccess).toBe(allowed);
        expect((await getCommercialDiagnostics(f.business.id, now)).mismatches).toEqual([]);
        expect((await getStaffLimitInfo(f.business.id)).maxAllowed).toBe(allowed ? 5 : 0);
        const projection = await prisma.subscription.findUniqueOrThrow({ where: { businessId: f.business.id } });
        expect(hasOperationalSubscriptionAccess(projection, now)).toBe(allowed);
        const usage = commercialUsageContext(f.business.id, now);
        if (allowed) await expect(usage).resolves.toMatchObject({ sub: { id: sub.id } });
        else await expect(usage).rejects.toThrow("COMMERCIAL_ACCESS_REQUIRED");
      }
      expect(await prisma.commercialEvent.count({ where: { businessId: f.business.id } })).toBe(before);
      expect(f.port.account).not.toHaveBeenCalled(); expect(f.port.subscription).not.toHaveBeenCalled();
      if (!worker) expect((await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: sub.id } })).gracePeriodEndsAt).toBeNull();
      await materializeCommercialEntitlements(prisma, sub, now);
      const entitlement = await prisma.commercialEntitlement.findFirst({ where: { subscriptionId: sub.id, capability: "puri.plus", status: "ACTIVE" } });
      expect(!!entitlement).toBe(allowed);
      if (allowed && offset >= 0) expect(+entitlement!.validTo!).toBe(+sub.periodEnd! + 48 * 3600000);
    });
  }
  it.each(["REQUESTED", "UNKNOWN", "CANCELLED_VERIFIED", "refunded", "charged_back", "unpaid"])("05-B %s never receives a courtesy window before the worker", async state => {
    const f = await paid(), sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
    const now = new Date(+sub.periodEnd! + 60000);
    if (["refunded", "charged_back"].includes(state)) {
      Object.assign(f.payments.get(f.invoice.payment.id)!, { status: state, date_last_updated: now });
      await reconcileMpV2Invoice(f.invoice, f.provider, now);
    } else {
      const changed = await prisma.commercialSubscription.update({ where: { id: sub.id }, data: state === "unpaid" ? { lastPaymentStatus: null, lastPaymentAt: null, lastPaymentEventId: null } : { renewalCancellationStatus: state, ...(state === "CANCELLED_VERIFIED" ? { renewalCancelledAt: now, renewalAt: null } : {}) } });
      await materializeCommercialEntitlements(prisma, changed, now);
    }
    await refreshMpV2Dunning(f.business.id, now);
    expect((await getCommercialPlanAccess(f.business.id, now)).allowed).toBe(false);
    expect(hasOperationalSubscriptionAccess(await prisma.subscription.findUniqueOrThrow({ where: { businessId: f.business.id } }), now)).toBe(false);
  });
  it("05-B Puri's restricted subscription selector retains grace provenance", async () => {
    const f = await paid(); await expand(f, "PURAGENDA_PLUS", 1);
    const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } }), now = new Date(+sub.periodEnd! + 60000);
    const context: PuriContext = { user: f.user, business: f.business, permissions: [], staffId: null, canSeeAllAgendas: true, ownAgenda: false, location: null, locationCount: 0, locale: "es", pathname: "/dashboard", selectedPeriod: "month" };
    await expect(createGrowthScope(context, false, now)).resolves.toMatchObject({ businessId: f.business.id });
    await expect(createGrowthScope(context, false, new Date(+sub.periodEnd! + 48 * 3600000))).rejects.toThrow("PLUS_ENTITLEMENT_REQUIRED");
  });
  it("05-B an uncertain cancellation withdraws the projected grace atomically", async () => {
    const f = await paid(), sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(+sub.periodEnd! + 60000));
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(true);
    f.port.update = async () => { throw new Error("synthetic provider outage"); };
    await cancelMpV2Renewal(f.business.id, f.user.id, f.provider);
    expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
    expect(hasOperationalSubscriptionAccess(await prisma.subscription.findUniqueOrThrow({ where: { businessId: f.business.id } }))).toBe(false);
    expect(await prisma.commercialBillingOperation.findFirst({ where: { businessId: f.business.id, kind: "CANCEL_RENEWAL" } })).toMatchObject({ status: "UNKNOWN" });
  });
  it.each([false, true])("05-B approved renewal recovers after grace expiry, worker=%s", async worker => {
    const f = await paid(), sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
    const now = new Date(+sub.periodEnd! + 49 * 3600000);
    if (worker) await refreshMpV2Dunning(f.business.id, now);
    expect((await getCommercialPlanAccess(f.business.id, now)).allowed).toBe(false);
    const invoice = invoiceFor(f, f.root, sub.periodEnd!);
    await Promise.all([reconcileMpV2Invoice(invoice, f.provider, now), reconcileMpV2Invoice(invoice, f.provider, now)]);
    expect((await getCommercialPlanAccess(f.business.id, now)).allowed).toBe(true);
    const recovered = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: sub.id } });
    expect(recovered).toMatchObject({ status: "ACTIVE", lastPaymentStatus: "CONFIRMED", gracePeriodEndsAt: null, periodStart: sub.periodEnd });
    expect(await prisma.commercialPaymentEvidence.count({ where: { businessId: f.business.id } })).toBe(2);
  });
});
