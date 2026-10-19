import { fromZonedTime } from "date-fns-tz";

// Only called by the loopback-only disposable-schema runner. No provider calls.
export async function enrichMcpReviewFixture(db, staffPasswordHash) {
  const timezone = "America/Santiago";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const shift = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  const tomorrow = shift(today, 1), yesterday = shift(today, -1);
  const friday = shift(today, (5 - new Date(`${today}T12:00:00Z`).getUTCDay() + 7) % 7 || 7);
  const previousMonth = new Date(`${today.slice(0, 7)}-15T12:00:00Z`); previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
  const at = (date, clock) => fromZonedTime(`${date}T${clock}:00`, timezone);
  const hours = () => Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isOpen: true, startTime: "09:00", endTime: "18:00", breakStart: "13:00", breakEnd: "14:00" }));
  await db.user.create({ data: { id: "preview-employee", email: "specialist.review@example.invalid", name: "Profesional limitado de revisión", password: staffPasswordHash, role: "STAFF" } });
  await db.accessProfile.create({ data: { id: "preview-own-agenda", businessId: "preview-business", name: "Sólo agenda propia", permissions: ["appointments.view_own", "appointments.manage_own"] } });
  await db.staff.update({ where: { id: "preview-staff" }, data: { userId: "preview-employee", accessProfileId: "preview-own-agenda" } });
  await db.businessLocation.create({ data: { id: "preview-secondary", businessId: "preview-business", name: "Sucursal secundaria de revisión", slug: "secundaria", timezone, isActive: true, isPrimary: false, hours: { create: hours() } } });
  for (const serviceId of ["preview-service", "preview-free-service"]) await db.locationService.create({ data: { serviceId, locationId: "preview-secondary" } });
  await db.staff.create({ data: { id: "preview-secondary-staff", businessId: "preview-business", name: "Profesional de otra sucursal", locations: { create: { locationId: "preview-secondary" } }, services: { connect: [{ id: "preview-service" }, { id: "preview-free-service" }] } } });
  for (const [id, name] of [["preview-carolina", "Carolina Prueba"], ["preview-luis", "Luis Prueba"]]) {
    await db.client.create({ data: { id, businessId: "preview-business", name, email: `${id}@example.invalid`, phone: id === "preview-carolina" ? "+56900000001" : "+56900000002" } });
  }
  const rows = [
    { id: "preview-collected", date: yesterday, time: "09:00", status: "COMPLETED", price: 20000, paymentStatus: "APPROVED", depositAmount: 5000 },
    { id: "preview-outstanding", date: yesterday, time: "11:00", status: "CONFIRMED", price: 30000 },
    { id: "preview-carolina-tomorrow", date: tomorrow, time: "10:00", status: "CONFIRMED", price: 20000 },
    { id: "preview-pending-tomorrow", date: tomorrow, time: "12:00", status: "PENDING", price: 0, free: true },
    { id: "preview-previous-month", date: previousMonth.toISOString().slice(0, 10), time: "10:00", status: "COMPLETED", price: 20000, paymentStatus: "APPROVED", depositAmount: 10000 },
    { id: "preview-secondary-private", date: tomorrow, time: "11:00", status: "CONFIRMED", price: 99000, secondary: true },
  ];
  const service = await db.service.findUniqueOrThrow({ where: { id: "preview-service" }, select: { name: true, optionCategories: { select: { id: true, name: true }, take: 1 } } });
  for (const row of rows) {
    const startTime = at(row.date, row.time), duration = row.free ? 30 : 60;
    await db.appointment.create({ data: { id: row.id, businessId: "preview-business", locationId: row.secondary ? "preview-secondary" : "preview-location", staffId: row.secondary ? "preview-secondary-staff" : "preview-staff",
      serviceId: row.free ? "preview-free-service" : "preview-service", clientId: "preview-carolina", customerName: "Carolina Prueba", customerEmail: "preview-carolina@example.invalid", customerPhone: "+56900000001",
      status: row.status, startTime, endTime: new Date(startTime.getTime() + duration * 60000), totalDuration: duration, totalPrice: row.price, paymentStatus: row.paymentStatus || "NONE", depositAmount: row.depositAmount ?? null,
      selectedOptions: row.free ? [] : [{ serviceId: "preview-service", serviceName: service.name, categoryId: service.optionCategories[0].id, categoryName: service.optionCategories[0].name,
        alternativeId: "preview-option-local", alternativeName: "En local", priceDelta: 0, durationDelta: 0, isHomeService: false }], internalNotes: "Dato privado ficticio: no debe aparecer en MCP" } });
  }
  await db.scheduleBlock.create({ data: { id: "preview-unavailable", staffId: "preview-staff", locationId: "preview-location", type: "UNAVAILABLE", startTime: at(tomorrow, "14:00"), endTime: at(tomorrow, "15:00"), reason: "Bloqueo de revisión" } });
  const primaryMonth = rows.filter((r) => !r.secondary && r.date.slice(0, 7) === today.slice(0, 7));
  const due = primaryMonth.reduce((sum, r) => sum + r.price, 0);
  const collected = primaryMonth.reduce((sum, r) => sum + (r.paymentStatus === "APPROVED" ? r.depositAmount : 0), 0);
  const paidServiceCount = (month) => rows.filter((r) => !r.secondary && !r.free && r.date.slice(0, 7) === month).length;
  return { timezone, today, tomorrow, friday, ownerBusinesses: ["preview-business", "preview-private-business"], primaryLocation: "preview-location", restrictedLocation: "preview-secondary", appointmentIds: rows.map((r) => r.id),
    primaryCurrentMonthBeforeMutations: { due, collected, pending: due - collected, currencyCode: "CLP" },
    primaryPaidServiceBookings: { currentMonth: paidServiceCount(today.slice(0, 7)), previousMonth: paidServiceCount(previousMonth.toISOString().slice(0, 7)) },
    identity: "Fictitious review data only; no credentials in this file." };
}
