import { describe, expect, it } from "vitest";
import { getWidgetUrl } from "@/server/booking/widget-url";

describe("Widget links preserve the deployment environment", () => {
  it("uses the configured staging alias in an optimized Preview build", () => {
    expect(getWidgetUrl("synthetic-business", { NODE_ENV: "production", VERCEL_ENV: "preview", APP_URL: "https://staging.example.invalid", VERCEL_URL: "immutable.example.invalid" }))
      .toBe("https://staging.example.invalid/widget/synthetic-business");
  });
  it("supports the public app origin and deployment URL fallbacks", () => {
    expect(getWidgetUrl("synthetic", { VERCEL_ENV: "preview", NEXT_PUBLIC_APP_URL: "https://preview.example.invalid/" })).toBe("https://preview.example.invalid/widget/synthetic");
    expect(getWidgetUrl("synthetic", { VERCEL_ENV: "preview", VERCEL_URL: "deployment.example.invalid" })).toBe("https://deployment.example.invalid/widget/synthetic");
  });
  it("never falls back to production when Preview lacks an origin", () => {
    expect(() => getWidgetUrl("synthetic", { NODE_ENV: "production", VERCEL_ENV: "preview" })).toThrow("PREVIEW_WIDGET_ORIGIN_REQUIRED");
  });
  it("rejects production origins in Preview and credential-bearing URLs", () => {
    expect(() => getWidgetUrl("synthetic", { VERCEL_ENV: "preview", APP_URL: "https://www.puragenda.cl" })).toThrow("INVALID_WIDGET_ORIGIN");
    expect(() => getWidgetUrl("synthetic", { APP_URL: "https://fixture:synthetic@example.invalid" })).toThrow("INVALID_WIDGET_ORIGIN");
  });
  it("preserves production and local defaults", () => {
    expect(getWidgetUrl("synthetic", { NODE_ENV: "production" })).toBe("https://www.puragenda.cl/widget/synthetic");
    expect(getWidgetUrl("synthetic", { NODE_ENV: "production", VERCEL_ENV: "production", VERCEL_URL: "immutable.example.invalid" })).toBe("https://www.puragenda.cl/widget/synthetic");
    expect(getWidgetUrl("synthetic", { NODE_ENV: "development" })).toBe("http://localhost:3000/widget/synthetic");
  });
});
