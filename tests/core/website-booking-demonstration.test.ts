import { afterEach, describe, expect, it, vi } from "vitest";
import { websiteBookingDemonstration } from "@/websites/booking-demonstration";
import { createWebsiteApi } from "@/websites/booking/client";
import { demoAvailability, demoCatalog } from "@/websites/fixtures/catalog";
import { matchdayFixture } from "@/websites/fixtures/matchday";
import type { AvailabilityQuery } from "@/websites/booking/types";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("owner's native booking demonstration", () => {
  it("keeps the actual business, template, services and staff, without changing the original or a public website", () => {
    const original = matchdayFixture("soccerbarber");
    original.business.id = "actual-owner-business";
    const demo = websiteBookingDemonstration(original);
    expect(demo.previewExperience).toBe("booking");
    expect(demo.catalog.mode).toBe("demo");
    expect(demo.config).toBe(original.config);
    expect(demo.business).toBe(original.business);
    expect(demo.catalog.services).toBe(original.catalog.services);
    expect(demo.catalog.staff).toBe(original.catalog.staff);
    expect(original.previewExperience).toBeUndefined();
    const publicView = { ...original, preview: false };
    expect(websiteBookingDemonstration(publicView)).toBe(publicView);
  });

  it("offers sample slots without any network request and blocks booking even for real business ids", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-09T15:00:00Z"));
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const demo = websiteBookingDemonstration({ ...matchdayFixture("soccerbarber"), business: { ...matchdayFixture("soccerbarber").business, id: "actual-business" } });
    const service = demo.catalog.services[0];
    const staff = demo.catalog.staff.find(person => person.locationIds.includes(service.locationIds[0]) && (!person.serviceIds.length || person.serviceIds.includes(service.id)))!;
    const api = createWebsiteApi(demo.catalog, demo.preview, demo.previewExperience === "booking");
    const query = { serviceId: service.id, staffId: staff.id, locationId: service.locationIds[0], optionIds: [], date: "2026-10-10" };
    const availability = await api.availability(query);
    expect(availability.mode).toBe("demo");
    expect(availability.slots.length).toBeGreaterThan(0);
    await expect(api.book({ ...query, startTime: availability.slots[0].startTime, customerName: "Demo", customerEmail: "demo@example.test", customerPhone: "+56912345678" }, "test-key")).rejects.toThrow("La vista previa no crea reservas");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never substitutes sample availability on a public website", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ mode: "connected", date: "2026-10-10", slots: [] }) });
    vi.stubGlobal("fetch", fetch);
    const api = createWebsiteApi({ ...demoCatalog, mode: "connected" }, false, true);
    await api.availability({ serviceId: "permanente", staffId: "antonia", locationId: "bella-demo", optionIds: [], date: "2026-10-10" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).not.toContain("preview=1");
  });

  it("supports the owner's multi-service and unrestricted staff configuration in the demonstration", () => {
    const catalog = { ...demoCatalog, rules: { maxServicesPerBooking: 2, staffSelection: "REQUIRED" as const, allowSameDayBookings: false, depositEnabled: false, maxDaysAhead: 90 }, staff: demoCatalog.staff.map(person => ({ ...person, serviceIds: [] })) };
    const query: AvailabilityQuery = { serviceId: "permanente", serviceIds: ["permanente", "retiro"], staffId: "any", locationId: "bella-demo", optionIds: [], date: "2026-10-10" };
    const slots = demoAvailability(query, new Date("2026-10-09T15:00:00Z"), catalog).slots;
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].staffId).toBe("antonia");
    expect((Date.parse(slots[0].endTime) - Date.parse(slots[0].startTime)) / 60000).toBe(90);
  });
});
