type MercadoPagoFailure = {
  status: number;
  body: {
    error: string;
    code:
      | "MERCADOPAGO_NOT_CONFIGURED"
      | "MERCADOPAGO_UNAUTHORIZED"
      | "MERCADOPAGO_REJECTED_REQUEST"
      | "MERCADOPAGO_RATE_LIMITED"
      | "MERCADOPAGO_UNAVAILABLE"
      | "BILLING_UNEXPECTED_ERROR";
  };
};

function readProviderStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && Number.isFinite(status) ? status : null;
}

export function mercadoPagoNotConfigured(isProduction: boolean): MercadoPagoFailure {
  return {
    status: 503,
    body: {
      code: "MERCADOPAGO_NOT_CONFIGURED",
      error: isProduction
        ? "Los pagos están temporalmente fuera de servicio. Contacta a soporte."
        : "Mercado Pago no está configurado en este entorno local. Agrega una credencial válida para probar pagos.",
    },
  };
}

export function mapMercadoPagoFailure(
  error: unknown,
  isProduction: boolean,
): MercadoPagoFailure {
  const providerStatus = readProviderStatus(error);

  if (providerStatus === 401 || providerStatus === 403) {
    return {
      status: 503,
      body: {
        code: "MERCADOPAGO_UNAUTHORIZED",
        error: isProduction
          ? "No pudimos conectar con el servicio de pagos. Contacta a soporte."
          : `Mercado Pago rechazó la credencial local (${providerStatus}). Configura un ACCESS_TOKEN válido para probar la suscripción.`,
      },
    };
  }

  if (providerStatus === 400 || providerStatus === 422) {
    return {
      status: 502,
      body: {
        code: "MERCADOPAGO_REJECTED_REQUEST",
        error: "Mercado Pago rechazó los datos de la suscripción. Revisa el plan e intenta nuevamente.",
      },
    };
  }

  if (providerStatus === 429) {
    return {
      status: 503,
      body: {
        code: "MERCADOPAGO_RATE_LIMITED",
        error: "El servicio de pagos está recibiendo demasiadas solicitudes. Intenta nuevamente en unos minutos.",
      },
    };
  }

  if (providerStatus !== null && providerStatus >= 500) {
    return {
      status: 502,
      body: {
        code: "MERCADOPAGO_UNAVAILABLE",
        error: "Mercado Pago no está disponible en este momento. Intenta nuevamente más tarde.",
      },
    };
  }

  return {
    status: 500,
    body: {
      code: "BILLING_UNEXPECTED_ERROR",
      error: "No pudimos iniciar la suscripción. Intenta nuevamente o contacta a soporte.",
    },
  };
}
