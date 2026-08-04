import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { sendDepositConfirmedNotifications } from "@/server/email/send";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";

/**
 * GET /api/mercadopago/deposit-return
 *
 * Handles the redirect from MercadoPago after the user completes (or fails) 
 * a deposit payment. Redirects to a status page in the widget.
 * Also triggers email notifications when payment is approved.
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

    const relatedAppointments = appointment.mpPreferenceId
      ? await prisma.appointment.findMany({
          where: {
            businessId: appointment.businessId,
            mpPreferenceId: appointment.mpPreferenceId,
          },
          select: { id: true, depositAmount: true },
        })
      : [{ id: appointmentId, depositAmount: appointment.depositAmount }];
    const relatedAppointmentIds = relatedAppointments.map((item) => item.id);
    const expectedAmount = relatedAppointments.reduce((total, item) => total + (item.depositAmount ?? 0), 0);

    if (paymentId) {
      const accessToken = await getValidMercadoPagoAccessToken(appointment.businessId);
      if (!accessToken) {
        console.warn("[deposit-return] No seller token available for payment verification");
        const pendingUrl = new URL(`${baseUrl}/cita/${appointmentId}`);
        pendingUrl.searchParams.set("payment", "pending");
        return NextResponse.redirect(pendingUrl.toString());
      }

      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
      );
      if (!paymentResponse.ok) {
        console.warn("[deposit-return] Could not verify payment:", paymentId);
        const pendingUrl = new URL(`${baseUrl}/cita/${appointmentId}`);
        pendingUrl.searchParams.set("payment", "pending");
        return NextResponse.redirect(pendingUrl.toString());
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
        const pendingUrl = new URL(`${baseUrl}/cita/${appointmentId}`);
        pendingUrl.searchParams.set("payment", "pending");
        return NextResponse.redirect(pendingUrl.toString());
      }

      if (payment.status === "approved") {
        // Mark appointment group as paid and confirmed
        await prisma.appointment.updateMany({
          where: { id: { in: relatedAppointmentIds } },
          data: {
            paymentStatus: "APPROVED",
            mpPaymentId: paymentId,
            status: "CONFIRMED",
          },
        });

        // Send email notifications (owner, staff, client)
        const fullAppointments = await prisma.appointment.findMany({
          where: { id: { in: relatedAppointmentIds } },
          include: {
            service: true,
            staff: true,
            business: {
              include: { owner: { select: { email: true, name: true } } },
            },
          },
        });
        for (const fullAppointment of fullAppointments) {
          await sendDepositConfirmedNotifications(fullAppointment);
          await syncAppointmentToGoogle(fullAppointment.id);
        }

        // Redirect to widget with success
        const successUrl = new URL(`${baseUrl}/cita/${appointmentId}`);
        successUrl.searchParams.set("payment", "success");
        return NextResponse.redirect(successUrl.toString());
      }

      if (payment.status === "rejected" || payment.status === "cancelled") {
        // Mark appointment group as rejected
        await prisma.appointment.updateMany({
          where: { id: { in: relatedAppointmentIds } },
          data: {
            paymentStatus: "REJECTED",
            mpPaymentId: paymentId || null,
          },
        });

        const failUrl = new URL(`${baseUrl}/cita/${appointmentId}`);
        failUrl.searchParams.set("payment", "failed");
        return NextResponse.redirect(failUrl.toString());
      }
    }

    // Pending or other status
    const pendingUrl = new URL(`${baseUrl}/cita/${appointmentId}`);
    pendingUrl.searchParams.set("payment", "pending");
    return NextResponse.redirect(pendingUrl.toString());
  } catch (error) {
    console.error("[deposit-return] Error:", error);
    return NextResponse.redirect(`${baseUrl}?error=server_error`);
  }
}

