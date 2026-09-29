import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { $queryRaw: mocks.query, puriRequest: { findUnique: mocks.findUnique } } }));

import { getPuriHabitual, getPuriOverview, getPuriRequestErrors, getPuriResponseMetadata, getPuriRetention, parsePuriFilters } from "@/server/puri/analytics";

describe("Superadmin Puri analytics QA", () => {
  beforeEach(() => { mocks.query.mockReset().mockResolvedValue([{}]); });

  it("bounds Hoy by Santiago local midnight, including the DST jump", () => {
    const beforeMidnight = parsePuriFilters({ range: "today" }, new Date("2026-09-29T02:30:00Z"));
    expect(beforeMidnight.fromKey).toBe("2026-09-28");
    expect(beforeMidnight.from.toISOString()).toBe("2026-09-28T03:00:00.000Z");
    expect(beforeMidnight.to.toISOString()).toBe("2026-09-29T03:00:00.000Z");
    const transition = parsePuriFilters({ range: "custom", from: "2026-09-06", to: "2026-09-06" });
    expect(transition.from.toISOString()).toBe("2026-09-06T04:00:00.000Z");
    expect(transition.to.toISOString()).toBe("2026-09-07T03:00:00.000Z");
  });

  it("normalizes malformed dates and pages without unbounded offsets", () => {
    const now = new Date("2026-09-29T15:00:00Z");
    expect(parsePuriFilters({ range: "custom", from: "2026-02-30", to: "2026-03-02", page: "4junk" }, now)).toMatchObject({ fromKey: "2026-08-31", toKey: "2026-09-29", page: 1 });
    expect(parsePuriFilters({ page: "99999999" }, now).page).toBe(1);
    expect(parsePuriFilters({ page: "0" }, now).page).toBe(1);
    expect(parsePuriFilters({ page: "9999" }, now).page).toBe(1000);
  });

  it("uses bound parameters for every request scope and keeps provider errors separate", async () => {
    const f = parsePuriFilters({ business: "business-A", role: "STAFF", location: "location-A", tool: "getAvailability", intent: "disponibilidad", plan: "EQUIPO" });
    await getPuriOverview(f);
    const overview = mocks.query.mock.calls[0][0];
    expect(overview.sql).toContain('ft."requestId" = r."id"');
    for (const value of ["business-A", "STAFF", "location-A", "getAvailability", "disponibilidad", "EQUIPO"]) {
      expect(overview.values).toContain(value);
      expect(overview.sql).not.toContain(value);
    }
    await getPuriRequestErrors(f);
    const errors = mocks.query.mock.calls[1][0];
    expect(errors.sql).toContain("MODEL_OR_PROVIDER_ERROR");
    expect(errors.sql).not.toContain("r.status IN ('ERROR','TIMEOUT')");
  });

  it("rejects response metadata outside every active business and request filter", async () => {
    const f = parsePuriFilters({ business: "business-A", tool: "getAvailability", intent: "disponibilidad" });
    mocks.query.mockResolvedValueOnce([]);
    expect(await getPuriResponseMetadata("response-from-B", f)).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
    const scoped = mocks.query.mock.calls[0][0];
    expect(scoped.values).toContain("business-A");
    expect(scoped.values).toContain("getAvailability");
    expect(scoped.values).toContain("disponibilidad");
    mocks.query.mockResolvedValueOnce([{ id: "response-from-A" }]);
    mocks.findUnique.mockResolvedValueOnce({ id: "response-from-A", businessId: "business-A" });
    expect(await getPuriResponseMetadata("response-from-A", f)).toMatchObject({ businessId: "business-A" });
  });

  it("counts distinct local activity days and exact D1/D7/D30 returns", async () => {
    const now = new Date("2026-09-29T15:00:00Z");
    const f = parsePuriFilters({ range: "30d", business: "business-A" }, now);
    await getPuriHabitual(f, now);
    const habitual = mocks.query.mock.calls[0][0];
    expect(habitual.sql).toContain("COUNT(DISTINCT (r.\"createdAt\" AT TIME ZONE");
    expect(habitual.values).toContain(3);
    expect(habitual.values).toContain("business-A");
    expect(habitual.values.some((value: unknown) => value instanceof Date && value.toISOString() === "2026-09-23T03:00:00.000Z")).toBe(true);

    mocks.query.mockResolvedValueOnce([]);
    expect(await getPuriRetention(f, now)).toEqual([
      { day: 1, eligible: 0, returned: 0 }, { day: 7, eligible: 0, returned: 0 }, { day: 30, eligible: 0, returned: 0 },
    ]);
    const retention = mocks.query.mock.calls[1][0];
    expect(retention.sql).toContain("(VALUES (1),(7),(30))");
    expect(retention.sql).toContain("= c.first_day + d.day");
    expect(retention.sql).toContain("ORDER BY p.\"createdAt\" ASC LIMIT 1");
  });

  it("uses continuous p50/p95 percentile semantics in milliseconds", async () => {
    const sample = [100, 200, 300, 400, 1000];
    const continuous = (fraction: number) => {
      const position = (sample.length - 1) * fraction;
      const lower = Math.floor(position);
      return sample[lower] + (sample[Math.ceil(position)] - sample[lower]) * (position - lower);
    };
    expect(continuous(0.5)).toBe(300);
    expect(continuous(0.95)).toBeCloseTo(880);
    await getPuriOverview(parsePuriFilters({ range: "7d" }));
    const sql = mocks.query.mock.calls[0][0].sql as string;
    expect(sql).toContain('PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r."totalDurationMs")');
    expect(sql).toContain('PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY r."totalDurationMs")');
  });
});
