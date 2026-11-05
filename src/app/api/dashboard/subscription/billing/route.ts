import { NextRequest } from "next/server";
import { billingLimiter } from "@/server/lib/rate-limit";
import { handleMpV2Command, mpV2DashboardState } from "@/server/commercial-billing/mercadopago-v2-http";
import {handleLegacyPlusCommand, legacyPlusDashboardState} from "@/server/commercial-billing/legacy-plus-http";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return await legacyPlusDashboardState(request) ?? mpV2DashboardState(request); }
export async function POST(request: NextRequest) { return await billingLimiter.check(request) ?? await handleLegacyPlusCommand(request) ?? handleMpV2Command(request); }
