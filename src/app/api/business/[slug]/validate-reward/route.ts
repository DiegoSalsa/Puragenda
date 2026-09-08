import { prisma } from "@/server/db/prisma";
import { NextRequest } from "next/server";
import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { resolveLoyaltyReward } from "@/server/services/loyalty-reward.service";

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
    const serviceIds: string[] = Array.isArray(body.serviceIds)
      ? Array.from(new Set<string>((body.serviceIds as unknown[]).filter((id): id is string => typeof id === "string"))).slice(0, 20)
      : [];

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

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, businessId: business.id },
      select: { id: true, price: true },
    });
    if (services.length !== serviceIds.length) return Response.json({ error: "Uno o más servicios no son válidos" }, { status: 400 });
    const serviceBasePrices = new Map(services.map((service) => [service.id, service.price]));
    const resolution = await resolveLoyaltyReward({
      code,
      customerEmail: email,
      businessId: business.id,
      subtotal: services.reduce((sum, service) => sum + service.price, 0),
      serviceBasePrices,
    });
    if ("error" in resolution) return Response.json({ error: resolution.error }, { status: 400 });

    return Response.json({
      valid: true,
      discountType: resolution.reward.rewardType,
      discountValue: resolution.reward.discountValue,
      rewardName: resolution.reward.rewardName,
      freeServiceId: resolution.reward.freeServiceId,
      freeServiceName: resolution.reward.freeService?.name ?? null,
      expiresAt: resolution.reward.expiresAt,
      quote: resolution.quote,
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
