import "dotenv/config";
import { parseArgs } from "node:util";
import { prisma } from "../src/server/db/prisma";
import { recordManualSubscriptionPayment } from "../src/server/services/commercial-subscription.service";

async function main() {
  try {
    const { values } = parseArgs({ options: {
      "business-id": { type: "string" },
      reference: { type: "string" },
      "amount-clp": { type: "string" },
      "paid-from": { type: "string" },
      "paid-through": { type: "string" },
      "expected-period-end": { type: "string" },
      apply: { type: "boolean", default: false },
    } });
    if (!values["expected-period-end"]) throw new Error("Indica --expected-period-end con el valor actual, o none si es NULL");
    const report = await recordManualSubscriptionPayment({
      businessId: values["business-id"] ?? "", reference: values.reference ?? "",
      amountClp: Number(values["amount-clp"]), paidFrom: values["paid-from"] ?? "", paidThrough: values["paid-through"] ?? "",
      expectedPeriodEnd: values["expected-period-end"] === "none" ? null : values["expected-period-end"],
    }, values.apply);
    console.log(JSON.stringify(report, null, 2));
    if (report.blockers.length) process.exitCode = 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo registrar el período pagado");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
