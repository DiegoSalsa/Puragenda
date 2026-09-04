import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

import Page, { metadata } from "@/app/software-agenda-estetica/page";
import IndustryPage from "@/app/para/[industry]/page";
import sitemap from "@/app/sitemap";
import { buildSlots } from "@/core/availability";
import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import {
  AESTHETICS_SOFTWARE_PATH,
  aestheticsCatalogExample,
  aestheticsSoftwareCopy,
  aestheticsSoftwareFaqs,
} from "@/lib/data/aesthetics-software-landing";
import { industriesData } from "@/lib/data/industries";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";
import { googleAnalyticsEventsFor } from "@/lib/analytics/google-events";
import { MARKETPLACE_QUALITY_GATE } from "@/lib/marketplace/quality-gate";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const spoke = industriesData.find((item) => item.slug === "estetica")!;
let html: string;
let visible: string;
let spokeHtml: string;

beforeAll(async () => {
  vi.stubGlobal("React", React);
  html = renderToStaticMarkup(React.createElement(Page));
  visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  spokeHtml = renderToStaticMarkup(await IndustryPage({ params: Promise.resolve({ industry: "estetica" }) }));
});

afterAll(() => vi.unstubAllGlobals());

describe("SEO-017 aesthetics commercial hub", () => {
  it("renders the approved intent with one H1, self canonical, and index/follow metadata", () => {
    expect(metadata.title).toBe("Software de agenda para centros de estética");
    expect(metadata.alternates).toEqual({ canonical: `https://www.puragenda.cl${AESTHETICS_SOFTWARE_PATH}` });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(aestheticsSoftwareCopy.h1);
    expect(spoke.title).toBe("Puragenda para centros de estética");
    expect(spoke.heroHeadline).toBe("Cómo organizar las citas de tu centro con Puragenda");
    expect(spoke.heroHeadline).not.toBe(aestheticsSoftwareCopy.h1);
    expect(spoke.description).not.toMatch(/software|sistema|programa/i);
    expect(spoke.keywords.join(" ")).not.toMatch(/software|sistema|programa/i);
  });

  it("uses a clearly fictional catalog to explain service, duration, professional, and schedule", () => {
    for (const text of ["Ejemplo de configuración", "Catálogo completamente ficticio", "Limpieza facial", "Diseño de cejas", "Extensiones de pestañas", "Profesional A", "Profesional B", "30 min", "60 min", "90 min", "Precio ficticio"]) {
      expect(visible).toContain(text);
    }
    expect(aestheticsCatalogExample.map((row) => row.duration)).toEqual([60, 30, 90]);
    const date = new Date(2026, 8, 7, 12);
    const sixtyMinutes = [{ dayOfWeek: date.getDay(), startTime: "10:00", endTime: "11:00", isOpen: true }];
    expect(buildSlots(date, 30, sixtyMinutes)).toHaveLength(2);
    expect(buildSlots(date, 60, sixtyMinutes)).toHaveLength(1);
    expect(buildSlots(date, 90, sixtyMinutes)).toHaveLength(0);
  });

  it("keeps its editorial angle separate from manicure, hair salons, and spas", () => {
    for (const text of ["catálogo variado", "profesionales con catálogos diferentes", "faciales", "cejas", "pestañas", "servicios estéticos no clínicos"]) expect(visible.toLowerCase()).toContain(text.toLowerCase());
    expect(visible).not.toMatch(/esmaltado|retiro de uñas|nail studio|corte de cabello|coloración|estilista|software para spa|centros de estética y spa/i);
    expect(source("messages/es.json")).toContain('\"beautySpa\": \"Para centros de estética\"');
    expect(source("messages/es.json")).not.toContain("Para estética y spa");
  });

  it("uses central pricing in visible content and SoftwareApplication offers", () => {
    for (const plan of [PRICING.INDIVIDUAL, PRICING.EQUIPO]) expect(visible).toContain(formatLandingClp(plan.monthly));
    const pricingFaq = aestheticsSoftwareFaqs().find((item) => item.question.includes("Cuánto cuesta"))!;
    expect(pricingFaq.answer).toContain(`${STAFF_LIMITS.EQUIPO} profesionales`);
    expect(pricingFaq.answer).toContain(formatLandingClp(EXTRA_STAFF_COST.EQUIPO));
    expect(pricingFaq.answer).toContain(`${TRIAL_DURATION_DAYS} días`);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    const app = graph["@graph"].find((node: Record<string, unknown>) => node["@type"] === "SoftwareApplication");
    expect(app.offers.map((offer: { price: string }) => offer.price)).toEqual([String(PRICING.INDIVIDUAL.monthly), String(PRICING.EQUIPO.monthly)]);
  });

  it("renders visible factual FAQs and the existing four-node schema without reviews", () => {
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(graph["@graph"].map((node: Record<string, unknown>) => node["@type"])).toEqual(["Organization", "SoftwareApplication", "FAQPage", "BreadcrumbList"]);
    expect(graph["@graph"][2].mainEntity).toHaveLength(aestheticsSoftwareFaqs().length);
    for (const item of aestheticsSoftwareFaqs()) {
      expect(visible).toContain(item.question);
      expect(visible).toContain(item.answer);
    }
    expect(graph["@graph"][3].itemListElement.at(-1).item).toBe(`https://www.puragenda.cl${AESTHETICS_SOFTWARE_PATH}`);
    expect(JSON.stringify(graph)).not.toMatch(/aggregateRating|ratingValue|"Review"|"LocalBusiness"|"MedicalBusiness"/);
  });

  it("links required destinations and connects the hub with a distinct contextual spoke", () => {
    for (const path of ["/para/estetica", "/sistema-de-agendamiento-online", "/funciones/agenda-multiples-profesionales", "/funciones/reservas-online-con-abono", "/caracteristicas", "/pricing", "/demo", "/register"]) {
      expect(html).toContain(`href="${path}"`);
    }
    expect(spoke.softwareHub?.href).toBe(AESTHETICS_SOFTWARE_PATH);
    expect(spokeHtml).toContain(`href="${AESTHETICS_SOFTWARE_PATH}"`);
    for (const page of ["soluciones", "sistema-de-agendamiento-online"]) expect(source(`src/app/${page}/page.tsx`)).toContain(`href="${AESTHETICS_SOFTWARE_PATH}"`);
    const hubQuestions = aestheticsSoftwareFaqs().map((item) => item.question);
    for (const item of spoke.faq) expect(hubQuestions).not.toContain(item.question);
  });

  it("tracks both signup CTAs through the existing analytics mapping", () => {
    expect(html.match(/data-cta="register"/g)).toHaveLength(2);
    expect(googleAnalyticsEventsFor("landing_cta_clicked", { cta: "register", placement: "hero" }, { pagePath: AESTHETICS_SOFTWARE_PATH })).toEqual([
      { name: "sign_up_cta_clicked", params: { source_page: AESTHETICS_SOFTWARE_PATH, cta_location: "hero" } },
    ]);
  });

  it("removes the old spoke claims about resources, session plans, spas, and clinical use", () => {
    const spokeCopy = [spoke.title, spoke.description, spoke.heroHeadline, spoke.heroSubheadline, ...spoke.benefits.flatMap((item) => [item.title, item.description]), ...spoke.faq.flatMap((item) => [item.question, item.answer]), ...spoke.keywords].join(" ");
    expect(spokeCopy).not.toMatch(/spa|paciente|tratamiento|box(?:es)?|cabina|planes de sesiones|sesiones recurrentes|confidencial|respaldad[ao] en la nube/i);
    expect(spokeCopy).not.toMatch(/software médico|software clínico|sistema clínico|gestión clínica/i);
    expect(spokeCopy).toContain("servicios no clínicos");
  });

  it("states the limits on physical resources and clinical records without promising those functions", () => {
    const cabinFaq = aestheticsSoftwareFaqs().find((item) => item.question.includes("cabinas"))!;
    const clinicalFaq = aestheticsSoftwareFaqs().find((item) => item.question.includes("ficha clínica"))!;
    const reminderFaq = aestheticsSoftwareFaqs().find((item) => item.question.includes("WhatsApp"))!;
    expect(cabinFaq.answer).toMatch(/^No\./);
    expect(cabinFaq.answer).toContain("controlar ese recurso por separado");
    expect(clinicalFaq.answer).toMatch(/^No\./);
    expect(reminderFaq.answer).toMatch(/^No\./);
    expect(reminderFaq.answer).toContain("email");
    expect(visible).not.toMatch(/gestiona (?:automáticamente )?(?:las )?cabinas|asigna (?:a )?(?:cada )?profesional (?:a|en) (?:una )?cabina|evita (?:automáticamente )?(?:el )?solapamiento (?:de|entre) (?:las )?cabinas/i);
    expect(visible).not.toMatch(/paquetes de sesiones|bonos de sesiones|saldo de sesiones|ERP|software médico|software clínico|medicina estética/i);
  });

  it("contains no unauthorized customer proof or unsupported communication claims", () => {
    expect(visible).not.toMatch(/Lotty\s*Skin|Estética Bella|Cinnamon|Soccerbarber|Modern Women|Sanando el Corazón|testimonio|caso de éxito|logo de cliente/i);
    expect(visible).not.toMatch(/envía (?:avisos|recordatorios).*WhatsApp|envía (?:avisos|recordatorios).*\bSMS\b/i);
    expect(visible).not.toMatch(/\d+\s*%|\d+\s+clientes|líder|#1/i);
  });

  it("adds only the approved indexable route and keeps the marketplace gate closed", () => {
    const urls = sitemap().map((item) => item.url);
    expect(urls.filter((url) => url === `https://www.puragenda.cl${AESTHETICS_SOFTWARE_PATH}`)).toHaveLength(1);
    expect(urls).toContain("https://www.puragenda.cl/para/estetica");
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
    for (const route of ["software-agenda-spa", "software-estetica", "software-centro-estetico", "agenda-estetica", "estetica", "estetica/[city]", "spa/[city]", "software-agenda-psicologos"]) {
      expect(existsSync(join(process.cwd(), "src/app", route, "page.tsx"))).toBe(false);
      expect(urls).not.toContain(`https://www.puragenda.cl/${route}`);
    }
  });
});
