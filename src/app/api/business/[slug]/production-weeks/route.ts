import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { getProductionWindows } from "@/server/services/production-window.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const serviceId = request.nextUrl.searchParams.get("serviceId");
  if (!serviceId) return Response.json({ error: "Servicio requerido" }, { status: 400 });

  const business = await getBusinessBySlug(slug);
  if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
  if (!business.productionOrdersEnabled) {
    return Response.json({ error: "Los encargos no están habilitados" }, { status: 404 });
  }

  const apiKey = request.headers.get("x-api-key");
  if (!validateApiKey(business, apiKey)) {
    return Response.json({ error: "API Key inválida" }, { status: 401 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id, bookingMode: "PRODUCTION" },
    select: {
      id: true,
      productionScheduleMode: true,
      weeklyProductionCapacity: true,
      productionWeeksAhead: true,
      productionLeadTimeWeeks: true,
      customProductionWindows: true,
    },
  });
  if (!service) return Response.json({ error: "Servicio de encargo no encontrado" }, { status: 404 });

  const windows = await getProductionWindows(service);
  return Response.json({ windows });
}
