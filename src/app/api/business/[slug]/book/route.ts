import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { getServiceByIdAndBusiness } from "@/server/services/service.service";
import { checkAppointmentCollision, createAppointment } from "@/server/services/appointment.service";
import { sendBookingNotifications } from "@/server/email/send";
import { bookingSchema } from "@/server/validations/booking";
import { prisma } from "@/server/db/prisma";
import { NextRequest } from "next/server";
import { bookingLimiter } from "@/server/lib/rate-limit";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { toZonedTime } from "date-fns-tz";
import { resolveWidgetPromotion } from "@/server/services/widget-promotion.service";
import { getPublicBlockingScheduleBlockWhere } from "@/server/services/schedule-block.service";

type ScheduleRange = {
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
};

function scheduleTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function validateScheduleRange(
  start: Date,
  end: Date,
  range: ScheduleRange,
  label: string
) {
  if (localDateKey(start) !== localDateKey(end)) {
    return `La reserva debe comenzar y terminar el mismo día según el horario de ${label}.`;
  }

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const rangeStart = scheduleTimeToMinutes(range.startTime);
  const rangeEnd = scheduleTimeToMinutes(range.endTime);

  if (startMinutes < rangeStart || endMinutes > rangeEnd) {
    return `El horario seleccionado está fuera del horario de ${label}.`;
  }

  if (range.breakStart && range.breakEnd) {
    const breakStart = scheduleTimeToMinutes(range.breakStart);
    const breakEnd = scheduleTimeToMinutes(range.breakEnd);
    if (startMinutes < breakEnd && endMinutes > breakStart) {
      return `El horario seleccionado coincide con la pausa configurada de ${label}.`;
    }
  }

  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // Rate limiting
    const blocked = bookingLimiter.check(request);
    if (blocked) return blocked;

    const body = await request.json();

    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((i) => i.message);
      return Response.json(
        { error: "Errores de validación", details: errors },
        { status: 400 }
      );
    }

    const { serviceId, serviceIds, selectedOptionAlternativeIds, customerName, customerEmail, customerPhone, customerAddress, startTime, endTime, staffId, staffAssignments, rewardCode, promotionId } = parsed.data;

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

    // ── Anti-No-Show: Check if client is blocked ──
    const existingClient = await prisma.client.findUnique({
      where: {
        businessId_email: { businessId: business.id, email: customerEmail },
      },
    });

    if (existingClient && existingClient.noShowCount >= 2) {
      return Response.json(
        {
          error: "Tu cuenta ha sido bloqueada por inasistencias reiteradas. Contacta al negocio para más información.",
          code: "NO_SHOW_BLOCKED",
        },
        { status: 403 }
      );
    }

    // Verify primary service belongs to business
    const service = await getServiceByIdAndBusiness(serviceId, business.id);
    if (!service) {
      return Response.json(
        { error: "Servicio no encontrado para este negocio" },
        { status: 404 }
      );
    }

    // Handle multi-service: validate all serviceIds
    const allServiceIds = serviceIds && serviceIds.length > 0 ? serviceIds : [serviceId];
    const additionalIds = allServiceIds.filter((id) => id !== serviceId);

    // Validate max services per booking
    if (allServiceIds.length > business.maxServicesPerBooking) {
      return Response.json(
        { error: `Máximo ${business.maxServicesPerBooking} servicio(s) por reserva` },
        { status: 400 }
      );
    }

    // Calculate totals from canonical service data, including configurable options.
    let totalDuration = service.duration;
    let totalPrice = service.price;
    const selectedOptionIdSet = new Set(selectedOptionAlternativeIds);
    const matchedOptionIds = new Set<string>();
    const serviceTotals = new Map<string, { duration: number; price: number }>();
    const selectedOptionsSnapshot: {
      serviceId: string;
      serviceName: string;
      categoryId: string;
      categoryName: string;
      alternativeId: string;
      alternativeName: string;
      priceDelta: number;
      durationDelta: number;
      isHomeService: boolean;
    }[] = [];
    const allSelectedServices = [service];
    serviceTotals.set(service.id, { duration: service.duration, price: service.price });

    if (additionalIds.length > 0) {
      const additionalServices = await prisma.service.findMany({
        where: { id: { in: additionalIds }, businessId: business.id },
        include: {
          category: true,
          optionCategories: {
            orderBy: { position: "asc" },
            include: { alternatives: { orderBy: { position: "asc" } } },
          },
        },
      });

      if (additionalServices.length !== additionalIds.length) {
        return Response.json(
          { error: "Uno o mas servicios seleccionados no pertenecen a este negocio" },
          { status: 400 }
        );
      }

      for (const s of additionalServices) {
        totalDuration += s.duration;
        totalPrice += s.price;
        allSelectedServices.push(s);
        serviceTotals.set(s.id, { duration: s.duration, price: s.price });
      }
    }

    for (const currentService of allSelectedServices) {
      for (const category of currentService.optionCategories) {
        const selectedAlternatives = category.alternatives.filter((alt) =>
          selectedOptionIdSet.has(alt.id)
        );

        if (selectedAlternatives.length > category.maxSelections) {
          return Response.json(
            { error: `Puedes seleccionar hasta ${category.maxSelections} alternativa(s) para ${category.name}` },
            { status: 400 }
          );
        }

        if (category.isRequired && selectedAlternatives.length === 0) {
          return Response.json(
            { error: `Debes seleccionar una alternativa para ${category.name}` },
            { status: 400 }
          );
        }

        for (const alternative of selectedAlternatives) {
          matchedOptionIds.add(alternative.id);
          totalDuration += alternative.durationDelta;
          totalPrice += alternative.priceDelta;
          const currentTotals = serviceTotals.get(currentService.id) ?? { duration: currentService.duration, price: currentService.price };
          serviceTotals.set(currentService.id, {
            duration: currentTotals.duration + alternative.durationDelta,
            price: currentTotals.price + alternative.priceDelta,
          });
          selectedOptionsSnapshot.push({
            serviceId: currentService.id,
            serviceName: currentService.name,
            categoryId: category.id,
            categoryName: category.name,
            alternativeId: alternative.id,
            alternativeName: alternative.name,
            priceDelta: alternative.priceDelta,
            durationDelta: alternative.durationDelta,
            isHomeService: alternative.isHomeService,
          });
        }
      }
    }

    if (matchedOptionIds.size !== selectedOptionIdSet.size) {
      return Response.json(
        { error: "Una o mas opciones seleccionadas no son validas para estos servicios" },
        { status: 400 }
      );
    }

    const requiresHomeAddress = selectedOptionsSnapshot.some((selected) => selected.isHomeService);
    if (requiresHomeAddress && (!customerAddress || customerAddress.trim().length < 5)) {
      return Response.json({ error: "Debes indicar la direccion para el servicio a domicilio" }, { status: 400 });
    }

    if (promotionId && rewardCode) {
      return Response.json(
        { error: "Las promociones y los códigos de premio no se pueden combinar" },
        { status: 400 }
      );
    }

    const originalTotalPrice = totalPrice;
    const promotionResolution = await resolveWidgetPromotion({
      promotionId,
      businessId: business.id,
      subtotal: originalTotalPrice,
    });
    if ("error" in promotionResolution) {
      return Response.json({ error: promotionResolution.error }, { status: 400 });
    }
    const appliedPromotion = promotionResolution.promotion;
    const promotionDiscountAmount = promotionResolution.quote?.discountAmount ?? 0;
    totalPrice = promotionResolution.quote?.discountedTotal ?? originalTotalPrice;

    const requestedStart = new Date(startTime);
    const requestedEnd = new Date(endTime);
    const hasStaffAssignments = !!staffAssignments && staffAssignments.length > 0;
    const expectedDuration = hasStaffAssignments
      ? Math.max(...allSelectedServices.map((s) => serviceTotals.get(s.id)?.duration ?? s.duration))
      : totalDuration;
    const expectedEnd = new Date(requestedStart.getTime() + expectedDuration * 60 * 1000);
    if (Math.abs(requestedEnd.getTime() - expectedEnd.getTime()) > 1000) {
      return Response.json(
        { error: "La duracion seleccionada no coincide con las opciones del servicio" },
        { status: 400 }
      );
    }

    // ── CRM: Upsert Client record ──
    if (
      Number.isNaN(requestedStart.getTime()) ||
      Number.isNaN(requestedEnd.getTime()) ||
      requestedEnd <= requestedStart
    ) {
      return Response.json(
        { error: "El rango de fecha y hora seleccionado no es válido" },
        { status: 400 }
      );
    }

    const timezone = business.timezone || "America/Santiago";
    const localStart = toZonedTime(requestedStart, timezone);
    const localEnd = toZonedTime(expectedEnd, timezone);
    const localNow = toZonedTime(new Date(), timezone);
    const bookingDateKey = localDateKey(localStart);
    const todayKey = localDateKey(localNow);

    if (bookingDateKey < todayKey || requestedStart <= new Date()) {
      return Response.json(
        { error: "No puedes reservar un horario que ya pasó" },
        { status: 400 }
      );
    }

    if (bookingDateKey === todayKey) {
      if (!business.allowSameDayBookings) {
        return Response.json(
          { error: "Este negocio no acepta reservas para el mismo día" },
          { status: 400 }
        );
      }

      const earliestAllowed = Date.now() + business.minAdvanceBookingMinutes * 60 * 1000;
      if (requestedStart.getTime() < earliestAllowed) {
        return Response.json(
          {
            error: `Debes reservar con al menos ${business.minAdvanceBookingMinutes} minutos de anticipación`,
          },
          { status: 400 }
        );
      }
    }

    const blockedDate = await prisma.blockedDate.findUnique({
      where: {
        businessId_date: {
          businessId: business.id,
          date: new Date(`${bookingDateKey}T00:00:00.000Z`),
        },
      },
      select: { reason: true },
    });

    if (blockedDate) {
      return Response.json(
        {
          error: blockedDate.reason
            ? `El negocio no atiende ese día: ${blockedDate.reason}`
            : "El negocio no atiende el día seleccionado",
        },
        { status: 400 }
      );
    }

    const businessHour = await prisma.businessHours.findUnique({
      where: {
        businessId_dayOfWeek: {
          businessId: business.id,
          dayOfWeek: localStart.getDay(),
        },
      },
    });

    if (businessHour && !businessHour.isOpen) {
      return Response.json(
        { error: "El negocio está cerrado el día seleccionado" },
        { status: 400 }
      );
    }

    const businessScheduleError = validateScheduleRange(
      localStart,
      localEnd,
      businessHour ?? { startTime: "09:00", endTime: "19:00" },
      "atención del negocio"
    );
    if (businessScheduleError) {
      return Response.json({ error: businessScheduleError }, { status: 400 });
    }

    if (!hasStaffAssignments && staffId) {
      const selectedStaff = await prisma.staff.findFirst({
        where: { id: staffId, businessId: business.id, isActive: true },
        include: {
          services: { select: { id: true } },
          schedule: { orderBy: { dayOfWeek: "asc" } },
        },
      });

      if (!selectedStaff) {
        return Response.json(
          { error: "El profesional seleccionado no pertenece a este negocio o está inactivo" },
          { status: 400 }
        );
      }

      const assignedServiceIds = new Set(selectedStaff.services.map((item) => item.id));
      const canPerformAll =
        assignedServiceIds.size === 0 ||
        allServiceIds.every((selectedServiceId) => assignedServiceIds.has(selectedServiceId));
      if (!canPerformAll) {
        return Response.json(
          { error: "El profesional seleccionado no realiza todos los servicios de la reserva" },
          { status: 400 }
        );
      }

      if (selectedStaff.schedule.length > 0) {
        const staffDay = selectedStaff.schedule.find(
          (entry) => entry.dayOfWeek === localStart.getDay()
        );
        if (!staffDay?.isWorking) {
          return Response.json(
            { error: "El profesional no trabaja el día seleccionado" },
            { status: 400 }
          );
        }

        const staffScheduleError = validateScheduleRange(
          localStart,
          localEnd,
          staffDay,
          `trabajo de ${selectedStaff.name}`
        );
        if (staffScheduleError) {
          return Response.json({ error: staffScheduleError }, { status: 400 });
        }
      }
    }

    const client = await prisma.client.upsert({
      where: {
        businessId_email: { businessId: business.id, email: customerEmail },
      },
      update: {
        name: customerName,
        phone: customerPhone,
      },
      create: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        businessId: business.id,
      },
    });

    // ── Check deposit requirements (per-service) ──
    let totalDepositAmount = service.depositAmount || 0;
    if (additionalIds.length > 0) {
      const additionalServicesForDeposit = await prisma.service.findMany({
        where: { id: { in: additionalIds }, businessId: business.id },
        select: { depositAmount: true },
      });
      for (const s of additionalServicesForDeposit) {
        totalDepositAmount += s.depositAmount || 0;
      }
    }
    totalDepositAmount = Math.min(totalDepositAmount, totalPrice);
    const depositRequired = business.depositRequired && totalDepositAmount > 0 && !!business.mpAccessToken;

    if (hasStaffAssignments) {
      const assignmentServiceIds = new Set(staffAssignments.map((assignment) => assignment.serviceId));
      if (assignmentServiceIds.size !== allServiceIds.length || allServiceIds.some((id) => !assignmentServiceIds.has(id))) {
        return Response.json(
          { error: "Debes asignar un profesional para cada servicio seleccionado" },
          { status: 400 }
        );
      }

      const assignedStaffIds = Array.from(new Set(staffAssignments.map((assignment) => assignment.staffId)));
      const assignedStaff = await prisma.staff.findMany({
        where: { id: { in: assignedStaffIds }, businessId: business.id, isActive: true },
        include: { services: { select: { id: true } } },
      });

      if (assignedStaff.length !== assignedStaffIds.length) {
        return Response.json(
          { error: "Uno o mas profesionales seleccionados no pertenecen a este negocio" },
          { status: 400 }
        );
      }

      const staffById = new Map(assignedStaff.map((staff) => [staff.id, staff]));
      const serviceById = new Map(allSelectedServices.map((s) => [s.id, s]));
      const groupedAssignments = new Map<string, typeof staffAssignments>();

      for (const assignment of staffAssignments) {
        const assigned = staffById.get(assignment.staffId);
        if (!assigned) continue;
        const assignedServiceIds = assigned.services.map((s) => s.id);
        const canPerform = assignedServiceIds.length === 0 || assignedServiceIds.includes(assignment.serviceId);
        if (!canPerform) {
          return Response.json(
            { error: "Uno o mas profesionales no pueden realizar el servicio asignado" },
            { status: 400 }
          );
        }
        groupedAssignments.set(assignment.staffId, [...(groupedAssignments.get(assignment.staffId) ?? []), assignment]);
      }

      const groupedAppointmentEntries = Array.from(groupedAssignments.entries());

      for (const [assignedStaffId, assignments] of groupedAppointmentEntries) {
        const groupServices = assignments
          .map((assignment) => serviceById.get(assignment.serviceId))
          .filter((s): s is NonNullable<typeof s> => Boolean(s));
        const groupDuration = groupServices.reduce((sum, s) => sum + (serviceTotals.get(s.id)?.duration ?? s.duration), 0);
        const groupEnd = new Date(requestedStart.getTime() + groupDuration * 60 * 1000);
        const assigned = staffById.get(assignedStaffId);
        if (assigned) {
          const schedule = await prisma.staffSchedule.findMany({
            where: { staffId: assignedStaffId },
            orderBy: { dayOfWeek: "asc" },
          });
          if (schedule.length > 0) {
            const staffDay = schedule.find((entry) => entry.dayOfWeek === localStart.getDay());
            if (!staffDay?.isWorking) {
              return Response.json(
                { error: `${assigned.name} no trabaja el día seleccionado` },
                { status: 400 }
              );
            }

            const staffScheduleError = validateScheduleRange(
              localStart,
              toZonedTime(groupEnd, timezone),
              staffDay,
              `trabajo de ${assigned.name}`
            );
            if (staffScheduleError) {
              return Response.json({ error: staffScheduleError }, { status: 400 });
            }
          }
        }

        const { hasCollision, conflictingAppointment } = await checkAppointmentCollision(
          business.id,
          requestedStart,
          groupEnd,
          assignedStaffId
        );

        if (hasCollision) {
          return Response.json(
            { error: `Ya existe una cita en ese horario (cliente: ${conflictingAppointment?.customerName}). Por favor selecciona otro horario.` },
            { status: 409 }
          );
        }

        const blockCollision = await prisma.scheduleBlock.findFirst({
          where: {
            staffId: assignedStaffId,
            startTime: { lt: groupEnd },
            endTime: { gt: requestedStart },
            ...getPublicBlockingScheduleBlockWhere(),
          },
        });

        if (blockCollision) {
          return Response.json(
            { error: "Uno de los profesionales tiene un bloqueo de horario en ese rango. Por favor selecciona otro horario." },
            { status: 409 }
          );
        }
      }

      const createdAppointments = [];
      let remainingDiscountedTotal = totalPrice;

      for (const [groupIndex, [assignedStaffId, assignments]] of groupedAppointmentEntries.entries()) {
        const groupServices = assignments
          .map((assignment) => serviceById.get(assignment.serviceId))
          .filter((s): s is NonNullable<typeof s> => Boolean(s));
        const groupDuration = groupServices.reduce((sum, s) => sum + (serviceTotals.get(s.id)?.duration ?? s.duration), 0);
        const groupPrice = groupServices.reduce((sum, s) => sum + (serviceTotals.get(s.id)?.price ?? s.price), 0);
        const groupDiscountedPrice = groupIndex === groupedAppointmentEntries.length - 1
          ? remainingDiscountedTotal
          : Math.min(
              remainingDiscountedTotal,
              Math.round(totalPrice * groupPrice / Math.max(1, originalTotalPrice))
            );
        remainingDiscountedTotal -= groupDiscountedPrice;
        const groupDeposit = Math.min(
          groupDiscountedPrice,
          groupServices.reduce((sum, s) => sum + (s.depositAmount || 0), 0)
        );
        const groupEnd = new Date(requestedStart.getTime() + groupDuration * 60 * 1000);
        const groupPrimary = groupServices[0];

        const result = await createAppointment({
          customerName,
          customerEmail,
          customerPhone,
          customerAddress: requiresHomeAddress ? customerAddress : undefined,
          startTime: requestedStart,
          endTime: groupEnd,
          businessId: business.id,
          serviceId: groupPrimary.id,
          staffId: assignedStaffId,
          additionalServiceIds: groupServices.slice(1).map((s) => s.id),
          totalDuration: groupDuration,
          totalPrice: groupDiscountedPrice,
          originalTotalPrice: groupPrice,
          discountAmount: groupPrice - groupDiscountedPrice,
          promotionId: appliedPromotion?.id,
          promotionTitle: appliedPromotion?.title,
          selectedOptions: selectedOptionsSnapshot.filter((option) => assignments.some((assignment) => assignment.serviceId === option.serviceId)),
          clientId: client.id,
          depositRequired,
          depositAmount: groupDeposit,
        });

        if (!result.success) {
          return Response.json({ error: result.error }, { status: 409 });
        }

        createdAppointments.push(result.appointment);
      }

      let paymentUrl: string | null = null;

      if (depositRequired && business.mpAccessToken) {
        try {
          const mpClient = new MercadoPagoConfig({
            accessToken: business.mpAccessToken,
          });

          const preference = new Preference(mpClient);
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const primaryAppointmentId = createdAppointments[0].id;

          const prefResult = await preference.create({
            body: {
              items: [
                {
                  id: primaryAppointmentId,
                  title: `Abono - Reserva multiple en ${business.name}`,
                  description: `Reserva para ${customerName} (${createdAppointments.length} profesionales)`,
                  quantity: 1,
                  unit_price: totalDepositAmount,
                  currency_id: "CLP",
                },
              ],
              back_urls: {
                success: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${primaryAppointmentId}&status=approved`,
                failure: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${primaryAppointmentId}&status=rejected`,
                pending: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${primaryAppointmentId}&status=pending`,
              },
              ...(baseUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
              external_reference: primaryAppointmentId,
              notification_url: `${baseUrl}/api/webhooks/deposit`,
              statement_descriptor: "PURAGENDA",
            },
          });

          paymentUrl = prefResult.init_point || prefResult.sandbox_init_point || null;

          if (!paymentUrl) {
            throw new Error("MercadoPago no devolvio un link de pago");
          }

          await prisma.appointment.updateMany({
            where: { id: { in: createdAppointments.map((appointment) => appointment.id) } },
            data: { mpPreferenceId: prefResult.id || null },
          });
        } catch (err) {
          console.error("[Book] Error creating MP preference for multi-staff booking:", err);
          await prisma.appointment.updateMany({
            where: { id: { in: createdAppointments.map((appointment) => appointment.id) } },
            data: { status: "CANCELLED", paymentStatus: "REJECTED" },
          });
          return Response.json(
            { error: "No se pudo generar el link de pago. Intenta nuevamente." },
            { status: 502 }
          );
        }
      }

      if (!depositRequired) {
        for (const appointment of createdAppointments) {
          const appointmentWithRelations = await prisma.appointment.findUnique({
            where: { id: appointment.id },
            include: {
              service: true,
              staff: true,
              business: { include: { owner: { select: { email: true, name: true } } } },
            },
          });
          if (appointmentWithRelations) {
            await sendBookingNotifications(appointmentWithRelations);
          }
        }
      }

      if (rewardCode) {
        try {
          const loyaltyCode = await prisma.loyaltyCode.findUnique({
            where: { code: rewardCode },
            include: { client: { select: { email: true } } },
          });

          if (
            loyaltyCode &&
            !loyaltyCode.isUsed &&
            loyaltyCode.businessId === business.id &&
            loyaltyCode.client.email.toLowerCase() === customerEmail.toLowerCase()
          ) {
            await prisma.loyaltyCode.update({
              where: { id: loyaltyCode.id },
              data: { isUsed: true },
            });
          }
        } catch (err) {
          console.error("[Book] Error redeeming reward code:", err);
        }
      }

      return Response.json(
        {
          ...createdAppointments[0],
          relatedAppointments: createdAppointments,
          depositRequired,
          paymentUrl,
        },
        { status: 201 }
      );
    }

    // Create appointment with collision detection
    const result = await createAppointment({
      customerName,
      customerEmail,
      customerPhone,
      customerAddress: requiresHomeAddress ? customerAddress : undefined,
      startTime: requestedStart,
      endTime: expectedEnd,
      businessId: business.id,
      serviceId: service.id,
      staffId,
      additionalServiceIds: additionalIds,
      totalDuration,
      totalPrice,
      originalTotalPrice,
      discountAmount: promotionDiscountAmount,
      promotionId: appliedPromotion?.id,
      promotionTitle: appliedPromotion?.title,
      selectedOptions: selectedOptionsSnapshot,
      clientId: client.id,
      depositRequired,
      depositAmount: totalDepositAmount,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 409 });
    }

    // ── If deposit required, create MP payment preference ──
    let paymentUrl: string | null = null;

    if (depositRequired && business.mpAccessToken) {
      try {
        const mpClient = new MercadoPagoConfig({
          accessToken: business.mpAccessToken,
        });

        const preference = new Preference(mpClient);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const prefResult = await preference.create({
          body: {
            items: [
              {
                id: result.appointment.id,
                title: `Abono - ${service.name} en ${business.name}`,
                description: `Reserva para ${customerName}`,
                quantity: 1,
                unit_price: totalDepositAmount,
                currency_id: "CLP",
              },
            ],
            back_urls: {
              success: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${result.appointment.id}&status=approved`,
              failure: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${result.appointment.id}&status=rejected`,
              pending: `${baseUrl}/api/mercadopago/deposit-return?appointmentId=${result.appointment.id}&status=pending`,
            },
            ...(baseUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
            external_reference: result.appointment.id,
            notification_url: `${baseUrl}/api/webhooks/deposit`,
            statement_descriptor: "PURAGENDA",
          },
        });

        paymentUrl = prefResult.init_point || prefResult.sandbox_init_point || null;

        if (!paymentUrl) {
          throw new Error("MercadoPago no devolvio un link de pago");
        }

        // Save preference ID
        await prisma.appointment.update({
          where: { id: result.appointment.id },
          data: { mpPreferenceId: prefResult.id || null },
        });
      } catch (err) {
        console.error("[Book] Error creating MP preference:", err);
        await prisma.appointment.update({
          where: { id: result.appointment.id },
          data: { status: "CANCELLED", paymentStatus: "REJECTED" },
        });
        return Response.json(
          { error: "No se pudo generar el link de pago. Intenta nuevamente." },
          { status: 502 }
        );
        // Don't block booking if preference creation fails — appointment is still created
      }
    }

    // Send email notifications asynchronously (don't block the response)
    // Only send if no deposit required (otherwise wait for payment)
    if (!depositRequired) {
      const appointmentWithRelations = await prisma.appointment.findUnique({
        where: { id: result.appointment.id },
        include: {
          service: true,
          staff: true,
          business: { include: { owner: { select: { email: true, name: true } } } },
        },
      });

      if (appointmentWithRelations) {
        await sendBookingNotifications(appointmentWithRelations);
      }
    }

    // ── Redeem reward code if provided ──
    if (rewardCode) {
      try {
        const loyaltyCode = await prisma.loyaltyCode.findUnique({
          where: { code: rewardCode },
          include: { client: { select: { email: true } } },
        });

        if (
          loyaltyCode &&
          !loyaltyCode.isUsed &&
          loyaltyCode.businessId === business.id &&
          loyaltyCode.client.email.toLowerCase() === customerEmail.toLowerCase()
        ) {
          await prisma.loyaltyCode.update({
            where: { id: loyaltyCode.id },
            data: { isUsed: true },
          });
        }
      } catch (err) {
        console.error("[Book] Error redeeming reward code:", err);
        // Don't block booking if reward redemption fails
      }
    }

    return Response.json(
      {
        ...result.appointment,
        depositRequired,
        paymentUrl,
      },
      { status: 201 }
    );
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

