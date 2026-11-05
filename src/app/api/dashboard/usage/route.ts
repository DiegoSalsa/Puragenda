import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getCommercialUsageSummary } from "@/server/services/commercial-usage-summary";
import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business || business.deletedAt) return Response.json({ code: "BUSINESS_NOT_FOUND" }, { status: 404 });
  return Response.json({ usage: await getCommercialUsageSummary(business.id) }, { headers: { "Cache-Control": "private, no-store" } });
}
