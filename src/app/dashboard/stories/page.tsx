import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getAvailabilityStoryOptions } from "@/server/services/availability-story.service";
import { StoryGenerator } from "./story-generator";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AvailabilityStoriesPage() {
  const t = await getTranslations("dashboard.stories");
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");

  const business = await getBusinessForUser(user.id);
  if (!business) redirect("/dashboard/settings");

  const options = await getAvailabilityStoryOptions(user, business);
  if (!options) {
    return <div className="py-20 text-center text-muted-foreground">{t("noAccess")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7C3AED]">{t("eyebrow")}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
      <StoryGenerator businessSlug={business.slug} options={options} />
    </div>
  );
}
