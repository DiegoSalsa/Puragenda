import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { sendGiftCardEmail } from "@/server/email/gift-card";
import { issueGiftCardForPurchase } from "@/server/services/gift-card.service";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { type?: string; data?: { id?: string | number } };
    const queryId = request.nextUrl.searchParams.get("data.id");
    const bodyId = body.data?.id === undefined ? null : String(body.data.id);
    if (queryId && bodyId && queryId !== bodyId) return NextResponse.json({ error: "Conflicting payment identifiers" }, { status: 400 });
    const paymentId = queryId || bodyId;
    if (body.type !== "payment" || !paymentId) return NextResponse.json({ received: true });
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: "Webhook verification unavailable" }, { status: 503 });
    WebhookSignatureValidator.validate({ xSignature: request.headers.get("x-signature"), xRequestId: request.headers.get("x-request-id"), dataId: paymentId, secret, toleranceSeconds: 300 });
    const businessId = request.nextUrl.searchParams.get("businessId");
    if (!businessId) return NextResponse.json({ error: "Missing business" }, { status: 400 });
    const accessToken = await getValidMercadoPagoAccessToken(businessId);
    if (!accessToken) return NextResponse.json({ error: "Payment verification unavailable" }, { status: 503 });
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: "Payment verification failed" }, { status: 502 });
    const payment = await response.json() as { status?: string; external_reference?: string; transaction_amount?: number; currency_id?: string };
    if (!payment.external_reference) return NextResponse.json({ received: true });
    const purchase = await prisma.giftCardPurchase.findUnique({ where: { id: payment.external_reference }, select: { id: true, businessId: true, salePrice: true, currencyCode: true, paymentStatus: true } });
    if (!purchase || purchase.businessId !== businessId) return NextResponse.json({ received: true });
    if (typeof payment.transaction_amount !== "number" || Math.abs(payment.transaction_amount - purchase.salePrice) >= 0.01 || payment.currency_id !== purchase.currencyCode) {
      console.warn("[gift-card-webhook] Payment amount/currency mismatch", { paymentId, purchaseId: purchase.id });
      return NextResponse.json({ received: true });
    }
    if (payment.status === "approved") {
      const issued = await prisma.$transaction(async (tx) => {
        const paid = await tx.giftCardPurchase.updateMany({ where: { id: purchase.id, businessId, paymentStatus: "PENDING", mpPaymentId: null }, data: { paymentStatus: "PAID", mpPaymentId: paymentId, mpStatus: payment.status, paidAt: new Date() } });
        if (paid.count === 0) return { created: false, giftCardId: (await tx.giftCard.findUnique({ where: { purchaseId: purchase.id }, select: { id: true } }))?.id };
        const result = await issueGiftCardForPurchase(purchase.id, tx);
        return { created: result.created, giftCardId: result.giftCard.id };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (issued.created && issued.giftCardId) await sendGiftCardEmail(issued.giftCardId);
    } else if (["rejected", "cancelled"].includes(payment.status || "")) {
      await prisma.giftCardPurchase.updateMany({ where: { id: purchase.id, businessId, paymentStatus: "PENDING" }, data: { paymentStatus: payment.status === "cancelled" ? "CANCELLED" : "FAILED", mpPaymentId: paymentId, mpStatus: payment.status } });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    console.error("[gift-card-webhook] Error", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
