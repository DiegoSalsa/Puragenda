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
  await prisma.user.deleteMany();

  // ─── User ───
  console.log("👤 Creando usuario admin...");
  const password = await bcrypt.hash("purocode123", 12);
  const user = await prisma.user.create({
    data: { email: "admin@purocode.cl", password, name: "Diego PuroCode", role: "OWNER" },
  });

  // ─── Business 1: PuroCode Demo ───
  console.log("🏢 Creando negocio PuroCode Demo...");
  const biz1 = await prisma.business.create({
    data: { name: "PuroCode Demo", slug: "purocode-demo", apiKey: apiKey(), ownerId: user.id, timezone: "America/Santiago", brandColor: "0085CB" },
  });

  await prisma.subscription.create({ data: { businessId: biz1.id, plan: "PRO", status: "ACTIVE" } });

  const staff1a = await prisma.staff.create({ data: { name: "Diego Salazar", email: "diego@purocode.cl", businessId: biz1.id, userId: user.id, isActive: true } });
  const staff1b = await prisma.staff.create({ data: { name: "Camila Rojas", email: "camila@purocode.cl", businessId: biz1.id, isActive: true } });

  const svc1 = await prisma.service.create({ data: { name: "Consultoría Web", description: "Sesión de consultoría para analizar tu proyecto web.", duration: 60, price: 75000, businessId: biz1.id } });
  const svc2 = await prisma.service.create({ data: { name: "Desarrollo Landing", description: "Diseño y desarrollo de landing page profesional.", duration: 90, price: 250000, businessId: biz1.id } });
  const svc3 = await prisma.service.create({ data: { name: "Mantenimiento Web", description: "Servicio mensual de mantenimiento y soporte.", duration: 45, price: 50000, businessId: biz1.id } });

  // ─── Business 2: Estética Bella ───
  console.log("🏢 Creando negocio Estética Bella...");
  const biz2 = await prisma.business.create({
    data: { name: "Estética Bella", slug: "estetica-bella", apiKey: apiKey(), timezone: "America/Santiago", brandColor: "E91E8C" },
  });

  await prisma.subscription.create({ data: { businessId: biz2.id, plan: "FREE", status: "ACTIVE" } });

  const staff2a = await prisma.staff.create({ data: { name: "Valentina López", email: "vale@esteticabella.cl", businessId: biz2.id, isActive: true } });
  const staff2b = await prisma.staff.create({ data: { name: "Francisca Muñoz", email: "fran@esteticabella.cl", businessId: biz2.id, isActive: true } });

  const svc4 = await prisma.service.create({ data: { name: "Corte de pelo", description: "Corte profesional para dama o caballero.", duration: 30, price: 15000, businessId: biz2.id } });
  const svc5 = await prisma.service.create({ data: { name: "Manicure Gel", description: "Manicure completa con gel semipermanente.", duration: 60, price: 25000, businessId: biz2.id } });
  const svc6 = await prisma.service.create({ data: { name: "Tratamiento Facial", description: "Limpieza facial profunda con hidratación.", duration: 90, price: 45000, businessId: biz2.id } });
  const svc7 = await prisma.service.create({ data: { name: "Depilación Láser", description: "Sesión de depilación láser zona a elegir.", duration: 15, price: 35000, businessId: biz2.id } });

  // ─── Appointments ───
  console.log("📅 Creando citas de prueba...");
  const t1 = addDays(new Date(), 1);
  const t2 = addDays(new Date(), 2);
  const t3 = addDays(new Date(), 3);

  const appointments = [
    // PuroCode - Diego
    { customerName: "Juan Pérez", customerEmail: "juan@email.com", startTime: setMinutes(setHours(t1, 10), 0), endTime: setMinutes(setHours(t1, 11), 0), businessId: biz1.id, serviceId: svc1.id, staffId: staff1a.id, status: "CONFIRMED" as const },
    { customerName: "María González", customerEmail: "maria@email.com", startTime: setMinutes(setHours(t1, 11), 0), endTime: setMinutes(setHours(t1, 12), 30), businessId: biz1.id, serviceId: svc2.id, staffId: staff1a.id, status: "PENDING" as const },
    { customerName: "Carlos Ruiz", customerEmail: "carlos@email.com", startTime: setMinutes(setHours(t1, 14), 0), endTime: setMinutes(setHours(t1, 14), 45), businessId: biz1.id, serviceId: svc3.id, staffId: staff1a.id, status: "PENDING" as const },
    // PuroCode - Camila
    { customerName: "Ana Torres", customerEmail: "ana@email.com", startTime: setMinutes(setHours(t1, 10), 0), endTime: setMinutes(setHours(t1, 11), 0), businessId: biz1.id, serviceId: svc1.id, staffId: staff1b.id, status: "CONFIRMED" as const },
    { customerName: "Pedro Soto", customerEmail: "pedro@email.com", startTime: setMinutes(setHours(t2, 9), 0), endTime: setMinutes(setHours(t2, 10), 30), businessId: biz1.id, serviceId: svc2.id, staffId: staff1b.id, status: "PENDING" as const },
    // Estética Bella - Valentina
    { customerName: "Sofía Herrera", customerEmail: "sofia@email.com", startTime: setMinutes(setHours(t1, 9), 0), endTime: setMinutes(setHours(t1, 9), 30), businessId: biz2.id, serviceId: svc4.id, staffId: staff2a.id, status: "CONFIRMED" as const },
    { customerName: "Isabella Díaz", customerEmail: "isabella@email.com", startTime: setMinutes(setHours(t1, 10), 0), endTime: setMinutes(setHours(t1, 11), 0), businessId: biz2.id, serviceId: svc5.id, staffId: staff2a.id, status: "PENDING" as const },
    { customerName: "Camila Vargas", customerEmail: "cvargas@email.com", startTime: setMinutes(setHours(t1, 11), 0), endTime: setMinutes(setHours(t1, 12), 30), businessId: biz2.id, serviceId: svc6.id, staffId: staff2a.id, status: "PENDING" as const },
    // Estética Bella - Francisca
    { customerName: "Fernanda Castro", customerEmail: "fcastro@email.com", startTime: setMinutes(setHours(t1, 9), 0), endTime: setMinutes(setHours(t1, 9), 15), businessId: biz2.id, serviceId: svc7.id, staffId: staff2b.id, status: "CONFIRMED" as const },
    { customerName: "Daniela Morales", customerEmail: "daniela@email.com", startTime: setMinutes(setHours(t2, 14), 0), endTime: setMinutes(setHours(t2, 14), 30), businessId: biz2.id, serviceId: svc4.id, staffId: staff2b.id, status: "PENDING" as const },
    { customerName: "Martina Reyes", customerEmail: "martina@email.com", startTime: setMinutes(setHours(t2, 15), 0), endTime: setMinutes(setHours(t2, 16), 0), businessId: biz2.id, serviceId: svc5.id, staffId: staff2b.id, status: "PENDING" as const },
    // Collision test: same staff, overlapping time
    { customerName: "TEST COLISIÓN", customerEmail: "test@email.com", startTime: setMinutes(setHours(t3, 10), 0), endTime: setMinutes(setHours(t3, 11), 0), businessId: biz1.id, serviceId: svc1.id, staffId: staff1a.id, status: "CONFIRMED" as const },
  ];

  for (const apt of appointments) {
    await prisma.appointment.create({ data: apt });
  }

  console.log("\n✅ Seed completado!\n");
  console.log("═══════════════════════════════════════");
  console.log("  📋 DATOS DE ACCESO");
  console.log("═══════════════════════════════════════");
  console.log(`  👤 Email:    admin@purocode.cl`);
  console.log(`  🔑 Password: purocode123`);
  console.log(`  🏢 Biz 1:    ${biz1.name} (/${biz1.slug})`);
  console.log(`  🏢 Biz 2:    ${biz2.name} (/${biz2.slug})`);
  console.log(`  🔑 API Key 1: ${biz1.apiKey}`);
  console.log(`  🔑 API Key 2: ${biz2.apiKey}`);
  console.log("═══════════════════════════════════════\n");
}

main()
  .catch((e) => { console.error("❌ Error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
