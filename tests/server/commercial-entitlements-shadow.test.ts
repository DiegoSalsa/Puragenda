import { describe, expect, it } from "vitest";
import { getCommercialEntitlementShadow } from "@/server/services/commercial-entitlements.service";
describe("shadow service failure isolation", () => {
  it("returns an unavailable evaluation without throwing or leaking database details", async () => {
    const db = { commercialSubscription: { findUnique: async () => { throw new Error("private provider or database reference"); } } } as never;
    const shadow = await getCommercialEntitlementShadow("business-a", db);
    expect(shadow).toMatchObject({ commercialAccess: false, shadow: true, error: "COMMERCIAL_SHADOW_UNAVAILABLE" });
    expect(JSON.stringify(shadow)).not.toContain("private provider");
  });
  it("does not grant anything when no snapshot exists", async () => {
    const db = { commercialSubscription: { findUnique: async () => null } } as never;
    expect(await getCommercialEntitlementShadow("business-a", db)).toMatchObject({ reason: "NO_SNAPSHOT", commercialAccess: false });
  });
});
