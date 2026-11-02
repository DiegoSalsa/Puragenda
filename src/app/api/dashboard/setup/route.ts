import { z } from "zod";
import { NextRequest } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { requireSameOrigin } from "@/server/security/same-origin";
import { loadSetup, mutateSetup, setupContext, SetupError } from "@/server/onboarding/service";
import { StaffLimitError } from "@/server/services/staff-capacity.service";
import { StaffLifecycleError } from "@/server/services/staff.service";
import { BookingSelectionError } from "@/core/booking-selection";

async function handle(request: NextRequest, write: boolean) {
  if (write) { const denied = requireSameOrigin(request); if (denied) return denied; }
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  try {
    const context = await setupContext(user);
    if (write && Number(request.headers.get("content-length") ?? 0) > 24000) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
    const body = write ? await request.text() : "";
    if (body.length > 24000) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
    const snapshot = write ? await mutateSetup(context, JSON.parse(body)) : await loadSetup(context);
    return Response.json(snapshot, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof SetupError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof StaffLimitError || error instanceof StaffLifecycleError || error instanceof BookingSelectionError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Revisa los datos ingresados." }, { status: 400 });
    if (error instanceof SyntaxError) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    console.error("[setup] request failed");
    return Response.json({ error: "No pudimos guardar. Conserva esta página abierta e intenta nuevamente." }, { status: 503 });
  }
}
export const GET = (request: NextRequest) => handle(request, false);
export const POST = (request: NextRequest) => handle(request, true);
