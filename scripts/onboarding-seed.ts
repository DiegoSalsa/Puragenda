import { prisma } from "../src/server/db/prisma";
import { registerUser } from "../src/server/services/auth.service";
import { createService } from "../src/server/services/service.service";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/puragenda_commercial_test_onboarding" || process.env.NODE_ENV === "production") throw new Error("LOCAL_FIXTURE_ONLY");
  const iteration2 = process.argv.includes("--iteration2");
  const emails = iteration2 ? ["solo2@puri-demo.invalid", "equipo2@puri-demo.invalid", "existente2@puri-demo.invalid", "profesional2@puri-demo.invalid"] : ["solo@puri-demo.invalid", "equipo@puri-demo.invalid", "existente@puri-demo.invalid", "profesional@puri-demo.invalid"];
  if (process.argv.includes("--reset")) {
    const owners = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    await prisma.business.deleteMany({ where: { ownerId: { in: owners.map(o => o.id) } } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
  await prisma.marketplaceCategory.upsert({ where: { slug: "puri-demo" }, create: { slug: "puri-demo", name: "Bienestar (demo)", isActive: true }, update: {} });
  for (const [index, email] of emails.slice(0, 3).entries()) {
    if (await prisma.user.findUnique({ where: { email } })) continue;
    const result = await registerUser({ email, password: "PuriDemo2026!", name: index === 1 ? "Camila Demo" : "Antonia Demo", businessName: index === 0 ? "Estudio Antonia Demo" : index === 1 ? "Equipo Bienestar Demo" : "Estudio Existente Demo", countryCode: "CL", timezone: "America/Santiago", currencyCode: "CLP", ip: "127.0.0.1", commercialPlanIntent: index === 1 ? "PURAGENDA_PLUS" : "PURAGENDA", professionalTotal: index === 1 ? 3 : 1, marketplaceCategorySlug: "puri-demo", marketplaceLocalityNotFound: true, marketplaceCityName: "Ciudad de demostración", marketplaceAuthorized: false });
    if (!result.success) throw new Error(result.error);
    if (index === 2) {
      await createService({ businessId: result.business.id, name: "Consulta de demostración", description: "Servicio ficticio existente", duration: 30, price: 10000 });
      await prisma.businessSetup.delete({ where: { businessId: result.business.id } });
    }
  }
  const owner = await prisma.user.findUniqueOrThrow({ where: { email: emails[1] } });
  const business = await prisma.business.findFirstOrThrow({ where: { ownerId: owner.id } });
  if (!iteration2 && !await prisma.user.findUnique({ where: { email: emails[3] } })) {
    const user = await prisma.user.create({ data: { name: "Profesional Demo", email: emails[3], password: await bcrypt.hash("PuriDemo2026!", 10), role: "STAFF" } });
    // This active fixture employee demonstrates role restrictions and consumes one granted seat.
    await prisma.staff.create({ data: { id: randomUUID(), businessId: business.id, userId: user.id, name: user.name, email: user.email, isActive: true } });
  }
  console.log("Local demo:", emails.slice(0, iteration2 ? 3 : 4).join(" | "));
  console.log("Local-only password: PuriDemo2026!");
}
main().finally(() => prisma.$disconnect());
