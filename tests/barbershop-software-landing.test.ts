import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET as llmsGet } from "@/app/llms.txt/route";
import sitemap from "@/app/sitemap";
import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { toGoogleAnalyticsPagePath } from "@/lib/analytics/path";
import { industriesData } from "@/lib/data/industries";
import {
  BARBERSHOP_SOFTWARE_PATH,
  barbershopSoftwareCopy,
  barbershopSoftwareFaqs,
  barbershopSoftwareMetadata,
} from "@/lib/data/barbershop-software-landing";
import { formatLandingClp } from "@/lib/data/scheduling-system-landing";
import { customerTestimonials } from "@/lib/data/testimonials";
import { createPageMetadata } from "@/lib/seo";
import {
  assertNoInventedReviewFields,
  breadcrumbListNode,
  faqPageNode,
  jsonLdGraph,
  organizationRef,
  softwareApplicationNode,
} from "@/lib/json-ld";

const root = process.cwd();
const pageSource = readFileSync(join(root, "src/app/software-agenda-barberias/page.tsx"), "utf8");

describe("SEO-006 barbershop software landing", () => {
  it("uses a unique title, H1 and www canonical distinct from /para/barberias", () => {
    const spoke = industriesData.find((industry) => industry.slug === "barberias");
    const metadata = createPageMetadata({
      title: barbershopSoftwareMetadata.title,
      description: barbershopSoftwareMetadata.description,
      path: BARBERSHOP_SOFTWARE_PATH,
    });

    expect(BARBERSHOP_SOFTWARE_PATH).toBe("/software-agenda-barberias");
    expect(barbershopSoftwareCopy.h1).toBe("Software de agenda para barberías");
    expect(barbershopSoftwareCopy.h1).not.toBe(spoke?.heroHeadline);
    expect(barbershopSoftwareMetadata.title).not.toBe(spoke?.title);
    expect(metadata.alternates).toEqual({
      canonical: "https://www.puragenda.cl/software-agenda-barberias",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://www.puragenda.cl/software-agenda-barberias",
      locale: "es_CL",
    });
    expect(pageSource).toContain("{barbershopSoftwareCopy.h1}");
  });

  it("reuses PRICING and only cites the real barbershop testimonial", () => {
    const faqs = barbershopSoftwareFaqs();
    const priceFaq = faqs.find((item) => item.question.includes("Cuánto cuesta"));
    expect(priceFaq?.answer).toContain(formatLandingClp(PRICING.INDIVIDUAL.monthly));
    expect(priceFaq?.answer).toContain(formatLandingClp(PRICING.EQUIPO.monthly));
    expect(priceFaq?.answer).toContain(String(STAFF_LIMITS.EQUIPO));
    expect(priceFaq?.answer).toContain(formatLandingClp(EXTRA_STAFF_COST.EQUIPO));
    expect(priceFaq?.answer).toContain(String(TRIAL_DURATION_DAYS));
    expect(pageSource).toContain('item.business === "Soccerbarber"');
    expect(pageSource).not.toContain("Terapias SEC");
    expect(customerTestimonials.some((item) => item.business === "Soccerbarber")).toBe(true);
  });

  it("keeps FAQ JSON-LD identical to visible copy and omits invented ratings", () => {
    const faqs = barbershopSoftwareFaqs();
    const graph = jsonLdGraph([
      organizationRef(),
      softwareApplicationNode(barbershopSoftwareCopy.softwareDescription),
      faqPageNode(faqs),
      breadcrumbListNode([
        { name: "Inicio", path: "/" },
        { name: "Software de agenda para barberías", path: BARBERSHOP_SOFTWARE_PATH },
      ]),
    ]);
    expect(faqs.length).toBeGreaterThanOrEqual(6);
    expect(faqs.length).toBeLessThanOrEqual(10);
    expect(pageSource).toContain("{faqs.map((item) => (");
    expect(faqPageNode(faqs).mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: faqs[0].question,
      acceptedAnswer: { "@type": "Answer", text: faqs[0].answer },
    });
    expect(assertNoInventedReviewFields(graph)).toEqual({
      hasAggregateRating: false,
      hasReviewRating: false,
      hasRatingValue: false,
    });
  });

  it("links the commercial hubs and does not advertise WhatsApp reminders", () => {
    expect(pageSource).toContain('href="/sistema-de-agendamiento-online"');
    expect(pageSource).toContain('href="/pricing"');
    expect(pageSource).toContain('href="/caracteristicas"');
    expect(pageSource).toContain('href="/funciones/agenda-multiples-profesionales"');
    expect(pageSource).toContain('href="/funciones/reservas-online-con-abono"');
    expect(pageSource).toContain('href="/guias/reducir-inasistencias-reservas"');
    expect(pageSource).toContain('href="/para/barberias"');
    expect(barbershopSoftwareFaqs().some((item) => item.answer.includes("correo el día anterior"))).toBe(true);
    expect(JSON.stringify(barbershopSoftwareCopy)).not.toMatch(/el mejor|#1|l[íi]der del mercado/i);
  });

  it("connects register CTAs and keeps the GA4 path uncollapsed", () => {
    expect(pageSource).toContain('cta="register"');
    expect(pageSource).toContain('placement="hero"');
    expect(pageSource).toContain('placement="final_cta"');
    expect(toGoogleAnalyticsPagePath(BARBERSHOP_SOFTWARE_PATH)).toBe(BARBERSHOP_SOFTWARE_PATH);
  });

  it("adds the landing to sitemap and llms.txt", async () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://www.puragenda.cl/software-agenda-barberias");
    const body = await llmsGet().text();
    expect(body).toContain("https://www.puragenda.cl/software-agenda-barberias");
  });
});
