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
  console.log("🧹 Limpiando base de datos...");
  await prisma.appointment.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.service.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.business.deleteMany();
  await prisma.blacklistedIp.deleteMany();
  await prisma.user.deleteMany();

  const now = new Date();
  const password = await bcrypt.hash("purocode123", 12);

  // ─── SuperAdmin User ───
  console.log("👤 Creando SuperAdmin...");
  const admin = await prisma.user.create({
    data: {
      email: "admin@purocode.cl",
      password,
      name: "Diego PuroCode",
      role: "SUPERADMIN",
      isSuperAdmin: true,
      registrationIp: "127.0.0.1",
      trialUsedAt: now,
    },
  });

  // ─── Business 1: PuroCode Demo (PRO, paid) ───
  console.log("🏢 Creando PuroCode Demo (Plan Pro)...");
  const biz1 = await prisma.business.create({
    data: { name: "PuroCode Demo", slug: "purocode-demo", apiKey: apiKey(), ownerId: admin.id, timezone: "America/Santiago", brandColor: "7C3AED" },
  });

  await prisma.subscription.create({
    data: { businessId: biz1.id, plan: "PRO", status: "ACTIVE", isTrial: false },
  });

  const staff1a = await prisma.staff.create({ data: { name: "Diego Salazar", email: "diego@purocode.cl", businessId: biz1.id, userId: admin.id, isActive: true } });
  const staff1b = await prisma.staff.create({ data: { name: "Camila Rojas", email: "camila@purocode.cl", businessId: biz1.id, isActive: true } });

  const svc1 = await prisma.service.create({ data: { name: "Consultoría Web", description: "Sesión de consultoría para analizar tu proyecto web.", duration: 60, price: 75000, businessId: biz1.id } });
  const svc2 = await prisma.service.create({ data: { name: "Desarrollo Landing", description: "Diseño y desarrollo de landing page profesional.", duration: 90, price: 250000, businessId: biz1.id } });
  const svc3 = await prisma.service.create({ data: { name: "Mantenimiento Web", description: "Servicio mensual de mantenimiento y soporte.", duration: 45, price: 50000, businessId: biz1.id } });

  // ─── Business 2: Estética Bella (BASIC, trial) ───
  console.log("🏢 Creando Estética Bella (Trial)...");
  const trialUser = await prisma.user.create({
    data: {
      email: "vale@esteticabella.cl",
      password,
      name: "Valentina López",
      role: "OWNER",
      registrationIp: "192.168.1.50",
      trialUsedAt: now,
    },
  });

  const biz2 = await prisma.business.create({
    data: { name: "Estética Bella", slug: "estetica-bella", apiKey: apiKey(), ownerId: trialUser.id, timezone: "America/Santiago", brandColor: "E91E8C" },
  });

  await prisma.subscription.create({
    data: { businessId: biz2.id, plan: "BASIC", status: "TRIALING", isTrial: true, trialEndsAt: addDays(now, 25) },
  });

  await prisma.blacklistedIp.create({ data: { ip: "192.168.1.50", reason: "Trial usado", userId: trialUser.id } });

  const staff2a = await prisma.staff.create({ data: { name: "Valentina López", email: "vale@esteticabella.cl", businessId: biz2.id, userId: trialUser.id, isActive: true } });
  const staff2b = await prisma.staff.create({ data: { name: "Francisca Muñoz", email: "fran@esteticabella.cl", businessId: biz2.id, isActive: true } });

  const svc4 = await prisma.service.create({ data: { name: "Corte de pelo", description: "Corte profesional para dama o caballero.", duration: 30, price: 15000, businessId: biz2.id } });
  const svc5 = await prisma.service.create({ data: { name: "Manicure Gel", description: "Manicure completa con gel semipermanente.", duration: 60, price: 25000, businessId: biz2.id } });
  const svc6 = await prisma.service.create({ data: { name: "Tratamiento Facial", description: "Limpieza facial profunda con hidratación.", duration: 90, price: 45000, businessId: biz2.id } });

  // ─── Business 3: Paid BASIC (no trial) ───
  console.log("🏢 Creando Barbería Santiago (Plan Base pagado)...");
  const paidUser = await prisma.user.create({
    data: {
      email: "carlos@barberia.cl",
      password,
      name: "Carlos Ruiz",
      role: "OWNER",
      registrationIp: "10.0.0.5",
      trialUsedAt: addDays(now, -60), // Used trial 60 days ago
    },
  });

  const biz3 = await prisma.business.create({
    data: { name: "Barbería Santiago", slug: "barberia-stgo", apiKey: apiKey(), ownerId: paidUser.id, timezone: "America/Santiago" },
  });

  await prisma.subscription.create({
    data: { businessId: biz3.id, plan: "BASIC", status: "ACTIVE", isTrial: false },
  });

  await prisma.staff.create({ data: { name: "Carlos Ruiz", email: "carlos@barberia.cl", businessId: biz3.id, userId: paidUser.id, isActive: true } });
  await prisma.service.create({ data: { name: "Corte Clásico", description: "Corte con máquina y tijera.", duration: 30, price: 8000, businessId: biz3.id } });
  await prisma.service.create({ data: { name: "Barba + Corte", description: "Combo corte + perfilado de barba.", duration: 45, price: 12000, businessId: biz3.id } });

  // ─── Appointments ───
  console.log("📅 Creando citas de prueba...");
  const t1 = addDays(now, 1);
  const t2 = addDays(now, 2);

  const appointments = [
    { customerName: "Juan Pérez", customerEmail: "juan@email.com", startTime: setMinutes(setHours(t1, 10), 0), endTime: setMinutes(setHours(t1, 11), 0), businessId: biz1.id, serviceId: svc1.id, staffId: staff1a.id, status: "CONFIRMED" as const },
    { customerName: "María González", customerEmail: "maria@email.com", startTime: setMinutes(setHours(t1, 11), 0), endTime: setMinutes(setHours(t1, 12), 30), businessId: biz1.id, serviceId: svc2.id, staffId: staff1a.id, status: "PENDING" as const },
    { customerName: "Carlos Ruiz", customerEmail: "carlos@email.com", startTime: setMinutes(setHours(t1, 14), 0), endTime: setMinutes(setHours(t1, 14), 45), businessId: biz1.id, serviceId: svc3.id, staffId: staff1b.id, status: "PENDING" as const },
    { customerName: "Ana Torres", customerEmail: "ana@email.com", startTime: setMinutes(setHours(t1, 10), 0), endTime: setMinutes(setHours(t1, 11), 0), businessId: biz1.id, serviceId: svc1.id, staffId: staff1b.id, status: "CONFIRMED" as const },
    { customerName: "Sofía Herrera", customerEmail: "sofia@email.com", startTime: setMinutes(setHours(t1, 9), 0), endTime: setMinutes(setHours(t1, 9), 30), businessId: biz2.id, serviceId: svc4.id, staffId: staff2a.id, status: "CONFIRMED" as const },
    { customerName: "Isabella Díaz", customerEmail: "isabella@email.com", startTime: setMinutes(setHours(t1, 10), 0), endTime: setMinutes(setHours(t1, 11), 0), businessId: biz2.id, serviceId: svc5.id, staffId: staff2a.id, status: "PENDING" as const },
    { customerName: "Camila Vargas", customerEmail: "cvargas@email.com", startTime: setMinutes(setHours(t2, 11), 0), endTime: setMinutes(setHours(t2, 12), 30), businessId: biz2.id, serviceId: svc6.id, staffId: staff2b.id, status: "PENDING" as const },
    { customerName: "TEST CANCELADA", customerEmail: "test@email.com", startTime: setMinutes(setHours(t1, 16), 0), endTime: setMinutes(setHours(t1, 17), 0), businessId: biz1.id, serviceId: svc1.id, staffId: staff1a.id, status: "CANCELLED" as const },
  ];

  for (const apt of appointments) {
    await prisma.appointment.create({ data: apt });
  }

  console.log("\n✅ Seed completado!\n");
  console.log("═══════════════════════════════════════════════");
  console.log("  📋 DATOS DE ACCESO");
  console.log("═══════════════════════════════════════════════");
  console.log(`  👑 SuperAdmin:  admin@purocode.cl / purocode123`);
  console.log(`  👤 Trial User:  vale@esteticabella.cl / purocode123`);
  console.log(`  👤 Paid User:   carlos@barberia.cl / purocode123`);
  console.log(`  🔑 API Key 1:   ${biz1.apiKey}`);
  console.log(`  🔑 API Key 2:   ${biz2.apiKey}`);
  console.log(`  🔑 API Key 3:   ${biz3.apiKey}`);
  console.log("═══════════════════════════════════════════════\n");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
