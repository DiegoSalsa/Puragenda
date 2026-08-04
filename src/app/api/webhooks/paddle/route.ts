import { NextRequest, NextResponse } from "next/server";
import { getPaddleServerClient } from "@/server/lib/paddle";
import { processPaddleWebhook } from "@/server/services/paddle-webhook.service";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("paddle-signature") ?? "";
  const rawBody = await request.text();
  const secret = process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET?.trim() ?? "";

  if (!signature || !rawBody || !secret) {
    return NextResponse.json({ error: "Webhook de Paddle no configurado" }, { status: 503 });
  }

  try {
    const event = await getPaddleServerClient().webhooks.unmarshal(rawBody, secret, signature);
    await processPaddleWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhook/paddle] No se pudo procesar la notificación", error);
    return NextResponse.json({ error: "No se pudo procesar la notificación" }, { status: 500 });
  }
}
