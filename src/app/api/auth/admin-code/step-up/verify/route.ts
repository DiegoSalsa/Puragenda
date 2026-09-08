import { NextRequest, NextResponse } from "next/server";
import { adminCodeVerifyLimiter } from "@/server/lib/rate-limit";
import { verifyAdminLoginCode } from "@/server/services/admin-auth.service";
import {
  getApiAdminSessionUser,
  markSuperAdminSessionReauthenticated,
} from "@/server/auth/admin-session";

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

    const admin = await getApiAdminSessionUser(request);
    if (!admin) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code : "";
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Código inválido o vencido" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const result = await verifyAdminLoginCode(admin.email, code, getClientIp(request));
    if ("error" in result || result.user.id !== admin.id) {
      return NextResponse.json({ error: "Código inválido o vencido" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const marked = await markSuperAdminSessionReauthenticated(admin.sessionId);
    if (!marked) {
      return NextResponse.json(
        { error: "Vuelve a iniciar sesión para confirmar esta acción" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { message: "Identidad confirmada" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[AdminAuth] Step-up verification failed:", error);
    return NextResponse.json({ error: "No fue posible verificar el código" }, { status: 500 });
  }
}
