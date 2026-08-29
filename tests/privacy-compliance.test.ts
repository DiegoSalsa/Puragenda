import { describe, expect, it } from "vitest";
import { getAnalyticsConsent } from "@/lib/analytics/consent";
import {
  ANALYTICS_POLICY_VERSION,
  ANALYTICS_RETENTION_DAYS,
  PRIVACY_REQUEST_RETENTION_DAYS,
} from "@/lib/analytics/policy";
import { getTermsNotice, getTrackingNotice } from "@/lib/privacy/tracking-notice";

describe("privacy compliance baseline", () => {
  it("keeps the consent policy version and retention windows explicit", () => {
    expect(ANALYTICS_POLICY_VERSION).toBe("2026-08-29");
    expect(ANALYTICS_RETENTION_DAYS).toBe(395);
    expect(PRIVACY_REQUEST_RETENTION_DAYS).toBe(1460);
  });

  it("publishes the consent and rights language in the default locale", () => {
    const tracking = getTrackingNotice("es");
    const terms = getTermsNotice("es");

    expect(tracking.summary.toLowerCase()).toContain("consentimiento previo");
    expect(tracking.rights.toLowerCase()).toContain("30 días");
    expect(terms.description.toLowerCase()).toContain("opcionales");
  });

  it("does not treat browser storage as consent during server rendering", () => {
    expect(getAnalyticsConsent()).toBeNull();
  });
});
