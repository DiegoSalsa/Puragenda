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
vi.mock("@/components/ui/accordion", () => ({
  Accordion: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  AccordionItem: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  AccordionTrigger: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
  AccordionContent: ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children),
}));

import Page, { metadata } from "@/app/software-agenda-psicologos/page";
import IndustryPage from "@/app/para/[industry]/page";
import sitemap from "@/app/sitemap";
import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { industriesData } from "@/lib/data/industries";
import {
  PSYCHOLOGISTS_SOFTWARE_PATH,
  psychologistsCatalogExample,
  psychologistsSoftwareCopy,
  psychologistsSoftwareFaqs,
} from "@/lib/data/psychologists-software-landing";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";
import { googleAnalyticsEventsFor } from "@/lib/analytics/google-events";
import { toGoogleAnalyticsPagePath } from "@/lib/analytics/path";
import { MARKETPLACE_QUALITY_GATE } from "@/lib/marketplace/quality-gate";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const spoke = industriesData.find((item) => item.slug === "psicologos")!;
let html: string;
let visible: string;
let spokeHtml: string;

beforeAll(async () => {
  vi.stubGlobal("React", React);
  html = renderToStaticMarkup(React.createElement(Page));
  visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  spokeHtml = renderToStaticMarkup(await IndustryPage({ params: Promise.resolve({ industry: "psicologos" }) }));
});
afterAll(() => vi.unstubAllGlobals());

describe("SEO-018 psychologist commercial hub", () => {
  it("uses the approved B2B intent, metadata, and one H1", () => {
    expect(metadata.title).toBe("Software de agenda para psicólogos");
    expect(metadata.alternates).toEqual({ canonical: `https://www.puragenda.cl${PSYCHOLOGISTS_SOFTWARE_PATH}` });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(psychologistsSoftwareCopy.h1);
    expect(spoke.title).toBe("Puragenda para consultas de psicología");
    expect(spoke.heroHeadline).toBe("Cómo organizar las citas de tu consulta con Puragenda");
    expect(spoke.title).not.toMatch(/software|sistema|programa/i);
    expect(spoke.keywords.join(" ")).not.toMatch(/software|sistema|programa/i);
    expect(spoke.softwareHub?.href).toBe(PSYCHOLOGISTS_SOFTWARE_PATH);
  });

  it("contains a fictional administrative example and the verified workflow", () => {
    for (const text of ["Ejemplo de configuración", "Ejemplo completamente ficticio", "Primera cita", "Seguimiento", "Profesional A", "60 min", "45 min", "lunes y miércoles", "13:00 a 15:00", "bloqueo"]) expect(visible.toLowerCase()).toContain(text.toLowerCase());
    expect(psychologistsCatalogExample.map((row) => row.duration)).toEqual([60, 45]);
    expect(visible).toContain("no para documentar la atención profesional");
  });

  it("uses central pricing and the four approved structured-data nodes", () => {
    for (const plan of [PRICING.INDIVIDUAL, PRICING.EQUIPO]) expect(visible).toContain(formatLandingClp(plan.monthly));
    const pricingFaq = psychologistsSoftwareFaqs().find((item) => item.question.includes("Cuánto cuesta"))!;
    expect(pricingFaq.answer).toContain(`${STAFF_LIMITS.EQUIPO} profesionales`);
    expect(pricingFaq.answer).toContain(formatLandingClp(EXTRA_STAFF_COST.EQUIPO));
    expect(pricingFaq.answer).toContain(`${TRIAL_DURATION_DAYS} días`);
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(graph["@graph"].map((node: Record<string, unknown>) => node["@type"])).toEqual(["Organization", "SoftwareApplication", "FAQPage", "BreadcrumbList"]);
    expect(JSON.stringify(graph)).not.toMatch(/MedicalBusiness|MedicalOrganization|aggregateRating|ratingValue|"Review"/);
  });

  it("answers administrative FAQs visibly and links hub, spoke, features, and conversion pages", () => {
    for (const item of psychologistsSoftwareFaqs()) {
      expect(visible).toContain(item.question);
      expect(visible).toContain(item.answer);
    }
    for (const path of ["/para/psicologos", "/sistema-de-agendamiento-online", "/funciones/agenda-google-calendar", "/funciones/reservas-online-con-abono", "/funciones/agenda-multiples-profesionales", "/politica-de-privacidad", "/pricing", "/demo", "/register"]) expect(html).toContain(`href="${path}"`);
    expect(spokeHtml).toContain(`href="${PSYCHOLOGISTS_SOFTWARE_PATH}"`);
    expect(spokeHtml).toContain('href="/funciones/agenda-google-calendar"');
    expect(spokeHtml).not.toMatch(/reducir inasistencias|protege las horas/i);
    for (const page of ["soluciones", "sistema-de-agendamiento-online"]) expect(source(`src/app/${page}/page.tsx`)).toContain(`href="${PSYCHOLOGISTS_SOFTWARE_PATH}"`);
    expect(googleAnalyticsEventsFor("landing_cta_clicked", { cta: "register", placement: "hero" }, { pagePath: PSYCHOLOGISTS_SOFTWARE_PATH })).toEqual([{ name: "sign_up_cta_clicked", params: { source_page: PSYCHOLOGISTS_SOFTWARE_PATH, cta_location: "hero" } }]);
    expect(toGoogleAnalyticsPagePath(PSYCHOLOGISTS_SOFTWARE_PATH)).toBe(PSYCHOLOGISTS_SOFTWARE_PATH);
  });

  it("keeps the health-scope boundary and avoids unsupported claims", () => {
    expect(visible).toContain("Agenda administrativa, no ficha clínica");
    expect(visible).toContain("La documentación clínica debe mantenerse");
    expect(visible).toMatch(/no crea una videollamada automáticamente/i);
    expect(visible).toMatch(/no crea una videollamada automática/i);
    expect(visible).not.toMatch(/terapeutas|terapia online|WhatsApp|\bSMS\b|HIPAA|ISO\s*\d/i);
    expect(visible).not.toMatch(/(?:cuenta con|incluye|tiene|ofrece) (?:una )?certificación sanitaria/i);
    expect(visible).not.toMatch(/testimonial|testimonio|caso de éxito|paciente real/i);
    expect(visible.match(/Profesional [A-Z]/g)?.every((name) => name === "Profesional A")).toBe(true);
    expect(spokeHtml).not.toMatch(/terapeutas|terapia online|WhatsApp|\bSMS\b|software clínico|ficha clínica electrónica/i);
  });

  it("adds exactly one indexable commercial route and never opens marketplace paths", () => {
    const urls = sitemap().map((item) => item.url);
    expect(urls.filter((url) => url === `https://www.puragenda.cl${PSYCHOLOGISTS_SOFTWARE_PATH}`)).toHaveLength(1);
    expect(urls).toContain("https://www.puragenda.cl/para/psicologos");
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
    for (const route of ["psicologos", "psicologos/[city]", "software-clinico-psicologos", "software-agenda-psicologo"]) {
      expect(existsSync(join(process.cwd(), "src/app", route, "page.tsx"))).toBe(false);
      expect(urls).not.toContain(`https://www.puragenda.cl/${route}`);
    }
  });
});
