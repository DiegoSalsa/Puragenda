import { NextRequest, NextResponse } from "next/server";
import { clientPortalChangePasswordSchema } from "@/server/validations/client-portal";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  changeClientPortalPassword,
  createClientPortalAccountSession,
  getClientPortalCookieOptions,
  getClientPortalEmailFromRequest,
} from "@/server/services/client-portal.service";

export async function PATCH(request: NextRequest) {
  const email = await getClientPortalEmailFromRequest(request);
  if (!email) return Response.json({ error: "No autenticado" }, { status: 401 });
  const parsed = clientPortalChangePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const changed = await changeClientPortalPassword(email, parsed.data.currentPassword, parsed.data.newPassword);
  if (!changed) return Response.json({ error: "La contraseña actual no es correcta" }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    CLIENT_PORTAL_COOKIE_NAME,
    await createClientPortalAccountSession(email),
    getClientPortalCookieOptions(),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
