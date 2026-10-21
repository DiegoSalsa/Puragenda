import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/server/auth/cron";
import { releaseExpiredPaymentHolds } from "@/server/services/payment-hold.service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Optional external scheduler endpoint. Availability reads and booking
 * transactions expire holds lazily, so this endpoint is only a cleanup aid
 * and never the source of truth for slot visibility.
 */
export async function GET(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;
  const result = await releaseExpiredPaymentHolds();
  return NextResponse.json({ ok: true, ...result });
}

