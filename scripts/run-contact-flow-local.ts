import { runContactWorker } from "../src/server/contact-flow/worker";
import { prisma } from "../src/server/db/prisma";
// Finite local executor; can be run by two processes to exercise leases. Every
// campaign needs a persisted owner authorization and fresh server revalidation.
async function main() {
  try {
    const r = await runContactWorker({ limit: 20 });
    console.log(
      JSON.stringify({
        processed: r.processed,
        simulated: true,
        externalBlocked: true,
        states: r.results.map((x) => x.state),
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error("CONTACT_FLOW_LOCAL_EXECUTOR_FAILED");
  process.exitCode = 1;
});
