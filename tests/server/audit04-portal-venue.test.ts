import { describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ data: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => () => "Synthetic", getLocale: async () => "es" }));
vi.mock("@/server/services/client-portal.service", () => ({ getClientPortalEmail: async () => "c@synthetic.invalid", getClientPortalAccount: async () => null, getClientPortalProfile: async () => null, getClientPortalData: m.data }));
import Page from "@/app/mi-agenda/page";
describe("audit 04 portal booked venue SSR", () => {
  it("04-09 renders the booked branch address and timezone while retaining UTC instants", async () => {
    const startTime = new Date("2026-09-06T03:30:00Z");
    m.data.mockResolvedValue({ displayName: "Synthetic", email: "c@synthetic.invalid", clients: [], upcoming: [{ id: "a", status: "CONFIRMED", businessId: "b", startTime, endTime: new Date("2026-09-06T04:00:00Z"), service: { name: "Synthetic" }, location: { businessId: "b", address: "SYNTHETIC_ISLAND_ADDRESS", timezone: "Pacific/Easter" }, business: { id: "b", name: "Synthetic", timezone: "America/Santiago", address: "SYNTHETIC_HEAD_OFFICE" } }], history: [], plans: [] });
    const payload = JSON.stringify(await Page({ searchParams: Promise.resolve({}) }), (key, value) => ["type", "_owner", "_store"].includes(key) ? undefined : value);
    expect(payload).toContain("SYNTHETIC_ISLAND_ADDRESS");
    expect(payload).not.toContain("SYNTHETIC_HEAD_OFFICE");
    expect(payload).toContain("21:30");
    expect(startTime.toISOString()).toBe("2026-09-06T03:30:00.000Z");
  });
  it.each([
    ["America/Santiago", "2026-09-06T03:30:00Z", "23:30", false],
    ["America/Santiago", "2026-09-06T04:30:00Z", "01:30", false],
    ["Pacific/Easter", "2026-07-04T04:30:00Z", "22:30", false],
    ["America/Punta_Arenas", "2026-07-04T04:30:00Z", "01:30", false],
    ["America/Santiago", "2026-07-04T04:30:00Z", "00:30", true],
  ])("uses %s at %s including DST and legacy fallback", async (timezone, instant, time, legacy) => {
    const startTime = new Date(instant);
    m.data.mockResolvedValue({ displayName: "Synthetic", email: "c@synthetic.invalid", clients: [], upcoming: [{ id: "a", businessId: "b", status: "CONFIRMED", startTime, endTime: new Date(+startTime + 1800000), service: { name: "Synthetic" }, location: legacy ? null : { businessId: "b", address: "SYNTHETIC_BRANCH", timezone }, business: { name: "Synthetic", timezone: "America/Santiago", address: "SYNTHETIC_LEGACY" } }], history: [], plans: [] });
    const payload = JSON.stringify(await Page({ searchParams: Promise.resolve({}) }), (key, value) => ["type", "_owner", "_store"].includes(key) ? undefined : value);
    expect(payload).toContain(time); expect(payload).toContain(legacy ? "SYNTHETIC_LEGACY" : "SYNTHETIC_BRANCH");
  });
});
