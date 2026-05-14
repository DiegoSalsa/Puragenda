import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { sendDepositConfirmedNotifications } from "@/server/email/send";

/**
 * POST /api/webhooks/deposit
 *
 * Webhook endpoint for MercadoPago deposit payment notifications.
 * When a deposit payment is approved, the appointment is auto-confirmed
 * and notification emails are sent to owner, staff, and client.
 *
 * MercadoPago sends: { type: "payment", data: { id: "PAYMENT_ID" }, ... }
 */

/** Fetch appointment with all relations needed for email notifications */
async function getAppointmentForEmail(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      staff: true,
      business: {
        include: { owner: { select: { email: true, name: true } } },
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const notificationType = body.type as string | undefined;
    const paymentId = (body.data as Record<string, unknown>)?.id as string | undefined;

    // Only process payment notifications
    if (notificationType !== "payment" || !paymentId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Find the appointment by the payment preference
    // First, we need to get the payment details to find the external_reference
    // We need to find which business this payment belongs to
    // Since we don't know the business yet, we look up by the paymentId or preference

    // Try to find the appointment that has this payment or preference linked
    // The external_reference in the preference is the appointment ID
    // We'll use the platform access token to get payment info first

    const platformToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!platformToken) {
      console.error("[webhook/deposit] MERCADOPAGO_ACCESS_TOKEN not set");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Get payment info from MP API
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${platformToken}`,
        },
      }
    );

    if (!paymentResponse.ok) {
      // The payment might have been made with the business's token, 
      // try looking up the appointment directly
      const appointmentByPayment = await prisma.appointment.findFirst({
        where: { mpPaymentId: paymentId },
        include: { business: true },
      });

      if (appointmentByPayment?.business.mpAccessToken) {
        const bizMpClient = new MercadoPagoConfig({
          accessToken: appointmentByPayment.business.mpAccessToken,
        });
        const bizPayment = new Payment(bizMpClient);
        const paymentData = await bizPayment.get({ id: paymentId });

        if (paymentData.status === "approved") {
          await prisma.appointment.update({
            where: { id: appointmentByPayment.id },
            data: {
              paymentStatus: "APPROVED",
              mpPaymentId: paymentId,
              status: "CONFIRMED",
            },
          });
          console.log(`[webhook/deposit] ✅ Appointment ${appointmentByPayment.id} auto-confirmed via business token`);

          // Send email notifications
          const fullAppointment = await getAppointmentForEmail(appointmentByPayment.id);
          if (fullAppointment) {
            sendDepositConfirmedNotifications(fullAppointment).catch(() => {});
          }
        }
        return NextResponse.json({ received: true }, { status: 200 });
      }

      console.warn("[webhook/deposit] Could not fetch payment:", paymentId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const paymentData = await paymentResponse.json();
    const externalReference = paymentData.external_reference as string | undefined;
    const paymentStatus = paymentData.status as string;

    if (!externalReference) {
      console.warn("[webhook/deposit] No external_reference in payment:", paymentId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Find the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: externalReference },
    });

    if (!appointment) {
      console.warn("[webhook/deposit] Appointment not found:", externalReference);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Update based on payment status
    if (paymentStatus === "approved") {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          paymentStatus: "APPROVED",
          mpPaymentId: paymentId,
          status: "CONFIRMED", // Auto-confirm on successful payment
        },
      });
      console.log(`[webhook/deposit] ✅ Appointment ${appointment.id} auto-confirmed`);

      // Send email notifications to owner, staff, and client
      const fullAppointment = await getAppointmentForEmail(appointment.id);
      if (fullAppointment) {
        sendDepositConfirmedNotifications(fullAppointment).catch(() => {});
      }
    } else if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          paymentStatus: "REJECTED",
          mpPaymentId: paymentId,
        },
      });
      console.log(`[webhook/deposit] ❌ Appointment ${appointment.id} payment ${paymentStatus}`);
    }
    // For "pending" and "in_process", we don't change anything yet

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[webhook/deposit] Error:", error);
    // Always return 200 to prevent retries
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
