import { NextRequest, NextResponse } from "next/server";
import { adminCodeRequestSchema } from "@/server/validations/auth";
import { adminCodeRequestLimiter } from "@/server/lib/rate-limit";
import { requestAdminLoginCode } from "@/server/services/admin-auth.service";

export async function POST(request: NextRequest) {
  try {
    const blocked = adminCodeRequestLimiter.check(request);
    if (blocked) return blocked;

    const parsed = adminCodeRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ingresa un email válido" }, { status: 400 });
    }

    await requestAdminLoginCode(parsed.data.email);
    return NextResponse.json(
      { message: "Si el correo está autorizado, recibirá un código de acceso." },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[AdminAuth] Code request failed:", error);
    return NextResponse.json({ error: "No fue posible solicitar el código" }, { status: 500 });
  }
}
