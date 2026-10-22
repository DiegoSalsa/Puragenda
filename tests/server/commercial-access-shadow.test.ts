import { beforeEach, describe, expect, it, vi } from "vitest";
const context = vi.hoisted(() => ({
  user: { id: "owner", role: "ADMIN" } as { id: string; role: string } | null,
  business: { id: "business-a", ownerId: "owner", deletedAt: null },
  permissions: ["analytics.view_business"], commercial: true,
}));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: vi.fn(async () => context.user) }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn(async () => context.business) }));
vi.mock("@/server/services/permissions.service", () => ({ getEffectiveBusinessPermissions: vi.fn(async () => context.permissions) }));
vi.mock("@/server/services/commercial-entitlements.service", () => ({ getCommercialEntitlementShadow: vi.fn(async () => ({
  commercialAccess: context.commercial, capabilities: context.commercial ? ["analytics.commercial", "puri.plus"] : [],
})) }));
vi.mock("@/server/services/commercial-capacity.service", () => ({ requestCommercialSeatChange: vi.fn(async input => input) }));
vi.mock("@/server/db/prisma", () => ({ prisma: { businessLocation: { findFirst: vi.fn(async () => null) } } }));
import { requestOwnedCommercialSeatChange, evaluateSessionCommercialAccessShadow } from "@/server/services/commercial-access-shadow.service";
import { requestCommercialSeatChange } from "@/server/services/commercial-capacity.service";

describe("commercial authorization boundaries", () => {
  beforeEach(() => {
    context.user = { id: "owner", role: "ADMIN" }; context.permissions = ["analytics.view_business"]; context.commercial = true;
  });
  it("derives business from session and allowlists the request fields", async () => {
    const input = { requestedProfessionalTotal: 2, idempotencyKey: "request-one", effectiveAt: new Date(),
      businessId: "victim-business", status: "APPLIED", paymentEvidence: { paid: true }, quotedAmountClp: 1 };
    await requestOwnedCommercialSeatChange(input);
    expect(requestCommercialSeatChange).toHaveBeenCalledWith({ businessId: "business-a", requestedProfessionalTotal: 2,
      idempotencyKey: "request-one", effectiveAt: input.effectiveAt });
  });
  it("rejects unauthenticated requests", async () => {
    context.user = null;
    await expect(requestOwnedCommercialSeatChange({ requestedProfessionalTotal: 2, idempotencyKey: "request-one", effectiveAt: new Date() })).rejects.toThrow("UNAUTHENTICATED");
  });
  it("does not let a receptionist alter commercial state", async () => {
    context.user = { id: "receptionist", role: "RECEPTIONIST" };
    await expect(requestOwnedCommercialSeatChange({ requestedProfessionalTotal: 2, idempotencyKey: "request-one", effectiveAt: new Date() })).rejects.toThrow("OWNER_REQUIRED");
  });
  it("Plus does not grant financial rights to an employee", async () => {
    context.permissions = ["appointments.view_own"];
    expect((await evaluateSessionCommercialAccessShadow("analytics.commercial")).allowed).toBe(false);
    context.permissions = ["analytics.view_business"];
    expect(await evaluateSessionCommercialAccessShadow("analytics.commercial")).toMatchObject({ allowed: true, changesEffectiveAccess: false });
  });
  it("an administrator cannot access Plus features without entitlement", async () => {
    context.commercial = false;
    expect((await evaluateSessionCommercialAccessShadow("analytics.commercial")).allowed).toBe(false);
  });
  it("denies foreign locations and unmapped capabilities", async () => {
    expect((await evaluateSessionCommercialAccessShadow("analytics.commercial", "foreign-location")).allowed).toBe(false);
    expect((await evaluateSessionCommercialAccessShadow("contact_flow")).allowed).toBe(false);
  });
});
