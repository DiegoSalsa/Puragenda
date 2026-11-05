import type {Prisma} from "@prisma/client";
import {prisma} from "@/server/db/prisma";
import {legacyPlusTerms} from "@/core/legacy-plus";

/** The original base agreement remains authoritative, including its benefits.
 * Only a consented Plus extension adds to its next debit. */
export async function legacyPlusRenewalAmount(businessId: string, db: Pick<Prisma.TransactionClient, "commercialSubscription"> = prisma) {
  if (!businessId || process.env.PURAGENDA_NEXT_ENABLED !== "1") return 0;
  const snapshot = await db.commercialSubscription.findUnique({where: {businessId}});
  const terms = legacyPlusTerms(snapshot?.termsSnapshot);
  return terms?.combinedRecurring && !terms.cancelAt ? terms.upgradeCycleAmount : 0;
}
