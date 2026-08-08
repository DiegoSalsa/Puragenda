import { createElement } from "react";
import { ImageResponse } from "next/og";
import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { buildAvailabilityStory } from "@/server/services/availability-story.service";
import { AvailabilityStoryImage } from "@/server/stories/availability-story-image";
import { availabilityStoryRequestSchema } from "@/server/validations/availability-story";
import { availabilityStoryLimiter } from "@/server/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "BUSINESS_NOT_FOUND") return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  if (message.includes("FORBIDDEN")) return NextResponse.json({ error: "No tienes acceso a esa disponibilidad" }, { status: 403 });
  console.error("[AvailabilityStory] Render failed:", error);
  return NextResponse.json({ error: "No se pudo generar la historia" }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const limited = availabilityStoryLimiter.check(request);
  if (limited) return limited;

  const user = await getApiSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const business = await getBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const parsed = availabilityStoryRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Configuración de historia inválida" }, { status: 400 });

  try {
    const data = await buildAvailabilityStory(user, business.id, parsed.data);
    const filename = `disponibilidad-${data.days[0]?.date ?? "puragenda"}.png`;
    return new ImageResponse(createElement(AvailabilityStoryImage, { data }), {
      width: 1080,
      height: 1920,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
