import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import {
  getGoogleAnalyticsId,
  getGoogleConsentBootstrapScript,
  isGoogleAnalyticsPath,
} from "@/lib/analytics/google-analytics";
import { ANALYTICS_CONSENT_KEY } from "@/lib/analytics/consent";

describe("getGoogleAnalyticsId", () => {
  it("accepts a GA4 measurement id", () => {
    expect(getGoogleAnalyticsId("G-TESTID01")).toBe("G-TESTID01");
  });

  it("prefixes a bare measurement id with G-", () => {
    expect(getGoogleAnalyticsId("TESTID01")).toBe("G-TESTID01");
  });

  it("rejects empty, GTM, and malformed values", () => {
    expect(getGoogleAnalyticsId("")).toBeNull();
    expect(getGoogleAnalyticsId("   ")).toBeNull();
    expect(getGoogleAnalyticsId("GTM-XXXX")).toBeNull();
    expect(getGoogleAnalyticsId("UA-123-1")).toBeNull();
  });
});

describe("isGoogleAnalyticsPath", () => {
  it("covers public marketing and product routes", () => {
    expect(isGoogleAnalyticsPath("/")).toBe(true);
    expect(isGoogleAnalyticsPath("/pricing")).toBe(true);
    expect(isGoogleAnalyticsPath("/widget/demo")).toBe(true);
    expect(isGoogleAnalyticsPath("/dashboard")).toBe(true);
  });

  it("skips the secret admin panel", () => {
    expect(isGoogleAnalyticsPath(ADMIN_SECRET_PATH)).toBe(false);
    expect(isGoogleAnalyticsPath(`${ADMIN_SECRET_PATH}/tracking`)).toBe(false);
  });
});

describe("Google Analytics CSP", () => {
  it("allows gtag hosts in the public Content-Security-Policy", () => {
    const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain("https://www.googletagmanager.com");
    expect(config).toContain("https://*.google-analytics.com");
    expect(config).toContain("https://*.analytics.google.com");
  });
});

describe("Google Analytics layout tag", () => {
  it("mounts @next/third-parties GoogleAnalytics in the root layout", () => {
    const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain('@next/third-parties/google');
    expect(layout).toContain("<GoogleAnalytics gaId={googleAnalyticsId} />");
  });

  it("defaults Consent Mode to denied until cookie consent is granted", () => {
    const script = getGoogleConsentBootstrapScript();
    expect(script).toContain(ANALYTICS_CONSENT_KEY);
    expect(script).toContain('analytics_storage: granted ? "granted" : "denied"');
  });
});
