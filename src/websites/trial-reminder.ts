import type { WebsiteLaunchContext } from "./launch";
import { hasWebsitePaidAccess } from "./policy";

// Monday 5 October, midnight to midnight in America/Santiago (UTC-3).
export const WEBSITE_TRIAL_REMINDER = {
  id: "website-trial-reminder-2026-10-05",
  startsAt: "2026-10-05T00:00:00-03:00",
  endsAt: "2026-10-06T00:00:00-03:00",
} as const;

export type WebsiteTrialReminderContext = WebsiteLaunchContext & { businessName: string; dismissalKey: string };

export function isWebsiteTrialReminderActive(now = new Date()) {
  return now.getTime() >= Date.parse(WEBSITE_TRIAL_REMINDER.startsAt)
    && now.getTime() < Date.parse(WEBSITE_TRIAL_REMINDER.endsAt);
}

export function websiteTrialReminderKey(businessId: string) {
  return `${businessId}:${WEBSITE_TRIAL_REMINDER.id}`;
}

export function shouldShowWebsiteTrialReminder({
  context,
  enabled,
  demoAccount,
  dismissed = false,
  now = new Date(),
}: {
  context: WebsiteLaunchContext | null;
  enabled: boolean;
  demoAccount: boolean;
  dismissed?: boolean;
  now?: Date;
}) {
  const offer = context?.offer;
  return enabled && !demoAccount && !dismissed && !!context?.canManage
    && isWebsiteTrialReminderActive(now)
    && offer?.offerCode === "BETA_FOUNDER"
    && !offer.trialStartedAt && !offer.trialConsumedAt
    && !hasWebsitePaidAccess(context.addon, now);
}
