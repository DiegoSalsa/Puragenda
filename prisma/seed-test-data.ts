import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { Client, Service, Staff } from "@prisma/client";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Find Lucas Dev business
  const business = await prisma.business.findFirst({ where: { name: { contains: "Lucas" } } });
  if (!business) { console.error("No business found with 'Lucas' in name"); process.exit(1); }
  console.log(`Found business: ${business.name} (${business.id})`);

  // 2. Update business policies
  await prisma.business.update({
    where: { id: business.id },
    data: {
      allowRescheduling: true,
      rescheduleHoursLimit: 2,
      requiresClientRut: true,
      address: "Av. Providencia 1234, Santiago",
      mapsUrl: "https://maps.google.com/?q=-33.4289,-70.6093",
    },
  });
  console.log("✅ Business policies updated");

  // 3. Create Staff (4 members)
  const staffData = [
    { name: "Camila Torres", email: "camila@lucasdev.cl" },
    { name: "Diego Muñoz", email: "diego@lucasdev.cl" },
    { name: "Valentina Rojas", email: "valentina@lucasdev.cl" },
    { name: "Matías Silva", email: "matias@lucasdev.cl" },
  ];

  const staffMembers: Staff[] = [];
  for (const s of staffData) {
    const existing = await prisma.staff.findFirst({ where: { businessId: business.id, email: s.email } });
    if (existing) { staffMembers.push(existing); continue; }
    const created = await prisma.staff.create({ data: { ...s, businessId: business.id, isActive: true } });
    staffMembers.push(created);
  }
  console.log(`✅ ${staffMembers.length} staff members ready`);

  // 4. Create schedules for each staff (Mon-Sat)
  for (const staff of staffMembers) {
    for (let day = 1; day <= 6; day++) {
      await prisma.staffSchedule.upsert({
        where: { staffId_dayOfWeek: { staffId: staff.id, dayOfWeek: day } },
        update: { startTime: "08:00", endTime: "19:00", isWorking: true },
        create: { staffId: staff.id, dayOfWeek: day, startTime: "08:00", endTime: "19:00", isWorking: true },
      });
    }
    // Sunday off
    await prisma.staffSchedule.upsert({
      where: { staffId_dayOfWeek: { staffId: staff.id, dayOfWeek: 0 } },
      update: { isWorking: false, startTime: "00:00", endTime: "00:00" },
      create: { staffId: staff.id, dayOfWeek: 0, startTime: "00:00", endTime: "00:00", isWorking: false },
    });
  }
  console.log("✅ Staff schedules set (Mon-Sat 08:00-19:00)");

  // 5. Create Services (varied)
  const servicesData = [
    { name: "Corte de Pelo", description: "Corte moderno con estilo personalizado", duration: 30, price: 15000, depositAmount: 0 },
    { name: "Barba Completa", description: "Perfilado y afeitado profesional de barba", duration: 20, price: 8000, depositAmount: 0 },
    { name: "Corte + Barba", description: "Combo completo: corte y barba", duration: 45, price: 20000, depositAmount: 5000 },
    { name: "Entrenamiento Personal", description: "Sesión de entrenamiento personalizado 1 a 1", duration: 60, price: 25000, depositAmount: 0 },
    { name: "Kinesiología", description: "Sesión de rehabilitación y terapia física", duration: 45, price: 30000, depositAmount: 0 },
    { name: "Masaje Descontracturante", description: "Masaje terapéutico para aliviar tensiones", duration: 60, price: 35000, depositAmount: 0 },
  ];

  const services: Service[] = [];
  for (const s of servicesData) {
    const existing = await prisma.service.findFirst({ where: { businessId: business.id, name: s.name } });
    if (existing) {
      services.push(existing);
      continue;
    }
    const created = await prisma.service.create({ data: { ...s, businessId: business.id } });
    services.push(created);
  }
  console.log(`✅ ${services.length} services ready`);

  // 6. Link staff to services
  const staffServiceMap: Record<string, number[]> = {
    "Camila Torres": [0, 1, 2],      // Corte, Barba, Combo
    "Diego Muñoz": [0, 1, 2, 5],     // Corte, Barba, Combo, Masaje
    "Valentina Rojas": [3, 4],        // Entrenamiento, Kinesiología
    "Matías Silva": [3, 5],           // Entrenamiento, Masaje
  };

  for (const staff of staffMembers) {
    const serviceIndices = staffServiceMap[staff.name] || [];
    const staffServices = serviceIndices.map(i => services[i]).filter(Boolean);
    await prisma.staff.update({
      where: { id: staff.id },
      data: { services: { set: staffServices.map(s => ({ id: s.id })) } },
    });
  }
  console.log("✅ Staff-service assignments done");

  // 7. Create RecurringPlans for 2 services
  // Entrenamiento Personal → DAYS_WITH_REST
  const entrenamientoSvc = services.find(s => s.name === "Entrenamiento Personal")!;
  await prisma.recurringPlan.upsert({
    where: { serviceId: entrenamientoSvc.id },
    update: {},
    create: {
      serviceId: entrenamientoSvc.id,
      mode: "DAYS_WITH_REST",
      daysPerWeek: 3,
      minRestDays: 1,
      durationOptions: [1, 2, 3],
      startDateRangeDays: 14,
      requiresApproval: true,
      requiresHealthForm: true,
      healthQuestions: ["¿Tiene alguna lesión activa?", "¿Tiene alguna enfermedad crónica?", "¿Toma algún medicamento?"],
      requiresRut: true,
      renewalMessage: "¡Tu plan de entrenamiento está por vencer! Renueva para seguir con tu progreso.",
      expirationWarningDays: 7,
    },
  });
  console.log("✅ RecurringPlan for Entrenamiento Personal (DAYS_WITH_REST, approval required)");

  // Kinesiología → FIXED_DAYS
  const kinesioSvc = services.find(s => s.name === "Kinesiología")!;
  await prisma.recurringPlan.upsert({
    where: { serviceId: kinesioSvc.id },
    update: {},
    create: {
      serviceId: kinesioSvc.id,
      mode: "FIXED_DAYS",
      fixedDays: [1, 3, 5], // Lun, Mie, Vie
      durationOptions: [1, 2],
      startDateRangeDays: 7,
      requiresApproval: false,
      requiresHealthForm: true,
      healthQuestions: ["¿Cuál es su diagnóstico?", "¿Tiene indicación médica?"],
      requiresRut: false,
      expirationWarningDays: 5,
    },
  });
  console.log("✅ RecurringPlan for Kinesiología (FIXED_DAYS L/M/V, no approval)");

  // 8. Create Clients (6 varied)
  const clientsData = [
    { name: "Ana García", email: "ana.garcia@email.com", phone: "+56912345678", rut: "12.345.678-5", privateNotes: "Prefiere cortes modernos. Alergia al látex." },
    { name: "Pedro Sánchez", email: "pedro.sanchez@email.com", phone: "+56923456789", rut: "13.456.789-2", privateNotes: "Viene los martes generalmente. Tiene problema de espalda baja." },
    { name: "María López", email: "maria.lopez@email.com", phone: "+56934567890", rut: "14.567.890-1", privateNotes: "Paciente de kinesiología post-operatorio rodilla derecha." },
    { name: "Carlos Fuentes", email: "carlos.fuentes@email.com", phone: "+56945678901", privateNotes: "Cliente nuevo. Quiere bajar de peso." },
    { name: "Sofía Morales", email: "sofia.morales@email.com", phone: "+56956789012", rut: "16.789.012-3", privateNotes: null },
    { name: "Andrés Herrera", email: "andres.herrera@email.com", phone: "+56967890123", privateNotes: "Deportista amateur. Entrena para maratón." },
  ];

  const clients: Client[] = [];
  for (const c of clientsData) {
    const existing = await prisma.client.findFirst({ where: { businessId: business.id, email: c.email } });
    if (existing) { clients.push(existing); continue; }
    const created = await prisma.client.create({ data: { ...c, businessId: business.id } });
    clients.push(created);
  }
  console.log(`✅ ${clients.length} clients ready`);

  // 9. Create normal appointments (past + future) for varied testing
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Helper
  const makeDate = (daysOffset: number, hour: number, min: number = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(hour, min, 0, 0);
    return d;
  };

  const appointmentsData = [
    // Past appointments
    { customer: clients[0], service: services[0], staff: staffMembers[0], start: makeDate(-3, 10), status: "COMPLETED" as const },
    { customer: clients[1], service: services[2], staff: staffMembers[1], start: makeDate(-2, 14), status: "COMPLETED" as const },
    { customer: clients[4], service: services[5], staff: staffMembers[3], start: makeDate(-1, 9), status: "NO_SHOW" as const },
    // Today
    { customer: clients[0], service: services[1], staff: staffMembers[0], start: makeDate(0, 15), status: "CONFIRMED" as const },
    { customer: clients[3], service: services[3], staff: staffMembers[2], start: makeDate(0, 16), status: "CONFIRMED" as const },
    // Future (for rescheduling test)
    { customer: clients[1], service: services[0], staff: staffMembers[0], start: makeDate(2, 11), status: "CONFIRMED" as const },
    { customer: clients[2], service: services[4], staff: staffMembers[2], start: makeDate(2, 10), status: "CONFIRMED" as const },
    { customer: clients[4], service: services[5], staff: staffMembers[3], start: makeDate(3, 14), status: "CONFIRMED" as const },
    { customer: clients[5], service: services[3], staff: staffMembers[3], start: makeDate(4, 8), status: "CONFIRMED" as const },
    { customer: clients[0], service: services[2], staff: staffMembers[1], start: makeDate(5, 12), status: "PENDING" as const },
    // Cancelled one
    { customer: clients[3], service: services[0], staff: staffMembers[0], start: makeDate(1, 9), status: "CANCELLED" as const },
  ];

  let aptCount = 0;
  for (const a of appointmentsData) {
    const endTime = new Date(a.start);
    endTime.setMinutes(endTime.getMinutes() + a.service.duration);

    const exists = await prisma.appointment.findFirst({
      where: { businessId: business.id, customerEmail: a.customer.email, startTime: a.start },
    });
    if (exists) continue;

    await prisma.appointment.create({
      data: {
        customerName: a.customer.name,
        customerEmail: a.customer.email,
        customerPhone: a.customer.phone,
        startTime: a.start,
        endTime: endTime,
        status: a.status,
        businessId: business.id,
        serviceId: a.service.id,
        staffId: a.staff.id,
        clientId: a.customer.id,
        totalDuration: a.service.duration,
        totalPrice: a.service.price,
      },
    });
    aptCount++;
  }
  console.log(`✅ ${aptCount} appointments created`);

  // 10. Create a RecurringBooking (ACTIVE) with appointments
  const recurringPlanEntrenamiento = await prisma.recurringPlan.findUnique({ where: { serviceId: entrenamientoSvc.id } });
  if (!recurringPlanEntrenamiento) { console.error("No recurring plan found"); process.exit(1); }

  const existingRecurring = await prisma.recurringBooking.findFirst({
    where: { businessId: business.id, customerEmail: "pedro.sanchez@email.com" },
  });

  if (!existingRecurring) {
    const startDate = makeDate(-7, 0); // Started a week ago
    const endDate = makeDate(23, 0);   // ~1 month total

    const rb = await prisma.recurringBooking.create({
      data: {
        businessId: business.id,
        serviceId: entrenamientoSvc.id,
        recurringPlanId: recurringPlanEntrenamiento.id,
        staffId: staffMembers[2].id, // Valentina
        clientId: clients[1].id,     // Pedro
        customerName: "Pedro Sánchez",
        customerEmail: "pedro.sanchez@email.com",
        customerPhone: "+56923456789",
        customerRut: "13.456.789-2",
        status: "ACTIVE",
        selectedDays: [1, 3, 5],
        selectedTimes: { "1": "09:00", "3": "09:00", "5": "09:00" },
        startDate,
        endDate,
        durationMonths: 1,
        healthAnswers: { "¿Tiene alguna lesión activa?": "Dolor lumbar leve", "¿Tiene alguna enfermedad crónica?": "No", "¿Toma algún medicamento?": "Ibuprofeno ocasional" },
        healthFreeText: "Quiero enfocarme en fortalecer la espalda baja",
        healthAccepted: true,
        internalNotes: "Buen progreso en las primeras sesiones. Aumentar carga gradualmente.",
        managementToken: "test-token-pedro-" + Date.now().toString(36),
      },
    });

    // Generate appointments for this recurring booking
    const days = [1, 3, 5];
    const current = new Date(startDate);
    let sessionCount = 0;
    while (current <= endDate) {
      if (days.includes(current.getDay())) {
        const aptStart = new Date(current);
        aptStart.setHours(9, 0, 0, 0);
        const aptEnd = new Date(aptStart);
        aptEnd.setMinutes(aptEnd.getMinutes() + 60);

        const isPast = aptStart < now;
        await prisma.appointment.create({
          data: {
            customerName: "Pedro Sánchez",
            customerEmail: "pedro.sanchez@email.com",
            customerPhone: "+56923456789",
            startTime: aptStart,
            endTime: aptEnd,
            status: isPast ? "COMPLETED" : "CONFIRMED",
            businessId: business.id,
            serviceId: entrenamientoSvc.id,
            staffId: staffMembers[2].id,
            clientId: clients[1].id,
            totalDuration: 60,
            totalPrice: 25000,
            recurringBookingId: rb.id,
          },
        });
        sessionCount++;
      }
      current.setDate(current.getDate() + 1);
    }
    console.log(`✅ RecurringBooking ACTIVE (Pedro, Entrenamiento) with ${sessionCount} sessions`);

    // Create an override for one session
    const futureSession = await prisma.appointment.findFirst({
      where: { recurringBookingId: rb.id, startTime: { gt: now } },
      orderBy: { startTime: "asc" },
    });
    if (futureSession) {
      await prisma.recurringSessionOverride.create({
        data: {
          recurringBookingId: rb.id,
          originalDate: futureSession.startTime,
          action: "TIME_CHANGED",
          newTime: "10:30",
          reason: "Cliente pidió cambio por trabajo",
          requestedByClient: true,
        },
      });
      console.log("✅ RecurringSessionOverride created (time change)");
    }
  } else {
    console.log("⏭️  RecurringBooking for Pedro already exists, skipping");
  }

  // 11. Create a second RecurringBooking (PENDING_APPROVAL)
  const existingPending = await prisma.recurringBooking.findFirst({
    where: { businessId: business.id, customerEmail: "andres.herrera@email.com", status: "PENDING_APPROVAL" },
  });

  if (!existingPending) {
    const startDate = makeDate(3, 0);
    const endDate = makeDate(33, 0);

    await prisma.recurringBooking.create({
      data: {
        businessId: business.id,
        serviceId: entrenamientoSvc.id,
        recurringPlanId: recurringPlanEntrenamiento.id,
        staffId: staffMembers[3].id, // Matías
        clientId: clients[5].id,     // Andrés
        customerName: "Andrés Herrera",
        customerEmail: "andres.herrera@email.com",
        customerPhone: "+56967890123",
        status: "PENDING_APPROVAL",
        selectedDays: [2, 4, 6],
        selectedTimes: { "2": "08:00", "4": "08:00", "6": "10:00" },
        startDate,
        endDate,
        durationMonths: 1,
        healthAnswers: { "¿Tiene alguna lesión activa?": "Tendinitis aquiles derecho", "¿Tiene alguna enfermedad crónica?": "No", "¿Toma algún medicamento?": "No" },
        healthFreeText: "Preparo maratón de Santiago en octubre. Necesito plan de fuerza compatible con running.",
        healthAccepted: true,
        managementToken: "test-token-andres-" + Date.now().toString(36),
      },
    });
    console.log("✅ RecurringBooking PENDING_APPROVAL (Andrés, Entrenamiento)");
  } else {
    console.log("⏭️  Pending booking for Andrés already exists, skipping");
  }

  // 12. Business Hours (Mon-Sat 08:00-20:00)
  for (let day = 1; day <= 6; day++) {
    await prisma.businessHours.upsert({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: day } },
      update: { startTime: "08:00", endTime: "20:00", isOpen: true },
      create: { businessId: business.id, dayOfWeek: day, startTime: "08:00", endTime: "20:00", isOpen: true },
    });
  }
  await prisma.businessHours.upsert({
    where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: 0 } },
    update: { isOpen: false, startTime: "00:00", endTime: "00:00" },
    create: { businessId: business.id, dayOfWeek: 0, startTime: "00:00", endTime: "00:00", isOpen: false },
  });
  console.log("✅ Business hours set (Mon-Sat 08:00-20:00)");

  console.log("\n🎉 SEED COMPLETE! Here's what was created:");
  console.log("   • 4 Staff: Camila, Diego, Valentina, Matías");
  console.log("   • 6 Services: Corte, Barba, Combo, Entrenamiento, Kinesiología, Masaje");
  console.log("   • 2 RecurringPlans: Entrenamiento (DAYS_WITH_REST + approval) & Kinesiología (FIXED_DAYS)");
  console.log("   • 6 Clients with notes, RUT, phone");
  console.log("   • ~11 normal Appointments (past, today, future, cancelled)");
  console.log("   • 1 RecurringBooking ACTIVE (Pedro) with ~12 sessions + 1 override");
  console.log("   • 1 RecurringBooking PENDING_APPROVAL (Andrés)");
  console.log("   • Business policies: rescheduling ON (2h), RUT required");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
