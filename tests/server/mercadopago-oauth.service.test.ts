import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMercadoPagoOAuthState,
  getMercadoPagoOAuthConfig,
  verifyMercadoPagoOAuthState,
} from "@/server/services/mercadopago-oauth.service";
import { COUNTRY_CONFIG, MERCADO_PAGO_COUNTRY_CODES } from "@/core/countries";

const mercadoPagoCountries = ["CL", "AR", "BR", "CO", "MX", "PE", "UY"];
const siteIds: Record<string, string> = {
  CL: "MLC",
  AR: "MLA",
  BR: "MLB",
  CO: "MCO",
  MX: "MLM",
  PE: "MPE",
  UY: "MLU",
};

describe("Mercado Pago country OAuth configuration", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-secret-with-at-least-thirty-two-characters");
    vi.stubEnv("MP_APP_ID", "shared-client");
    vi.stubEnv("MP_CLIENT_SECRET", "shared-secret");
    vi.stubEnv("MP_REDIRECT_URI", "https://example.test/api/mercadopago/callback");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("reuses one shared application for every Mercado Pago country", () => {
    expect(MERCADO_PAGO_COUNTRY_CODES).toEqual(mercadoPagoCountries);
    for (const countryCode of mercadoPagoCountries) {
      expect(getMercadoPagoOAuthConfig(countryCode)).toEqual({
        clientId: "shared-client",
        clientSecret: "shared-secret",
        redirectUri: "https://example.test/api/mercadopago/callback",
      });
      expect(COUNTRY_CONFIG[countryCode].mercadoPagoSiteId).toBe(siteIds[countryCode]);
    }
    expect(getMercadoPagoOAuthConfig("ES")).toBeNull();
  });

  it("normalizes lowercase country input", () => {
    expect(getMercadoPagoOAuthConfig("pe")).toMatchObject({ clientId: "shared-client" });
  });

  it("allows an optional country override without duplicating the shared redirect", () => {
    vi.stubEnv("MP_APP_ID_AR", "argentina-client");
    vi.stubEnv("MP_CLIENT_SECRET_AR", "argentina-secret");

    expect(getMercadoPagoOAuthConfig("AR")).toEqual({
      clientId: "argentina-client",
      clientSecret: "argentina-secret",
      redirectUri: "https://example.test/api/mercadopago/callback",
    });
    expect(getMercadoPagoOAuthConfig("PE")).toMatchObject({ clientId: "shared-client" });
  });

  it("signs country-bound, expiring OAuth state and rejects tampering", () => {
    const state = createMercadoPagoOAuthState("business-123", "AR");
    expect(verifyMercadoPagoOAuthState(state)).toMatchObject({ businessId: "business-123", countryCode: "AR" });

    const tampered = `${state.slice(0, -1)}${state.endsWith("a") ? "b" : "a"}`;
    expect(verifyMercadoPagoOAuthState(tampered)).toBeNull();
  });
});
