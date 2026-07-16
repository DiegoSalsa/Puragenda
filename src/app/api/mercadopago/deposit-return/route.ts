import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { sendDepositConfirmedNotifications } from "@/server/email/send";

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
  const status = searchParams.get("status");
  const paymentId = searchParams.get("payment_id");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!appointmentId) {
    return NextResponse.redirect(`${baseUrl}?error=missing_appointment`);
  }

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        business: { select: { slug: true, name: true } },
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
          select: { id: true },
        })
      : [{ id: appointmentId }];
    const relatedAppointmentIds = relatedAppointments.map((item) => item.id);

    if (status === "approved" && paymentId) {
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
      }

      // Redirect to widget with success
      const successUrl = new URL(`${baseUrl}/cita/${appointmentId}`);
      successUrl.searchParams.set("payment", "success");
      return NextResponse.redirect(successUrl.toString());
    } else if (status === "rejected") {
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

    // Pending or other status
    const pendingUrl = new URL(`${baseUrl}/cita/${appointmentId}`);
    pendingUrl.searchParams.set("payment", "pending");
    return NextResponse.redirect(pendingUrl.toString());
  } catch (error) {
    console.error("[deposit-return] Error:", error);
    return NextResponse.redirect(`${baseUrl}?error=server_error`);
  }
}

