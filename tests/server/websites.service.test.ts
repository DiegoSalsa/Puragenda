import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ site: vi.fn(), custom: vi.fn(), user: vi.fn(), business: vi.fn(), permission: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { businessWebsite: { findUnique: mocks.site, findFirst: mocks.custom } } }));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: mocks.user }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: mocks.business }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: mocks.permission }));
import { resolveWebsiteHost, requireWebsiteManager } from "@/server/websites/service";
const website = (id: string) => ({ businessId: id, status: "PUBLISHED", publishedConfig: {}, templateKey: "bella", templateVersion: 1, business: { deletedAt: null, subscription: { status: "ACTIVE" }, websiteAddon: { status: "ACTIVE", validUntil: new Date(Date.now() + 86400000) } } });
describe("website server tenant boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("WEBSITE_ROOT_DOMAIN", "puragenda.cl"); });
  it("looks up each hostname by its own unique tenant key", async () => {
    mocks.site.mockImplementation(async ({ where }) => website(where.subdomain));
    expect((await resolveWebsiteHost("business-a.puragenda.cl"))?.businessId).toBe("business-a");
    expect((await resolveWebsiteHost("business-b.puragenda.cl"))?.businessId).toBe("business-b");
    expect(mocks.site).toHaveBeenCalledWith(expect.objectContaining({ where: { subdomain: "business-a" } }));
  });
  it("only resolves active custom domains and denies unpublished sites", async () => {
    mocks.custom.mockResolvedValue(website("b"));
    expect((await resolveWebsiteHost("studio-b.cl"))?.businessId).toBe("b");
    expect(mocks.custom).toHaveBeenCalledWith(expect.objectContaining({ where: { domains: { some: { hostname: "studio-b.cl", status: "ACTIVE" } } } }));
    mocks.custom.mockResolvedValue({ ...website("b"), status: "DRAFT" });
    expect(await resolveWebsiteHost("studio-b.cl")).toBeNull();
  });
  it("does not trust role alone, arbitrary business IDs or another owner's staff", async () => {
    mocks.user.mockResolvedValue({ id: "user-a", role: "ADMIN" });
    mocks.business.mockResolvedValue({ id: "business-b", ownerId: "user-b" });
    mocks.permission.mockResolvedValue(false);
    await expect(requireWebsiteManager()).rejects.toThrow("No autorizado");
    mocks.permission.mockResolvedValue(true);
    await expect(requireWebsiteManager(true)).rejects.toThrow("No autorizado");
    expect(mocks.business).toHaveBeenCalledWith("user-a");
    mocks.user.mockResolvedValue(null);
    await expect(requireWebsiteManager()).rejects.toThrow("No autenticado");
  });
});
