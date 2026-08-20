import { NextRequest, NextResponse } from "next/server";
import { clientPortalResetSchema } from "@/server/validations/client-portal";
import { clientPortalAccountEmailLimiter } from "@/server/lib/rate-limit";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  createClientPortalAccountSession,
  getClientPortalCookieOptions,
  resetClientPortalPassword,
} from "@/server/services/client-portal.service";

export async function POST(request: NextRequest) {
  const limited = clientPortalAccountEmailLimiter.check(request);
  if (limited) return limited;
  const parsed = clientPortalResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const email = await resetClientPortalPassword(parsed.data.token, parsed.data.password);
  if (!email) return Response.json({ error: "El enlace venció o ya fue utilizado" }, { status: 400 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_PORTAL_COOKIE_NAME, await createClientPortalAccountSession(email), getClientPortalCookieOptions());
  return response;
}
