import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import {
  getGoogleAnalyticsId,
  isGoogleAnalyticsPath,
} from "@/lib/analytics/google-analytics";

describe("getGoogleAnalyticsId", () => {
  it("accepts a GA4 measurement id", () => {
    expect(getGoogleAnalyticsId("G-TESTID01")).toBe("G-TESTID01");
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
