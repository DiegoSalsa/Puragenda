import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET as llmsGet } from "@/app/llms.txt/route";
import sitemap from "@/app/sitemap";
import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { toGoogleAnalyticsPagePath } from "@/lib/analytics/path";
import { industriesData } from "@/lib/data/industries";
import { barbershopSoftwareCopy, barbershopSoftwareMetadata } from "@/lib/data/barbershop-software-landing";
import {
  SALON_SOFTWARE_PATH,
  salonFeatures,
  salonSoftwareCopy,
  salonSoftwareFaqs,
  salonSoftwareMetadata,
} from "@/lib/data/salon-software-landing";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";
import { createPageMetadata } from "@/lib/seo";
import {
  assertNoInventedReviewFields,
  faqPageNode,
  jsonLdGraph,
  organizationRef,
  softwareApplicationNode,
} from "@/lib/json-ld";

const root = process.cwd();
const pageSource = readFileSync(join(root, "src/app/software-agenda-peluquerias/page.tsx"), "utf8");
const barberPageSource = readFileSync(join(root, "src/app/software-agenda-barberias/page.tsx"), "utf8");

describe("SEO-007 salon software landing", () => {
  it("uses a unique title, H1 and www canonical distinct from /para/peluquerias", () => {
    const spoke = industriesData.find((industry) => industry.slug === "peluquerias");
    const metadata = createPageMetadata({
      title: salonSoftwareMetadata.title,
      description: salonSoftwareMetadata.description,
      path: SALON_SOFTWARE_PATH,
    });

    expect(SALON_SOFTWARE_PATH).toBe("/software-agenda-peluquerias");
    expect(salonSoftwareCopy.h1).toBe("Software de agenda para peluquerías y salones");
    expect(salonSoftwareCopy.h1).not.toBe(spoke?.heroHeadline);
    expect(salonSoftwareMetadata.title).not.toBe(spoke?.title);
    expect(spoke?.title).toBe("Puragenda para peluquerías");
    expect(spoke?.softwareHub?.href).toBe(SALON_SOFTWARE_PATH);
    expect(metadata.alternates).toEqual({
      canonical: "https://www.puragenda.cl/software-agenda-peluquerias",
    });
    expect(pageSource).toContain("{salonSoftwareCopy.h1}");
  });

  it("does not reuse the barbershop title, H1 or hero lead", () => {
    expect(salonSoftwareMetadata.title).not.toBe(barbershopSoftwareMetadata.title);
    expect(salonSoftwareCopy.h1).not.toBe(barbershopSoftwareCopy.h1);
    expect(salonSoftwareCopy.heroLead).not.toBe(barbershopSoftwareCopy.heroLead);
    expect(salonSoftwareCopy.definition).not.toBe(barbershopSoftwareCopy.definition);
    expect(pageSource).not.toContain("Software de agenda para barberías");
    expect(barberPageSource).not.toContain("Software de agenda para peluquerías y salones");
  });

  it("reuses PRICING and does not invent a salon testimonial", () => {
    const priceFaq = salonSoftwareFaqs().find((item) => item.question.includes("Cuánto cuesta"));
    expect(priceFaq?.answer).toContain(formatLandingClp(PRICING.INDIVIDUAL.monthly));
    expect(priceFaq?.answer).toContain(formatLandingClp(PRICING.EQUIPO.monthly));
    expect(priceFaq?.answer).toContain(String(STAFF_LIMITS.EQUIPO));
    expect(priceFaq?.answer).toContain(formatLandingClp(EXTRA_STAFF_COST.EQUIPO));
    expect(priceFaq?.answer).toContain(String(TRIAL_DURATION_DAYS));
    expect(pageSource).not.toContain("Soccerbarber");
    expect(pageSource).not.toContain("Lotty Skin");
    expect(pageSource).toContain("Pruébalo en tu propia peluquería");
    expect(pageSource).toContain('placement="trial_invite"');
    expect(pageSource).not.toContain("No tenemos publicado un testimonio de una peluquería");
  });

  it("keeps FAQ JSON-LD visible and omits invented ratings", () => {
    const faqs = salonSoftwareFaqs();
    const graph = jsonLdGraph([
      organizationRef(),
      softwareApplicationNode(salonSoftwareCopy.softwareDescription),
      faqPageNode(faqs),
    ]);
    expect(faqs.length).toBeGreaterThanOrEqual(6);
    expect(faqs.length).toBeLessThanOrEqual(10);
    expect(pageSource).toContain("{faqs.map((item) => (");
    expect(assertNoInventedReviewFields(graph)).toEqual({
      hasAggregateRating: false,
      hasReviewRating: false,
      hasRatingValue: false,
    });
    expect(faqs.some((item) => item.answer.includes("ficha técnica de coloración"))).toBe(true);
  });

  it("links the commercial hubs and keeps the GA4 path uncollapsed", () => {
    expect(pageSource).toMatch(/href[=:]\s*"\/sistema-de-agendamiento-online"/);
    expect(pageSource).toContain('href="/pricing"');
    expect(pageSource).toContain('href="/caracteristicas"');
    expect(pageSource).toContain('href="/funciones/reservas-online-con-abono"');
    expect(pageSource).toContain('href="/guias/reducir-inasistencias-reservas"');
    expect(pageSource).toContain('href="/para/peluquerias"');
    expect(salonFeatures.some((feature) => feature.href === "/funciones/agenda-multiples-profesionales")).toBe(true);
    expect(pageSource).toMatch(/cta:\s*"register"|cta="register"/);
    expect(toGoogleAnalyticsPagePath(SALON_SOFTWARE_PATH)).toBe(SALON_SOFTWARE_PATH);
  });

  it("adds the landing to sitemap and llms.txt", async () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://www.puragenda.cl/software-agenda-peluquerias");
    const body = await llmsGet().text();
    expect(body).toContain("https://www.puragenda.cl/software-agenda-peluquerias");
  });
});
