import { createHmac, randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/server/db/prisma";
import { paid, expand, businesses, users } from "../fixtures/audit05-billing";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { invoiceFor } from "../fixtures/audit05-billing";
import { reconcileMpV2Invoice, reconcileMpV2Operation, handleMpV2Webhook } from "@/server/commercial-billing/mercadopago-v2";

describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL)("Audit05 paid expansion corrections", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  afterAll(async () => {
    await prisma.business.deleteMany({ where: { id: { in: businesses } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });
  it("05-A preserves the first paid expansion when only the second is refunded", async () => {
    const f = await paid();
    await expand(f, "PURAGENDA_PLUS", 1);
    const second = await expand(f, "PURAGENDA_PLUS", 5);
    const updates = vi.mocked(f.port.update).mock.calls.length;
    Object.assign(second.payment, { status: "refunded", date_last_updated: new Date() });
    await reconcileMpV2Operation(f.business.id, second.op.id, f.provider);
    const access = await getCommercialPlanAccess(f.business.id);
    expect(access.allowed).toBe(true);
    expect(access.has("puri.plus")).toBe(true);
    expect(access.professionalTotal).toBe(1);
    expect(vi.mocked(f.port.update).mock.calls).toHaveLength(updates);
  });
  it("05-A signed duplicate and delayed webhooks reconstruct multiple paid expansions", async () => {
    const f = await paid(), first = await expand(f, "PURAGENDA_PLUS", 1), second = await expand(f, "PURAGENDA_PLUS", 5);
    Object.assign(second.payment, { status: "refunded", date_last_updated: new Date() });
    const notify = (id: string) => {
      const ts = String(Math.floor(Date.now() / 1000)), requestId = randomUUID();
      const signature = createHmac("sha256", f.provider.config.secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest("hex");
      return handleMpV2Webhook(JSON.stringify({ id: randomUUID(), type: "payment", data: { id }, live_mode: false }), new Headers({ "x-request-id": requestId, "x-signature": `ts=${ts},v1=${signature}` }), id, f.provider);
    };
    await Promise.all([notify(second.payment.id), notify(second.payment.id), notify(first.payment.id)]);
    expect((await getCommercialPlanAccess(f.business.id)).has("puri.plus")).toBe(true);
    expect((await getCommercialPlanAccess(f.business.id)).professionalTotal).toBe(1);
    expect(await prisma.commercialEvent.count({ where: { businessId: f.business.id, source: "mp_v2_review" } })).toBe(1);
  });
  for (const cycle of ["MONTHLY", "ANNUAL"] as const) for (const status of ["refunded", "charged_back"]) {
    for (const reversed of [0, 1]) for (const renewed of [false, true]) {
      it(`05-A ${cycle} ${status} expansion=${reversed + 1} renewed=${renewed}: paid components, concurrent duplicates and stale approval`, async () => {
        const f = await paid(cycle), first = await expand(f, "PURAGENDA_PLUS", 1), second = await expand(f, "PURAGENDA_PLUS", 5);
        const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } });
        const now = renewed ? new Date(+sub.periodEnd! + 60_000) : new Date();
        vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now);
        if (renewed) await reconcileMpV2Invoice(invoiceFor(f, f.root, sub.periodEnd!, second.op.recurringAmountMinor), f.provider, now);
        const updates = vi.mocked(f.port.update).mock.calls.length, chosen = [first, second][reversed];
        Object.assign(chosen.payment, { status, date_last_updated: now });
        await Promise.all([reconcileMpV2Operation(f.business.id, chosen.op.id, f.provider), reconcileMpV2Operation(f.business.id, chosen.op.id, f.provider)]);
        const access = await getCommercialPlanAccess(f.business.id, now);
        expect(access.allowed).toBe(true);
        expect(access.has("puri.plus")).toBe(renewed || reversed === 1);
        expect(access.professionalTotal).toBe(renewed || reversed === 0 ? 5 : 1);
        const review = await prisma.commercialEvent.findFirstOrThrow({ where: { businessId: f.business.id, source: "mp_v2_review" } });
        expect(review.details).toMatchObject({ remoteAmountUnchanged: true });
        const items = await prisma.commercialSubscriptionItem.count({ where: { subscriptionId: sub.id } });
        Object.assign(chosen.payment, { status: "approved", date_last_updated: new Date(+now + 1000) });
        await reconcileMpV2Operation(f.business.id, chosen.op.id, f.provider);
        // A delayed approval may not resurrect reversed evidence or append items.
        expect((await getCommercialPlanAccess(f.business.id, now)).professionalTotal).toBe(access.professionalTotal);
        expect(await prisma.commercialSubscriptionItem.count({ where: { subscriptionId: sub.id } })).toBe(items);
        expect(await prisma.commercialEvent.count({ where: { businessId: f.business.id, source: "mp_v2_review" } })).toBe(1);
        expect(vi.mocked(f.port.update).mock.calls).toHaveLength(updates);
      });
    }
    it.each(["first-then-second", "second-then-first", "concurrent"])(`05-A ${cycle} ${status}: reversing both %s converges without losing history`, async order => {
      const f = await paid(cycle), first = await expand(f, "PURAGENDA_PLUS", 1), second = await expand(f, "PURAGENDA_PLUS", 5);
      const snapshots = await prisma.commercialBillingOperation.findMany({ where: { subscriptionId: f.sub.id }, select: { id: true, quoteSnapshot: true, previousContractHash: true }, orderBy: { id: "asc" } });
      const updates = vi.mocked(f.port.update).mock.calls.length;
      Object.assign(first.payment, { status, date_last_updated: new Date() }); Object.assign(second.payment, { status, date_last_updated: new Date() });
      const reverse = (id: string) => reconcileMpV2Operation(f.business.id, id, f.provider);
      if (order === "concurrent") await Promise.all([reverse(first.op.id), reverse(second.op.id)]);
      else for (const item of order === "first-then-second" ? [first, second] : [second, first]) await reverse(item.op.id);
      const access = await getCommercialPlanAccess(f.business.id);
      expect(access.allowed).toBe(true); expect(access.professionalTotal).toBe(1); expect(access.has("puri.plus")).toBe(false);
      expect(await prisma.commercialPaymentEvidence.count({ where: { businessId: f.business.id } })).toBe(3);
      expect(await prisma.commercialEvent.count({ where: { businessId: f.business.id, source: "mp_v2_review" } })).toBe(2);
      expect(await prisma.commercialBillingOperation.findMany({ where: { subscriptionId: f.sub.id }, select: { id: true, quoteSnapshot: true, previousContractHash: true }, orderBy: { id: "asc" } })).toEqual(snapshots);
      const items = await prisma.commercialSubscriptionItem.findMany({ where: { subscriptionId: f.sub.id } });
      expect(items.every(item => !item.effectiveTo || item.effectiveTo > item.effectiveFrom)).toBe(true);
      expect(vi.mocked(f.port.update).mock.calls).toHaveLength(updates);
    });
    it(`05-A ${cycle} ${status}: missing paid seat prerequisite is explicitly reviewed`, async () => {
      const f = await paid(cycle), first = await expand(f, "PURAGENDA_PLUS", 2), second = await expand(f, "PURAGENDA_PLUS", 5);
      Object.assign(first.payment, { status, date_last_updated: new Date() });
      await reconcileMpV2Operation(f.business.id, first.op.id, f.provider);
      const access = await getCommercialPlanAccess(f.business.id);
      expect(access.allowed).toBe(true); expect(access.has("puri.plus")).toBe(false); expect(access.professionalTotal).toBe(1);
      const review = await prisma.commercialEvent.findFirstOrThrow({ where: { businessId: f.business.id, source: "mp_v2_review" } });
      expect(review.details).toMatchObject({ reconstruction: { ambiguousDependencies: [second.op.id] } });
      // Corrupt synthetic fixture: absent anchor evidence must not retain a
      // reversed selection merely because the cached snapshot claims payment.
      await prisma.commercialPaymentEvidence.deleteMany({ where: { operationId: f.root.id } });
      Object.assign(second.payment, { status, date_last_updated: new Date() });
      await reconcileMpV2Operation(f.business.id, second.op.id, f.provider);
      expect((await getCommercialPlanAccess(f.business.id)).allowed).toBe(false);
      expect(await prisma.commercialSubscription.findUnique({ where: { id: f.sub.id } })).toMatchObject({ status: "UNKNOWN" });
    });
    it(`05-A ${cycle} ${status}: a later paid renewal restores the full independently paid selection`, async () => {
      const f = await paid(cycle), first = await expand(f, "PURAGENDA_PLUS", 1), second = await expand(f, "PURAGENDA_PLUS", 5);
      Object.assign(second.payment, { status, date_last_updated: new Date() });
      await reconcileMpV2Operation(f.business.id, second.op.id, f.provider);
      const sub = await prisma.commercialSubscription.findUniqueOrThrow({ where: { id: f.sub.id } }), now = new Date(+sub.periodEnd! + 60000);
      vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now);
      await reconcileMpV2Invoice(invoiceFor(f, f.root, sub.periodEnd!, second.op.recurringAmountMinor), f.provider, now);
      Object.assign(first.payment, { status, date_last_updated: now });
      await reconcileMpV2Operation(f.business.id, first.op.id, f.provider);
      const access = await getCommercialPlanAccess(f.business.id, now);
      expect(access.allowed).toBe(true); expect(access.has("puri.plus")).toBe(true); expect(access.professionalTotal).toBe(5);
    });
  }
});
