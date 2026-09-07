import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHILE_COMMUNE_COUNT,
  CHILE_COMMUNES,
  CHILE_REGION_COUNT,
  CHILE_REGIONS,
} from "@/lib/marketplace/chile-communes";

describe("official Chile marketplace locality catalog", () => {
  it("contains all 16 regions and 346 communes without duplicate codes or slugs", () => {
    expect(CHILE_REGIONS).toHaveLength(CHILE_REGION_COUNT);
    expect(CHILE_REGION_COUNT).toBe(16);
    expect(CHILE_COMMUNES).toHaveLength(CHILE_COMMUNE_COUNT);
    expect(CHILE_COMMUNE_COUNT).toBe(346);
    expect(new Set(CHILE_COMMUNES.map((commune) => commune.code)).size).toBe(346);
    expect(new Set(CHILE_COMMUNES.map((commune) => commune.slug)).size).toBe(346);
    expect(CHILE_REGIONS.every((region) => region.communes.length > 0)).toBe(true);
  });

  it("covers boundary and recently separated regions with canonical communes", () => {
    expect(CHILE_COMMUNES).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "General Lagos", regionName: "Arica y Parinacota" }),
      expect.objectContaining({ name: "Chillán", regionName: "Ñuble" }),
      expect.objectContaining({ name: "Cabo de Hornos", regionName: "Magallanes y de la Antártica Chilena" }),
      expect.objectContaining({ name: "Antártica", regionName: "Magallanes y de la Antártica Chilena" }),
    ]));
  });

  it("ships the same 346 canonical entries in the idempotent database migration", () => {
    const migration = readFileSync(join(
      process.cwd(),
      "prisma/migrations/20260906203000_marketplace_all_chile_communes/migration.sql",
    ), "utf8");

    expect(migration.match(/\('mloc_cl_\d{5}'/g)).toHaveLength(346);
    expect(migration).toContain('ON CONFLICT ("slug") DO UPDATE');
  });
});
