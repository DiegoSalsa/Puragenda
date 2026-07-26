import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const business = await prisma.business.findFirst({
    where: { OR: [{ slug: "estetica-bella" }, { slug: "esteticabella" }] },
  });
  if (!business) throw new Error("No se encontro la cuenta Estetica Bella");

  await prisma.business.update({
    where: { id: business.id },
    data: { productionOrdersEnabled: true },
  });

  const christmasWindow = {
    key: "navidad-2026",
    label: "Entrega Navidad 2026",
    startDate: "2026-12-18",
    endDate: "2026-12-23",
    capacity: 30,
    isActive: true,
  };
  const januaryWindow = {
    key: "enero-2027",
    label: "Entrega enero 2027",
    startDate: "2027-01-11",
    endDate: "2027-01-17",
    capacity: 15,
    isActive: true,
  };

  const existingService = await prisma.service.findFirst({
    where: { businessId: business.id, name: "Replica de mascota en lana" },
  });

  const service = existingService
    ? await prisma.service.update({
        where: { id: existingService.id },
        data: {
          description: "Replica artesanal de tu mascota creada a partir de fotografias.",
          bookingMode: "PRODUCTION",
          productionScheduleMode: "CUSTOM",
          customProductionWindows: [christmasWindow, januaryWindow],
          productionDepositPercent: 50,
          requiresReferenceImages: true,
          duration: 60,
          price: 65000,
        },
      })
    : await prisma.service.create({
        data: {
          businessId: business.id,
          name: "Replica de mascota en lana",
          description: "Replica artesanal de tu mascota creada a partir de fotografias.",
          bookingMode: "PRODUCTION",
          productionScheduleMode: "CUSTOM",
          customProductionWindows: [christmasWindow, januaryWindow],
          productionDepositPercent: 50,
          requiresReferenceImages: true,
          duration: 60,
          price: 65000,
        },
      });

  const currentCategories = await prisma.serviceOptionCategory.count({ where: { serviceId: service.id } });
  if (currentCategories === 0) {
    await prisma.serviceOptionCategory.create({
      data: {
        serviceId: service.id,
        name: "Tamano de la replica",
        isRequired: true,
        maxSelections: 1,
        position: 0,
        alternatives: {
          create: [
            { name: "Mini (10 cm)", priceDelta: 0, durationDelta: 0, position: 0 },
            { name: "Mediana (18 cm)", priceDelta: 25000, durationDelta: 0, position: 1 },
            { name: "Grande (25 cm)", priceDelta: 55000, durationDelta: 0, position: 2 },
          ],
        },
      },
    });
    await prisma.serviceOptionCategory.create({
      data: {
        serviceId: service.id,
        name: "Detalle especial",
        isRequired: false,
        maxSelections: 2,
        position: 1,
        alternatives: {
          create: [
            { name: "Aureola", priceDelta: 0, durationDelta: 0, position: 0 },
            { name: "Alas", priceDelta: 0, durationDelta: 0, position: 1 },
            { name: "Accesorio personalizado", priceDelta: 8000, durationDelta: 0, position: 2 },
          ],
        },
      },
    });
  }

  const sampleClient = await prisma.client.upsert({
    where: { businessId_email: { businessId: business.id, email: "demo.encargos@puragenda.cl" } },
    update: { name: "Camila Soto", phone: "+56955555555" },
    create: {
      businessId: business.id,
      name: "Camila Soto",
      email: "demo.encargos@puragenda.cl",
      phone: "+56955555555",
    },
  });

  const promisedStart = new Date(`${christmasWindow.startDate}T00:00:00.000Z`);
  const promisedEnd = new Date(`${christmasWindow.endDate}T00:00:00.000Z`);
  const samples = [
    {
      orderNumber: "ENC-DEMO-COLA",
      petName: "Milo",
      petDetails: "Gato naranjo de pelo largo, ojos verdes y una pequena mancha blanca en el pecho.",
      productionWeek: promisedStart,
      status: "QUEUED" as const,
      depositPaymentStatus: "APPROVED" as const,
      totalPrice: 90000,
      depositAmount: 45000,
      balanceAmount: 45000,
    },
    {
      orderNumber: "ENC-DEMO-PRODUCCION",
      petName: "Luna",
      petDetails: "Perrita mestiza negra con patas cafe. Incluir su panuelo rojo favorito.",
      productionWeek: promisedStart,
      status: "IN_PRODUCTION" as const,
      depositPaymentStatus: "APPROVED" as const,
      totalPrice: 73000,
      depositAmount: 36500,
      balanceAmount: 36500,
    },
    {
      orderNumber: "ENC-DEMO-SALDO",
      petName: "Benji",
      petDetails: "Poodle blanco pequeno. Replica homenaje con aureola.",
      productionWeek: promisedStart,
      status: "BALANCE_DUE" as const,
      depositPaymentStatus: "APPROVED" as const,
      totalPrice: 65000,
      depositAmount: 32500,
      balanceAmount: 32500,
    },
  ];

  for (const sample of samples) {
    await prisma.productionOrder.upsert({
      where: { orderNumber: sample.orderNumber },
      update: {
        serviceId: service.id,
        productionWeek: sample.productionWeek,
        productionWindowKey: christmasWindow.key,
        productionWindowLabel: christmasWindow.label,
        productionWindowEnd: promisedEnd,
        status: sample.status,
      },
      create: {
        ...sample,
        businessId: business.id,
        serviceId: service.id,
        clientId: sampleClient.id,
        customerName: sampleClient.name,
        customerEmail: sampleClient.email,
        customerPhone: sampleClient.phone || "+56955555555",
        productionWindowKey: christmasWindow.key,
        productionWindowLabel: christmasWindow.label,
        productionWindowEnd: promisedEnd,
        selectedOptions: [],
        referenceImageUrls: [],
      },
    });
  }

  console.log(JSON.stringify({
    business: business.slug,
    service: service.name,
    serviceId: service.id,
    samples: samples.length,
  }));
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
