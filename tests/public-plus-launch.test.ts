import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { COMMERCIAL_PLAN_METADATA, COMMERCIAL_MAX_PROFESSIONALS } from "@/core/commercial-catalog";
import { evaluateCommercialEntitlements } from "@/core/commercial-entitlements";
import { TRIAL_DURATION_DAYS } from "@/core/constants";
import { PUBLIC_PLUS_GROWTH_FEATURES, PUBLIC_TRIAL_NOTE } from "@/lib/public-plans";
import { PricingCards } from "@/components/pricing-cards";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("joint public launch of Puragenda+", () => {
  it("includes the growth capabilities in the Plus benefits without granting them to Puragenda", () => {
    const html = renderToStaticMarkup(createElement(PricingCards, {}));
    const baseCard = html.split('data-plan="PURAGENDA"')[1].split("</article>")[0];
    const plusCard = html.split('data-plan="PURAGENDA_PLUS"')[1].split("</article>")[0];
    const plusBenefits = plusCard.split("<ul")[1].split("</ul>")[0];
    for (const { capability, label } of PUBLIC_PLUS_GROWTH_FEATURES) {
      expect(COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.capabilities).toContain(capability);
      expect(COMMERCIAL_PLAN_METADATA.PURAGENDA.capabilities).not.toContain(capability);
      expect(plusBenefits).toContain(label);
      expect(baseCard).not.toContain(label);
    }
    for (const feature of ["Sitio web personalizable", "reservas integradas", "Editor, hosting, SSL", "subdominio", "dominio propio"]) {
      expect(plusBenefits).toContain(feature);
    }
    expect(html.match(/role="combobox"/g)).toHaveLength(2);
    expect(html.match(/Comenzar prueba de Puragenda/g)).toHaveLength(2);
  });

  it.each([1, COMMERCIAL_MAX_PROFESSIONALS])("matches the catalog's intended Plus trial at %i professional seats", (professionalTotal) => {
    const now = new Date("2026-10-27T12:00:00Z");
    const trial = evaluateCommercialEntitlements({
      plan: "PURAGENDA_PLUS", status: "TRIALING", professionalTotal,
      trialEnd: new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000),
    }, now);
    expect(trial.commercialAccess).toBe(true);
    expect(trial.quantities["professional.seats"]).toBe(professionalTotal);
    for (const capability of ["puri.plus", "contact_flow", "website.editor", "website.hosting", "analytics.commercial"] as const) {
      expect(trial.capabilities).toContain(capability);
    }
    for (const name of ["30 días", "sitio web", "Puri avanzado", "Contact Flow", "límites de uso", "sin tarjeta"]) {
      expect(PUBLIC_TRIAL_NOTE).toContain(name);
    }
  });

  it("keeps public launch copy free of future-feature and base-only trial disclaimers", () => {
    const paths = [
      "src/lib/public-plans.ts", "src/components/pricing-cards.tsx", "src/components/pricing-page-sections.tsx",
      "src/components/puragenda-plus-section.tsx", "src/components/landing/faq-section.tsx",
      "src/app/puragenda-plus/page.tsx", "src/app/pricing/page.tsx", "src/app/puri/page.tsx",
      "src/app/faq/page.tsx", "src/app/register/register-form.tsx",
    ];
    for (const path of paths) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(/PLUS_PREVIEW_NOTE|Próximamente|En preparación|no están disponibles para uso general|prueba incluye las funciones de Puragenda/);
    }
  });
});
