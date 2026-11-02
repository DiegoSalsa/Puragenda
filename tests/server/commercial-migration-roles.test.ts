import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { optionalRoleSafeMigrationSql } from "../../scripts/commercial-migrations.mjs";

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
    }
  });

  it("no consulta privilegios con has_table_privilege para roles ausentes", () => {
    expect(runner).toContain("optionalPublicRoles");
    expect(runner).toContain("rolname = ANY($1::text[])");
    expect(runner).toContain("for(const role of optionalPublicRoles)");
  });
});
