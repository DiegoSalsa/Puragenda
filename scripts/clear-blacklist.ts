import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const ips = await prisma.blacklistedIp.findMany({ orderBy: { createdAt: "desc" } });
  console.log(`Found ${ips.length} blacklisted IPs:`);
  ips.forEach((i) => console.log(`  ${i.ip} | ${i.reason} | ${i.createdAt.toISOString()}`));

  const deleted = await prisma.blacklistedIp.deleteMany({});
  console.log(`\nDeleted ${deleted.count} blacklisted IPs.`);

  const updated = await prisma.user.updateMany({
    where: { trialUsedAt: { not: null } },
    data: { trialUsedAt: null },
  });
  console.log(`Reset trialUsedAt on ${updated.count} users.`);

  await pool.end();
}

main();
