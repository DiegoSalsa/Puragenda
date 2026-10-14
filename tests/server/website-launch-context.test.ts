import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchdayFixture } from "@/websites/fixtures/matchday";

const mocks = vi.hoisted(() => ({ user: vi.fn(), business: vi.fn(), offer: vi.fn(), addon: vi.fn(), site: vi.fn(), services: vi.fn(), locations: vi.fn(), update: vi.fn(), upsert: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: mocks.user }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: mocks.business }));
vi.mock("@/server/websites/service", () => ({ websiteRootDomain: () => "puragenda.cl" }));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  websiteOfferEligibility: { findUnique: mocks.offer, update: mocks.update },
  websiteAddon: { findUnique: mocks.addon },
  businessWebsite: { findUnique: mocks.site, upsert: mocks.upsert },
  service: { count: mocks.services },
  businessLocation: { count: mocks.locations },
} }));
import { getDashboardWebsiteLaunch } from "@/server/websites/launch-context";

describe("personalized website discovery context", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("WEBSITE_LAUNCH_ENABLED", "1");
    vi.stubEnv("WEBSITE_CHECKOUT_ENABLED", "1");
    mocks.user.mockResolvedValue({ id: "owner-a", email: "owner@example.test" });
    mocks.business.mockResolvedValue({ id: "business-a", ownerId: "owner-a", name: "Soccerbarber", slug: "soccerbarber", deletedAt: null });
    mocks.offer.mockResolvedValue({ offerCode: "BETA_FOUNDER", trialConsumedAt: null });
    mocks.addon.mockResolvedValue(null);
    mocks.services.mockResolvedValue(4);
    mocks.locations.mockResolvedValue(1);
    mocks.site.mockResolvedValue({ templateKey: "matchday", templateVersion: 1, subdomain: "soccerbarber", draftConfig: matchdayFixture("soccerbarber").config });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses only the authenticated owner's website and preserves its chosen template", async () => {
    const context = await getDashboardWebsiteLaunch();
    expect(context?.preview).toMatchObject({ businessName: "Soccerbarber", templateName: "Matchday", address: "soccerbarber.puragenda.cl", ready: true, servicesReady: true, bookingReady: true });
    expect(mocks.business).toHaveBeenCalledWith("owner-a");
    for (const read of [mocks.offer, mocks.addon, mocks.site]) expect(read.mock.calls[0][0].where).toEqual({ businessId: "business-a" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("does not claim an unfinished or missing website is ready to publish", async () => {
    mocks.site.mockResolvedValue(null);
    expect((await getDashboardWebsiteLaunch())?.preview).toMatchObject({ businessName: "Soccerbarber", ready: false, address: null });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("does not expose an owner's offer or draft to staff", async () => {
    mocks.user.mockResolvedValue({ id: "staff-a", email: "staff@example.test" });
    expect(await getDashboardWebsiteLaunch()).toBeNull();
    expect(mocks.offer).not.toHaveBeenCalled();
    expect(mocks.site).not.toHaveBeenCalled();
  });
  it("excludes unauthenticated users, the demo and deleted businesses", async () => {
    mocks.user.mockResolvedValue(null);
    expect(await getDashboardWebsiteLaunch()).toBeNull();
    mocks.user.mockResolvedValue({ id: "owner-a", email: "vale@esteticabella.cl" });
    expect(await getDashboardWebsiteLaunch()).toBeNull();
    mocks.user.mockResolvedValue({ id: "owner-a", email: "owner@example.test" });
    mocks.business.mockResolvedValue({ id: "business-a", ownerId: "owner-a", deletedAt: new Date() });
    expect(await getDashboardWebsiteLaunch()).toBeNull();
    expect(mocks.site).not.toHaveBeenCalled();
  });
  it("honors acquisition flags without mutating trial or billing state", async () => {
    vi.stubEnv("WEBSITE_CHECKOUT_ENABLED", "0");
    expect((await getDashboardWebsiteLaunch())?.canActivateTrial).toBe(false);
    vi.stubEnv("WEBSITE_LAUNCH_ENABLED", "0");
    mocks.user.mockClear();
    expect(await getDashboardWebsiteLaunch()).toBeNull();
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("uses real setup state instead of claiming an empty agenda is ready", async () => {
    mocks.services.mockResolvedValue(0);
    mocks.locations.mockResolvedValue(0);
    expect((await getDashboardWebsiteLaunch())?.preview).toMatchObject({ servicesReady: false, bookingReady: false });
    expect(mocks.services).toHaveBeenCalledWith({ where: { businessId: "business-a", bookingMode: "APPOINTMENT" } });
    expect(mocks.locations).toHaveBeenCalledWith({ where: { businessId: "business-a", isActive: true } });
  });
});
