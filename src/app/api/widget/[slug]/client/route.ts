import { prisma } from "@/server/db/prisma";
import { NextRequest } from "next/server";

/**
 * GET /api/widget/[slug]/client
 * ?email=cliente@ejemplo.com
 *
 * Returns basic client info for pre-fill if the client already booked with this business.
 * Only returns non-sensitive fields: name, phone, rut.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return Response.json({ error: "Email requerido" }, { status: 400 });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Email invalido" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const client = await prisma.client.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        businessId: business.id,
      },
      select: {
        name: true,
        phone: true,
        rut: true,
      },
    });

    if (!client) {
      return Response.json(null);
    }

    return Response.json(client);
  } catch (error) {
    console.error("[api/widget/client] Error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}
