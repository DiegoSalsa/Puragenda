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
});
