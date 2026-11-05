import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { optionalRoleSafeMigrationSql, inspectOptionalRoleMigration } from "../../scripts/commercial-migrations.mjs";

const webPlus = readFileSync(resolve(process.cwd(), "prisma/migrations/20261022180000_commercial_migration_web_plus/migration.sql"), "utf8");
const growth = readFileSync(resolve(process.cwd(), "prisma/migrations/20261022210000_puri_plus_growth/migration.sql"), "utf8");
const runner = readFileSync(resolve(process.cwd(), "scripts/commercial-migrations.mjs"), "utf8");

describe("migraciones comerciales compatibles con PostgreSQL estándar", () => {
  it("mantiene el SQL histórico y genera una copia con revocaciones opcionales", () => {
    expect(webPlus).toContain("FROM PUBLIC, anon, authenticated;");
    expect(growth).toContain("FROM PUBLIC, anon, authenticated;");
    for (const name of ["20261022180000_commercial_migration_web_plus", "20261022210000_puri_plus_growth"]) {
      const migration = optionalRoleSafeMigrationSql(name);
      expect(migration).toContain("REVOKE ALL ON");
      expect(migration).toMatch(/IF EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'anon'\)/);
      expect(migration).toMatch(/IF EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'authenticated'\)/);
      expect(migration).not.toMatch(/FROM PUBLIC, anon, authenticated/);
      const original = name === "20261022180000_commercial_migration_web_plus" ? webPlus : growth;
      const strip = (value: string) => value
        .replace(/REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM PUBLIC, anon, authenticated;/g, "")
        .replace(/REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM PUBLIC;/g, "")
        .replace(/REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM anon;/g, "")
        .replace(/REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM authenticated;/g, "")
        .replace(/REVOKE ALL ON "PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit" FROM PUBLIC, anon, authenticated;/g, "")
        .replace(/REVOKE ALL ON "PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit" FROM PUBLIC;/g, "")
        .replace(/REVOKE ALL ON "PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit" FROM anon;/g, "")
        .replace(/REVOKE ALL ON "PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit" FROM authenticated;/g, "")
        .replace(/DO \$\$[\s\S]*?END \$\$;/g, "")
        .replace(/\s+/g, "");
      expect(strip(migration)).toBe(strip(original));
      expect(migration.trimStart().startsWith("BEGIN;")).toBe(true);
      expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    }
  });

  it("no consulta privilegios con has_table_privilege para roles ausentes", () => {
    expect(runner).toContain("optionalPublicRoles");
    expect(runner).toContain("rolname = ANY($1::text[])");
    expect(runner).toContain("for(const role of optionalPublicRoles)");
  });

  it("expone un verificador que distingue esquema ausente, completo y parcial", async () => {
    const queries: string[] = [];
    const pool = { query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes("FROM pg_roles")) return { rows: [] };
      if (sql.includes("FROM pg_class") && sql.includes("relkind='r'")) return { rows: [{ count: 0 }] };
      return { rows: [{ count: 0 }] };
    } } as never;
    await expect(inspectOptionalRoleMigration(pool, "20261022180000_commercial_migration_web_plus")).resolves.toBe("absent");
    expect(queries.length).toBeGreaterThan(0);
  });
});
