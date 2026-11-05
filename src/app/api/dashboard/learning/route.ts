import { NextRequest } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { requireSameOrigin } from "@/server/security/same-origin";
import { prisma } from "@/server/db/prisma";
import { learningContext, saveLearning } from "@/server/onboarding/tutorial-service";
import { SetupError } from "@/server/onboarding/service";

async function handle(request: NextRequest, write: boolean) {
  if (write) { const denied = requireSameOrigin(request); if (denied) return denied; }
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión para ver tus guías." }, { status: 401 });
  try {
    const context = await learningContext(user);
    if (write) {
      const text = await request.text();
      if (text.length > 2000) return Response.json({ error: "Solicitud demasiado grande." }, { status: 413 });
      return Response.json(await saveLearning(context, JSON.parse(text)), { headers: { "Cache-Control": "private, no-store" } });
    }
    const progress = await prisma.tutorialProgress.findMany({ where: { businessId: context.businessId, userId: context.userId }, select: { tutorialId: true, version: true, step: true, status: true, revision: true } });
    return Response.json({ tutorials: context.tutorials, progress, canSetup: context.canSetup }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof SetupError) return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof SyntaxError) return Response.json({ error: "Solicitud inválida." }, { status: 400 });
    return Response.json({ error: "No pudimos guardar el avance de la guía. Intenta nuevamente." }, { status: 503 });
  }
}
export const GET = (request: NextRequest) => handle(request, false);
export const POST = (request: NextRequest) => handle(request, true);
