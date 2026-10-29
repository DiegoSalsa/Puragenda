import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { BusinessCountryEditor } from "@/app/dashboard/settings/business-country-editor";
import { isRegistrationV2Contract } from "@/server/services/commercial-plan-access";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/actions/dashboard.actions", () => ({ updateBusinessCountryAction: vi.fn() }));
vi.mock("@/components/icons/hover-icons", () => ({ Loader2: () => null, Save: () => null }));

function render(registrationV2: boolean) {
  const messages = JSON.parse(readFileSync("messages/es.json", "utf8"));
  messages.legacy = JSON.parse(readFileSync("messages/legacy/es.json", "utf8"));
  const config: React.ComponentProps<typeof NextIntlClientProvider> = {
    locale: "es", messages, timeZone: "America/Santiago", onError: error => { throw error; },
    children: React.createElement(BusinessCountryEditor, {
      registrationV2, initialCountryCode: registrationV2 ? "CL" : "AR", initialCurrencyCode: registrationV2 ? "CLP" : "ARS",
      initialTimezone: registrationV2 ? "America/Santiago" : "America/Argentina/Buenos_Aires",
      countryOptions: [{ code: "CL", name: "Chile" }, { code: "AR", name: "Argentina" }],
      currencyOptions: [{ value: "CLP", label: "CLP" }, { value: "ARS", label: "ARS" }, { value: "USD", label: "USD" }],
      initialTimezoneOptions: [{ value: "America/Santiago", label: "Santiago", preferred: true }, { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires", preferred: true }, { value: "Asia/Tokyo", label: "Tokyo", preferred: false }],
    }),
  };
  return renderToStaticMarkup(React.createElement(NextIntlClientProvider, config));
}
describe("regional settings contract boundary", () => {
  const contract = { planCode: "PURAGENDA_PLUS", legacySubscriptionId: null, termsSnapshot: { origin: "registration_v2" } };
  it("recognizes persisted new-registration provenance for both plans", () => {
    expect(isRegistrationV2Contract(contract)).toBe(true);
    expect(isRegistrationV2Contract({ ...contract, planCode: "PURAGENDA" })).toBe(true);
  });
  it("does not infer new registration from a plan label, legacy snapshot or unrelated origin", () => {
    expect(isRegistrationV2Contract(null)).toBe(false);
    expect(isRegistrationV2Contract({ ...contract, legacySubscriptionId: "legacy-contract" })).toBe(false);
    expect(isRegistrationV2Contract({ ...contract, termsSnapshot: { origin: "legacy_import" } })).toBe(false);
    expect(isRegistrationV2Contract({ ...contract, termsSnapshot: null })).toBe(false);
    expect(isRegistrationV2Contract({ ...contract, planCode: "EQUIPO" })).toBe(false);
  });
  it("renders V2 country and currency read-only with only Chilean timezones", () => {
    const html = render(true);
    expect(html).toMatch(/<input id="business-country"[^>]*readOnly=""[^>]*value="Chile"/);
    expect(html).toMatch(/<input id="business-currency"[^>]*readOnly=""[^>]*value="CLP"/);
    for (const zone of ["America/Santiago", "America/Coyhaique", "America/Punta_Arenas", "Pacific/Easter"]) expect(html).toContain(`value="${zone}"`);
    expect(html).not.toMatch(/Asia\/Tokyo|Buenos_Aires|value="USD"|value="AR"/);
    expect(html).toContain("Actualmente disponible para negocios en Chile");
  });
  it("keeps legacy international country, currency and timezone selectors", () => {
    const html = render(false);
    expect(html).toContain('<select id="business-country"');
    expect(html).toContain('<select id="business-currency"');
    expect(html).toContain('value="AR" selected=""');
    expect(html).toContain('value="ARS" selected=""');
    expect(html).toContain('value="Asia/Tokyo"');
    expect(html).not.toContain("Actualmente disponible para negocios en Chile");
  });
});
