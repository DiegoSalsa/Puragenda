import { NextResponse } from "next/server";

import { runGoogleCalendarReconciliation } from "@/server/services/google-calendar.service";
import { authorizeCronRequest } from "@/server/auth/cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;
  const businessId = new URL(request.url).searchParams.get("businessId") ?? undefined;
  const results = await runGoogleCalendarReconciliation(new Date(), businessId);
  const ok = results.errors.length === 0;
  return NextResponse.json({ ok, ...results }, { status: ok ? 200 : 500 });
}
