import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";
import { getMercadoPagoCurrency, isMercadoPagoCurrencyCompatible } from "@/core/countries";
import {
  createLocalPaymentToken,
  isLocalPaymentSimulatorEnabled,
  localPaymentCheckoutUrl,
  localProviderId,
} from "@/server/services/local-payment-simulator";

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

    if (appointment.business.depositPaymentMode === "MANUAL_LINK") {
      if (!appointment.depositPaymentUrl) {
        return Response.json(
          { error: "Esta cita no tiene un link de pago configurado" },
          { status: 409 },
        );
      }
      return Response.json({
        preferenceId: null,
        initPoint: appointment.depositPaymentUrl,
        sandboxInitPoint: null,
        manual: true,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    if (isLocalPaymentSimulatorEnabled()) {
      const preferenceId = localProviderId("deposit");
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          mpPreferenceId: preferenceId,
          depositAmount: depositAmt,
          paymentStatus: "PENDING",
        },
      });
      const token = createLocalPaymentToken({
        kind: "deposit",
        entityId: appointment.id,
        businessId: appointment.business.id,
        amount: depositAmt,
        currency: appointment.business.currencyCode,
      });
      const initPoint = localPaymentCheckoutUrl(baseUrl, token);
      return Response.json({
        preferenceId,
        initPoint,
        sandboxInitPoint: initPoint,
        simulated: true,
      });
    }

    const accessToken = await getValidMercadoPagoAccessToken(appointment.business.id);
    if (!accessToken) {
      return Response.json(
        { error: "El negocio no tiene Mercado Pago conectado" },
        { status: 400 }
      );
    }

    if (!isMercadoPagoCurrencyCompatible(appointment.business.countryCode, appointment.business.currencyCode)) {
      const expectedCurrency = getMercadoPagoCurrency(appointment.business.countryCode);
      return Response.json(
        {
          error: expectedCurrency
            ? `Mercado Pago para ${appointment.business.countryCode} solo esta habilitado en ${expectedCurrency}. Cambia la moneda del negocio o desconecta Mercado Pago.`
            : "Mercado Pago no esta disponible para el pais de este negocio.",
        },
        { status: 409 },
      );
    }

    // Use the business's own access token (marketplace model)
    const mpClient = new MercadoPagoConfig({
      accessToken,
    });

    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: appointment.id,
            title: `Abono - ${appointment.service.name} en ${appointment.business.name}`,
            description: `Reserva para ${appointment.customerName}`,
            quantity: 1,
            unit_price: depositAmt,
            currency_id: appointment.business.currencyCode,
          },
        ],
        back_urls: {
          success: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${appointment.id}&status=approved`,
          failure: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${appointment.id}&status=rejected`,
          pending: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${appointment.id}&status=pending`,
        },
        auto_return: "approved",
        external_reference: appointment.id,
        notification_url: `${baseUrl}/api/webhooks/deposit?businessId=${appointment.business.id}`,
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
