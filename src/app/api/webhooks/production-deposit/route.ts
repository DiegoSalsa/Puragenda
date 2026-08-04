import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";

export async function POST(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get("orderId");
    const body = await request.json();
    const paymentId = (body.data as Record<string, unknown> | undefined)?.id;
    if (body.type !== "payment" || !orderId || typeof paymentId !== "string") {
      return Response.json({ received: true });
    }

    const order = await prisma.productionOrder.findUnique({
      where: { id: orderId },
      include: { business: { select: { currencyCode: true } } },
    });
    if (!order) return Response.json({ received: true });
    const accessToken = await getValidMercadoPagoAccessToken(order.businessId);
    if (!accessToken) return Response.json({ received: true });

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!paymentResponse.ok) return Response.json({ received: true });
    const payment = await paymentResponse.json();
    if (
      payment.external_reference !== `production:${order.id}` ||
      typeof payment.transaction_amount !== "number" ||
      Math.abs(payment.transaction_amount - order.depositAmount) >= 0.01 ||
      payment.currency_id !== order.business.currencyCode
    ) {
      console.warn("[production-deposit] Payment validation failed", order.id);
      return Response.json({ received: true });
    }

    if (payment.status === "approved") {
      await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          depositPaymentStatus: "APPROVED",
          depositMpPaymentId: paymentId,
          status: order.referenceImageUrls.length > 0 ? "REFERENCES_REVIEW" : "QUEUED",
        },
      });
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await prisma.productionOrder.update({
        where: { id: order.id },
        data: { depositPaymentStatus: "REJECTED", depositMpPaymentId: paymentId },
      });
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("[production-deposit] Error:", error);
    return Response.json({ received: true });
  }
}
