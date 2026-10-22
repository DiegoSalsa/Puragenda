import { authorizeCommercialWorker, runCommercialTick } from "@/server/commercial-worker";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  const denied = authorizeCommercialWorker(request);
  if (denied) return denied;
  try { return Response.json(await runCommercialTick(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ code: "WORKER_TICK_FAILED" }, { status: 503 }); }
}
