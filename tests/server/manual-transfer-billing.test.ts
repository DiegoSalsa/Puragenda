import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const provider = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), get: vi.fn() }));
vi.mock("mercadopago", () => ({
  PreApproval: class { create = provider.create; update = provider.update; get = provider.get; },
  Invoice: class {},
}));
vi.mock("@/server/lib/mercadopago", () => ({ mpClient: {} }));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  subscription: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(async () => []), update: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  websitePurchaseIntent: { findUnique: vi.fn() },
} }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: vi.fn(async () => ({ id: "owner", email: "owner@example.test" })) }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn(async () => ({ id: "manual-business", countryCode: "CL", ownerId: "owner" })) }));
vi.mock("@/server/lib/rate-limit", () => ({ billingLimiter: { check: vi.fn(() => null) } }));
vi.mock("@/server/email/send", () => ({ sendSubscriptionPaymentFailedEmail: vi.fn(), sendSubscriptionPaymentRecoveredEmail: vi.fn() }));
vi.mock("@/server/services/affiliate.service", () => ({ incrementPaidReferrals: vi.fn() }));
vi.mock("@/server/services/platform-discount.service", () => ({ markPlatformDiscountApplied: vi.fn(), quotePlatformDiscount: vi.fn(), reservePlatformDiscount: vi.fn() }));
vi.mock("@/server/services/subscription-payment-notification.service", () => ({ notifySubscriptionPayment: vi.fn() }));
vi.mock("@/server/lib/mercadopago-webhook", () => ({ verifyMercadoPagoWebhookSignature: vi.fn(() => ({ valid: true })) }));
vi.mock("@/server/websites/mercadopago-billing", () => ({ syncMercadoPagoWebsitePreapproval: vi.fn(async () => false), syncMercadoPagoWebsiteInvoice: vi.fn(async () => false) }));

import { prisma } from "@/server/db/prisma";
import { POST as subscribe } from "@/app/api/billing/subscribe/route";
import { POST as verify } from "@/app/api/billing/verify/route";
import { POST as recover } from "@/app/api/billing/recovery/route";
import { calculateNextBillingPreview, syncMercadoPagoSubscriptionAmount, advanceBillingBenefitAfterAuthorized } from "@/server/services/subscription-billing.service";
import { processMercadoPagoInvoice, runBillingReconciliation } from "@/server/services/subscription-dunning.service";
import { applyDiscount } from "@/server/services/discount.service";
import { POST as webhook } from "@/app/api/webhooks/mercadopago/route";

const manual = {
  id: "manual-sub", plan: "EQUIPO" as const, status: "ACTIVE" as const,
  billingCycle: "MONTHLY" as const, isTrial: false, extraStaffCount: 0,
  paymentMethod: "BANK_TRANSFER" as const, staffLimitOverride: 2,
  customMonthlyPriceClp: 17990, mpSubscriptionId: "historical-provider-id",
  currentPeriodEnd: new Date("2026-11-17T03:00:00Z"),
};
const request = () => new NextRequest("http://localhost/api/billing/subscribe", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ plan: "EQUIPO", extraStaffCount: 20, paymentMethod: "AUTOMATIC", staffLimitOverride: 100 }),
});

describe("manual subscription billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(manual as never);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValue(manual as never);
  });

  it("previews the agreed tax-inclusive CLP amount without a provider charge", () => {
    expect(calculateNextBillingPreview(manual)).toMatchObject({ baseAmount: 17990, amountDue: 17990, mpAmount: 0, usesMercadoPagoMinimum: false });
  });

  it("does not apply a manual price to standard automatic plans", () => {
    expect(calculateNextBillingPreview({ ...manual, status: "INACTIVE", paymentMethod: "AUTOMATIC" })).toMatchObject({ baseAmount: 29990, mpAmount: 29990 });
  });

  it("blocks a tampered checkout before creating any provider subscription or updating the database", async () => {
    const response = await subscribe(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "MANUAL_TRANSFER_SUBSCRIPTION" });
    expect(provider.create).not.toHaveBeenCalled();
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.websitePurchaseIntent.findUnique).not.toHaveBeenCalled();
  });

  it("skips provider amount synchronization and benefit consumption", async () => {
    expect(await syncMercadoPagoSubscriptionAmount(manual.id)).toMatchObject({ success: true, skipped: true });
    expect(await advanceBillingBenefitAfterAuthorized(manual.id)).toMatchObject({ success: true, skipped: true });
    expect(provider.update).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it("verifies the manual state without contacting the provider or moving the paid period", async () => {
    const response = await verify(request());
    expect(await response.json()).toMatchObject({ provider: "bank_transfer", status: "ACTIVE", currentPeriodEnd: manual.currentPeriodEnd.toISOString() });
    expect(provider.get).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it("blocks card recovery for a manual account", async () => {
    const response = await recover(request());
    expect(response.status).toBe(409);
    expect(provider.update).not.toHaveBeenCalled();
  });

  it("does not send automatic discounts to a manual account", async () => {
    expect(await applyDiscount("manual-business", 50)).toMatchObject({ success: false });
    expect(provider.update).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it("excludes manual accounts from reconciliation and card retry notices", async () => {
    await runBillingReconciliation();
    expect(prisma.subscription.findMany).toHaveBeenCalledTimes(3);
    for (const [query] of vi.mocked(prisma.subscription.findMany).mock.calls) {
      expect(query?.where).toMatchObject({ paymentMethod: "AUTOMATIC" });
    }
  });

  it.each(["authorized", "paused", "cancelled"])("ignores a historical preapproval notification: %s", async (status) => {
    provider.get.mockResolvedValue({ id: "historical-provider-id", status });
    const response = await webhook(new NextRequest("http://localhost/api/webhooks/mercadopago", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "subscription_preapproval", data: { id: "historical-provider-id" } }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: { reason: "manual_transfer_subscription" } });
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it.each(["approved", "rejected"])("ignores historical provider invoice notifications: %s", async (status) => {
    expect(await processMercadoPagoInvoice({ id: "invoice", preapproval_id: "historical-provider-id", payment: { id: "1", status } })).toEqual({ handled: false, reason: "manual_transfer_subscription" });
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });
});
