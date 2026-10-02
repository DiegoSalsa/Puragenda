import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { isWebsiteFounderCandidate } from "../src/websites/offers";

const launchRaw = process.env.WEBSITE_LAUNCH_AT;
if (!launchRaw) throw new Error("WEBSITE_LAUNCH_AT es obligatorio; no se usa una fecha codificada");
const launchAt = new Date(launchRaw);
if (Number.isNaN(launchAt.getTime())) throw new Error("WEBSITE_LAUNCH_AT no es una fecha ISO válida");
const apply = process.argv.includes("--apply");
const snapshotId = `website-launch-${launchAt.toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
try {
  const businesses = await prisma.business.findMany({
    where: { createdAt: { lte: launchAt } },
    select: { id: true, createdAt: true, deletedAt: true, subscription: { select: { status: true, isTrial: true, currentPeriodEnd: true, createdAt: true } } },
  });
  const eligible = businesses.filter(b => isWebsiteFounderCandidate(b, launchAt));
  const existing = await prisma.websiteLaunchSnapshot.findUnique({ where: { id: snapshotId }, include: { members: { select: { businessId: true } } } });
  const marked = await prisma.websiteOfferEligibility.findMany({ where: { businessId: { in: eligible.map(b => b.id) } }, select: { businessId: true } });
  const alreadyMarked = existing?.members.length ?? marked.length;
  const unmarked = eligible.filter(b => !marked.some(m => m.businessId === b.id));
  console.log(`Negocios elegibles: ${existing?.memberCount ?? eligible.length}`);
  console.log(`Ya marcados: ${alreadyMarked}`);
  console.log(`Nuevos a marcar: ${existing ? 0 : unmarked.length}`);
  if (!apply) {
    console.log("DRY RUN: no se modificó la base de datos. Usa --apply y WEBSITE_LAUNCH_SNAPSHOT_CONFIRM=... para mutar.");
    return;
  }
  if (process.env.WEBSITE_LAUNCH_SNAPSHOT_CONFIRM !== snapshotId) throw new Error(`Confirma explícitamente con WEBSITE_LAUNCH_SNAPSHOT_CONFIRM=${snapshotId}`);
  if (existing) throw new Error("El snapshot ya existe; la operación es inmutable e idempotente");
  if (marked.length) throw new Error("Hay negocios asociados a otro snapshot; concilia el snapshot antes de aplicar");
  await prisma.$transaction(async tx => {
    await tx.websiteLaunchSnapshot.create({ data: { id: snapshotId, launchAt, capturedAt: new Date(), memberCount: eligible.length } });
    if (eligible.length) await tx.websiteOfferEligibility.createMany({ data: eligible.map(b => ({ businessId: b.id, snapshotId, eligibleAt: launchAt, offerCode: "BETA_FOUNDER" as const })) });
  });
  console.log(`Snapshot creado: ${snapshotId}`);
} finally { await prisma.$disconnect(); await pool.end(); }
}
void main().catch(() => { console.error("No se pudo completar el snapshot. Revisa configuración y migraciones; no se imprimen credenciales."); process.exitCode = 1; });
