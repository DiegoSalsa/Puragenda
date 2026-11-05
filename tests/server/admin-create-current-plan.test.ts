import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), user: vi.fn(), business: vi.fn(), transaction: vi.fn(), contract: vi.fn(), location: vi.fn(), userCreate: vi.fn(), businessCreate: vi.fn(), staffCreate: vi.fn(), audit: vi.fn(), sync: vi.fn() }));
vi.mock("@/server/auth/admin-session", () => ({ requireSuperAdminSession: m.auth, isRecentAdminAuth: () => true, revokeAllSuperAdminSessionsForUser: vi.fn(), stepUpRequiredResult: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { user: { findUnique: m.user }, business: { findUnique: m.business }, $transaction: m.transaction } }));
vi.mock("@/server/services/subscription-billing.service", () => ({ syncMercadoPagoSubscriptionAmount: m.sync }));
vi.mock("@/server/services/location.service", () => ({ createPrimaryLocation: m.location }));
vi.mock("@/server/services/commercial-trial.service", async () => ({ ...await vi.importActual("@/core/commercial-selection"), createRegistrationContract: m.contract }));
vi.mock("bcrypt", () => ({ default: { hash: vi.fn(async () => "synthetic-hash") } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { createBusinessAction } from "@/server/actions/admin.actions";
const input = { ownerName: "Synthetic owner", ownerEmail: "owner@example.invalid", ownerPassword: "synthetic-password", businessName: "Synthetic studio", plan: "PURAGENDA_PLUS" as const, professionalTotal: 3, billingCycle: "MONTHLY" as const };

describe("superadmin creates only current commercial contracts", () => {
  const tx = { user: { create: m.userCreate }, business: { create: m.businessCreate }, staff: { create: m.staffCreate }, auditLog: { create: m.audit } };
  beforeEach(() => {
    vi.clearAllMocks();m.auth.mockResolvedValue({ id: "admin" });m.user.mockResolvedValue(null);m.business.mockResolvedValue(null);
    m.userCreate.mockResolvedValue({ id: "owner" });m.businessCreate.mockResolvedValue({ id: "business" });m.staffCreate.mockResolvedValue({ id: "staff" });
    m.transaction.mockImplementation(async run => run(tx));
  });
  it.each(["PURAGENDA", "PURAGENDA_PLUS"] as const)("starts %s with the selected professional count as a trial, without a provider charge", async plan => {
    expect(await createBusinessAction({ ...input, plan })).toEqual({ success: true });
    expect(m.contract).toHaveBeenCalledWith(tx, { plan, professionalTotal: 3, billingCycle: "MONTHLY", businessId: "business", trialEligible: true });
    expect(m.sync).not.toHaveBeenCalled();
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "admin", action: "ADMIN_BUSINESS_CREATED" }) }));
  });
  it.each(["INDIVIDUAL", "EQUIPO"])("rejects creating the retired %s product from a stale form", async plan => {
    expect(await createBusinessAction({ ...input, plan } as never)).toHaveProperty("error");
    expect(m.transaction).not.toHaveBeenCalled();expect(m.contract).not.toHaveBeenCalled();
  });
  it("requires superadmin authentication before any write", async () => {
    m.auth.mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
    await expect(createBusinessAction(input)).rejects.toThrow("UNAUTHENTICATED");
    expect(m.transaction).not.toHaveBeenCalled();
  });
});
