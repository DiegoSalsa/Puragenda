import { NextRequest, NextResponse } from "next/server";
import { billingLimiter } from "@/server/lib/rate-limit";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { PRICING } from "@/core/constants";
import { PreApproval } from "mercadopago";
import { mpClient } from "@/server/lib/mercadopago";
import { quotePlatformDiscount, reservePlatformDiscount } from "@/server/services/platform-discount.service";
import { calculateNextBillingPreview } from "@/server/services/subscription-billing.service";
import {
  mapMercadoPagoFailure,
  mercadoPagoNotConfigured,
} from "@/server/lib/mercadopago-error";

type ValidPlan = "INDIVIDUAL" | "EQUIPO" | "TEST";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const blocked = billingLimiter.check(request);
    if (blocked) return blocked;

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
    let discountCode: string | undefined;
    let requestedExtraStaffCount = 0;
    try {
      const body = await request.json();
      if (body.plan === "INDIVIDUAL" || body.plan === "EQUIPO" || body.plan === "TEST") {
        targetPlan = body.plan;
      }
      if (typeof body.extraStaffCount === "number") {
        requestedExtraStaffCount = Math.max(0, Math.min(20, Math.floor(body.extraStaffCount)));
      }
      if (typeof body.discountCode === "string") {
        discountCode = body.discountCode;
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
    const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
    const baseUrl = isProduction
      ? configuredBaseUrl || "https://www.puragenda.cl"
      : request.nextUrl.origin;
    const backUrl = `${baseUrl}/dashboard/settings`;

    // 6. Create MercadoPago Preapproval (subscription)
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()) {
      const failure = mercadoPagoNotConfigured(isProduction);
      console.error("[billing/subscribe] MercadoPago is not configured", {
        code: failure.body.code,
      });
      return NextResponse.json(failure.body, { status: failure.status });
    }

    const preapproval = new PreApproval(mpClient);
    
    // Calculate initial price (apply discount if any)
    const billingPreview = calculateNextBillingPreview({
      plan: targetPlan,
      billingCycle: subscription?.billingCycle ?? "MONTHLY",
      extraStaffCount: targetPlan === "EQUIPO" ? requestedExtraStaffCount || subscription?.extraStaffCount || 0 : 0,
      pendingDiscountPercentage: subscription?.pendingDiscountPercentage ?? null,
      freeMonthsRemaining: subscription?.freeMonthsRemaining ?? 0,
      promoName: subscription?.promoName ?? null,
      promoFreeMonthsRemaining: subscription?.promoFreeMonthsRemaining ?? 0,
      promoDiscountPercentage: subscription?.promoDiscountPercentage ?? null,
      promoDiscountMonthsRemaining: subscription?.promoDiscountMonthsRemaining ?? 0,
      nextBillingOverrideAmount: subscription?.nextBillingOverrideAmount ?? null,
    });
    let transactionAmount: number = billingPreview.mpAmount;
    let platformDiscount: Awaited<ReturnType<typeof quotePlatformDiscount>>["discount"];
    if (discountCode?.trim()) {
      if (subscription?.pendingDiscountPercentage) {
        return NextResponse.json(
          { error: "Ya tienes un descuento pendiente. No puedes combinar codigos." },
          { status: 400 }
        );
      }

      const quote = await quotePlatformDiscount({
        code: discountCode,
        plan: targetPlan,
        businessId: business.id,
        amount: transactionAmount,
      });

      if (quote.error || !quote.discount) {
        return NextResponse.json({ error: quote.error || "Codigo invalido" }, { status: 400 });
      }

      platformDiscount = quote.discount;
      transactionAmount = platformDiscount.discountedAmount;
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
    const savedSubscription = await prisma.subscription.upsert({
      where: { businessId: business.id },
      update: {
        mpSubscriptionId: result.id,
        mpCustomerId: result.payer_id?.toString() ?? null,
        plan: targetPlan,
        extraStaffCount: targetPlan === "EQUIPO" ? requestedExtraStaffCount || subscription?.extraStaffCount || 0 : 0,
        status: "INACTIVE",
        isTrial: false,
      },
      create: {
        businessId: business.id,
        mpSubscriptionId: result.id,
        mpCustomerId: result.payer_id?.toString() ?? null,
        plan: targetPlan,
        extraStaffCount: targetPlan === "EQUIPO" ? requestedExtraStaffCount : 0,
        status: "INACTIVE",
        isTrial: false,
      },
    });

    if (platformDiscount) {
      await reservePlatformDiscount({
        discountCodeId: platformDiscount.id,
        businessId: business.id,
        subscriptionId: savedSubscription.id,
        originalAmount: platformDiscount.originalAmount,
        discountedAmount: platformDiscount.discountedAmount,
      });
    }

    // 8. Return the payment URL
    return NextResponse.json({ init_point: result.init_point, discount: platformDiscount ?? null });
  } catch (error: unknown) {
    const failure = mapMercadoPagoFailure(error, process.env.NODE_ENV === "production");
    console.error("[billing/subscribe] Failed to create subscription", {
      code: failure.body.code,
      providerStatus:
        error && typeof error === "object" && "status" in error
          ? (error as { status?: unknown }).status
          : undefined,
    });
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
