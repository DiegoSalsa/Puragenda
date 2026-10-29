import { authorizeCommercialWorker, runCommercialTick } from "@/server/commercial-worker";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  const denied = authorizeCommercialWorker(request);
  if (denied) return denied;
  try {
    const result = await runCommercialTick();
    const failed = "stageErrors" in result && (!!result.stageErrors.length || result.billingFailed > 0 || result.proactiveFailed > 0 || result.receiptReconciliationFailed || (result.v2Billing?.failed ?? 0) > 0);
    return Response.json({ ok: !failed, ...result }, { status: failed ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  }
  catch { return Response.json({ code: "WORKER_TICK_FAILED" }, { status: 503 }); }
}
