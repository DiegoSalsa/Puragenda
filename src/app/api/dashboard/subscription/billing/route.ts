import { NextRequest } from "next/server";
import { billingLimiter } from "@/server/lib/rate-limit";
import { handleMpV2Command, mpV2DashboardState } from "@/server/commercial-billing/mercadopago-v2-http";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return mpV2DashboardState(request); }
export async function POST(request: NextRequest) { return await billingLimiter.check(request) ?? handleMpV2Command(request); }
