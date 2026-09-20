import crypto from "crypto";
import { describe, expect, it } from "vitest";

import { verifyMercadoPagoWebhookSignature } from "@/server/lib/mercadopago-webhook";

function signature(params: {
  dataId: string;
  requestId: string;
  timestamp: string;
  secret: string;
}) {
  const manifest = `id:${params.dataId};request-id:${params.requestId};ts:${params.timestamp};`;
  const hash = crypto
    .createHmac("sha256", params.secret)
    .update(manifest)
    .digest("hex");
  return `ts=${params.timestamp},v1=${hash}`;
}

describe("Mercado Pago webhook signature", () => {
  it("validates the signed URL data.id and normalizes alphanumeric IDs", () => {
    const secret = "webhook-secret";
    const requestId = "request-123";
    const timestamp = "1789932000000";
    const signedDataId = "abc123def";

    const result = verifyMercadoPagoWebhookSignature({
      xSignature: signature({ dataId: signedDataId, requestId, timestamp, secret }),
      xRequestId: requestId,
      dataId: "ABC123DEF",
      secret,
    });

    expect(result).toEqual({ valid: true });
  });

  it("rejects a signature generated for a different resource", () => {
    const secret = "webhook-secret";
    const requestId = "request-123";
    const timestamp = "1789932000000";

    const result = verifyMercadoPagoWebhookSignature({
      xSignature: signature({ dataId: "resource-a", requestId, timestamp, secret }),
      xRequestId: requestId,
      dataId: "resource-b",
      secret,
    });

    expect(result).toEqual({ valid: false, reason: "invalid_signature" });
  });

  it("fails closed when the webhook secret is missing", () => {
    expect(verifyMercadoPagoWebhookSignature({
      xSignature: "ts=1,v1=abc",
      xRequestId: "request-123",
      dataId: "resource-a",
      secret: undefined,
    })).toEqual({ valid: false, reason: "missing_secret" });
  });
});
