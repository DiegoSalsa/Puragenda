import crypto from "crypto";
import { addMonths, addYears } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import {
  isLocalPaymentSimulatorEnabled,
  verifyLocalPaymentToken,
} from "@/server/services/local-payment-simulator";

function disabledResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function GET(request: NextRequest) {
  if (!isLocalPaymentSimulatorEnabled()) return disabledResponse();

  const token = request.nextUrl.searchParams.get("token");
  const payload = token ? verifyLocalPaymentToken(token) : null;
  if (!token || !payload) {
    return new NextResponse("Pago simulado inválido o vencido", { status: 400 });
  }

  const label = payload.kind === "subscription" ? "Suscripción Puragenda" : "Abono de reserva";
  const amount = new Intl.NumberFormat("es", {
    style: "currency",
    currency: payload.currency,
  }).format(payload.amount);

  return new NextResponse(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pago simulado · Puragenda</title>
<style>body{font-family:system-ui,sans-serif;background:#f5f3ff;margin:0;min-height:100vh;display:grid;place-items:center;color:#1f1737}.card{width:min(420px,calc(100% - 32px));background:white;border:1px solid #ddd6fe;border-radius:20px;padding:28px;box-shadow:0 20px 60px #4c1d9518}.tag{display:inline-block;background:#ede9fe;color:#6d28d9;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}h1{font-size:24px;margin:18px 0 8px}.amount{font-size:30px;font-weight:800;margin:18px 0}.notice{font-size:13px;line-height:1.5;color:#5b5568;background:#faf5ff;border-radius:12px;padding:12px}.actions{display:grid;gap:10px;margin-top:20px}button{width:100%;border:0;border-radius:12px;padding:13px;font-weight:700;cursor:pointer}.approve{background:#6d28d9;color:white}.reject{background:#fee2e2;color:#b91c1c}</style></head>
<body><main class="card"><span class="tag">SIMULADOR LOCAL · SIN DINERO REAL</span><h1>${htmlEscape(label)}</h1><p>Esta pantalla prueba el flujo completo sin contactar a Mercado Pago.</p><div class="amount">${htmlEscape(amount)}</div><div class="notice">Solo existe cuando <code>LOCAL_PAYMENT_SIMULATOR=true</code> y nunca funciona con <code>NODE_ENV=production</code>.</div><form class="actions" method="post"><input type="hidden" name="token" value="${htmlEscape(token)}"><button class="approve" name="result" value="approved">Aprobar pago falso</button><button class="reject" name="result" value="rejected">Rechazar pago falso</button></form></main></body></html>`, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  if (!isLocalPaymentSimulatorEnabled()) return disabledResponse();

  const form = await request.formData();
  const token = form.get("token");
  const result = form.get("result");
  const payload = typeof token === "string" ? verifyLocalPaymentToken(token) : null;
  if (!payload || (result !== "approved" && result !== "rejected")) {
    return NextResponse.json({ error: "Pago simulado inválido o vencido" }, { status: 400 });
  }

  if (payload.kind === "subscription") {
    const subscription = await prisma.subscription.findUnique({ where: { id: payload.entityId } });
    if (
      !subscription
      || subscription.businessId !== payload.businessId
      || !subscription.mpSubscriptionId?.startsWith("LOCAL_SUBSCRIPTION:")
    ) {
      return NextResponse.json({ error: "Suscripción simulada no encontrada" }, { status: 404 });
    }

    const approved = result === "approved";
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: approved ? "ACTIVE" : "INACTIVE",
        isTrial: approved ? false : subscription.isTrial,
        currentPeriodEnd: approved
          ? subscription.billingCycle === "ANNUAL"
            ? addYears(new Date(), 1)
            : addMonths(new Date(), 1)
          : subscription.currentPeriodEnd,
        lastPaymentId: `LOCAL_PAYMENT:${crypto.randomUUID()}`,
        lastPaymentStatus: approved ? "APPROVED" : "REJECTED",
        lastPaymentAttemptAt: new Date(),
      },
    });

    const redirect = new URL("/dashboard/settings", request.nextUrl.origin);
    redirect.searchParams.set("local_payment", approved ? "approved" : "rejected");
    return NextResponse.redirect(redirect, 303);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: payload.entityId },
    include: { business: { select: { currencyCode: true } } },
  });
  if (
    !appointment
    || appointment.businessId !== payload.businessId
    || !appointment.mpPreferenceId?.startsWith("LOCAL_DEPOSIT:")
    || appointment.depositAmount !== payload.amount
    || appointment.business.currencyCode !== payload.currency
  ) {
    return NextResponse.json({ error: "Abono simulado no encontrado" }, { status: 404 });
  }

  const approved = result === "approved";
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      paymentStatus: approved ? "APPROVED" : "REJECTED",
      status: approved ? "CONFIRMED" : appointment.status,
      mpPaymentId: `LOCAL_PAYMENT:${crypto.randomUUID()}`,
    },
  });

  const redirect = new URL(`/cita/${appointment.id}`, request.nextUrl.origin);
  redirect.searchParams.set("payment", approved ? "success" : "failed");
  return NextResponse.redirect(redirect, 303);
}
