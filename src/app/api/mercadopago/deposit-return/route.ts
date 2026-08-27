import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";
import {
  confirmDepositPayment,
  findRelatedDepositAppointments,
  rejectDepositPayment,
} from "@/server/services/deposit.service";

/**
 * GET /api/mercadopago/deposit-return
 *
 * Handles the redirect from MercadoPago after the user completes (or fails)
 * a deposit payment. Redirects to a status page in the widget.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get("appointmentId");
  const paymentId = searchParams.get("payment_id");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!appointmentId) {
    return NextResponse.redirect(`${baseUrl}?error=missing_appointment`);
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        business: { select: { slug: true, name: true, currencyCode: true } },
        service: { select: { name: true } },
      },
    });

    if (!appointment) {
      return NextResponse.redirect(`${baseUrl}?error=not_found`);
    }

    const relatedAppointments = await findRelatedDepositAppointments(appointment);
    const relatedAppointmentIds = relatedAppointments.map((item) => item.id);
    const expectedAmount = relatedAppointments.reduce((total, item) => total + (item.depositAmount ?? 0), 0);

    if (paymentId) {
      const accessToken = await getValidMercadoPagoAccessToken(appointment.businessId);
      if (!accessToken) {
        console.warn("[deposit-return] No seller token available for payment verification");
        return redirectPayment(baseUrl, appointmentId, "pending");
      }

      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
      );
      if (!paymentResponse.ok) {
        console.warn("[deposit-return] Could not verify payment:", paymentId);
        return redirectPayment(baseUrl, appointmentId, "pending");
      }

      const payment = await paymentResponse.json() as {
        status?: string;
        external_reference?: string;
        transaction_amount?: number;
        currency_id?: string;
      };
      const matchesAppointment = payment.external_reference === appointmentId;
      const matchesAmount = typeof payment.transaction_amount === "number"
        && Math.abs(payment.transaction_amount - expectedAmount) < 0.01;
      const matchesCurrency = payment.currency_id === appointment.business.currencyCode;

      if (!matchesAppointment || !matchesAmount || !matchesCurrency) {
        console.warn("[deposit-return] Payment verification mismatch", {
          paymentId,
          matchesAppointment,
          matchesAmount,
          matchesCurrency,
        });
        return redirectPayment(baseUrl, appointmentId, "pending");
      }

      if (payment.status === "approved") {
        const result = await confirmDepositPayment({
          appointmentIds: relatedAppointmentIds,
          businessId: appointment.businessId,
          paymentId,
          source: "return",
        });

        if (result.confirmedIds.includes(appointmentId)) {
          return redirectPayment(baseUrl, appointmentId, "success");
        }
        if (result.auditedOnlyIds.includes(appointmentId)) {
          return redirectPayment(baseUrl, appointmentId, "recorded");
        }

        const current = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { status: true, paymentStatus: true },
        });
        if (current?.paymentStatus === "APPROVED" && current.status === "CANCELLED") {
          return redirectPayment(baseUrl, appointmentId, "recorded");
        }
        if (current?.paymentStatus === "APPROVED") {
          return redirectPayment(baseUrl, appointmentId, "success");
        }
        return redirectPayment(baseUrl, appointmentId, "pending");
      }

      if (payment.status === "rejected" || payment.status === "cancelled") {
        await rejectDepositPayment({
          appointmentIds: relatedAppointmentIds,
          businessId: appointment.businessId,
          paymentId,
        });
        return redirectPayment(baseUrl, appointmentId, "failed");
      }
    }

    return redirectPayment(baseUrl, appointmentId, "pending");
  } catch (error) {
    console.error("[deposit-return] Error:", error);
    return NextResponse.redirect(`${baseUrl}?error=server_error`);
  }
}

function redirectPayment(baseUrl: string, appointmentId: string, payment: "success" | "failed" | "pending" | "recorded") {
  const url = new URL(`${baseUrl}/cita/${appointmentId}`);
  url.searchParams.set("payment", payment);
  return NextResponse.redirect(url.toString());
}
