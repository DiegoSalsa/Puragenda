import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { prisma } from "@/server/db/prisma";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";
import {
  getMercadoPagoOrder,
  PosPaymentError,
  syncPosPaymentFromOrder,
} from "@/server/services/mercadopago-pos.service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as {
      type?: string;
      data?: { id?: string };
    } | null;
    const dataId = request.url
      ? new URL(request.url).searchParams.get("data.id") ?? body?.data?.id ?? null
      : body?.data?.id ?? null;
    if (body?.type !== "order" || !dataId) return Response.json({ received: true });

    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[mercadopago orders webhook] MERCADOPAGO_WEBHOOK_SECRET is not configured");
      return Response.json({ error: "Webhook no configurado" }, { status: 503 });
    }
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: webhookSecret,
      toleranceSeconds: 300,
    });

    const payment = await prisma.posPayment.findUnique({
      where: { providerOrderId: dataId },
      select: { id: true, businessId: true },
    });
    if (!payment) return Response.json({ received: true });

    const accessToken = await getValidMercadoPagoAccessToken(payment.businessId);
    if (!accessToken) {
      console.error("[mercadopago orders webhook] Missing access token", payment.businessId);
      return Response.json({ received: true });
    }
    const order = await getMercadoPagoOrder(accessToken, dataId);
    await syncPosPaymentFromOrder(payment.id, order);
    return Response.json({ received: true });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return Response.json({ error: "Firma inválida" }, { status: 401 });
    }
    if (error instanceof PosPaymentError) {
      console.warn("[mercadopago orders webhook]", error.code, error.message);
      return Response.json({ received: true });
    }
    console.error("[mercadopago orders webhook]", error);
    return Response.json({ received: true });
  }
}
