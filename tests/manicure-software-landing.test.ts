import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Render the actual server page; isolate shared navigation and browser tracking.
vi.mock("@/components/landing/landing-layout", () => ({ LandingLayout: ({ children }: { children: React.ReactNode }) => React.createElement("main", null, children) }));
vi.mock("@/components/analytics/tracked-link", () => {
  const anchor = ({ children, cta, placement, ...props }: React.ComponentProps<"a"> & { cta: string; placement: string }) => React.createElement("a", { ...props, "data-cta": cta, "data-placement": placement }, children);
  return { TrackedLink: anchor, TrackedCtaAnchor: anchor };
});
vi.mock("@/components/i18n/localized-text", () => ({ LocalizedText: () => null }));
vi.mock("@/components/icons/hover-icons", () => ({ ArrowRight: () => null, CheckCircle2: () => null }));
vi.mock("@/components/ui/accordion", () => {
  const content = ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children);
  return { Accordion: content, AccordionItem: content, AccordionTrigger: content, AccordionContent: content };
});

import Page, { metadata } from "@/app/software-agenda-manicure/page";
import IndustryPage from "@/app/para/[industry]/page";
import sitemap from "@/app/sitemap";
import { buildSlots } from "@/core/availability";
import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { industriesData } from "@/lib/data/industries";
import { MANICURE_SOFTWARE_PATH, manicureCatalogExample, manicureSoftwareCopy, manicureSoftwareFaqs } from "@/lib/data/manicure-software-landing";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";
import { googleAnalyticsEventsFor } from "@/lib/analytics/google-events";
import { MARKETPLACE_QUALITY_GATE } from "@/lib/marketplace/quality-gate";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const spoke = industriesData.find((item) => item.slug === "manicure")!;
let html: string;
let visible: string;
let spokeHtml: string;
beforeAll(async () => {
  // Vitest's existing JSX transform is classic; Next uses the automatic runtime.
  vi.stubGlobal("React", React);
  html = renderToStaticMarkup(React.createElement(Page));
  visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  spokeHtml = renderToStaticMarkup(await IndustryPage({ params: Promise.resolve({ industry: "manicure" }) }));
});
afterAll(() => vi.unstubAllGlobals());

describe("SEO-016 manicure commercial hub", () => {
  it("renders the approved unique H1 with self canonical and index/follow metadata", () => {
    expect(metadata.title).toBe("Software de agenda para manicure y uñas");
    expect(metadata.alternates).toEqual({ canonical: `https://www.puragenda.cl${MANICURE_SOFTWARE_PATH}` });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(manicureSoftwareCopy.h1);
    expect(spoke.title).toBe("Puragenda para manicuristas y nail studios");
    expect(spoke.heroHeadline).toBe("Así organiza sus citas un nail studio con Puragenda");
    expect(spoke.heroHeadline).not.toBe(manicureSoftwareCopy.h1);
    expect(spoke.description).not.toMatch(/software|sistema|programa/i);
    expect(spoke.keywords.join(" ")).not.toMatch(/software|sistema|programa/i);
  });

  it("has substantial nail-specific content and a clearly fictional configuration", () => {
    for (const text of ["Ejemplo de configuración", "Catálogo ficticio", "Esmaltado permanente con retiro", "mantenimiento", "diseño", "Profesional B", "60 min", "90 min", "10:00 a 11:00", "no evalúa el estado de las uñas"]) expect(visible).toContain(text);
    expect(manicureCatalogExample.map((row) => row.duration)).toEqual([60, 90]);
    // Check the editorial availability example against the real scheduling primitive.
    const date = new Date(2026, 8, 7, 12);
    const hours = [{ dayOfWeek: date.getDay(), startTime: "10:00", endTime: "11:00", isOpen: true }];
    expect(buildSlots(date, manicureCatalogExample[0].duration, hours)).toHaveLength(1);
    expect(buildSlots(date, manicureCatalogExample[1].duration, hours)).toHaveLength(0);
    expect(visible).toContain("opciones mantienen la duración");
  });

  it("uses shared current public pricing in visible content and schema", () => {
    for (const plan of [PRICING.INDIVIDUAL, PRICING.EQUIPO]) expect(visible).toContain(formatLandingClp(plan.monthly));
    const faq = manicureSoftwareFaqs().find((item) => item.question.includes("Cuánto cuesta"))!;
    expect(faq.answer).toContain(`${STAFF_LIMITS.EQUIPO} profesionales`);
    expect(faq.answer).toContain(formatLandingClp(EXTRA_STAFF_COST.EQUIPO));
    expect(faq.answer).toContain(`${TRIAL_DURATION_DAYS} días`);
    expect(visible).not.toContain("Plan Test");
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    const app = graph["@graph"].find((node: Record<string, unknown>) => node["@type"] === "SoftwareApplication");
    expect(app.offers.map((offer: { price: string }) => offer.price)).toEqual([String(PRICING.INDIVIDUAL.monthly), String(PRICING.EQUIPO.monthly)]);
  });

  it("renders factual FAQs matching the existing JSON-LD architecture without reviews", () => {
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(graph["@graph"].map((node: Record<string, unknown>) => node["@type"])).toEqual(["Organization", "SoftwareApplication", "FAQPage", "BreadcrumbList"]);
    const faq = graph["@graph"][2];
    expect(faq.mainEntity).toHaveLength(manicureSoftwareFaqs().length);
    for (const item of manicureSoftwareFaqs()) {
      expect(visible).toContain(item.question);
      expect(visible).toContain(item.answer);
      expect(faq.mainEntity).toContainEqual({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } });
    }
    expect(graph["@graph"][3].itemListElement.at(-1).item).toBe(`https://www.puragenda.cl${MANICURE_SOFTWARE_PATH}`);
    expect(JSON.stringify(graph)).not.toMatch(/aggregateRating|ratingValue|"Review"|"LocalBusiness"/);
  });

  it("links all required destinations and separates the hub from its contextual spoke", () => {
    for (const path of ["/para/manicure", "/sistema-de-agendamiento-online", "/funciones/reservas-online-con-abono", "/funciones/agenda-multiples-profesionales", "/guias/cobrar-abonos-reservas-online", "/pricing", "/demo", "/register"]) expect(html).toContain(`href="${path}"`);
    expect(spoke.softwareHub?.href).toBe(MANICURE_SOFTWARE_PATH);
    expect(source("src/app/para/[industry]/page.tsx")).toContain("href={data.softwareHub.href}");
    for (const page of ["soluciones", "sistema-de-agendamiento-online"]) expect(source(`src/app/${page}/page.tsx`)).toContain(`href="${MANICURE_SOFTWARE_PATH}"`);
    const hubQuestions = manicureSoftwareFaqs().map((item) => item.question);
    for (const item of spoke.faq) expect(hubQuestions).not.toContain(item.question);
    expect(industriesData.find((item) => item.slug === "peluquerias")?.softwareHub?.href).toBe("/software-agenda-peluquerias");
    expect(visible).not.toMatch(/coloración|corte de cabello|ficha clínica|tratamientos faciales/i);
  });

  it("keeps the existing signup tracking mapped to the new page path", () => {
    expect(html.match(/data-cta="register"/g)).toHaveLength(2);
    expect(googleAnalyticsEventsFor("landing_cta_clicked", { cta: "register", placement: "hero" }, { pagePath: MANICURE_SOFTWARE_PATH })).toEqual([{ name: "sign_up_cta_clicked", params: { source_page: MANICURE_SOFTWARE_PATH, cta_location: "hero" } }]);
  });

  it("keeps inherited spoke recommendations factual and connected to the commercial hub", () => {
    expect(spokeHtml).toContain(`href="${MANICURE_SOFTWARE_PATH}"`);
    expect(spokeHtml).toContain('href="/guias/cobrar-abonos-reservas-online"');
    expect(spokeHtml).toContain(spoke.heroHeadline);
    expect(spokeHtml).not.toMatch(/cabinas|reducir.inasistencias|no.show|Cinnamon|testimonio/i);
    expect(spokeHtml).toContain("faciales, cejas y pestañas");
  });

  it("omits prohibited claims and unauthorized social proof in both page-specific surfaces", () => {
    const copy = visible + JSON.stringify(spoke);
    expect(copy).not.toMatch(/whats\s*app|\bSMS\b|app móvil nativa|comisi[oó]n|inventario|control de stock|\bPOS\b|paquetes de sesiones|no.shows|aument[ao]\w* (?:tus )?ingresos|reduc\w* (?:las )?inasistencias|líder|\bmejor\b|#1|Cinnamon|Soccerbarber|Modern Women|Sanando el Corazón|Lotty\s*Skin|testimonio/i);
    expect(copy).not.toMatch(/\d+\s*%|\d+\s+clientes/);
    expect(visible).toContain("abono aprobado");
    expect(visible).toContain("requieren contactar al negocio");
    expect(visible).toContain("Recordatorios por email");
  });

  it("adds one indexable commercial route without synonym or marketplace routes", () => {
    const urls = sitemap().map((item) => item.url);
    expect(urls.filter((url) => url === `https://www.puragenda.cl${MANICURE_SOFTWARE_PATH}`)).toHaveLength(1);
    expect(urls).toContain("https://www.puragenda.cl/para/manicure");
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
    for (const route of ["manicure", "manicure/[city]", "software-agenda-unas", "software-agenda-nail-studio", "software-para-manicuristas", "software-agenda-estetica", "software-agenda-psicologos"]) {
      expect(existsSync(join(process.cwd(), "src/app", route, "page.tsx"))).toBe(false);
      expect(urls).not.toContain(`https://www.puragenda.cl/${route}`);
    }
  });
});
