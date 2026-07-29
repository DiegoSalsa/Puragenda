import { describe, expect, it } from "vitest";
import {
  mapMercadoPagoFailure,
  mercadoPagoNotConfigured,
} from "@/server/lib/mercadopago-error";

describe("Mercado Pago billing failures", () => {
  it("explains a rejected local credential without exposing its value", () => {
    expect(
      mapMercadoPagoFailure(
        { status: 401, message: "Unauthorized access to resource." },
        false,
      ),
    ).toEqual({
      status: 503,
      body: {
        code: "MERCADOPAGO_UNAUTHORIZED",
        error:
          "Mercado Pago rechazó la credencial local (401). Configura un ACCESS_TOKEN válido para probar la suscripción.",
      },
    });
  });

  it("keeps credential details generic in production", () => {
    const result = mapMercadoPagoFailure({ status: 401 }, true);

    expect(result.status).toBe(503);
    expect(result.body.error).toBe(
      "No pudimos conectar con el servicio de pagos. Contacta a soporte.",
    );
    expect(result.body.error).not.toContain("ACCESS_TOKEN");
  });

  it("distinguishes provider rejection, rate limiting and outage", () => {
    expect(mapMercadoPagoFailure({ status: 422 }, false).body.code).toBe(
      "MERCADOPAGO_REJECTED_REQUEST",
    );
    expect(mapMercadoPagoFailure({ status: 429 }, false).body.code).toBe(
      "MERCADOPAGO_RATE_LIMITED",
    );
    expect(mapMercadoPagoFailure({ status: 500 }, false).body.code).toBe(
      "MERCADOPAGO_UNAVAILABLE",
    );
  });

  it("returns an explicit response when the environment has no credential", () => {
    expect(mercadoPagoNotConfigured(false)).toEqual({
      status: 503,
      body: {
        code: "MERCADOPAGO_NOT_CONFIGURED",
        error:
          "Mercado Pago no está configurado en este entorno local. Agrega una credencial válida para probar pagos.",
      },
    });
  });
});
