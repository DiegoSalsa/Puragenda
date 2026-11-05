import {authorizeCronRequest} from "@/server/auth/cron";
import {runMpV2Reconciliation} from "@/server/commercial-billing/mercadopago-v2";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Billing recovery is independent of optional marketing/AI workers. */
export async function GET(request: Request) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;
  try {
    const result = await runMpV2Reconciliation(undefined, {limit: 2, maxRequests: 12, maxDurationMs: 8_000});
    const ok = result.failed === 0;
    return Response.json({ok, ...result}, {status: ok ? 200 : 503, headers: {"Cache-Control": "no-store"}});
  } catch {
    return Response.json({ok: false, code: "V2_BILLING_RECOVERY_FAILED"}, {status: 503, headers: {"Cache-Control": "no-store"}});
  }
}
