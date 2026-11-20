import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { knownModelMicros, maximumModelMicros } from "@/server/puri/growth/budgets";
import { PLUS_VERIFIED_PRICE } from "@/server/puri/growth/pricing";
describe("Verified Plus Standard pricing and bounded reservations", () => {
  beforeEach(() => vi.stubEnv("PURI_PLUS_VERIFIED_PRICING_ENABLED", "1"));
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  it("includes cache writes at the separately verified rate", () => {
    expect(knownModelMicros("gpt-6-luna", { input_tokens: 1000, output_tokens: 200, input_tokens_details: { cached_tokens: 100, cache_write_tokens: 200 } })).toBe(196);
  });
  it("does not record missing usage or a changed model as free", () => {
    expect(knownModelMicros("gpt-6-luna", { input_tokens: 1000, output_tokens: 200, input_tokens_details: { cached_tokens: 100 } })).toBeNull();
    expect(knownModelMicros("unpriced-future-model", undefined)).toBeNull();
  });
  it("reserves the expensive input-cache-write bound and fences stale price snapshots", () => {
    expect(maximumModelMicros("gpt-6-luna", 1000, 200)).toBe(353);
    vi.useFakeTimers(); vi.setSystemTime(new Date(PLUS_VERIFIED_PRICE.validUntil));
    expect(maximumModelMicros("gpt-6-luna", 1000, 200)).toBeNull();
  });
  it("uses configured production rates after the bundled snapshot expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(PLUS_VERIFIED_PRICE.validUntil));
    vi.stubEnv("PURI_MODEL_PRICES_USD_PER_MILLION", JSON.stringify({
      "gpt-6-luna": { input: 0.10, output: 0.50, cachedInput: 0.01, cacheWrite: 0.125 },
    }));
    expect(maximumModelMicros("gpt-6-luna", 1000, 200)).toBe(353);
    expect(knownModelMicros("gpt-6-luna", {
      input_tokens: 1000, output_tokens: 200, input_tokens_details: { cached_tokens: 100, cache_write_tokens: 200 },
    })).toBe(196);
    expect(knownModelMicros("gpt-6-luna", {
      input_tokens: 1000, output_tokens: 200, input_tokens_details: { cached_tokens: 100 },
    })).toBe(214);
    expect(maximumModelMicros("another-model", 1000, 200)).toBeNull();
  });
});
