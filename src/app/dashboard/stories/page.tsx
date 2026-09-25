import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  getAvailabilityStoryInsights,
  getAvailabilityStoryOptions,
} from "@/server/services/availability-story.service";
import { StoryGenerator } from "./story-generator";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AvailabilityStoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string; staffId?: string; serviceId?: string; date?: string; objective?: string; range?: string }>;
}) {
  const t = await getTranslations("dashboard.stories");
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");

  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/dashboard/settings");

  const [options, insights] = await Promise.all([
    getAvailabilityStoryOptions(user, business),
    getAvailabilityStoryInsights(user, business),
  ]);
  if (!options) {
    return <div className="py-20 text-center text-muted-foreground">{t("noAccess")}</div>;
  }

  const params = await searchParams;
  const objectives = new Set(["FILL_SLOTS", "LAST_MINUTE", "PROMOTE_SERVICE", "CANCELLATION"]);
  const locationOk = options.locations.some((location) => location.id === params.locationId);
  const staffOk = !params.staffId || options.staff.some((member) => member.id === params.staffId);
  const serviceOk = !params.serviceId || options.services.some((service) => service.id === params.serviceId);
  const dateOk = Boolean(params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date));
  const objectiveOk = Boolean(params.objective && objectives.has(params.objective));
  const initialFocus = locationOk && staffOk && serviceOk && dateOk && objectiveOk && params.range === "CUSTOM"
    ? {
        locationId: params.locationId!,
        staffId: params.staffId ?? (options.canChooseStaff ? null : options.ownStaffId),
        serviceId: params.serviceId ?? null,
        date: params.date!,
        objective: params.objective as "FILL_SLOTS" | "LAST_MINUTE" | "PROMOTE_SERVICE" | "CANCELLATION",
      }
    : null;

  return (
    <StoryGenerator
        businessSlug={business.slug}
        options={options}
        insights={insights}
        initialFocus={initialFocus}
        currencyCode={business.currencyCode}
        brand={{
          name: business.name,
          logoUrl: business.logoUrl,
          primaryColor: business.primaryColor,
          secondaryColor: business.secondaryColor,
          backgroundColor: business.backgroundColor,
        }}
      />
  );
}
