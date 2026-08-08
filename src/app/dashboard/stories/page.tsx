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

export default async function AvailabilityStoriesPage() {
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

  return (
    <StoryGenerator
        businessSlug={business.slug}
        options={options}
        insights={insights}
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
