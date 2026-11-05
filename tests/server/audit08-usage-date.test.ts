import { describe, expect, it } from "vitest";
import { commercialUsageResetDate } from "@/core/commercial-usage";

describe("Auditoría 08 / fecha de consumo durante hidratación", () => {
  it("uses stable numeric text at the Santiago month boundary", () => {
    expect(commercialUsageResetDate("2026-12-01T00:00:00Z")).toBe("30-11-2026 21:00");
    expect(commercialUsageResetDate("2026-12-01T00:00:00Z", false)).toBe("30-11-2026");
  });
  it("preserves Santiago winter time independently of the device timezone", () => {
    expect(commercialUsageResetDate("2026-07-01T00:00:00Z")).toBe("30-06-2026 20:00");
  });
});
