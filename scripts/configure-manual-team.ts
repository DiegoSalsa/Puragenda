import "dotenv/config";
import { parseArgs } from "node:util";
import { prisma } from "../src/server/db/prisma";
import { configureManualTeamSubscription } from "../src/server/services/commercial-subscription.service";

async function main() {
  try {
    const { values } = parseArgs({ options: {
      "business-id": { type: "string" },
      "staff-limit": { type: "string" },
      "monthly-price-clp": { type: "string" },
      apply: { type: "boolean", default: false },
    } });
    const report = await configureManualTeamSubscription({
      businessId: values["business-id"] ?? "",
      staffLimit: Number(values["staff-limit"]),
      monthlyPriceClp: Number(values["monthly-price-clp"]),
    }, values.apply);
    console.log(JSON.stringify(report, null, 2));
    if (report.blockers.length) process.exitCode = 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo preparar la configuración comercial");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
