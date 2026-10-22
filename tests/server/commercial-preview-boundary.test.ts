import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertCommercialSandbox } from "@/server/services/commercial-internal";
describe("Commercial staging boundary", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("allows only the fingerprinted preview database, never production with the same switches", () => {
    const database = "postgresql://fixture:synthetic@staging.example.invalid/isolated";
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("DATABASE_URL", database); vi.stubEnv("COMMERCIAL_V2_INTERNAL_WRITES", "1");
    vi.stubEnv("COMMERCIAL_V2_PREVIEW_ENABLED", "1");
    vi.stubEnv("COMMERCIAL_V2_PREVIEW_DATABASE_SHA256", createHash("sha256").update(new URL(database).href).digest("hex"));
    expect(() => assertCommercialSandbox()).not.toThrow();
    vi.stubEnv("DATABASE_URL", database + "-other");
    expect(() => assertCommercialSandbox()).toThrow("COMMERCIAL_WRITES_DISABLED");
    vi.stubEnv("DATABASE_URL", database); vi.stubEnv("VERCEL_ENV", "production");
    expect(() => assertCommercialSandbox()).toThrow("COMMERCIAL_WRITES_DISABLED");
  });
});
