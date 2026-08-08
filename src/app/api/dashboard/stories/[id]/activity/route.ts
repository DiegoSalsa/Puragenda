import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { recordAvailabilityStoryActivity } from "@/server/services/availability-story.service";
import { storyActivitySchema } from "@/server/validations/availability-story";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  const parsed = storyActivitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Actividad inválida" }, { status: 400 });

  try {
    const { id } = await params;
    await recordAvailabilityStoryActivity(user, business, id, parsed.data.activity);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }
    if (message === "STORY_CAMPAIGN_NOT_FOUND") {
      return NextResponse.json({ error: "Historia no encontrada" }, { status: 404 });
    }
    console.error("[AvailabilityStory] Activity failed:", error);
    return NextResponse.json({ error: "No se pudo registrar la actividad" }, { status: 500 });
  }
}
