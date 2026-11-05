import { runCommercialTick } from "../src/server/commercial-worker";
import { prisma } from "../src/server/db/prisma";
// One finite tick. An external scheduler may invoke this process repeatedly;
// the database lease makes overlapping invocations safe.
async function main() {
  try { console.log(JSON.stringify(await runCommercialTick())); }
  finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("COMMERCIAL_WORKER_TICK_FAILED"); process.exitCode = 1; });
