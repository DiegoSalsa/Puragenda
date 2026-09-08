import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_AUTH_COOKIE_NAME,
  clearAdminSessionCookieOptions,
  getApiAdminSessionUser,
  revokeAllSuperAdminSessionsForUser,
} from "@/server/auth/admin-session";
import { AUTH_COOKIE_NAME, getSessionCookieOptions } from "@/server/auth/session";

export async function POST(request: NextRequest) {
  const admin = await getApiAdminSessionUser(request);
  if (!admin) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  await revokeAllSuperAdminSessionsForUser(admin.id);

  const response = NextResponse.json(
    { message: "Todas las sesiones superadmin fueron cerradas" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(ADMIN_AUTH_COOKIE_NAME, "", clearAdminSessionCookieOptions());
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
