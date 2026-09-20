import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from "mercadopago";

export function verifyMercadoPagoWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string | undefined;
}) {
  if (!params.secret) {
    return { valid: false as const, reason: "missing_secret" as const };
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: params.xSignature,
      xRequestId: params.xRequestId,
      // Mercado Pago documents that alphanumeric data.id values must be
      // normalized to lowercase before calculating the signed manifest.
      dataId: params.dataId?.toLowerCase() ?? null,
      secret: params.secret,
    });
    return { valid: true as const };
  } catch (error) {
    return {
      valid: false as const,
      reason:
        error instanceof InvalidWebhookSignatureError
          ? "invalid_signature" as const
          : "verification_error" as const,
    };
  }
}
