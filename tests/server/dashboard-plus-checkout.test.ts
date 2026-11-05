import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

const m = vi.hoisted(() => ({ user: vi.fn(), business: vi.fn(), subscription: vi.fn(), contract: vi.fn(), panel: vi.fn(), legacyPanel: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: m.user }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: m.business }));
vi.mock("@/server/db/prisma", () => ({ prisma: { subscription: { findUnique: m.subscription }, commercialSubscription: { findUnique: m.contract } } }));
vi.mock("@/components/dashboard/commercial-subscription-panel", () => ({ CommercialSubscriptionPanel: (props: unknown) => { m.panel(props); return createElement("div", null, "Checkout de prueba"); } }));
vi.mock("@/components/dashboard/legacy-plus-subscription-panel", () => ({ LegacyPlusSubscriptionPanel: () => { m.legacyPanel(); return createElement("button", null, "Continuar al pago de Puragenda+"); } }));
import UpgradePage from "@/app/dashboard/settings/upgrade/page";

describe("authenticated Plus checkout page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.user.mockResolvedValue({ id: "owner" });
    m.business.mockResolvedValue({ id: "business", ownerId: "owner", name: "Synthetic business" });
    m.subscription.mockResolvedValue({ plan: "EQUIPO", extraStaffCount: 0, billingCycle: "MONTHLY" });
    m.contract.mockResolvedValue(null);
  });
  it("requires the authenticated business owner", async () => {
    m.user.mockResolvedValue(null);
    await expect(UpgradePage()).rejects.toThrow("REDIRECT:/login");
    m.user.mockResolvedValue({ id: "staff" });
    await expect(UpgradePage()).rejects.toThrow("REDIRECT:/dashboard/settings");
    expect(m.subscription).not.toHaveBeenCalled();
  });
  it.each(["INDIVIDUAL", "EQUIPO"])("opens the checkout for an existing %s contract instead of blocking it", async plan => {
    m.subscription.mockResolvedValue({plan, extraStaffCount: 0, staffLimitOverride: 5, billingCycle: "MONTHLY"});
    const html = renderToStaticMarkup(await UpgradePage());
    expect(html).toContain("Contratar Puragenda+");
    expect(html).toContain("5 profesionales contratados");
    expect(html).not.toContain("El pago de este cambio todavía no está habilitado");
    expect(html).toContain("Continuar al pago de Puragenda+");
    expect(html).not.toContain('href="/puragenda-plus"');
    expect(m.panel).not.toHaveBeenCalled();
    expect(m.legacyPanel).toHaveBeenCalledOnce();
  });
  it("opens the upgrade checkout for a registration contract, keeping its annual cycle and seat count", async () => {
    m.subscription.mockResolvedValue({ plan: "PURAGENDA", billingCycle: "ANNUAL" });
    m.contract.mockResolvedValue({ planCode: "PURAGENDA", professionalTotal: 2, billingCycle: "ANNUAL", legacySubscriptionId: null, termsSnapshot: { origin: "registration_v2" } });
    const html = renderToStaticMarkup(await UpgradePage());
    expect(html).toContain("2 profesionales contratados");
    expect(html).toContain("CLP/año");
    expect(m.panel).toHaveBeenCalledWith({ upgradeToPlus: true });
  });
  it("returns an existing Plus business to its current plan", async () => {
    m.contract.mockResolvedValue({ planCode: "PURAGENDA_PLUS" });
    await expect(UpgradePage()).rejects.toThrow("REDIRECT:/dashboard/settings#plan");
  });
});
