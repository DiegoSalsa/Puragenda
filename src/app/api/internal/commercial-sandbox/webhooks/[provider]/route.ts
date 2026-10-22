import { NextRequest, NextResponse } from "next/server";
import { assertCommercialSandbox } from "@/server/services/commercial-internal";
import { processSandboxBillingWebhook } from "@/server/commercial-billing/operations";
import { createPaddleSandboxAdapter } from "@/server/commercial-billing/paddle-sandbox";
import { createMercadoPagoSandboxAdapter } from "@/server/commercial-billing/mercadopago-sandbox";
export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  try { assertCommercialSandbox(); } catch { return new NextResponse(null, { status: 404 }); }
  if (process.env.COMMERCIAL_V2_SANDBOX_WEBHOOKS !== "1") return new NextResponse(null, { status: 404 });
  try {
    const { provider } = await context.params;
    if (!["paddle", "mercadopago"].includes(provider)) return new NextResponse(null, { status: 404 });
    if (Number(request.headers.get("content-length") ?? 0) > 262_144) return new NextResponse(null, { status: 413 });
    const headers = new Headers(request.headers);
    const signedId = request.nextUrl.searchParams.get("data.id");
    if (signedId) headers.set("x-commercial-data-id", signedId);
    const adapter = provider === "paddle" ? createPaddleSandboxAdapter() : createMercadoPagoSandboxAdapter();
    await processSandboxBillingWebhook(await request.text(), headers, adapter);
    return NextResponse.json({ received: true });
  } catch {
    // No payloads, SDK errors, references or secrets enter logs or public output.
    // Non-2xx allows a provider to redeliver after an unavailable DB/API.
    return NextResponse.json({ received: false }, { status: 503 });
  }
}
