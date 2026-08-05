import crypto from "crypto";
import { NextResponse } from "next/server";
import { cleanupOrphanedWidgetAssets } from "@/server/services/widget-assets.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") || "");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Cron no configurado." }, { status: 503 });
  }
  if (!authorizedCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const result = await cleanupOrphanedWidgetAssets();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[Widget Asset Cleanup] Error general:", error);
    return NextResponse.json(
      { error: "No fue posible completar el cleanup de imágenes." },
      { status: 500 },
    );
  }
}
