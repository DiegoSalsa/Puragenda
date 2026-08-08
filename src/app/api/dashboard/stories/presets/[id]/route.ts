import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { deleteAvailabilityStoryPreset } from "@/server/services/availability-story.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  try {
    const { id } = await params;
    await deleteAvailabilityStoryPreset(user, business, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("FORBIDDEN")) return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    if (message === "STORY_PRESET_NOT_FOUND") return NextResponse.json({ error: "Preset no encontrado" }, { status: 404 });
    console.error("[AvailabilityStory] Preset delete failed:", error);
    return NextResponse.json({ error: "No se pudo eliminar el preset" }, { status: 500 });
  }
}
