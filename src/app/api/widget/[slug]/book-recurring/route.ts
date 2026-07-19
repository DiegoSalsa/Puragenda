import { prisma } from "@/server/db/prisma";
import { createRecurringBookingAction } from "@/server/actions/recurring.actions";
import { NextRequest } from "next/server";

/**
 * POST /api/widget/[slug]/book-recurring
 *
 * Public endpoint for widget to submit a recurring booking.
 * Body: { serviceId, staffId, selectedDays, selectedTimes, startDate,
 *         durationMonths, customerName, customerEmail, customerPhone,
 *         rut?, healthAnswers?, healthExtra? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const business = await prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const body = await request.json();

    const {
      serviceId,
      staffId,
      selectedDays,
      selectedTimes,
      startDate,
      durationMonths,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      selectedOptionAlternativeIds,
      rut,
      healthAnswers,
      healthExtra,
      healthAccepted,
    } = body;

    const normalizedPhone = typeof customerPhone === "string" ? customerPhone.trim() : "";

    if (!serviceId || !selectedDays || !selectedTimes || !startDate || !durationMonths || !customerName || !customerEmail || !normalizedPhone) {
      return Response.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    if (!/^\+?[0-9\s()-]{8,18}$/.test(normalizedPhone)) {
      return Response.json({ error: "Telefono invalido" }, { status: 400 });
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: business.id },
      include: {
        optionCategories: { include: { alternatives: true } },
      },
    });
    if (!service) {
      return Response.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const selectedOptionIds = new Set<string>(
      Array.isArray(selectedOptionAlternativeIds)
        ? selectedOptionAlternativeIds.filter((id): id is string => typeof id === "string")
        : []
    );
    const matchedOptionIds = new Set<string>();
    let requiresHomeAddress = false;

    for (const category of service.optionCategories) {
      const selectedAlternatives = category.alternatives.filter((alternative) => selectedOptionIds.has(alternative.id));
      if (selectedAlternatives.length > category.maxSelections) {
        return Response.json({ error: `Puedes seleccionar hasta ${category.maxSelections} alternativa(s) para ${category.name}` }, { status: 400 });
      }
      if (selectedOptionIds.size > 0 && category.isRequired && selectedAlternatives.length === 0) {
        return Response.json({ error: `Debes seleccionar una alternativa para ${category.name}` }, { status: 400 });
      }
      for (const alternative of selectedAlternatives) {
        matchedOptionIds.add(alternative.id);
        requiresHomeAddress ||= alternative.isHomeService;
      }
    }

    if (matchedOptionIds.size !== selectedOptionIds.size) {
      return Response.json({ error: "Una o mas opciones seleccionadas no son validas para este servicio" }, { status: 400 });
    }

    const normalizedAddress = typeof customerAddress === "string" ? customerAddress.trim() : "";
    if (requiresHomeAddress && normalizedAddress.length < 5) {
      return Response.json({ error: "Debes indicar la direccion para el servicio a domicilio" }, { status: 400 });
    }

    const result = await createRecurringBookingAction({
      businessSlug: slug,
      serviceId,
      staffId: staffId || undefined,
      selectedDays,
      selectedTimes,
      startDate: new Date(startDate),
      durationMonths,
      customerName,
      customerEmail,
      customerPhone: normalizedPhone,
      customerAddress: requiresHomeAddress ? normalizedAddress : undefined,
      customerRut: rut || undefined,
      healthAnswers: healthAnswers || undefined,
      healthFreeText: healthExtra || undefined,
      healthAccepted: healthAccepted ?? true,
    });

    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(result, { status: 201 });
  } catch (error) {
    console.error("[api/widget/book-recurring] Error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}
