import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getSubscriptionByBusinessId } from "@/server/services/subscription.service";
import {
  getCampaignsThisMonth,
  getLastCampaign,
} from "@/server/services/marketing.service";
import type { SubscriptionPlan, MarketingStatus } from "@/core/entities";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { getMarketingAvailability } from "@/server/services/marketing-availability.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }
    if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.MARKETING_MANAGE))) {
      return NextResponse.json({ error: "Sin permisos para gestionar marketing" }, { status: 403 });
    }

    const subscription = await getSubscriptionByBusinessId(business.id);
    const plan: SubscriptionPlan = subscription?.plan ?? "INDIVIDUAL";
    const [campaignsSent, lastCampaign, availability] = await Promise.all([
      getCampaignsThisMonth(business.id),
      getLastCampaign(business.id),
      getMarketingAvailability(user, business.id),
    ]);

    const status: MarketingStatus = {
      campaignsSentThisMonth: campaignsSent,
      // Keep old readers compatible while reporting usable capacity truthfully.
      // Contractual limits remain untouched in the commercial catalog.
      maxCampaignsPerMonth: 0,
      maxAudienceSize: 0,
      legacySendingPaused: true,
      sendingEnabled: false,
      availability,
      plan,
      lastCampaign: lastCampaign
        ? {
            subject: lastCampaign.subject,
            audienceSize: lastCampaign.audienceSize,
            sentAt: lastCampaign.sentAt.toISOString(),
          }
        : null,
    };

    return NextResponse.json(status, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[Marketing] Status error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
