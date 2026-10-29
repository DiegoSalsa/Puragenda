import { NextRequest, NextResponse } from "next/server";
import { handleMpV2Webhook } from "@/server/commercial-billing/mercadopago-v2";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length")) > 32_768) return new NextResponse(null, { status: 413 });
  const raw = await request.text();
  if (raw.length > 32_768) return new NextResponse(null, { status: 413 });
  try {
    await handleMpV2Webhook(raw, request.headers, request.nextUrl.searchParams.get("data.id"));
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // No raw payload, provider response, credential or personal data in logs/responses.
    return NextResponse.json({ received: false }, { status: message === "V2_INVALID_WEBHOOK_SIGNATURE" ? 401 : message === "V2_OPERATION_NOT_FOUND" ? 404 : 503 });
  }
}
