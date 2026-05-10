import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "vale@esteticabella.cl" }, select: { id: true, name: true } });
  if (!user) { console.log("User not found"); return; }
  console.log("User:", user);

  const business = await prisma.business.findFirst({ where: { ownerId: user.id }, select: { id: true, name: true } });
  if (!business) { console.log("Business not found"); return; }
  console.log("Business:", business);

  const affiliate = await prisma.affiliate.findUnique({ where: { businessId: business.id } });
  console.log("Affiliate before:", affiliate);

  const sub = await prisma.subscription.findUnique({ where: { businessId: business.id } });
  console.log("Subscription before:", { pendingDiscountPercentage: sub?.pendingDiscountPercentage, activePrizeId: sub?.activePrizeId });

  if (affiliate) {
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { paidReferrals: 20, spentTokens: 0 },
    });
    console.log("✅ Affiliate updated: 20 paidReferrals, 0 spentTokens (= 20 fichas disponibles)");
  }

  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { pendingDiscountPercentage: null, activePrizeId: null, freeMonthsRemaining: 0 },
    });
    console.log("✅ Subscription cleared: no pending discount");
  }

  if (affiliate) {
    const deleted = await prisma.prize.deleteMany({ where: { affiliateId: affiliate.id } });
    console.log("✅ Deleted existing prizes:", deleted.count);
  }

  console.log("\n🎰 Done! vale@esteticabella.cl now has 20 tokens and no active discount.");
}

main().finally(() => { pool.end(); });
