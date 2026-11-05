import { describe, expect, it } from "vitest";
import { validateProductionEnv } from "../../scripts/validate-production-env.mjs";

const valid = {
  NODE_ENV: "production" as const,
  AUTH_SECRET: "test-auth-secret-with-at-least-32-characters",
  DATABASE_URL: "postgresql://db.example.invalid/puragenda",
  MERCADOPAGO_ACCESS_TOKEN: "test-access-token",
  MERCADOPAGO_WEBHOOK_SECRET: "test-webhook-secret",
  RESEND_API_KEY: "test-resend-key",
  EMAIL_FROM: "Puragenda <no-reply@example.test>",
  NEXT_PUBLIC_APP_URL: "https://www.puragenda.cl",
};

describe("production environment validation", () => {
  it("requires the session secret used by runtime auth", () => {
    expect(() => validateProductionEnv({
      ...valid,
      AUTH_SECRET: "",
      NEXTAUTH_SECRET: "",
      GIFT_CARD_SECRET: "unrelated-token-secret-that-must-not-count",
    })).toThrow(/AUTH_SECRET or NEXTAUTH_SECRET/);
  });

  it("accepts the documented AUTH_SECRET configuration", () => {
    expect(() => validateProductionEnv(valid)).not.toThrow();
  });
  it("refuses to launch Next with its checkout disabled or pointed at Preview", () => {
    expect(() => validateProductionEnv({ ...valid, PURAGENDA_NEXT_ENABLED: "1" })).toThrow(/checkout to be enabled/);
    const billing = { ...valid, PURAGENDA_NEXT_ENABLED: "1", PURAGENDA_MP_V2_ENABLED: "1", PURAGENDA_MP_V2_ENVIRONMENT: "production", PURAGENDA_MP_V2_PRODUCTION_WRITES: "1", PURAGENDA_MP_V2_PRODUCTION_ACCOUNT_ID: "123", MP_APP_ID: "456", PURAGENDA_MP_V2_APP_URL: valid.NEXT_PUBLIC_APP_URL };
    expect(() => validateProductionEnv(billing)).not.toThrow();
    expect(() => validateProductionEnv({ ...billing, PURAGENDA_MP_V2_APP_URL: "https://example-preview.vercel.app" })).toThrow(/production application origin/);
    expect(() => validateProductionEnv({ ...billing, PURAGENDA_MP_V2_PRODUCTION_ACCOUNT_ID: "" })).toThrow(/verified production account/);
  });
});
