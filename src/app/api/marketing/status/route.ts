import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getSubscriptionByBusinessId } from "@/server/services/subscription.service";
import {
  getMarketingLimits,
  getCampaignsThisMonth,
  getLastCampaign,
} from "@/server/services/marketing.service";
import type { SubscriptionPlan, MarketingStatus } from "@/core/entities";

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

    const subscription = await getSubscriptionByBusinessId(business.id);
    const plan: SubscriptionPlan = subscription?.plan ?? "INDIVIDUAL";
    const limits = getMarketingLimits(plan);

    const [campaignsSent, lastCampaign] = await Promise.all([
      getCampaignsThisMonth(business.id),
      getLastCampaign(business.id),
    ]);

    const status: MarketingStatus = {
      campaignsSentThisMonth: campaignsSent,
      maxCampaignsPerMonth: limits.maxCampaignsPerMonth,
      maxAudienceSize: limits.maxEmails,
      plan,
      lastCampaign: lastCampaign
        ? {
            subject: lastCampaign.subject,
            audienceSize: lastCampaign.audienceSize,
            sentAt: lastCampaign.sentAt.toISOString(),
          }
        : null,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("[Marketing] Status error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
