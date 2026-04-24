import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { addDays, setHours, setMinutes } from "date-fns";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function apiKey() { return `pg_${crypto.randomBytes(24).toString("hex")}`; }

async function main() {
  console.log("🧹 Limpiando...");
  await prisma.appointment.deleteMany();
  await prisma.blockedDate.deleteMany();
  await prisma.staffSchedule.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.service.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.business.deleteMany();
  await prisma.blacklistedIp.deleteMany();
  await prisma.user.deleteMany();

  const now = new Date();
  const pw = await bcrypt.hash("purocode123", 12);

  // ─── SuperAdmin ───
  console.log("👑 SuperAdmin...");
  const admin = await prisma.user.create({
    data: { email: "admin@purocode.cl", password: pw, name: "Diego PuroCode", role: "SUPERADMIN", isSuperAdmin: true, registrationIp: "127.0.0.1", trialUsedAt: now },
  });

  // ─── Biz 1: PuroCode Demo (PRO) ───
  console.log("🏢 PuroCode Demo (Pro)...");
  const biz1 = await prisma.business.create({
    data: { name: "PuroCode Demo", slug: "purocode-demo", apiKey: apiKey(), ownerId: admin.id, primaryColor: "#7C3AED", secondaryColor: "#5B21B6", backgroundColor: "#0A0A0A" },
  });
  await prisma.subscription.create({ data: { businessId: biz1.id, plan: "PRO", status: "ACTIVE", billingCycle: "MONTHLY" } });

  // Business hours Mon-Fri 8-20, Sat 10-14
  for (let d = 0; d <= 6; d++) {
    await prisma.businessHours.create({
      data: { businessId: biz1.id, dayOfWeek: d, startTime: d === 0 ? "00:00" : d === 6 ? "10:00" : "08:00", endTime: d === 0 ? "00:00" : d === 6 ? "14:00" : "20:00", isOpen: d >= 1 },
    });
  }

  // Staff with differentiated schedules
  const s1a = await prisma.staff.create({ data: { name: "Diego Salazar", email: "diego@purocode.cl", businessId: biz1.id, userId: admin.id } });
  const s1b = await prisma.staff.create({ data: { name: "Camila Rojas", email: "camila@purocode.cl", businessId: biz1.id } });
  const s1c = await prisma.staff.create({ data: { name: "Matías Torres", email: "matias@purocode.cl", businessId: biz1.id } });

  // Diego: Morning shift Mon-Fri 08:00-14:00
  for (let d = 0; d <= 6; d++) {
    await prisma.staffSchedule.create({
      data: { staffId: s1a.id, dayOfWeek: d, startTime: "08:00", endTime: "14:00", isWorking: d >= 1 && d <= 5 },
    });
  }
  // Camila: Afternoon shift Mon-Fri 14:00-20:00
  for (let d = 0; d <= 6; d++) {
    await prisma.staffSchedule.create({
      data: { staffId: s1b.id, dayOfWeek: d, startTime: "14:00", endTime: "20:00", isWorking: d >= 1 && d <= 5 },
    });
  }
  // Matías: Full day Mon-Wed-Fri + Saturday
  for (let d = 0; d <= 6; d++) {
    const works = [1, 3, 5, 6].includes(d);
    await prisma.staffSchedule.create({
      data: { staffId: s1c.id, dayOfWeek: d, startTime: works ? (d === 6 ? "10:00" : "09:00") : "00:00", endTime: works ? (d === 6 ? "14:00" : "18:00") : "00:00", isWorking: works },
    });
  }

  const svc1 = await prisma.service.create({ data: { name: "Consultoría Web", description: "Sesión de consultoría para tu proyecto.", duration: 60, price: 75000, businessId: biz1.id } });
  const svc2 = await prisma.service.create({ data: { name: "Desarrollo Landing", description: "Landing page profesional.", duration: 90, price: 250000, businessId: biz1.id } });
  await prisma.service.create({ data: { name: "Diseño UI/UX", description: "Sesión de diseño.", duration: 45, price: 50000, businessId: biz1.id } });

  // ─── Biz 2: Estética Bella (BASIC, trial) ───
  console.log("🏢 Estética Bella (Trial Base)...");
  const u2 = await prisma.user.create({
    data: { email: "vale@esteticabella.cl", password: pw, name: "Valentina López", role: "OWNER", registrationIp: "192.168.1.50", trialUsedAt: now },
  });
  const biz2 = await prisma.business.create({
    data: { name: "Estética Bella", slug: "estetica-bella", apiKey: apiKey(), ownerId: u2.id, primaryColor: "#E91E8C", secondaryColor: "#C2185B", backgroundColor: "#0D0D0D", brandColor: "E91E8C" },
  });
  await prisma.subscription.create({ data: { businessId: biz2.id, plan: "BASIC", status: "TRIALING", billingCycle: "MONTHLY", isTrial: true, trialEndsAt: addDays(now, 25), extraStaffCount: 1 } });

  for (let d = 0; d <= 6; d++) {
    await prisma.businessHours.create({
      data: { businessId: biz2.id, dayOfWeek: d, startTime: d === 0 ? "00:00" : "10:00", endTime: d === 0 ? "00:00" : "20:00", isOpen: d >= 1 },
    });
  }

  const s2a = await prisma.staff.create({ data: { name: "Valentina López", email: "vale@esteticabella.cl", businessId: biz2.id, userId: u2.id } });
  const s2b = await prisma.staff.create({ data: { name: "Francisca Muñoz", email: "fran@esteticabella.cl", businessId: biz2.id } });

  // Valentina: full day, Francisca: afternoons only
  for (let d = 0; d <= 6; d++) {
    await prisma.staffSchedule.create({ data: { staffId: s2a.id, dayOfWeek: d, startTime: "10:00", endTime: "20:00", isWorking: d >= 1 } });
    await prisma.staffSchedule.create({ data: { staffId: s2b.id, dayOfWeek: d, startTime: "14:00", endTime: "20:00", isWorking: d >= 1 && d <= 5 } });
  }

  const svc3 = await prisma.service.create({ data: { name: "Corte de pelo", description: "Corte profesional.", duration: 30, price: 15000, businessId: biz2.id } });
  const svc4 = await prisma.service.create({ data: { name: "Manicure Gel", description: "Manicure con gel.", duration: 60, price: 25000, businessId: biz2.id } });

  // ─── Biz 3: Barbería (INDIVIDUAL) ───
  console.log("🏢 Barbería Santiago (Individual)...");
  const u3 = await prisma.user.create({
    data: { email: "carlos@barberia.cl", password: pw, name: "Carlos Ruiz", role: "OWNER", registrationIp: "10.0.0.5", trialUsedAt: addDays(now, -60) },
  });
  const biz3 = await prisma.business.create({
    data: { name: "Barbería Santiago", slug: "barberia-stgo", apiKey: apiKey(), ownerId: u3.id, primaryColor: "#D97706", secondaryColor: "#92400E", backgroundColor: "#0A0A0A" },
  });
  await prisma.subscription.create({ data: { businessId: biz3.id, plan: "INDIVIDUAL", status: "ACTIVE", billingCycle: "ANNUAL" } });

  for (let d = 0; d <= 6; d++) {
    await prisma.businessHours.create({ data: { businessId: biz3.id, dayOfWeek: d, startTime: "09:00", endTime: "18:00", isOpen: d >= 1 && d <= 5 } });
  }
  const s3 = await prisma.staff.create({ data: { name: "Carlos Ruiz", email: "carlos@barberia.cl", businessId: biz3.id, userId: u3.id } });
  for (let d = 0; d <= 6; d++) {
    await prisma.staffSchedule.create({ data: { staffId: s3.id, dayOfWeek: d, startTime: "09:00", endTime: "18:00", isWorking: d >= 1 && d <= 5 } });
  }
  await prisma.service.create({ data: { name: "Corte Clásico", duration: 30, price: 8000, businessId: biz3.id } });
  await prisma.service.create({ data: { name: "Barba + Corte", description: "Combo completo.", duration: 45, price: 12000, businessId: biz3.id } });

  const blockedDay = addDays(now, 3); blockedDay.setHours(0, 0, 0, 0);
  await prisma.blockedDate.create({ data: { businessId: biz3.id, date: blockedDay, reason: "Feriado" } });

  // ─── Appointments ───
  console.log("📅 Citas...");
  const t1 = addDays(now, 1), t2 = addDays(now, 2);
  const apts = [
    { customerName: "Juan Pérez", customerEmail: "juan@email.com", startTime: setMinutes(setHours(t1, 10), 0), endTime: setMinutes(setHours(t1, 11), 0), businessId: biz1.id, serviceId: svc1.id, staffId: s1a.id, status: "CONFIRMED" as const },
    { customerName: "María González", customerEmail: "maria@email.com", startTime: setMinutes(setHours(t1, 11), 0), endTime: setMinutes(setHours(t1, 12), 30), businessId: biz1.id, serviceId: svc2.id, staffId: s1a.id, status: "PENDING" as const },
    { customerName: "Ana Torres", customerEmail: "ana@email.com", startTime: setMinutes(setHours(t1, 15), 0), endTime: setMinutes(setHours(t1, 16), 0), businessId: biz1.id, serviceId: svc1.id, staffId: s1b.id, status: "CHECKED_IN" as const },
    { customerName: "Pedro Soto", customerEmail: "pedro@email.com", startTime: setMinutes(setHours(t2, 9), 0), endTime: setMinutes(setHours(t2, 10), 0), businessId: biz1.id, serviceId: svc1.id, staffId: s1c.id, status: "CONFIRMED" as const },
    { customerName: "Sofía Herrera", customerEmail: "sofia@email.com", startTime: setMinutes(setHours(t1, 10), 0), endTime: setMinutes(setHours(t1, 10), 30), businessId: biz2.id, serviceId: svc3.id, staffId: s2a.id, status: "CONFIRMED" as const },
    { customerName: "Isabella Díaz", customerEmail: "isabella@email.com", startTime: setMinutes(setHours(t2, 15), 0), endTime: setMinutes(setHours(t2, 16), 0), businessId: biz2.id, serviceId: svc4.id, staffId: s2b.id, status: "NO_SHOW" as const },
    { customerName: "TEST CANCELADA", customerEmail: "test@email.com", startTime: setMinutes(setHours(t1, 16), 0), endTime: setMinutes(setHours(t1, 17), 0), businessId: biz1.id, serviceId: svc1.id, staffId: s1b.id, status: "CANCELLED" as const },
  ];
  for (const a of apts) await prisma.appointment.create({ data: a });

  console.log("\n✅ Seed v5 completado!");
  console.log("═══════════════════════════════════════");
  console.log("  👑 admin@purocode.cl / purocode123     → PRO (3 staff: mañana/tarde/mixto)");
  console.log("  👤 vale@esteticabella.cl / purocode123  → BASIC Trial (2 staff)");
  console.log("  👤 carlos@barberia.cl / purocode123     → INDIVIDUAL (1 staff)");
  console.log("═══════════════════════════════════════\n");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
