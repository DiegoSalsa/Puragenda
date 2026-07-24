import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  const paymentId = request.nextUrl.searchParams.get("payment_id");
  const baseUrl = process.env.NODE_ENV === "production"
    ? (process.env.NEXT_PUBLIC_APP_URL || "https://www.puragenda.cl")
    : request.nextUrl.origin;
  if (!orderId) return NextResponse.redirect(`${baseUrl}?error=missing_order`);

  const order = await prisma.productionOrder.findUnique({
    where: { id: orderId },
    include: { business: { select: { mpAccessToken: true } } },
  });
  if (!order) return NextResponse.redirect(`${baseUrl}?error=order_not_found`);

  let result = "pending";
  if (paymentId && order.business.mpAccessToken) {
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${order.business.mpAccessToken}` },
    });
    if (paymentResponse.ok) {
      const payment = await paymentResponse.json();
      const valid = payment.external_reference === `production:${order.id}` &&
        Number(payment.transaction_amount) >= order.depositAmount;
      if (valid && payment.status === "approved") {
        await prisma.productionOrder.update({
          where: { id: order.id },
          data: {
            depositPaymentStatus: "APPROVED",
            depositMpPaymentId: paymentId,
            status: order.referenceImageUrls.length > 0 ? "REFERENCES_REVIEW" : "QUEUED",
          },
        });
        result = "success";
      } else if (valid && (payment.status === "rejected" || payment.status === "cancelled")) {
        await prisma.productionOrder.update({
          where: { id: order.id },
          data: { depositPaymentStatus: "REJECTED", depositMpPaymentId: paymentId },
        });
        result = "failed";
      }
    }
  }

  return NextResponse.redirect(`${baseUrl}/encargo/${order.orderNumber}?payment=${result}`);
}
