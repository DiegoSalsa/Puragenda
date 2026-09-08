import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_AUTH_COOKIE_NAME,
  clearAdminSessionCookieOptions,
  revokeSuperAdminSessionByToken,
} from "@/server/auth/admin-session";
import { AUTH_COOKIE_NAME, getSessionCookieOptions } from "@/server/auth/session";

export async function POST(request: NextRequest) {
  await revokeSuperAdminSessionByToken(request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value);

  const response = NextResponse.json(
    { message: "Sesión superadmin cerrada" },
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
