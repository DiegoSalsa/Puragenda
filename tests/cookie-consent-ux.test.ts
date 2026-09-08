import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_CONSENT_VERSION_KEY,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "@/lib/analytics/consent";
import { ANALYTICS_POLICY_VERSION } from "@/lib/analytics/policy";
import { getGoogleConsentBootstrapScript } from "@/lib/analytics/google-analytics";

const banner = readFileSync(resolve(process.cwd(), "src/components/cookie-banner.tsx"), "utf8");
const consentSync = readFileSync(resolve(process.cwd(), "src/components/analytics/google-analytics.tsx"), "utf8");
const bootstrap = getGoogleConsentBootstrapScript();

function installBrowserStorage() {
  const data = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
  };
  const windowMock = {
    localStorage,
    dispatchEvent: () => true,
  };
  Object.defineProperty(globalThis, "window", { value: windowMock, configurable: true });
  return { localStorage, data };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("cookie banner visibility and actions", () => {
  it("shows the banner until a stored consent decision exists", () => {
    expect(banner).toContain("if (!readStoredConsent()) setVisible(true)");
    expect(banner).toContain("getAnalyticsConsent()");
    expect(banner).toContain("{visible && (");
  });

  it("keeps accept, reject, and configure as direct actions", () => {
    expect(banner).toContain('t("accept")');
    expect(banner).toContain('t("reject")');
    expect(banner).toContain('t("configure")');
    expect(banner).toContain('persistDecision("accepted")');
    expect(banner).toContain('persistDecision("rejected")');
    expect(banner).toContain('setView("settings")');
  });

  it("does not hide reject inside settings", () => {
    expect(banner).toContain('onClick={() => void persistDecision("rejected")}');
    expect(banner.indexOf('t("reject")')).toBeLessThan(banner.indexOf('t("configure")'));
    expect(banner.indexOf('t("configure")')).toBeLessThan(banner.indexOf('t("accept")'));
  });

  it("keeps actions on real buttons that can receive keyboard focus", () => {
    expect(banner).toContain('type="button"');
    expect(banner).toContain("focus-visible:ring-2");
    expect(banner).toContain('role="region"');
    expect(banner).not.toContain("aria-modal");
    expect(banner).not.toContain("focus-trap");
    expect(banner).toContain('event.key !== "Escape"');
  });
});

describe("cookie preference persistence", () => {
  it("stores accept and reject in localStorage, not only React state", () => {
    const { localStorage } = installBrowserStorage();
    expect(getAnalyticsConsent()).toBeNull();

    setAnalyticsConsent("accepted");
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("accepted");
    expect(localStorage.getItem(ANALYTICS_CONSENT_VERSION_KEY)).toBe(ANALYTICS_POLICY_VERSION);
    expect(getAnalyticsConsent()).toBe("accepted");

    setAnalyticsConsent("rejected");
    expect(getAnalyticsConsent()).toBe("rejected");
  });

  it("does not treat an outdated policy version as a valid choice", () => {
    const { localStorage } = installBrowserStorage();
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "accepted");
    localStorage.setItem(ANALYTICS_CONSENT_VERSION_KEY, "stale");
    expect(getAnalyticsConsent()).toBeNull();
  });

  it("saves configure as the same accepted/rejected decisions", () => {
    expect(banner).toContain('persistDecision(analyticsEnabled ? "accepted" : "rejected")');
    expect(banner).toContain("setAnalyticsConsent");
    expect(banner).toContain("recordAnalyticsConsent");
  });
});

describe("Consent Mode v2", () => {
  it("defaults all four Consent Mode v2 signals to denied until analytics is granted", () => {
    expect(bootstrap).toContain('analytics_storage: granted ? "granted" : "denied"');
    expect(bootstrap).toContain('ad_storage: "denied"');
    expect(bootstrap).toContain('ad_user_data: "denied"');
    expect(bootstrap).toContain('ad_personalization: "denied"');
  });

  it("still updates only analytics_storage after a choice", () => {
    expect(consentSync).toContain('gtag("consent", "update", { analytics_storage: granted ? "granted" : "denied" })');
    expect(consentSync).not.toContain("ad_storage");
    expect(consentSync).not.toContain("ad_user_data");
    expect(consentSync).not.toContain("ad_personalization");
  });
});

describe("mobile cookie banner layout", () => {
  it("uses a compact bottom sheet with safe-area inset and no overflow", () => {
    expect(banner).toContain("env(safe-area-inset-bottom)");
    expect(banner).toContain("max-w-[calc(100vw-1.5rem)]");
    expect(banner).toContain("grid-cols-3");
    expect(banner).toContain("min-h-11");
    expect(banner).toContain("overflow-hidden");
    expect(banner).toContain("sm:max-w-md");
    expect(banner).not.toContain("inset-0");
  });

  it("keeps settings available from the banner and the later control", () => {
    expect(banner).toContain("puragenda:open-cookie-settings");
    expect(banner).toContain('role="switch"');
    expect(banner).toContain('t("save")');
    expect(banner).toContain('t("back")');
  });
});
