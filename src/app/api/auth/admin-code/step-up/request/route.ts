import { NextRequest, NextResponse } from "next/server";
import { adminCodeRequestLimiter } from "@/server/lib/rate-limit";
import { requestAdminLoginCode } from "@/server/services/admin-auth.service";
import { getApiAdminSessionUser } from "@/server/auth/admin-session";

export async function POST(request: NextRequest) {
  try {
    const blocked = adminCodeRequestLimiter.check(request);
    if (blocked) return blocked;

    const admin = await getApiAdminSessionUser(request);
    if (!admin) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    await requestAdminLoginCode(admin.email);
    return NextResponse.json(
      { message: "Si el correo está autorizado, recibirá un código de acceso." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[AdminAuth] Step-up request failed:", error);
    return NextResponse.json({ error: "No fue posible solicitar el código" }, { status: 500 });
  }
}
