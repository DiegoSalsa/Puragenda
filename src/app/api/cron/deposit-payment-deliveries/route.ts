import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/server/auth/cron";
import { processPendingDepositPaymentDeliveries } from "@/server/services/deposit.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Retries email and Google Calendar effects persisted after a deposit approval. */
export async function GET(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    // Keep this bounded well below the Vercel function timeout. Successful
    // payment return/webhook requests process their own delivery immediately;
    // this daily cron is the all-plan-compatible recovery path.
    const result = await processPendingDepositPaymentDeliveries({ limit: 10 });
    return NextResponse.json({ ok: result.errors.length === 0, ...result }, {
      status: result.errors.length === 0 ? 200 : 500,
    });
  } catch (error) {
    console.error("[cron/deposit-payment-deliveries] Fatal error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
