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
  it("emits gtag.js from the root layout HTML", () => {
    const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain("https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}");
    expect(layout).toContain("dangerouslySetInnerHTML");
    expect(layout).toContain("process.env.NEXT_PUBLIC_GA_ID");
  });

  it("defaults Consent Mode to denied until cookie consent is granted", () => {
    const script = getGoogleConsentBootstrapScript();
    expect(script).toContain(ANALYTICS_CONSENT_KEY);
    expect(script).toContain('analytics_storage: granted ? "granted" : "denied"');
  });
});

describe("GA4 conversion wiring", () => {
  it("does not import @next/third-parties as a second analytics implementation", () => {
    const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
    const client = readFileSync(resolve(process.cwd(), "src/lib/analytics/client.ts"), "utf8");
    expect(layout).not.toContain("@next/third-parties");
    expect(client).toContain("sendGoogleAnalyticsEvents");
    expect(client).toContain("getGoogleAnalyticsId()");
  });

  it("records sign_up only after a successful register payload", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/register/register-form.tsx"), "utf8");
    expect(source).toContain('track("registration_started"');
    expect(source).toContain('track("registration_completed"');
    expect(source.indexOf('track("registration_started"')).toBeLessThan(source.indexOf('track("registration_completed"'));
    expect(source).toContain("if (!data.user) return;");
    expect(source.indexOf("if (!response.ok)")).toBeLessThan(source.indexOf('track("registration_completed"'));
  });

  it("records login only after a successful authentication response", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/login/login-form.tsx"), "utf8");
    expect(source).toContain('track("login_completed")');
    expect(source.indexOf("if (!response.ok)")).toBeLessThan(source.indexOf('track("login_completed")'));
  });

  it("records booking_created only after the booking request succeeds", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/widget/[slug]/widget-client.tsx"), "utf8");
    expect(source.indexOf("if (!res.ok)")).toBeLessThan(source.indexOf('track("booking_created"'));
    expect(source.indexOf('track("booking_created"')).toBeLessThan(source.indexOf('track("booking_failed"'));
  });
});
