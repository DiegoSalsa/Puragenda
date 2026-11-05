import { afterEach, describe, expect, it, vi } from "vitest";
import { localCommercialDatabase, stagingCommercialDatabase } from "../../scripts/commercial-migrations.mjs";

const fixtureUrl = new URL("postgresql://ep-twilight-hat-be6cl0zr.c-9.us-east-2.aws.neon.tech/puragenda_next_staging?sslmode=require&sslaccept=strict&channel_binding=require");
fixtureUrl.username = "puragenda_next_staging_owner";
fixtureUrl.password = "synthetic-only";
const allowed = fixtureUrl.href;
afterEach(() => vi.unstubAllEnvs());
function authorize() { vi.stubEnv("RC1_STAGING_CONFIRM", "puragenda-next-staging"); vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("NODE_ENV", "test"); }

describe("migraciones sólo al staging autorizado", () => {
  it("no amplía la autorización de los runners locales", () => {
    authorize(); expect(() => localCommercialDatabase(allowed)).toThrow("ISOLATED_COMMERCIAL_DATABASE_REQUIRED");
  });
  it("exige autorización y entorno Preview incluso con la URL exacta", () => {
    authorize(); vi.stubEnv("RC1_STAGING_CONFIRM", ""); expect(() => stagingCommercialDatabase(allowed)).toThrow();
    authorize(); vi.stubEnv("VERCEL_ENV", "production"); expect(() => stagingCommercialDatabase(allowed)).toThrow();
    authorize(); vi.stubEnv("NODE_ENV", "production"); expect(() => stagingCommercialDatabase(allowed)).toThrow();
  });
  it("acepta sólo el endpoint directo, base y rol preaprobados", () => {
    authorize(); expect(stagingCommercialDatabase(allowed)).toBe(new URL(allowed).href);
    for (const input of [allowed.replace("ep-twilight-hat-be6cl0zr.c-9", "production.c-9"), allowed.replace("/puragenda_next_staging?", "/production?"), allowed.replace("staging_owner:", "production_owner:"), allowed.replace("be6cl0zr.c-9", "be6cl0zr-pooler.c-9")]) expect(() => stagingCommercialDatabase(input)).toThrow();
  });
  it("rechaza TLS permisivo y puertos o fragmentos inesperados", () => {
    authorize(); for (const input of [allowed.replace("sslaccept=strict", "sslaccept=accept_invalid_certs"), allowed.replace("sslmode=require", "sslmode=disable"), allowed.replace("channel_binding=require", "channel_binding=disable"), allowed.replace(".tech/", ".tech:5433/"), allowed + "#unexpected", allowed + "&host=production.example", allowed + "&sslmode=disable"]) expect(() => stagingCommercialDatabase(input)).toThrow();
  });
});
