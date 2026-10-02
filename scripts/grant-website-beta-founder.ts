import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { isWebsiteFounderCandidate } from "../src/websites/offers";

const launchRaw = process.env.WEBSITE_LAUNCH_AT;
if (!launchRaw) throw new Error("WEBSITE_LAUNCH_AT es obligatorio; no se usa una fecha codificada");
const launchAt = new Date(launchRaw);
if (Number.isNaN(launchAt.getTime())) throw new Error("WEBSITE_LAUNCH_AT no es una fecha ISO válida");
const apply = process.argv.includes("--apply");
const snapshotId = `website-launch-${launchAt.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
const prisma = new PrismaClient();

try {
  const businesses = await prisma.business.findMany({
    where: { createdAt: { lte: launchAt } },
    select: { id: true, createdAt: true, deletedAt: true, subscription: { select: { status: true, isTrial: true, currentPeriodEnd: true, createdAt: true } } },
  });
  const eligible = businesses.filter(b => isWebsiteFounderCandidate(b, launchAt));
  const existing = await prisma.websiteLaunchSnapshot.findUnique({ where: { id: snapshotId }, include: { members: { select: { businessId: true } } } });
  const alreadyMarked = existing?.members.length ?? 0;
  console.log(`Negocios elegibles: ${eligible.length}`);
  console.log(`Ya marcados: ${alreadyMarked}`);
  console.log(`Nuevos a marcar: ${Math.max(0, eligible.filter(b => !existing?.members.some(m => m.businessId === b.id)).length)}`);
  if (!apply) {
    console.log("DRY RUN: no se modificó la base de datos. Usa --apply y WEBSITE_LAUNCH_SNAPSHOT_CONFIRM=... para mutar.");
    process.exit(0);
  }
  if (process.env.WEBSITE_LAUNCH_SNAPSHOT_CONFIRM !== snapshotId) throw new Error(`Confirma explícitamente con WEBSITE_LAUNCH_SNAPSHOT_CONFIRM=${snapshotId}`);
  if (existing) throw new Error("El snapshot ya existe; la operación es inmutable e idempotente");
  await prisma.$transaction(async tx => {
    await tx.websiteLaunchSnapshot.create({ data: { id: snapshotId, launchAt, capturedAt: new Date(), memberCount: eligible.length } });
    if (eligible.length) await tx.websiteOfferEligibility.createMany({ data: eligible.map(b => ({ businessId: b.id, snapshotId, eligibleAt: launchAt, offerCode: "BETA_FOUNDER" as const })) });
  });
  console.log(`Snapshot creado: ${snapshotId}`);
} finally { await prisma.$disconnect(); }
