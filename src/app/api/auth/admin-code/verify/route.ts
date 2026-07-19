import { NextRequest, NextResponse } from "next/server";
import { adminCodeVerifySchema } from "@/server/validations/auth";
import { adminCodeVerifyLimiter } from "@/server/lib/rate-limit";
import { verifyAdminLoginCode } from "@/server/services/admin-auth.service";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
} from "@/server/auth/session";
import { ADMIN_SESSION_MAX_AGE_SECONDS } from "@/core/constants";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const blocked = adminCodeVerifyLimiter.check(request);
    if (blocked) return blocked;

    const parsed = adminCodeVerifySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Código inválido o vencido" }, { status: 401 });
    }

    const result = await verifyAdminLoginCode(parsed.data.email, parsed.data.code, getClientIp(request));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const token = createSessionToken(
      { ...result.user, adminAccess: true },
      ADMIN_SESSION_MAX_AGE_SECONDS
    );
    const response = NextResponse.json(
      { message: "Acceso verificado" },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set(
      AUTH_COOKIE_NAME,
      token,
      getSessionCookieOptions(ADMIN_SESSION_MAX_AGE_SECONDS)
    );
    return response;
  } catch (error) {
    console.error("[AdminAuth] Code verification failed:", error);
    return NextResponse.json({ error: "No fue posible verificar el código" }, { status: 500 });
  }
}
