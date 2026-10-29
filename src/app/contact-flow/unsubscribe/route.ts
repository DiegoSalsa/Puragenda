import { NextRequest } from "next/server";
import { contactOptOutEnabled } from "@/server/contact-flow/resend-test";
import { contactPublicLimiter } from "@/server/contact-flow/http";
import { unsubscribe } from "@/server/contact-flow/tokens";
import { prisma } from "@/server/db/prisma";
import { resolveToken } from "@/server/contact-flow/tokens";
const headers = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "X-Robots-Tag": "noindex, nofollow",
};
const page = (message: string, form = false) =>
  new Response(
    `<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baja de comunicaciones comerciales</title><main><h1>Baja de comunicaciones comerciales</h1><p>${message}</p>${form ? '<form method="post"><button type="submit">Confirmar baja comercial</button></form>' : ""}</main></html>`,
    { headers },
  );
export async function GET(request: NextRequest) {
  if (!contactOptOutEnabled()) return new Response(null, { status: 404 });
  const limited = await contactPublicLimiter.check(request);
  if (limited) return limited;
  try {
    await prisma.$transaction((tx) =>
      resolveToken(
        tx,
        request.nextUrl.searchParams.get("token") ?? "",
        "UNSUBSCRIBE",
      ),
    );
    return page(
      "Confirma la baja. Seguirás recibiendo las notificaciones necesarias de tus reservas.",
      true,
    );
  } catch {
    return page("El enlace no es válido o ha expirado.");
  }
}
// Supports RFC 8058 POST and the confirmation form. No session/PII lookup is
// exposed: the signed unguessable bearer token authorizes only this opt-out.
export async function POST(request: NextRequest) {
  if (!contactOptOutEnabled()) return new Response(null, { status: 404 });
  const limited = await contactPublicLimiter.check(request);
  if (limited) return limited;
  try {
    await unsubscribe(request.nextUrl.searchParams.get("token") ?? "");
    return page(
      "La baja comercial quedó registrada. Los recordatorios de reservas se mantienen.",
    );
  } catch {
    return page("El enlace no es válido o ha expirado.");
  }
}
