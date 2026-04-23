import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import crypto from "crypto";
import { addDays, setHours, setMinutes } from "date-fns";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧹 Limpiando base de datos...");
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.business.deleteMany();

  const apiKey = `pc_${crypto.randomBytes(24).toString("hex")}`;

  console.log("🏢 Creando negocio PuroCode Demo...");
  const business = await prisma.business.create({
    data: {
      name: "PuroCode Demo",
      slug: "purocode-demo",
      apiKey,
    },
  });

  console.log("🛠️  Creando servicios...");
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: "Consultoría Web",
        description:
          "Sesión de consultoría para analizar tu proyecto web, optimizar rendimiento y definir estrategia digital.",
        duration: 60,
        price: 75000,
        businessId: business.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Desarrollo Landing Page",
        description:
          "Diseño y desarrollo completo de una landing page profesional con enfoque en conversión.",
        duration: 90,
        price: 250000,
        businessId: business.id,
      },
    }),
    prisma.service.create({
      data: {
        name: "Mantenimiento Web",
        description:
          "Servicio de mantenimiento mensual: actualizaciones, backups, monitoreo y soporte técnico.",
        duration: 45,
        price: 50000,
        businessId: business.id,
      },
    }),
  ]);

  console.log("📅 Creando citas de prueba...");
  const tomorrow = addDays(new Date(), 1);
  const dayAfterTomorrow = addDays(new Date(), 2);

  await prisma.appointment.create({
    data: {
      customerName: "Juan Pérez",
      customerEmail: "juan.perez@email.com",
      startTime: setMinutes(setHours(tomorrow, 10), 0),
      endTime: setMinutes(setHours(tomorrow, 11), 0),
      status: "PENDING",
      businessId: business.id,
      serviceId: services[0].id,
    },
  });

  await prisma.appointment.create({
    data: {
      customerName: "María González",
      customerEmail: "maria.gonzalez@email.com",
      startTime: setMinutes(setHours(dayAfterTomorrow, 14), 0),
      endTime: setMinutes(setHours(dayAfterTomorrow, 15), 30),
      status: "PENDING",
      businessId: business.id,
      serviceId: services[1].id,
    },
  });

  console.log("\n✅ Seed completado exitosamente!\n");
  console.log("═══════════════════════════════════════════");
  console.log("  📋 DATOS DE ACCESO DEL NEGOCIO DE PRUEBA");
  console.log("═══════════════════════════════════════════");
  console.log(`  🏢 Negocio: ${business.name}`);
  console.log(`  🔗 Slug:    ${business.slug}`);
  console.log(`  🔑 API Key: ${business.apiKey}`);
  console.log("═══════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
