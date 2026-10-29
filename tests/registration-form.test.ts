import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { commercialRegisterUrl } from "@/websites/commercial";
import { RegisterForm } from "@/app/register/register-form";

const query = vi.hoisted(() => ({ value: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => query.value }));
vi.mock("@/components/icons/hover-icons", () => ({ Loader2: () => null, UserPlus: () => null, Gift: () => null }));

function render(locale = "es") {
  const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
  const marketplace = JSON.parse(readFileSync(`messages/marketplace-onboarding/${locale}.json`, "utf8"));
  messages.register = { ...messages.register, ...marketplace.register };
  messages.legacy = JSON.parse(readFileSync(`messages/legacy/${locale}.json`, "utf8"));
  const config: React.ComponentProps<typeof NextIntlClientProvider> = {
    locale, messages, timeZone: "America/Santiago", onError: error => { throw error; },
    children: React.createElement(RegisterForm, { categoryOptions: [], localityOptions: [] }),
  };
  return renderToStaticMarkup(React.createElement(NextIntlClientProvider, config));
}
describe("registration selection from public pricing", () => {
  it.each([
    ["PURAGENDA", "monthly", 1, "12.990"], ["PURAGENDA", "annual", 1, "129.900"],
    ["PURAGENDA_PLUS", "monthly", 3, "37.490"], ["PURAGENDA_PLUS", "annual", 3, "374.900"],
  ] as const)("retains %s, %s and %i professionals from the real pricing URL", (plan, cycle, count, price) => {
    query.value = new URL(commercialRegisterUrl(plan, cycle, count, false, true), "http://localhost").searchParams;
    const html = render();
    expect(html).toContain(`Plan elegido: ${plan === "PURAGENDA_PLUS" ? "Puragenda+" : "Puragenda"}`);
    expect(html).toContain(`${count} ${count === 1 ? "profesional" : "profesionales"}`);
    expect(html).toContain(`$${price} CLP/${cycle === "annual" ? "año" : "mes"}`);
    expect(html).toContain("30 días de prueba gratis");
    expect(html).toContain("No necesitas tarjeta ni pagar");
    expect(html).not.toMatch(/Paddle|USD|Crear cuenta y pagar|Plan Equipo|Plan Individual/);
    expect(html).toContain('id="referralCode"');
    expect(html).toMatch(/id="countryCode"[^>]*readOnly=""[^>]*value="Chile"/);
    expect(html).toMatch(/id="currencyCode"[^>]*readOnly=""[^>]*value="CLP"/);
    expect(html).toContain('value="America/Coyhaique"');
    expect(html).not.toContain('value="Asia/Tokyo"');
  });
  it.each(["es", "en", "it", "pt", "fr", "de", "zh-CN"])("renders the restricted registration in %s without missing copy", locale => {
    query.value = new URLSearchParams("plan=PURAGENDA_PLUS&professionalTotal=2&cycle=annual");
    const html = render(locale);
    expect(html).toContain("Puragenda+"); expect(html).toContain("CLP");
    expect(html).not.toMatch(/MISSING_MESSAGE|register\.(?:selectedPlan|selectedPrice|freeTrial|chileOnly|timezones)/);
  });
});
