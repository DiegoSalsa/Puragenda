import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";
import {
  confirmDepositPayment,
  findRelatedDepositAppointments,
  rejectDepositPayment,
} from "@/server/services/deposit.service";

export async function POST(request: NextRequest) {
  let body: { type?: unknown; data?: unknown };
  try {
    body = await request.json() as { type?: unknown; data?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  try {
    const notificationType = body.type as string | undefined;
    const bodyPaymentId = (body.data as Record<string, unknown>)?.id;
    const queryPaymentId = request.nextUrl.searchParams.get("data.id");
    if (
      queryPaymentId
      && bodyPaymentId !== undefined
      && String(bodyPaymentId) !== queryPaymentId
    ) {
      return NextResponse.json({ error: "Conflicting payment identifiers" }, { status: 400 });
    }
    const paymentId = queryPaymentId ?? (bodyPaymentId === undefined ? undefined : String(bodyPaymentId));

    if (notificationType !== "payment" || !paymentId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[webhook/deposit] MERCADOPAGO_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ received: false, error: "Webhook verification unavailable" }, { status: 503 });
    }
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: paymentId,
      secret: webhookSecret,
      toleranceSeconds: 300,
    });

    const businessId = request.nextUrl.searchParams.get("businessId");
    const accessToken = businessId
      ? await getValidMercadoPagoAccessToken(businessId)
      : process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("[webhook/deposit] No access token available");
      return NextResponse.json({ received: false, error: "Payment verification unavailable" }, { status: 503 });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!paymentResponse.ok) {
      console.warn("[webhook/deposit] Could not fetch payment:", paymentId);
      return NextResponse.json({ received: false, error: "Payment verification failed" }, { status: 502 });
    }

    const paymentData = await paymentResponse.json();
    const externalReference = paymentData.external_reference as string | undefined;
    const paymentStatus = paymentData.status as string;

    if (!externalReference) {
      console.warn("[webhook/deposit] No external_reference in payment:", paymentId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: externalReference },
      include: { business: { select: { currencyCode: true } } },
    });

    if (!appointment) {
      console.warn("[webhook/deposit] Appointment not found:", externalReference);
      return NextResponse.json({ received: true }, { status: 200 });
    }
    if (businessId && appointment.businessId !== businessId) {
      console.warn("[webhook/deposit] Business mismatch for payment:", paymentId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const relatedAppointments = await findRelatedDepositAppointments(appointment);
    const relatedIds = relatedAppointments.map((item) => item.id);
    const expectedAmount = relatedAppointments.reduce(
      (total, item) => total + (item.depositAmount ?? 0),
      0,
    );
    const matchesAmount = typeof paymentData.transaction_amount === "number"
      && Math.abs(paymentData.transaction_amount - expectedAmount) < 0.01;
    const matchesCurrency = paymentData.currency_id === appointment.business.currencyCode;
    if (!matchesAmount || !matchesCurrency) {
      console.warn("[webhook/deposit] Payment amount or currency mismatch", {
        paymentId,
        matchesAmount,
        matchesCurrency,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (paymentStatus === "approved") {
      await confirmDepositPayment({
        appointmentIds: relatedIds,
        businessId: appointment.businessId,
        paymentId: String(paymentId),
        source: "webhook",
      });
    } else if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
      await rejectDepositPayment({
        appointmentIds: relatedIds,
        businessId: appointment.businessId,
        paymentId: String(paymentId),
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }
    console.error("[webhook/deposit] Error:", error);
    // Mercado Pago retries non-2xx notifications. The payment transition is
    // idempotent, so a retry is safer than acknowledging lost work.
    return NextResponse.json({ received: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
