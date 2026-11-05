import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), reserve: vi.fn(), settle: vi.fn(), maximum: vi.fn(), known: vi.fn() }));
vi.mock("@/server/services/commercial-plan-access", () => ({ getCommercialPlanAccess: mocks.access }));
vi.mock("@/server/puri/growth/budgets", () => ({ GrowthBudgetError: class extends Error {}, maximumModelMicros: mocks.maximum, knownModelMicros: mocks.known, reserveGrowthUsage: mocks.reserve, settleGrowthUsage: mocks.settle }));
import { withCommercialPuriUsage } from "@/server/puri/commercial-usage";

describe("standard Puri commercial usage", () => {
  beforeEach(() => {
    vi.resetAllMocks(); mocks.access.mockResolvedValue({ has: () => true });
    mocks.maximum.mockReturnValue(20); mocks.known.mockReturnValue(10);
    mocks.reserve.mockResolvedValue({ reservation: { id: "reservation" } }); mocks.settle.mockResolvedValue(undefined);
  });
  const request = () => ({ businessId: "business", model: "test-model", parameters: { synthetic: true }, maxRetries: 2, run: vi.fn(async () => ({ model: "test-model", service_tier: "default", usage: { input_tokens: 2, output_tokens: 1 } })) });
  it("checks entitlement and reserves capacity before invoking a model", async () => {
    const input = request(); await withCommercialPuriUsage(input);
    expect(mocks.reserve).toHaveBeenCalledWith(expect.objectContaining({ category: "STANDARD_INTERACTIVE", micros: 60 }));
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(input.run.mock.invocationCallOrder[0]);
    expect(mocks.settle).toHaveBeenCalledWith("reservation", expect.objectContaining({ actualMicros: 10 }));
  });
  it("blocks expired trials independently of the interface", async () => {
    mocks.access.mockResolvedValue({ has: () => false }); const input = request();
    await expect(withCommercialPuriUsage(input)).rejects.toThrow("FORBIDDEN"); expect(input.run).not.toHaveBeenCalled();
  });
  it("does not call a model without an approved allowance or a known price", async () => {
    mocks.reserve.mockRejectedValue(new Error("COMMERCIAL_USAGE_LIMITS_UNDEFINED")); const input = request();
    await expect(withCommercialPuriUsage(input)).rejects.toThrow("COMMERCIAL_USAGE_LIMITS_UNDEFINED"); expect(input.run).not.toHaveBeenCalled();
    mocks.maximum.mockReturnValue(null); await expect(withCommercialPuriUsage(input)).rejects.toThrow("MODEL_PRICE_UNKNOWN"); expect(input.run).not.toHaveBeenCalled();
  });
  it("keeps uncertain provider consumption reserved for reconciliation", async () => {
    const input = request(); input.run.mockRejectedValue(new Error("timeout"));
    await expect(withCommercialPuriUsage(input)).rejects.toThrow("timeout");
    expect(mocks.settle).toHaveBeenCalledWith("reservation", expect.objectContaining({ actualMicros: null, errorCode: "MODEL_OUTCOME_UNKNOWN" }));
    expect(input.run).toHaveBeenCalledTimes(1);
  });
});
