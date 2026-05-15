import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { MercadoPagoConfig, Preference } from "mercadopago";

/**
 * POST /api/mercadopago/deposit-preference
 *
 * Creates a MercadoPago payment preference for a deposit/abono.
 * Uses the BUSINESS's access token (marketplace model) to create the payment.
 *
 * Body: { appointmentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json();

    if (!appointmentId) {
      return Response.json({ error: "appointmentId requerido" }, { status: 400 });
    }

    // Get appointment with business data
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        business: true,
        service: true,
      },
    });

    if (!appointment) {
      return Response.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    // Check business has MP connected
    if (!appointment.business.mpAccessToken) {
      return Response.json(
        { error: "El negocio no tiene Mercado Pago conectado" },
        { status: 400 }
      );
    }

    // Check deposit is required (use appointment's stored deposit amount)
    const depositAmt = appointment.depositAmount || 0;
    if (!appointment.business.depositRequired || depositAmt <= 0) {
      return Response.json(
        { error: "Este negocio no requiere abono" },
        { status: 400 }
      );
    }

    // Don't recreate if already paid
    if (appointment.paymentStatus === "APPROVED") {
      return Response.json(
        { error: "El abono ya fue pagado" },
        { status: 400 }
      );
    }

    // Use the business's own access token (marketplace model)
    const mpClient = new MercadoPagoConfig({
      accessToken: appointment.business.mpAccessToken,
    });

    const preference = new Preference(mpClient);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const result = await preference.create({
      body: {
        items: [
          {
            id: appointment.id,
            title: `Abono - ${appointment.service.name} en ${appointment.business.name}`,
            description: `Reserva para ${appointment.customerName}`,
            quantity: 1,
            unit_price: depositAmt,
            currency_id: "CLP",
          },
        ],
        back_urls: {
          success: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${appointment.id}&status=approved`,
          failure: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${appointment.id}&status=rejected`,
          pending: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${appointment.id}&status=pending`,
        },
        auto_return: "approved",
        external_reference: appointment.id,
        notification_url: `${baseUrl}/api/webhooks/deposit`,
        statement_descriptor: "PURAGENDA",
      },
    });

    // Save preference ID on appointment
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        mpPreferenceId: result.id || null,
        depositAmount: depositAmt,
        paymentStatus: "PENDING",
      },
    });

    return Response.json({
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    });
  } catch (error) {
    console.error("[deposit-preference] Error:", error);
    return Response.json(
      { error: "Error al crear la preferencia de pago" },
      { status: 500 }
    );
  }
}
