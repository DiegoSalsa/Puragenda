import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { addMinutes, startOfDay, subDays } from "date-fns";
import pg from "pg";
import { ESTETICA_BELLA_DEMO_SLUG } from "../src/lib/marketplace/visibility";
import { formatPublicReviewerName } from "../src/lib/reviews/public-name";
import {
  ESTETICA_BELLA_DEMO_REVIEWS,
  demoAppointmentId,
  demoClientEmail,
  esteticaBellaDemoRatingSummary,
  isEsteticaBellaDemoBusiness,
} from "../src/lib/reviews/estetica-bella-demo";

function requireDatabaseUrl() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DIRECT_URL o DATABASE_URL.");
  return url;
}

const connectionString = requireDatabaseUrl();

const configuredSchema = (() => {
  try {
    return new URL(connectionString).searchParams.get("schema") || undefined;
  } catch {
    return undefined;
  }
})();

const pool = new pg.Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema: configuredSchema }) });

function pickService(
  services: Array<{ id: string; name: string; duration: number; price: number }>,
  hint: "nails" | "hair",
) {
  const match = services.find((service) => (
    hint === "nails"
      ? /mani|uñas|una|gel|nail|pedicure/i.test(service.name)
      : /corte|pelo|cabello|color|brushing|mechas/i.test(service.name)
  ));
  return match ?? services[0];
}

async function main() {
  const host = new URL(connectionString).host;
  console.log(`Usando base ${host}${configuredSchema ? ` schema=${configuredSchema}` : ""}`);

  const business = await prisma.business.findUnique({
    where: { slug: ESTETICA_BELLA_DEMO_SLUG },
    include: {
      services: { where: { bookingMode: "APPOINTMENT" }, select: { id: true, name: true, duration: true, price: true }, orderBy: { name: "asc" } },
      staff: { select: { id: true, name: true }, orderBy: { createdAt: "asc" } },
      locations: { where: { isActive: true }, select: { id: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      owner: { select: { id: true } },
    },
  });

  if (!business || !isEsteticaBellaDemoBusiness(business)) {
    throw new Error("No se encontró el negocio demo Estética Bella (slug estetica-bella). No se insertó nada.");
  }
  if (business.services.length === 0) {
    throw new Error("Estética Bella no tiene servicios de cita. No se insertó nada.");
  }

  const catalogIds = ESTETICA_BELLA_DEMO_REVIEWS.map((review) => demoAppointmentId(review.key));
  const now = new Date();
  const locality = await prisma.marketplaceLocality.findFirst({
    where: { slug: "concepcion", isActive: true },
    select: { id: true, slug: true },
  });

  const stale = await prisma.appointment.findMany({
      where: {
        businessId: business.id,
        id: { startsWith: "clevrebella" },
        NOT: { id: { in: catalogIds } },
      },
      select: { id: true },
    });
  if (stale.length > 0) {
    await prisma.appointment.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
  }

  for (const [index, spec] of ESTETICA_BELLA_DEMO_REVIEWS.entries()) {
      const service = pickService(business.services, spec.serviceHint);
      const staff = business.staff[index % Math.max(business.staff.length, 1)] ?? null;
      const locationId = business.locations[0]?.id ?? null;
      const email = demoClientEmail(spec.key);
      const appointmentId = demoAppointmentId(spec.key);
      const startTime = addMinutes(subDays(startOfDay(now), spec.daysAgo), spec.hour * 60 + 10);
      const endTime = addMinutes(startTime, service.duration || 60);
      const submittedAt = addMinutes(endTime, 95);

      const client = await prisma.client.upsert({
        where: { businessId_email: { businessId: business.id, email } },
        create: {
          businessId: business.id,
          email,
          name: spec.customerName,
          acceptsMarketing: false,
        },
        update: { name: spec.customerName },
      });

      await prisma.appointment.upsert({
        where: { id: appointmentId },
        create: {
          id: appointmentId,
          businessId: business.id,
          locationId,
          serviceId: service.id,
          staffId: staff?.id ?? null,
          clientId: client.id,
          customerName: spec.customerName,
          customerEmail: email,
          startTime,
          endTime,
          status: "COMPLETED",
          totalDuration: service.duration,
          totalPrice: service.price,
          settledAt: endTime,
        },
        update: {
          locationId,
          serviceId: service.id,
          staffId: staff?.id ?? null,
          clientId: client.id,
          customerName: spec.customerName,
          customerEmail: email,
          startTime,
          endTime,
          status: "COMPLETED",
          totalDuration: service.duration,
          totalPrice: service.price,
          settledAt: endTime,
        },
      });

      await prisma.appointmentReview.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          businessId: business.id,
          clientId: client.id,
          rating: spec.rating,
          comment: spec.comment,
          visibility: spec.visibility,
          status: spec.status,
          submittedAt,
          publishedAt: spec.status === "PUBLISHED" ? addMinutes(submittedAt, 40) : null,
          autoPublishAt: spec.status === "PENDING" && spec.visibility === "PUBLIC" ? addMinutes(now, 72 * 60) : null,
          publicReviewerName: formatPublicReviewerName(spec.customerName),
          serviceNameSnapshot: service.name,
          staffNameSnapshot: staff?.name ?? null,
          businessReply: spec.reply ?? null,
          businessRepliedAt: spec.reply ? addMinutes(submittedAt, 80) : null,
          businessRepliedByUserId: spec.reply ? business.owner?.id ?? null : null,
          reportReason: spec.reportReason ?? null,
          reportedAt: spec.status === "REPORTED" ? addMinutes(submittedAt, 50) : null,
          reportedByUserId: spec.status === "REPORTED" ? business.owner?.id ?? null : null,
          verificationSource: "BOOKING_TOKEN",
        },
        update: {
          clientId: client.id,
          rating: spec.rating,
          comment: spec.comment,
          visibility: spec.visibility,
          status: spec.status,
          submittedAt,
          publishedAt: spec.status === "PUBLISHED" ? addMinutes(submittedAt, 40) : null,
          autoPublishAt: spec.status === "PENDING" && spec.visibility === "PUBLIC" ? addMinutes(now, 72 * 60) : null,
          publicReviewerName: formatPublicReviewerName(spec.customerName),
          serviceNameSnapshot: service.name,
          staffNameSnapshot: staff?.name ?? null,
          businessReply: spec.reply ?? null,
          businessRepliedAt: spec.reply ? addMinutes(submittedAt, 80) : null,
          businessRepliedByUserId: spec.reply ? business.owner?.id ?? null : null,
          reportReason: spec.reportReason ?? null,
          reportedAt: spec.status === "REPORTED" ? addMinutes(submittedAt, 50) : null,
          reportedByUserId: spec.status === "REPORTED" ? business.owner?.id ?? null : null,
          withdrawnAt: null,
        },
      });
    }

  const published = await prisma.appointmentReview.aggregate({
      where: {
        businessId: business.id,
        visibility: "PUBLIC",
        status: "PUBLISHED",
        withdrawnAt: null,
      },
      _count: { _all: true },
      _sum: { rating: true },
    });
  await prisma.business.update({
    where: { id: business.id },
    data: {
      publicReviewCount: published._count._all,
      publicReviewRatingSum: published._sum.rating ?? 0,
    },
  });

  const listingToPublish = await prisma.marketplaceListing.findFirst({
    where: { businessId: business.id },
    select: { id: true, publishedAt: true, localityId: true, authorizationConfirmedAt: true },
  });
  if (listingToPublish) {
    await prisma.marketplaceListing.update({
      where: { id: listingToPublish.id },
      data: {
        status: "ACTIVE",
        publishedAt: listingToPublish.publishedAt ?? now,
        localityId: listingToPublish.localityId ?? locality?.id ?? undefined,
        authorizationConfirmedAt: listingToPublish.authorizationConfirmedAt ?? now,
        authorizationRevokedAt: null,
      },
    });
  }

  const summary = esteticaBellaDemoRatingSummary();
  const listing = await prisma.marketplaceListing.findFirst({
    where: { businessId: business.id },
    select: { status: true, publishedAt: true, authorizationConfirmedAt: true },
  });

  console.log(`Reseñas demo de ${business.name} (${business.slug}) actualizadas.`);
  console.log(`Total catálogo: ${ESTETICA_BELLA_DEMO_REVIEWS.length}`);
  console.log(`Públicas publicadas: ${summary.count}`);
  console.log(`Promedio público: ${summary.average}`);
  console.log(`Distribución: 5★ ${summary.distribution[5]} · 4★ ${summary.distribution[4]} · 3★ ${summary.distribution[3]} · 2★ ${summary.distribution[2]} · 1★ ${summary.distribution[1]}`);
  console.log(`Pending: ${summary.pending} · Reported: ${summary.reported} · Private: ${summary.private} · Con respuesta: ${summary.withReply}`);
  console.log(`Listing marketplace: ${listing ? `${listing.status} published=${Boolean(listing.publishedAt)} auth=${Boolean(listing.authorizationConfirmedAt)}` : "no existe"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
