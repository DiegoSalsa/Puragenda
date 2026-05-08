import { prisma } from "@/server/db/prisma";
import { NextRequest } from "next/server";
import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";

/**
 * POST /api/business/[slug]/validate-reward
 * Validates a loyalty reward code for the given business + client email.
 *
 * Body: { code: string, email: string }
 * Returns: { valid: true, discountType, discountValue } or { error }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();
    const { code, email } = body;

    if (!code || !email) {
      return Response.json(
        { error: "Código y email son obligatorios." },
        { status: 400 }
      );
    }

    const business = await getBusinessBySlug(slug);
    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    // Validate API Key
    const apiKey = request.headers.get("x-api-key") || body.apiKey;
    if (!validateApiKey(business, apiKey)) {
      return Response.json(
        { error: "API Key inválida" },
        { status: 401 }
      );
    }

    // Find the loyalty code
    const loyaltyCode = await prisma.loyaltyCode.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        client: { select: { email: true } },
      },
    });

    if (!loyaltyCode) {
      return Response.json(
        { error: "Código de premio no encontrado." },
        { status: 404 }
      );
    }

    // Verify the code belongs to this business
    if (loyaltyCode.businessId !== business.id) {
      return Response.json(
        { error: "Este código no pertenece a este negocio." },
        { status: 403 }
      );
    }

    // Verify the code belongs to the client's email
    if (loyaltyCode.client.email.toLowerCase() !== email.trim().toLowerCase()) {
      return Response.json(
        { error: "Este código no está asociado a tu correo electrónico." },
        { status: 403 }
      );
    }

    // Verify the code hasn't been used
    if (loyaltyCode.isUsed) {
      return Response.json(
        { error: "Este código ya fue utilizado." },
        { status: 409 }
      );
    }

    // Code is valid!
    return Response.json({
      valid: true,
      discountType: loyaltyCode.discountType,
      discountValue: loyaltyCode.discountValue,
      rewardName: loyaltyCode.rewardName,
    });
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
