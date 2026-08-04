import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { sendDepositConfirmedNotifications } from "@/server/email/send";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";

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

async function getRelatedAppointments(appointment: {
  id: string;
  businessId: string;
  mpPreferenceId: string | null;
  depositAmount: number | null;
}) {
  if (!appointment.mpPreferenceId) {
    return [{ id: appointment.id, depositAmount: appointment.depositAmount }];
  }

  return prisma.appointment.findMany({
    where: {
      businessId: appointment.businessId,
      mpPreferenceId: appointment.mpPreferenceId,
    },
    select: { id: true, depositAmount: true },
  });
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

    const businessId = request.nextUrl.searchParams.get("businessId");
    const accessToken = businessId
      ? await getValidMercadoPagoAccessToken(businessId)
      : process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error("[webhook/deposit] No access token available");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!paymentResponse.ok) {
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

    const relatedAppointments = await getRelatedAppointments(appointment);
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
