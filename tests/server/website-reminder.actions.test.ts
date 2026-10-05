import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ manager: vi.fn(), offer: vi.fn(), upsert: vi.fn() }));
vi.mock("@/server/websites/service", () => ({ requireWebsiteManager: mocks.manager }));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  websiteOfferEligibility: { findUnique: mocks.offer },
  websiteCommercialEvent: { upsert: mocks.upsert },
} }));

import { dismissWebsiteTrialReminder } from "@/server/actions/website-reminder.actions";
import { WebsiteError } from "@/server/websites/errors";

describe("website reminder dismissal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T12:00:00-03:00"));
    mocks.manager.mockResolvedValue({ business: { id: "tenant-a" }, user: { email: "owner@example.test" } });
    mocks.offer.mockResolvedValue({ offerCode: "BETA_FOUNDER" });
  });
  afterEach(() => vi.useRealTimers());

  it("requires ownership and derives the business from the authenticated session", async () => {
    expect(await dismissWebsiteTrialReminder()).toEqual({ success: true });
    expect(mocks.manager).toHaveBeenCalledWith(true);
    expect(mocks.offer).toHaveBeenCalledWith({ where: { businessId: "tenant-a" } });
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { key: "tenant-a:website-trial-reminder-2026-10-05" },
      create: {
        key: "tenant-a:website-trial-reminder-2026-10-05",
        businessId: "tenant-a",
        event: "website_trial_reminder_dismissed",
        priceTier: "BETA_FOUNDER",
      },
      update: {},
    });
  });

  it("keeps repeated dismissal idempotent", async () => {
    await dismissWebsiteTrialReminder();
    await dismissWebsiteTrialReminder();
    expect(mocks.upsert.mock.calls[0]).toEqual(mocks.upsert.mock.calls[1]);
    expect(mocks.upsert.mock.calls[0][0].update).toEqual({});
  });

  it("does not write if the caller is not the business owner", async () => {
    mocks.manager.mockRejectedValue(new WebsiteError("No autorizado"));
    expect(await dismissWebsiteTrialReminder()).toEqual({ error: "No autorizado" });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("does not write for the demo or outside Monday", async () => {
    mocks.manager.mockResolvedValue({ business: { id: "demo" }, user: { email: "vale@esteticabella.cl" } });
    expect(await dismissWebsiteTrialReminder()).toEqual({ success: true });
    mocks.manager.mockResolvedValue({ business: { id: "tenant-a" }, user: { email: "owner@example.test" } });
    vi.setSystemTime(new Date("2026-10-04T12:00:00-03:00"));
    expect(await dismissWebsiteTrialReminder()).toEqual({ success: true });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("does not write for a business without the founder offer", async () => {
    mocks.offer.mockResolvedValue(null);
    expect(await dismissWebsiteTrialReminder()).toEqual({ success: true });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("returns a safe error when persistence fails", async () => {
    mocks.upsert.mockRejectedValue(new Error("sensitive provider details"));
    expect(await dismissWebsiteTrialReminder()).toEqual({ error: "No pudimos guardar tu respuesta. Inténtalo de nuevo." });
  });
});
