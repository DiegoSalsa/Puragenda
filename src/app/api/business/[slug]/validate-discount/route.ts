import { NextRequest } from "next/server";
import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { resolveBookingDiscount } from "@/server/services/booking-discount.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code : "";
    const subtotal = Number(body.subtotal);
    if (!code.trim() || !Number.isFinite(subtotal) || subtotal < 0) {
      return Response.json({ error: "Código y subtotal son obligatorios" }, { status: 400 });
    }

    const business = await getBusinessBySlug(slug);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

    const apiKey = request.headers.get("x-api-key") || body.apiKey;
    if (!validateApiKey(business, apiKey)) return Response.json({ error: "API Key inválida" }, { status: 401 });

    const result = await resolveBookingDiscount({ code, businessId: business.id, subtotal });
    if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
    if (!result.quote) return Response.json({ error: "El código no está disponible" }, { status: 404 });

    return Response.json({
      valid: true,
      code: result.quote.code,
      discountType: result.quote.discountType,
      discountValue: result.quote.discountValue,
      discountAmount: result.quote.discountAmount,
      discountedTotal: result.quote.discountedTotal,
    });
  } catch (error) {
    console.error("[validate-discount] Error", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
