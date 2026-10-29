import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), context: vi.fn(), policy: vi.fn(), puri: vi.fn(), contact: vi.fn() }));
vi.mock("@/server/services/commercial-plan-access", () => ({ getCommercialPlanAccess: mocks.access }));
vi.mock("@/server/services/commercial-usage-policy", () => ({ commercialUsageContext: mocks.context, commercialUsagePolicy: mocks.policy }));
vi.mock("@/server/db/prisma", () => ({ prisma: { puriBudgetBucket: { findMany: mocks.puri }, cfQuotaBucket: { findMany: mocks.contact } } }));
import { getCommercialUsageSummary } from "@/server/services/commercial-usage-summary";
const allocation = { puri: { ALL: { limitMicros: 1000, limitUnits: 10 }, STANDARD_INTERACTIVE: { limitMicros: 1000, limitUnits: 10 } } };
describe("customer quota projection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.access.mockResolvedValue({ v2: true, allowed: true, snapshot: { planCode: "PURAGENDA", status: "TRIALING", trialEnd: new Date("2026-11-01") } });
    mocks.context.mockResolvedValue({ periodStart: new Date("2026-10-01"), period: "trial-synthetic", allocation });
    mocks.policy.mockReturnValue({ global: { puri: allocation.puri.ALL } });
    mocks.puri.mockResolvedValue([{ businessId: "a", category: "STANDARD_INTERACTIVE", spentUnits: 3, reservedUnits: 1, spentMicros: 10, reservedMicros: 10 }, { businessId: "a", category: "ALL", spentUnits: 7, reservedUnits: 1, spentMicros: 30, reservedMicros: 10 }]);
    mocks.contact.mockResolvedValue([]);
  });
  it("shows committed consumption, the shared remaining cap, trial end and Plus exclusives without internal pricing", async () => {
    const result = await getCommercialUsageSummary("a", new Date("2026-10-28"));
    expect(result).toMatchObject({ trial: true, active: true, resetsAt: "2026-11-01T00:00:00.000Z" });
    expect(result!.items[0]).toMatchObject({ used: 3, reserved: 1, remaining: 2 });
    expect(result!.items.find(item => item.key === "PLUS_INTERACTIVE")!.state).toBe("EXCLUSIVE");
    expect(JSON.stringify(result)).not.toMatch(/Micros|Tokens|model|global:/);
  });
  it("shows expired access without allocating or resetting a budget", async () => {
    mocks.access.mockResolvedValue({ v2: true, allowed: false, snapshot: { planCode: "PURAGENDA_PLUS", status: "TRIALING", trialEnd: new Date("2026-10-01") } });
    expect((await getCommercialUsageSummary("a"))!.items.every(item => item.state === "INACTIVE")).toBe(true);
    expect(mocks.puri).not.toHaveBeenCalled(); expect(mocks.context).not.toHaveBeenCalled();
  });
  it("keeps missing allocations closed and leaves legacy plans outside the V2 projection", async () => {
    mocks.policy.mockReturnValue(null);
    expect((await getCommercialUsageSummary("a"))!.items[0].state).toBe("UNCONFIGURED");
    mocks.access.mockResolvedValue({ v2: false }); expect(await getCommercialUsageSummary("legacy")).toBeNull();
  });
});
