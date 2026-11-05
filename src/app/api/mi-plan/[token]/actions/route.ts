import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClientPortalEmailFromRequest, normalizeClientPortalEmail } from "@/server/services/client-portal.service";
import { managePortalPlan } from "@/server/services/portal-plan.service";

export const dynamic = "force-dynamic";
const schema = z.object({ action: z.enum(["pause", "resume", "cancel", "rotate-link", "revoke-link"]), email: z.string().email().optional(), pauseUntil: z.string().max(40).optional() });
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const email = await getClientPortalEmailFromRequest(req);
  if (!email) return NextResponse.json({ error: "No autenticado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  if (parsed.data.email && normalizeClientPortalEmail(parsed.data.email) !== email) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  try {
    const result = await managePortalPlan((await params).token, email, parsed.data);
    return NextResponse.json(result.status === 200 ? { ok: true, message: "Plan actualizado", ...("url" in result && result.url ? { url: result.url } : {}) } : { error: result.error }, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const conflict = error && typeof error === "object" && "code" in error && ["P2034", "P2002", "P2004", "P2010"].includes(String(error.code));
    return NextResponse.json({ error: conflict ? "El plan o el horario cambió; actualiza e intenta nuevamente" : "No se pudo actualizar el plan" }, { status: conflict ? 409 : 500 });
  }
}
