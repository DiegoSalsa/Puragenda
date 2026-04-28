import { getBusinessWithServices } from "@/server/services/business.service";
import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const business = await getBusinessWithServices(slug);

    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    return Response.json(business.services);
  } catch {
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
