import { describe, expect, it } from "vitest";
import {
  COUNTRY_CONFIG,
  getCountryConfig,
  getCurrencyOptions,
  getMercadoPagoCurrency,
  getTimezoneOptions,
  isMercadoPagoCurrencyCompatible,
  isSupportedCountryCode,
  normalizeAndValidateTaxId,
} from "@/core/countries";
import { registerSchema } from "@/server/validations/auth";

const validRegistration = {
  email: "cliente@example.com",
  password: "password-segura",
  name: "Cliente Prueba",
  businessName: "Negocio Prueba",
  termsAccepted: true as const,
};

describe("business country configuration", () => {
  it("maps Chile and Argentina to their operational timezone and currency", () => {
    expect(COUNTRY_CONFIG.CL).toMatchObject({
      timezone: "America/Santiago",
      currency: "CLP",
      mercadoPagoSiteId: "MLC",
    });
    expect(COUNTRY_CONFIG.AR).toMatchObject({
      timezone: "America/Argentina/Buenos_Aires",
      currency: "ARS",
      mercadoPagoSiteId: "MLA",
    });
  });

  it("falls back to Chile for invalid legacy records and supports generic ISO countries", () => {
    expect(getCountryConfig(null).code).toBe("CL");
    expect(getCountryConfig("XX").code).toBe("CL");
    expect(getCountryConfig("JP")).toMatchObject({ code: "JP", timezone: "UTC", currency: "USD" });
  });

  it("recognizes ISO countries beyond Chile and Argentina", () => {
    expect(isSupportedCountryCode("AR")).toBe(true);
    expect(isSupportedCountryCode("US")).toBe(true);
    expect(isSupportedCountryCode("JP")).toBe(true);
    expect(isSupportedCountryCode("XX")).toBe(false);
  });

  it("validates Mercado Pago currencies from one shared country configuration", () => {
    expect(getMercadoPagoCurrency("AR")).toBe("ARS");
    expect(getMercadoPagoCurrency("PE")).toBe("PEN");
    expect(getMercadoPagoCurrency("US")).toBeNull();
    expect(isMercadoPagoCurrencyCompatible("AR", "ars")).toBe(true);
    expect(isMercadoPagoCurrencyCompatible("AR", "USD")).toBe(false);
    expect(isMercadoPagoCurrencyCompatible("PE", "COP")).toBe(false);
    expect(isMercadoPagoCurrencyCompatible("US", "USD")).toBe(false);
  });

  it("offers the regional timezones needed for Chile and Mexico", () => {
    const chile = getTimezoneOptions("CL").filter((option) => option.preferred).map((option) => option.value);
    const mexico = getTimezoneOptions("MX").filter((option) => option.preferred).map((option) => option.value);
    expect(chile).toEqual(expect.arrayContaining(["America/Santiago", "America/Punta_Arenas", "Pacific/Easter"]));
    expect(mexico).toEqual(expect.arrayContaining(["America/Mexico_City", "America/Tijuana", "America/Cancun"]));
  });

  it("offers selectable ISO currencies including the supported Latin American ones", () => {
    const currencies = getCurrencyOptions().map((option) => option.value);
    expect(currencies).toEqual(expect.arrayContaining(["CLP", "ARS", "COP", "USD", "MXN"]));
  });
});

describe("country tax identifiers", () => {
  it("normalizes Chilean RUT and Argentine DNI/CUIT independently", () => {
    expect(normalizeAndValidateTaxId("CL", "12.345.678-9")).toEqual({ value: "12345678-9" });
    expect(normalizeAndValidateTaxId("AR", "12.345.678")).toEqual({ value: "12345678" });
    expect(normalizeAndValidateTaxId("AR", "20-12345678-3")).toEqual({ value: "20123456783" });
  });

  it("rejects an identifier in the wrong country format", () => {
    expect(normalizeAndValidateTaxId("CL", "20123456783").error).toBeDefined();
    expect(normalizeAndValidateTaxId("AR", "12345678-K").error).toBeDefined();
  });
});

describe("registration country validation", () => {
  it("accepts countries worldwide and keeps Chile as a legacy API default", () => {
    expect(registerSchema.parse({ ...validRegistration, countryCode: "AR" }).countryCode).toBe("AR");
    expect(registerSchema.parse({ ...validRegistration, countryCode: "JP", timezone: "Asia/Tokyo", currencyCode: "JPY" })).toMatchObject({
      countryCode: "JP",
      timezone: "Asia/Tokyo",
      currencyCode: "JPY",
    });
    expect(registerSchema.parse(validRegistration).countryCode).toBe("CL");
  });

  it("rejects unsupported countries", () => {
    expect(registerSchema.safeParse({ ...validRegistration, countryCode: "XX" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegistration, countryCode: "JP", timezone: "Mars/Tokyo" }).success).toBe(false);
  });
});
