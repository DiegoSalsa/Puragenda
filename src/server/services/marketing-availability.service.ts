import type { MarketingAvailability } from "@/core/entities";
import { getCommercialPlanAccess } from "./commercial-plan-access";
import { contactLabEnabled } from "@/server/contact-flow/policy";
import { resendReleaseReadiness } from "@/server/contact-flow/resend-release";
import { createPuriContext } from "@/server/puri/context";
import { createGrowthScope } from "@/server/puri/growth/access";
import { PuriAccessError } from "@/server/puri/types";

/** Read-only navigation. It grants neither legacy sending nor Contact Flow delivery. */
export async function getMarketingAvailability(
  user: { id: string; role: string; tokenVersion?: number },
  businessId: string,
): Promise<MarketingAvailability> {
  const paused = (state: MarketingAvailability["state"]): MarketingAvailability => ({
    state, contactFlowHref: null, contactFlowDeliveryEnabled: false,
  });
  const access = await getCommercialPlanAccess(businessId);
  // A security pause does not erase historical rights or require a Plus purchase.
  if (!access.v2) return paused("LEGACY_PAUSED");
  if (!access.allowed) return paused("SUBSCRIPTION_INACTIVE");
  if (!access.has("contact_flow")) return paused("CONTACT_FLOW_NOT_INCLUDED");
  if (!contactLabEnabled()) return paused("CONTACT_FLOW_DISABLED");
  try {
    const context = await createPuriContext(user, { businessId, pathname: "/dashboard/marketing", locale: "es" });
    const scope = await createGrowthScope(context);
    if (!scope.canPrepare || !scope.canClients) return paused("CONTACT_FLOW_FORBIDDEN");
    return {
      state: "CONTACT_FLOW_REVIEW",
      contactFlowHref: "/dashboard/puri-plus",
      contactFlowDeliveryEnabled: resendReleaseReadiness().deliveryEnabled,
    };
  } catch (error) {
    if (!(error instanceof PuriAccessError)) throw error;
    return paused("CONTACT_FLOW_FORBIDDEN");
  }
}
