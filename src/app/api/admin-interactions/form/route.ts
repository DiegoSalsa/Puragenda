import { NextRequest, NextResponse } from "next/server";
import { submitInteractiveResponse } from "@/server/services/admin-interactions.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const answers = typeof body.answers === "object" && body.answers ? body.answers as Record<string, string> : {};
    const comment = typeof body.comment === "string" ? body.comment : undefined;
    const rating = typeof body.rating === "number" ? body.rating : undefined;

    const result = await submitInteractiveResponse({ token, answers, comment, rating });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin-interactions/form] Error:", error);
    return NextResponse.json({ error: "Error al guardar la respuesta" }, { status: 500 });
  }
}
