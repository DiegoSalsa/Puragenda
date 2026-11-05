import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20261021120000_commercial_infrastructure_v2/migration.sql"), "utf8");

describe("commercial infrastructure migration", () => {
  it("is additive and creates every isolated commercial table", () => {
    for (const table of ["CommercialSubscription", "CommercialSubscriptionItem", "CommercialEntitlement", "CommercialEvent", "SeatChangeRequest"]) {
      expect(migration).toContain(`CREATE TABLE \"${table}\"`);
      expect(migration).toContain(`ALTER TABLE \"${table}\" ENABLE ROW LEVEL SECURITY`);
    }
    expect(migration).toContain("CREATE UNIQUE INDEX \"CommercialEvent_source_eventId_key\"");
    expect(migration).toContain("CREATE UNIQUE INDEX \"SeatChangeRequest_idempotencyKey_key\"");
    expect(migration).toContain("REVOKE ALL ON TABLE");
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|TYPE)\b/i);
    expect(migration).not.toMatch(/\bTRUNCATE\b/i);
  });

  it("protects V2 annual billing and preserves tier breakdown data", () => {
    expect(migration).toContain("CommercialSubscription_v2_monthly_check");
    expect(migration).toContain("pricingSnapshot");
    expect(migration).toContain("CommercialSubscriptionItemKind");
  });
});
