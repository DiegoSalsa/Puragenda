import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ admin: vi.fn(), redirect: vi.fn(() => { throw new Error("REDIRECT"); }), overview: vi.fn(), options: vi.fn(), filters: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/admin-session", () => ({ getCurrentAdminSessionUser: mocks.admin }));
vi.mock("@/server/puri/analytics", () => ({ parsePuriFilters: mocks.filters, getPuriOverview: mocks.overview, getPuriFilterOptions: mocks.options }));
vi.mock("@/server/lib/audit", () => ({ createAuditLog: vi.fn() }));

import PuriPage from "@/app/para/x7k9m2v4q8/(panel)/puri/page";

describe("Superadmin Puri page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.filters.mockReturnValue({ tab: "resumen", range: "30d", metric: "users", fromKey: "2026-08-31", toKey: "2026-09-29", search: "", sort: "messages" });
    mocks.options.mockResolvedValue({ plans: [], locations: [] });
  });

  it("checks the admin session on the server before querying telemetry", async () => {
    mocks.admin.mockResolvedValue(null);
    await expect(PuriPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith(expect.stringContaining("/login"));
    expect(mocks.overview).not.toHaveBeenCalled();
  });

  it("shows a safe pending-migration state when a Puri table is missing", async () => {
    mocks.admin.mockResolvedValue({ id: "superadmin-1" });
    mocks.overview.mockRejectedValue({ code: "P2010", meta: { code: "42P01", message: 'relation "PuriRequest" does not exist' } });
    const html = renderToStaticMarkup(await PuriPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("Telemetría de Puri pendiente");
    expect(html).toContain("Secciones de Puri");
    expect(html).not.toContain("42P01");
  });

  it("does not hide unrelated database failures", async () => {
    mocks.admin.mockResolvedValue({ id: "superadmin-1" });
    const outage = new Error("database unavailable");
    mocks.overview.mockRejectedValue(outage);
    await expect(PuriPage({ searchParams: Promise.resolve({}) })).rejects.toBe(outage);
  });
});
