import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MARKETPLACE_AUTHORIZATION_SOURCE_DASHBOARD_PROMPT,
  MARKETPLACE_QUALITY_GATE,
  MARKETPLACE_READY_REGISTRATION_CUTOFF,
  marketplaceConsentState,
  shouldShowExistingBusinessMarketplacePrompt,
} from "@/lib/marketplace";

const historicalBusiness = {
  createdAt: new Date(MARKETPLACE_READY_REGISTRATION_CUTOFF.getTime() - 1),
  deletedAt: null,
  slug: "barberia-historica",
  plan: "INDIVIDUAL",
  subscriptionStatus: "ACTIVE",
  promptDismissedAt: null,
  hasActivePrimaryLocation: true,
  listings: [],
};

describe("existing business marketplace prompt eligibility", () => {
  it("shows the prompt to an active historical business with no decision", () => {
    expect(shouldShowExistingBusinessMarketplacePrompt(historicalBusiness)).toBe(true);
  });

  it.each([
    { label: "demo", change: { slug: "purocode-demo" } },
    { label: "internal fixture", change: { slug: "estetica-bella" } },
    { label: "TEST", change: { plan: "TEST" } },
    { label: "deleted", change: { deletedAt: new Date() } },
    { label: "inactive subscription", change: { subscriptionStatus: "CANCELED" } },
    { label: "inactive primary location", change: { hasActivePrimaryLocation: false } },
    { label: "new registration flow", change: { createdAt: MARKETPLACE_READY_REGISTRATION_CUTOFF } },
  ])("does not show it to a $label business", ({ change }) => {
    expect(shouldShowExistingBusinessMarketplacePrompt({ ...historicalBusiness, ...change })).toBe(false);
  });

  it("distinguishes unanswered, dismissed, authorized and revoked states", () => {
    expect(marketplaceConsentState({ promptDismissedAt: null, listings: [] })).toBe("UNANSWERED");
    expect(marketplaceConsentState({ promptDismissedAt: new Date(), listings: [] })).toBe("DISMISSED");
    expect(marketplaceConsentState({
      promptDismissedAt: null,
      listings: [{ authorizationConfirmedAt: new Date(), authorizationRevokedAt: null }],
    })).toBe("AUTHORIZED");
    expect(marketplaceConsentState({
      promptDismissedAt: null,
      listings: [{ authorizationConfirmedAt: new Date(), authorizationRevokedAt: new Date() }],
    })).toBe("REVOKED");
  });

  it("never prompts authorized, revoked or server-side dismissed businesses", () => {
    const authorized = [{ authorizationConfirmedAt: new Date(), authorizationRevokedAt: null }];
    const revoked = [{ authorizationConfirmedAt: new Date(), authorizationRevokedAt: new Date() }];
    expect(shouldShowExistingBusinessMarketplacePrompt({ ...historicalBusiness, listings: authorized })).toBe(false);
    expect(shouldShowExistingBusinessMarketplacePrompt({ ...historicalBusiness, listings: revoked })).toBe(false);
    expect(shouldShowExistingBusinessMarketplacePrompt({
      ...historicalBusiness,
      promptDismissedAt: new Date(),
    })).toBe(false);
  });

  it("keeps the source explicit and leaves indexing disabled", () => {
    expect(MARKETPLACE_AUTHORIZATION_SOURCE_DASHBOARD_PROMPT).toBe("dashboard_prompt");
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
  });
});

describe("existing business prompt UI contract", () => {
  const component = readFileSync(
    join(process.cwd(), "src/app/dashboard/marketplace-consent-prompt.tsx"),
    "utf8",
  );
  const spanish = JSON.parse(readFileSync(
    join(process.cwd(), "messages/marketplace-onboarding/es.json"),
    "utf8",
  )) as { dashboard: { marketplacePrompt: Record<string, string> } };

  it("uses the requested contextual actions and exact Spanish copy", () => {
    expect(spanish.dashboard.marketplacePrompt.title).toBe("Haz que encuentren tu negocio en Puragenda");
    expect(spanish.dashboard.marketplacePrompt.description).toBe(
      "Puedes autorizar que mostremos tu negocio en el directorio público de Puragenda para que las personas puedan encontrarlo y reservar contigo.",
    );
    expect(spanish.dashboard.marketplacePrompt.appear).toBe("Quiero aparecer");
    expect(spanish.dashboard.marketplacePrompt.notNow).toBe("Ahora no");
  });

  it("is an inline responsive card with focus management and no local-only persistence", () => {
    expect(component).toContain("<section");
    expect(component).toContain("requestAnimationFrame(() => firstFieldRef.current?.focus())");
    expect(component).toContain("sm:flex-row");
    expect(component).toContain("w-full");
    expect(component).not.toContain("localStorage");
    expect(component).not.toContain("Dialog");
  });
});
