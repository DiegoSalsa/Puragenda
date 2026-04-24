import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { getServiceByIdAndBusiness } from "@/server/services/service.service";
import { createAppointment } from "@/server/services/appointment.service";
import { bookingSchema } from "@/server/validations/booking";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message);
      return Response.json(
        { error: "Errores de validación", details: errors },
        { status: 400 }
      );
    }

    const { serviceId, customerName, customerEmail, customerPhone, startTime, endTime, staffId } = parsed.data;

    const business = await getBusinessBySlug(slug);
    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    // Validate API Key
    const apiKey = request.headers.get("x-api-key") || body.apiKey;
    if (!validateApiKey(business, apiKey)) {
      return Response.json(
        { error: "API Key inválida o no proporcionada" },
        { status: 401 }
      );
    }

    // Verify service belongs to business
    const service = await getServiceByIdAndBusiness(serviceId, business.id);
    if (!service) {
      return Response.json(
        { error: "Servicio no encontrado para este negocio" },
        { status: 404 }
      );
    }

    // Create appointment with collision detection
    const result = await createAppointment({
      customerName,
      customerEmail,
      customerPhone,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      businessId: business.id,
      serviceId: service.id,
      staffId,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 409 });
    }

    return Response.json(result.appointment, { status: 201 });
  } catch {
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
