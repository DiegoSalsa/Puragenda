import { describe, expect, it } from "vitest";
import type { WebsiteLaunchContext } from "@/websites/launch";
import { isWebsiteTrialReminderActive, shouldShowWebsiteTrialReminder, websiteTrialReminderKey } from "@/websites/trial-reminder";

const monday = new Date("2026-10-05T12:00:00-03:00");
const context: WebsiteLaunchContext = { offer: { offerCode: "BETA_FOUNDER" }, addon: null, canManage: true };
const show = (overrides: Partial<Parameters<typeof shouldShowWebsiteTrialReminder>[0]> = {}) =>
  shouldShowWebsiteTrialReminder({ context, enabled: true, demoAccount: false, now: monday, ...overrides });

describe("Monday website trial reminder", () => {
  it("uses the full Monday in Santiago rather than UTC midnight", () => {
    expect(isWebsiteTrialReminderActive(new Date("2026-10-05T02:59:59.999Z"))).toBe(false);
    expect(isWebsiteTrialReminderActive(new Date("2026-10-05T03:00:00Z"))).toBe(true);
    expect(isWebsiteTrialReminderActive(new Date("2026-10-06T02:59:59.999Z"))).toBe(true);
    expect(isWebsiteTrialReminderActive(new Date("2026-10-06T03:00:00Z"))).toBe(false);
  });

  it("reaches eligible owners independently of the changelog seen version", () => {
    expect(show()).toBe(true);
    expect(show({ now: new Date("2026-10-04T12:00:00-03:00") })).toBe(false);
    expect(show({ now: new Date("2026-10-06T12:00:00-03:00") })).toBe(false);
  });

  it("excludes the demo, disabled acquisition and dismissed reminders", () => {
    expect(show({ demoAccount: true })).toBe(false);
    expect(show({ enabled: false })).toBe(false);
    expect(show({ dismissed: true })).toBe(false);
    expect(show({ context: null })).toBe(false);
    expect(show({ context: { ...context, canManage: false } })).toBe(false);
  });

  it("excludes standard offers and trials that have ever been started", () => {
    expect(show({ context: { ...context, offer: null } })).toBe(false);
    expect(show({ context: { ...context, offer: { offerCode: "STANDARD" } } })).toBe(false);
    for (const field of ["trialStartedAt", "trialConsumedAt"] as const) {
      expect(show({ context: { ...context, offer: { ...context.offer!, [field]: "2026-10-03T01:34:27Z" } } })).toBe(false);
    }
  });

  it("excludes paid websites, including cancellations with access remaining", () => {
    const addon = { status: "ACTIVE", validUntil: "2026-11-01T00:00:00Z" };
    expect(show({ context: { ...context, addon } })).toBe(false);
    expect(show({ context: { ...context, addon: { ...addon, cancelAt: "2026-10-20T00:00:00Z" } } })).toBe(false);
  });

  it("keeps dismissal scoped to a business and this campaign", () => {
    expect(websiteTrialReminderKey("business-a")).toBe("business-a:website-trial-reminder-2026-10-05");
    expect(websiteTrialReminderKey("business-a")).not.toBe(websiteTrialReminderKey("business-b"));
  });
});
