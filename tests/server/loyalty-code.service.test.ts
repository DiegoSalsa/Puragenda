import { describe, expect, it } from "vitest";

import {
  buildLoyaltyRewardCode,
  normalizeLoyaltyCodePrefix,
} from "@/server/services/loyalty-code.service";

describe("loyalty reward codes", () => {
  it("normalizes a business-defined prefix", () => {
    expect(normalizeLoyaltyCodePrefix(" Terapias Sec! ")).toBe("TERAPIAS-SEC");
  });

  it("preserves accented Spanish letters in ASCII form", () => {
    expect(normalizeLoyaltyCodePrefix("Terapías Ñuñoa")).toBe(
      "TERAPIAS-NUNOA"
    );
  });

  it("falls back to the default prefix when empty", () => {
    expect(normalizeLoyaltyCodePrefix("---")).toBe("PREMIO");
  });

  it("keeps a unique suffix on personalized codes", () => {
    expect(buildLoyaltyRewardCode("terapias", "a1b2c3d4e5")).toBe(
      "TERAPIAS-A1B2C3D4E5"
    );
  });
});
