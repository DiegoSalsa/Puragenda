import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  getAvailabilityStoryPresets,
  saveAvailabilityStoryPreset,
} from "@/server/services/availability-story.service";
import { storyPresetCreateSchema } from "@/server/validations/availability-story";

export async function GET(request: NextRequest) {
  const user = await getApiSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  const presets = await getAvailabilityStoryPresets(user, business);
  return NextResponse.json({ presets });
}

export async function POST(request: NextRequest) {
  const user = await getApiSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  const parsed = storyPresetCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Preset inválido" }, { status: 400 });

  try {
    const preset = await saveAvailabilityStoryPreset(user, business, parsed.data);
    return NextResponse.json({ preset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("FORBIDDEN")) return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    if (message.includes("STORAGE_MISSING")) return NextResponse.json({ error: "Ejecuta la migración pendiente" }, { status: 503 });
    console.error("[AvailabilityStory] Preset save failed:", error);
    return NextResponse.json({ error: "No se pudo guardar el preset" }, { status: 500 });
  }
}
