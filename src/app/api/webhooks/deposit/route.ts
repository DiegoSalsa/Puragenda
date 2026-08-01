import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { sendDepositConfirmedNotifications } from "@/server/email/send";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";

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

async function getRelatedAppointmentIds(appointment: { id: string; businessId: string; mpPreferenceId: string | null }) {
  if (!appointment.mpPreferenceId) return [appointment.id];

  const related = await prisma.appointment.findMany({
    where: {
      businessId: appointment.businessId,
      mpPreferenceId: appointment.mpPreferenceId,
    },
    select: { id: true },
  });

  return related.map((item) => item.id);
}

async function markGroupApproved(appointmentIds: string[], paymentId: string) {
  await prisma.appointment.updateMany({
    where: { id: { in: appointmentIds } },
    data: {
      paymentStatus: "APPROVED",
      mpPaymentId: paymentId,
      status: "CONFIRMED",
    },
  });

  for (const appointmentId of appointmentIds) {
    const appointment = await getAppointmentForEmail(appointmentId);
    if (!appointment) continue;
    await sendDepositConfirmedNotifications(appointment);
    await syncAppointmentToGoogle(appointmentId);
  }
}

async function markGroupRejected(appointmentIds: string[], paymentId: string) {
  await prisma.appointment.updateMany({
    where: { id: { in: appointmentIds } },
    data: {
      paymentStatus: "REJECTED",
      mpPaymentId: paymentId,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const notificationType = body.type as string | undefined;
    const paymentId = (body.data as Record<string, unknown>)?.id as string | undefined;

    if (notificationType !== "payment" || !paymentId) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const platformToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!platformToken) {
      console.error("[webhook/deposit] MERCADOPAGO_ACCESS_TOKEN not set");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${platformToken}` },
    });

    if (!paymentResponse.ok) {
      const appointmentByPayment = await prisma.appointment.findFirst({
        where: { mpPaymentId: paymentId },
        include: { business: { select: { mpAccessToken: true } } },
      });

      if (!appointmentByPayment?.business.mpAccessToken) {
        console.warn("[webhook/deposit] Could not fetch payment:", paymentId);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const businessPaymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${appointmentByPayment.business.mpAccessToken}` },
      });

      if (!businessPaymentResponse.ok) {
        console.warn("[webhook/deposit] Could not fetch payment with business token:", paymentId);
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const businessPaymentData = await businessPaymentResponse.json();
      const businessPaymentStatus = businessPaymentData.status as string;
      const relatedIds = await getRelatedAppointmentIds(appointmentByPayment);

      if (businessPaymentStatus === "approved") {
        await markGroupApproved(relatedIds, paymentId);
      } else if (businessPaymentStatus === "rejected" || businessPaymentStatus === "cancelled") {
        await markGroupRejected(relatedIds, paymentId);
      }

      return NextResponse.json({ received: true }, { status: 200 });
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
    });

    if (!appointment) {
      console.warn("[webhook/deposit] Appointment not found:", externalReference);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const relatedIds = await getRelatedAppointmentIds(appointment);

    if (paymentStatus === "approved") {
      await markGroupApproved(relatedIds, paymentId);
    } else if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
      await markGroupRejected(relatedIds, paymentId);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[webhook/deposit] Error:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
