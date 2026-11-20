import { afterEach, describe, expect, it, vi } from "vitest";
import { isChristmasDashboardSeason } from "@/server/services/dashboard-appearance.service";

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));

afterEach(() => vi.unstubAllEnvs());

describe("Christmas dashboard season", () => {
  it.each([
    ["2026-12-01T02:59:59Z", false],
    ["2026-12-01T03:00:00Z", true],
    ["2027-01-07T02:59:59Z", true],
    ["2027-01-07T03:00:00Z", false],
  ])("uses Santiago dates at %s", (date, expected) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DASHBOARD_CHRISTMAS_PREVIEW", "1");
    expect(isChristmasDashboardSeason(new Date(date))).toBe(expected);
  });

  it("allows the preview outside the season in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DASHBOARD_CHRISTMAS_PREVIEW", "1");
    expect(isChristmasDashboardSeason(new Date("2026-11-20T12:00:00Z"))).toBe(true);
  });
});
