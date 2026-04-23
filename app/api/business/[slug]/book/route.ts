import { getBusinessBySlug, validateApiKey } from "@/backend/services/business.service";
import { getServiceByIdAndBusiness } from "@/backend/services/service.service";
import { createAppointment } from "@/backend/services/appointment.service";
import { bookingSchema } from "@/backend/validations/booking";
import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const body = await request.json();

    // Validación con Zod
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message);
      return Response.json(
        { error: "Errores de validación", details: errors },
        { status: 400 }
      );
    }

    const { serviceId, customerName, customerEmail, startTime, endTime } = parsed.data;

    // Buscar negocio
    const business = await getBusinessBySlug(slug);
    if (!business) {
      return Response.json(
        { error: "Negocio no encontrado" },
        { status: 404 }
      );
    }

    // Validar API Key
    const apiKey = request.headers.get("x-api-key") || body.apiKey;
    if (!validateApiKey(business, apiKey)) {
      return Response.json(
        { error: "API Key inválida o no proporcionada" },
        { status: 401 }
      );
    }

    // Verificar que el servicio pertenece al negocio
    const service = await getServiceByIdAndBusiness(serviceId, business.id);
    if (!service) {
      return Response.json(
        { error: "Servicio no encontrado para este negocio" },
        { status: 404 }
      );
    }

    // Crear cita con detección de colisiones
    const result = await createAppointment({
      customerName,
      customerEmail,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      businessId: business.id,
      serviceId: service.id,
    });

    if (!result.success) {
      return Response.json(
        { error: result.error },
        { status: 409 }
      );
    }

    return Response.json(result.appointment, { status: 201 });
  } catch {
    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Manejo de OPTIONS para CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
    },
  });
}
