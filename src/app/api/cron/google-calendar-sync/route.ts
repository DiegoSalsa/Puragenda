import { NextResponse } from "next/server";

import { runGoogleCalendarReconciliation } from "@/server/services/google-calendar.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await runGoogleCalendarReconciliation();
  const ok = results.errors.length === 0;
  return NextResponse.json({ ok, ...results }, { status: ok ? 200 : 500 });
}
