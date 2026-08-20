import { NextRequest, NextResponse } from "next/server";
import { clientPortalLoginSchema } from "@/server/validations/client-portal";
import { clientPortalLoginLimiter } from "@/server/lib/rate-limit";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  createClientPortalSessionToken,
  getClientPortalCookieOptions,
  verifyClientPortalCredentials,
} from "@/server/services/client-portal.service";

export async function POST(request: NextRequest) {
  const limited = clientPortalLoginLimiter.check(request);
  if (limited) return limited;
  const parsed = clientPortalLoginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const account = await verifyClientPortalCredentials(parsed.data.email, parsed.data.password);
  if (!account) return Response.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_PORTAL_COOKIE_NAME, createClientPortalSessionToken(account.email), getClientPortalCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
