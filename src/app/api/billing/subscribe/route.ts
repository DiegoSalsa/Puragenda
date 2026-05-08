import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { PRICING } from "@/core/constants";
import { MercadoPagoConfig, PreApproval } from "mercadopago";

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

type ValidPlan = "INDIVIDUAL" | "EQUIPO" | "TEST";

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

    // 3. Determine which plan to subscribe to (default: EQUIPO for backwards compat)
    let targetPlan: ValidPlan = "EQUIPO";
    try {
      const body = await request.json();
      if (body.plan === "INDIVIDUAL" || body.plan === "EQUIPO" || body.plan === "TEST") {
        targetPlan = body.plan;
      }
    } catch {
      // No body or invalid JSON — default to EQUIPO
    }

    // 4. Check existing subscription
    const subscription = await prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    if (subscription?.plan === targetPlan && subscription.status === "ACTIVE" && !subscription.isTrial) {
      return NextResponse.json(
        { error: `Ya tienes el plan ${PRICING[targetPlan].name} activo.` },
        { status: 400 }
      );
    }

    // 5. Determine back_url based on environment
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction
      ? "https://www.puragenda.cl"
      : "http://localhost:3000";
    const backUrl = `${baseUrl}/dashboard/settings`;

    // 6. Create MercadoPago Preapproval (subscription)
    const preapproval = new PreApproval(mpClient);
    
    // Calculate initial price (apply discount if any)
    let transactionAmount: number = PRICING[targetPlan].monthly;
    if (subscription?.pendingDiscountPercentage) {
      transactionAmount = Math.round(transactionAmount * (1 - subscription.pendingDiscountPercentage / 100));
    }

    const result = await preapproval.create({
      body: {
        reason: `Puragenda — Plan ${PRICING[targetPlan].name} (${business.name})`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: transactionAmount,
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

    // 7. Upsert subscription in our DB with INACTIVE status (pending payment)
    await prisma.subscription.upsert({
      where: { businessId: business.id },
      update: {
        mpSubscriptionId: result.id,
        mpCustomerId: result.payer_id?.toString() ?? null,
        plan: targetPlan,
        status: "INACTIVE",
        isTrial: false,
      },
      create: {
        businessId: business.id,
        mpSubscriptionId: result.id,
        mpCustomerId: result.payer_id?.toString() ?? null,
        plan: targetPlan,
        status: "INACTIVE",
        isTrial: false,
      },
    });

    // 8. Return the payment URL
    return NextResponse.json({ init_point: result.init_point });
  } catch (error: any) {
    console.error("[billing/subscribe] Error:", error);
    
    // Extract MercadoPago error details if present
    let errorMsg = "Error interno al procesar la suscripción.";
    if (error.message) errorMsg += ` Detalles: ${error.message}`;
    if (error.cause) errorMsg += ` (Causa: ${JSON.stringify(error.cause)})`;

    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
