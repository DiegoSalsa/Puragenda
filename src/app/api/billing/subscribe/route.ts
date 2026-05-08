import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { PRICING } from "@/core/constants";
import { MercadoPagoConfig, PreApproval } from "mercadopago";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authenticated session
    const user = await getApiSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión." },
        { status: 401 }
      );
    }

    // 2. Get the business for this user
    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json(
        { error: "No se encontró un negocio asociado a tu cuenta." },
        { status: 404 }
      );
    }

    // 3. Check existing subscription
    const subscription = await prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    if (subscription?.plan === "EQUIPO" && subscription.status === "ACTIVE" && !subscription.isTrial) {
      return NextResponse.json(
        { error: "Ya tienes el plan Equipo activo." },
        { status: 400 }
      );
    }

    // 4. Determine back_url based on environment
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction
      ? "https://www.puragenda.cl"
      : "http://localhost:3000";
    const backUrl = `${baseUrl}/dashboard/settings`;

    // 5. Create MercadoPago Preapproval (subscription)
    const preapproval = new PreApproval(mpClient);
    const result = await preapproval.create({
      body: {
        reason: `Puragenda — Plan Equipo (${business.name})`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PRICING.EQUIPO.monthly,
          currency_id: "CLP",
        },
        payer_email: user.email,
        back_url: backUrl,
        status: "pending",
      },
    });

    if (!result.id || !result.init_point) {
      console.error("[billing/subscribe] MercadoPago response missing id or init_point:", result);
      return NextResponse.json(
        { error: "Error al crear la suscripción en MercadoPago." },
        { status: 502 }
      );
    }

    // 6. Upsert subscription in our DB with PENDING status
    await prisma.subscription.upsert({
      where: { businessId: business.id },
      update: {
        mpSubscriptionId: result.id,
        mpCustomerId: result.payer_id?.toString() ?? null,
        plan: "EQUIPO",
        status: "INACTIVE",
        isTrial: false,
      },
      create: {
        businessId: business.id,
        mpSubscriptionId: result.id,
        mpCustomerId: result.payer_id?.toString() ?? null,
        plan: "EQUIPO",
        status: "INACTIVE",
        isTrial: false,
      },
    });

    // 7. Return the payment URL
    return NextResponse.json({ init_point: result.init_point });
  } catch (error) {
    console.error("[billing/subscribe] Error:", error);
    return NextResponse.json(
      { error: "Error interno al procesar la suscripción." },
      { status: 500 }
    );
  }
}
