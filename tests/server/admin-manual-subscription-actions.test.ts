import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn(), update: vi.fn(), sync: vi.fn() }));
vi.mock("@/server/auth/admin-session", () => ({ requireSuperAdminSession: mocks.auth, isRecentAdminAuth: vi.fn(), revokeAllSuperAdminSessionsForUser: vi.fn(), stepUpRequiredResult: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { subscription: { findUnique: mocks.findUnique, update: mocks.update } } }));
vi.mock("@/server/services/subscription-billing.service", () => ({ syncMercadoPagoSubscriptionAmount: mocks.sync }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { updateSubscriptionAction, applySubscriptionBenefitPresetAction, updateSubscriptionBillingRulesAction, clearSubscriptionBenefitAction, syncSubscriptionBillingAction, extendTrialAction } from "@/server/actions/admin.actions";

const manual = { paymentMethod: "BANK_TRANSFER", plan: "EQUIPO", billingCycle: "MONTHLY", extraStaffCount: 0, staffLimitOverride: 2, customMonthlyPriceClp: 17990 };
describe("superadmin preserves manual subscription agreements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ id: "superadmin" });
    mocks.findUnique.mockResolvedValue(manual);
    mocks.update.mockResolvedValue(manual);
    mocks.sync.mockResolvedValue({ success: true });
  });
  it("protects V2 trials from legacy extension, plan changes and billing synchronization", async () => {
    mocks.findUnique.mockResolvedValue({ plan: "PURAGENDA_PLUS", status: "TRIALING", paymentMethod: "AUTOMATIC", trialEndsAt: new Date(Date.now() + 86400000) });
    expect(await extendTrialAction("v2", 30)).toHaveProperty("error");
    expect(await updateSubscriptionAction("v2", { plan: "INDIVIDUAL" })).toHaveProperty("error");
    expect(await syncSubscriptionBillingAction("v2")).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.sync).not.toHaveBeenCalled();
  });
  it.each([
    { plan: "INDIVIDUAL" as const }, { billingCycle: "ANNUAL" as const },
    { extraStaffCount: 20 }, { isTrial: true }, { status: "TRIALING" as const },
  ])("rejects altering manual terms through the generic subscription form: %o", async data => {
    expect(await updateSubscriptionAction("manual", data)).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("updates manual status without touching commercial terms, period or provider", async () => {
    expect(await updateSubscriptionAction("manual", { status: "INACTIVE" })).toEqual({ success: true });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "manual" }, data: { status: "INACTIVE" } });
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it.each([
    () => applySubscriptionBenefitPresetAction("manual", "PRIZE_12"),
    () => updateSubscriptionBillingRulesAction("manual", { nextBillingOverrideAmount: 0 }),
    () => clearSubscriptionBenefitAction("manual"),
    () => syncSubscriptionBillingAction("manual"),
  ])("rejects automated billing controls for a manual agreement", async action => {
    expect(await action()).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("retains the existing synchronization for automatic accounts", async () => {
    mocks.findUnique.mockResolvedValue({ ...manual, paymentMethod: "AUTOMATIC" });
    expect(await updateSubscriptionAction("automatic", { plan: "INDIVIDUAL" })).toEqual({ success: true });
    expect(mocks.sync).toHaveBeenCalledWith("automatic");
  });
  it("requires the superadmin session before reading or updating subscriptions", async () => {
    mocks.auth.mockRejectedValueOnce(new Error("Acceso denegado"));
    await expect(syncSubscriptionBillingAction("manual")).rejects.toThrow("Acceso denegado");
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
