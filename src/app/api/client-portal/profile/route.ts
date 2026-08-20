import { NextRequest, NextResponse } from "next/server";
import { clientPortalProfileSchema } from "@/server/validations/client-portal";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  createClientPortalAccountSession,
  getClientPortalCookieOptions,
  getClientPortalEmailFromRequest,
  getClientPortalProfile,
  renewClientPortalSessionToken,
  updateClientPortalProfile,
} from "@/server/services/client-portal.service";

export async function GET(request: NextRequest) {
  const email = await getClientPortalEmailFromRequest(request);
  if (!email) return Response.json({ error: "No autenticado" }, { status: 401 });
  const profile = await getClientPortalProfile(email);
  if (!profile) return Response.json({ error: "Cuenta no activada" }, { status: 404 });
  const response = NextResponse.json(profile, { headers: { "Cache-Control": "no-store" } });
  const token = request.cookies.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  if (token) {
    const renewed = await renewClientPortalSessionToken(token);
    response.cookies.set(
      CLIENT_PORTAL_COOKIE_NAME,
      renewed ? token : await createClientPortalAccountSession(email),
      getClientPortalCookieOptions(),
    );
  }
  return response;
}

export async function PATCH(request: NextRequest) {
  const email = await getClientPortalEmailFromRequest(request);
  if (!email) return Response.json({ error: "No autenticado" }, { status: 401 });
  const parsed = clientPortalProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const profile = await updateClientPortalProfile(email, parsed.data);
  if (!profile) return Response.json({ error: "Cuenta no activada" }, { status: 404 });
  return Response.json({ ok: true, profile }, { headers: { "Cache-Control": "no-store" } });
}
