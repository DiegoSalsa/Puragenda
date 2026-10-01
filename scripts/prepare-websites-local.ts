import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fixtureView } from "../src/websites/fixtures/views";
const connectionString = "postgresql://websiteqa@127.0.0.1:55439/websiteqa";
async function main() {
const client = new pg.Client({ connectionString });
await client.connect();
const hasBusiness = await client.query("SELECT to_regclass('public.\"Business\"') as table");
if (!hasBusiness.rows[0].table) {
  // Disposable local baseline only; deployed environments use migration history.
  const ddl = execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema", "prisma/schema.prisma", "--script"], { encoding: "utf8", env: { ...process.env, DATABASE_URL: connectionString, DIRECT_URL: connectionString } });
  await client.query(ddl);
  const security = fs.readFileSync("prisma/migrations/20260930160000_websites_addon_v1/migration.sql", "utf8").split("-- Server-only persistence.")[1];
  if (!security) throw new Error("Faltan las restricciones server-only de websites");
  await client.query("-- Server-only persistence." + security);
  await client.query('ALTER TABLE "WebsiteMedia" ENABLE ROW LEVEL SECURITY');
}
const hasMedia = await client.query("SELECT to_regclass('public.\"WebsiteMedia\"') as table");
if (!hasMedia.rows[0].table) await client.query(fs.readFileSync("prisma/migrations/20260930210000_website_visual_builder_v2/migration.sql", "utf8"));
await client.end();
const localPassword = await bcrypt.hash("Bella-local-qa-2026!", 10);
const pool = new pg.Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
for (const key of ["a", "b"] as const) {
  const view = fixtureView(key), prefix = `website-qa-${key}`;
  await prisma.user.upsert({ where: { id: `${prefix}-owner` }, create: { id: `${prefix}-owner`, email: `${prefix}@example.test`, name: `${view.business.name} Owner`, password: localPassword, role: "ADMIN" }, update: { password: localPassword } });
  await prisma.business.upsert({ where: { id: prefix }, create: { id: prefix, name: view.business.name, slug: prefix, apiKey: `${prefix}-local-only-key`, ownerId: `${prefix}-owner`, timezone: "America/Santiago", allowSameDayBookings: false }, update: {} });
  await prisma.subscription.upsert({ where: { businessId: prefix }, create: { businessId: prefix, status: "ACTIVE", plan: "EQUIPO" }, update: { status: "ACTIVE" } });
  const location = await prisma.businessLocation.upsert({ where: { businessId_slug: { businessId: prefix, slug: "principal" } }, create: { id: `${prefix}-location`, businessId: prefix, name: `${view.business.name} · Estudio`, slug: "principal", timezone: "America/Santiago", isActive: true, isPrimary: true }, update: { isActive: true } });
  for (let day = 1; day <= 6; day++) {
    await prisma.businessHours.upsert({ where: { businessId_dayOfWeek: { businessId: prefix, dayOfWeek: day } }, create: { businessId: prefix, dayOfWeek: day, startTime: "09:00", endTime: "19:00", isOpen: true }, update: {} });
  }
  for (const [position, service] of view.catalog.services.entries()) {
    const id = `${prefix}-${service.id}`;
    await prisma.service.upsert({ where: { id }, create: { id, businessId: prefix, name: service.name, price: service.price, duration: service.duration, description: service.description, imageUrl: service.image, position }, update: { position, price: service.price } });
    await prisma.locationService.upsert({ where: { locationId_serviceId: { locationId: location.id, serviceId: id } }, create: { locationId: location.id, serviceId: id }, update: {} });
    for (const category of service.optionCategories) await prisma.serviceOptionCategory.upsert({ where: { id: `${prefix}-${category.id}` }, create: { id: `${prefix}-${category.id}`, serviceId: id, name: category.name, isRequired: category.isRequired, maxSelections: category.maxSelections, alternatives: { create: category.alternatives.map(alt => ({ ...alt, id: `${prefix}-${alt.id}` })) } }, update: {} });
  }
  for (const person of view.catalog.staff) {
    const staff = await prisma.staff.upsert({ where: { id: `${prefix}-${person.id}` }, create: { id: `${prefix}-${person.id}`, businessId: prefix, name: person.name, services: { connect: person.serviceIds.map(id => ({ id: `${prefix}-${id}` })) } }, update: {} });
    await prisma.staffLocation.upsert({ where: { staffId_locationId: { staffId: staff.id, locationId: location.id } }, create: { staffId: staff.id, locationId: location.id, isActive: true }, update: {} });
    for (let day = 1; day <= 6; day++) await prisma.staffSchedule.upsert({ where: { staffId_dayOfWeek: { staffId: staff.id, dayOfWeek: day } }, create: { staffId: staff.id, dayOfWeek: day, startTime: "09:00", endTime: "19:00", isWorking: true }, update: {} });
  }
  await prisma.websiteAddon.upsert({ where: { businessId: prefix }, create: { businessId: prefix, provider: "mock", status: "ACTIVE", validUntil: new Date("2026-12-31T00:00:00Z") }, update: {} });
  const existingWebsite = await prisma.businessWebsite.findUnique({ where: { businessId: prefix }, select: { revision: true } });
  const fixtureRevision = existingWebsite ? existingWebsite.revision + 1 : 0;
  await prisma.businessWebsite.upsert({ where: { businessId: prefix }, create: { businessId: prefix, subdomain: `bella-${key}`, draftConfig: view.config, publishedConfig: view.config, status: "PUBLISHED", publishedAt: new Date(), publishedRevision: 0 }, update: { draftConfig: view.config, publishedConfig: view.config, status: "PUBLISHED", publishedAt: new Date(), revision: fixtureRevision, publishedRevision: fixtureRevision } });
}
console.log("Migración y fixtures A/B preparados exclusivamente en PostgreSQL local 127.0.0.1:55439/websiteqa");
await prisma.$disconnect();
await pool.end();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
