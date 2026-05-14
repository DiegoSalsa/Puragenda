import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { getServiceByIdAndBusiness } from "@/server/services/service.service";
import { createAppointment } from "@/server/services/appointment.service";
import { sendBookingNotifications } from "@/server/email/send";
import { bookingSchema } from "@/server/validations/booking";
import { prisma } from "@/server/db/prisma";
import { NextRequest } from "next/server";
import { bookingLimiter } from "@/server/lib/rate-limit";
import { MercadoPagoConfig, Preference } from "mercadopago";


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // Rate limiting
    const blocked = bookingLimiter.check(request);
    if (blocked) return blocked;

    const body = await request.json();

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message);
      return Response.json(
        { error: "Errores de validación", details: errors },
        { status: 400 }
      );
    }

    const { serviceId, serviceIds, customerName, customerEmail, customerPhone, startTime, endTime, staffId, rewardCode } = parsed.data;

    const business = await getBusinessBySlug(slug);
    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    // Validate API Key
    const apiKey = request.headers.get("x-api-key") || body.apiKey;
    if (!validateApiKey(business, apiKey)) {
      return Response.json(
        { error: "API Key inválida o no proporcionada" },
        { status: 401 }
      );
    }

    // ── Anti-No-Show: Check if client is blocked ──
    const existingClient = await prisma.client.findUnique({
      where: {
        businessId_email: { businessId: business.id, email: customerEmail },
      },
    });

    if (existingClient && existingClient.noShowCount >= 2) {
      return Response.json(
        {
          error: "Tu cuenta ha sido bloqueada por inasistencias reiteradas. Contacta al negocio para más información.",
          code: "NO_SHOW_BLOCKED",
        },
        { status: 403 }
      );
    }

    // Verify primary service belongs to business
    const service = await getServiceByIdAndBusiness(serviceId, business.id);
    if (!service) {
      return Response.json(
        { error: "Servicio no encontrado para este negocio" },
        { status: 404 }
      );
    }

    // Handle multi-service: validate all serviceIds
    const allServiceIds = serviceIds && serviceIds.length > 0 ? serviceIds : [serviceId];
    const additionalIds = allServiceIds.filter((id) => id !== serviceId);

    // Validate max services per booking
    if (allServiceIds.length > business.maxServicesPerBooking) {
      return Response.json(
        { error: `Máximo ${business.maxServicesPerBooking} servicio(s) por reserva` },
        { status: 400 }
      );
    }

    // Calculate totals for multi-service
    let totalDuration = service.duration;
    let totalPrice = service.price;

    if (additionalIds.length > 0) {
      const additionalServices = await prisma.service.findMany({
        where: { id: { in: additionalIds }, businessId: business.id },
      });
      for (const s of additionalServices) {
        totalDuration += s.duration;
        totalPrice += s.price;
      }
    }

    // ── CRM: Upsert Client record ──
    const client = await prisma.client.upsert({
      where: {
        businessId_email: { businessId: business.id, email: customerEmail },
      },
      update: {
        name: customerName,
        phone: customerPhone || undefined,
      },
      create: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone || undefined,
        businessId: business.id,
      },
    });

    // ── Check deposit requirements ──
    const depositRequired = business.depositRequired && business.depositAmount > 0 && !!business.mpAccessToken;

    // Create appointment with collision detection
    const result = await createAppointment({
      customerName,
      customerEmail,
      customerPhone,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      businessId: business.id,
      serviceId: service.id,
      staffId,
      additionalServiceIds: additionalIds,
      totalDuration: allServiceIds.length > 1 ? totalDuration : undefined,
      totalPrice: allServiceIds.length > 1 ? totalPrice : undefined,
      clientId: client.id,
      depositRequired,
      depositAmount: business.depositAmount,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 409 });
    }

    // ── If deposit required, create MP payment preference ──
    let paymentUrl: string | null = null;

    if (depositRequired && business.mpAccessToken) {
      try {
        const mpClient = new MercadoPagoConfig({
          accessToken: business.mpAccessToken,
        });

        const preference = new Preference(mpClient);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const prefResult = await preference.create({
          body: {
            items: [
              {
                id: result.appointment.id,
                title: `Abono - ${service.name} en ${business.name}`,
                description: `Reserva para ${customerName}`,
                quantity: 1,
                unit_price: business.depositAmount,
                currency_id: "CLP",
              },
            ],
            back_urls: {
              success: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${result.appointment.id}&status=approved`,
              failure: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${result.appointment.id}&status=rejected`,
              pending: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${result.appointment.id}&status=pending`,
            },
            auto_return: "approved",
            external_reference: result.appointment.id,
            notification_url: `${baseUrl}/api/webhooks/deposit`,
            statement_descriptor: "PURAGENDA",
          },
        });

        paymentUrl = prefResult.init_point || null;

        // Save preference ID
        await prisma.appointment.update({
          where: { id: result.appointment.id },
          data: { mpPreferenceId: prefResult.id || null },
        });
      } catch (err) {
        console.error("[Book] Error creating MP preference:", err);
        // Don't block booking if preference creation fails — appointment is still created
      }
    }

    // Send email notifications asynchronously (don't block the response)
    // Only send if no deposit required (otherwise wait for payment)
    if (!depositRequired) {
      const appointmentWithRelations = await prisma.appointment.findUnique({
        where: { id: result.appointment.id },
        include: {
          service: true,
          staff: true,
          business: { include: { owner: { select: { email: true, name: true } } } },
        },
      });

      if (appointmentWithRelations) {
        sendBookingNotifications(appointmentWithRelations).catch(() => {});
      }
    }

    // ── Redeem reward code if provided ──
    if (rewardCode) {
      try {
        const loyaltyCode = await prisma.loyaltyCode.findUnique({
          where: { code: rewardCode },
          include: { client: { select: { email: true } } },
        });

        if (
          loyaltyCode &&
          !loyaltyCode.isUsed &&
          loyaltyCode.businessId === business.id &&
          loyaltyCode.client.email.toLowerCase() === customerEmail.toLowerCase()
        ) {
          await prisma.loyaltyCode.update({
            where: { id: loyaltyCode.id },
            data: { isUsed: true },
          });
        }
      } catch (err) {
        console.error("[Book] Error redeeming reward code:", err);
        // Don't block booking if reward redemption fails
      }
    }

    return Response.json(
      {
        ...result.appointment,
        depositRequired,
        paymentUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}

