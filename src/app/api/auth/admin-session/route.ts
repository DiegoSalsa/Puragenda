import { NextRequest, NextResponse } from "next/server";
import {
  getApiAdminSessionUser,
  listSuperAdminSessions,
  revokeSuperAdminSessionById,
} from "@/server/auth/admin-session";

export async function GET(request: NextRequest) {
  const admin = await getApiAdminSessionUser(request);
  if (!admin) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const sessions = await listSuperAdminSessions(admin.id, admin.sessionId);
  return NextResponse.json(
    { sessions },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: NextRequest) {
  const admin = await getApiAdminSessionUser(request);
  if (!admin) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
  if (!sessionId) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const revoked = await revokeSuperAdminSessionById(admin.id, sessionId);
  if (!revoked) {
    return NextResponse.json({ error: "No se pudo cerrar la sesión" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
