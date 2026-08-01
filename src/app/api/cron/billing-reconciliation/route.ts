import { NextResponse } from "next/server";

import { runBillingReconciliation } from "@/server/services/subscription-dunning.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (
    cronSecret &&
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runBillingReconciliation();
    const ok = results.errors.length === 0;
    return NextResponse.json({ ok, ...results }, { status: ok ? 200 : 500 });
  } catch (error) {
    console.error("[cron/billing-reconciliation] Fatal error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
