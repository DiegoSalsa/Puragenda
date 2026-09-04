import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET as llmsGet } from "@/app/llms.txt/route";
import sitemap from "@/app/sitemap";
import { EXTRA_STAFF_COST, PRICING, STAFF_LIMITS, TRIAL_DURATION_DAYS } from "@/core/constants";
import { toGoogleAnalyticsPagePath } from "@/lib/analytics/path";
import {
  SCHEDULING_SYSTEM_PATH,
  formatLandingClp,
  schedulingSystemAudiences,
  schedulingSystemCopy,
  schedulingSystemFaqs,
  schedulingSystemFeatures,
  schedulingSystemMetadata,
} from "@/lib/data/scheduling-system-landing";
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
const pageSource = readFileSync(join(root, "src/app/sistema-de-agendamiento-online/page.tsx"), "utf8");

describe("SEO-005 scheduling system pillar", () => {
  it("uses a unique title, description, H1 and www canonical", () => {
    const metadata = createPageMetadata({
      title: schedulingSystemMetadata.title,
      description: schedulingSystemMetadata.description,
      path: SCHEDULING_SYSTEM_PATH,
    });

    expect(SCHEDULING_SYSTEM_PATH).toBe("/sistema-de-agendamiento-online");
    expect(schedulingSystemCopy.h1).toBe("Sistema de agendamiento online para negocios");
    expect(schedulingSystemMetadata.title).toContain("Sistema de agendamiento online");
    expect(schedulingSystemMetadata.description).toContain("reservas 24/7");
    expect(metadata.alternates).toEqual({
      canonical: "https://www.puragenda.cl/sistema-de-agendamiento-online",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://www.puragenda.cl/sistema-de-agendamiento-online",
      locale: "es_CL",
      siteName: "Puragenda",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(pageSource).toContain("{schedulingSystemCopy.h1}");
    expect(pageSource).not.toMatch(/<h1[^>]*>[\s\S]*<h1/);
  });

  it("reuses published pricing constants instead of duplicated amounts", () => {
    const faqs = schedulingSystemFaqs();
    const priceFaq = faqs.find((item) => item.question.includes("Cuánto cuesta"));

    expect(pageSource).toContain("PRICING.INDIVIDUAL.monthly");
    expect(pageSource).toContain("PRICING.EQUIPO.monthly");
    expect(priceFaq?.answer).toContain(formatLandingClp(PRICING.INDIVIDUAL.monthly));
    expect(priceFaq?.answer).toContain(formatLandingClp(PRICING.EQUIPO.monthly));
    expect(priceFaq?.answer).toContain(String(STAFF_LIMITS.EQUIPO));
    expect(priceFaq?.answer).toContain(formatLandingClp(EXTRA_STAFF_COST.EQUIPO));
    expect(priceFaq?.answer).toContain(String(TRIAL_DURATION_DAYS));
  });

  it("keeps FAQ JSON-LD identical to the visible questions", () => {
    const faqs = schedulingSystemFaqs();
    const node = faqPageNode(faqs);
    expect(node.mainEntity).toHaveLength(faqs.length);
    expect(faqs.length).toBeGreaterThanOrEqual(6);
    expect(faqs.length).toBeLessThanOrEqual(10);
    expect(pageSource).toContain("{faqs.map((item) => (");
    expect(node.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: faqs[0].question,
      acceptedAnswer: { "@type": "Answer", text: faqs[0].answer },
    });
  });

  it("emits existing structured data helpers without invented ratings", () => {
    const graph = jsonLdGraph([
      organizationRef(),
      softwareApplicationNode(schedulingSystemCopy.softwareDescription),
      faqPageNode(schedulingSystemFaqs()),
      breadcrumbListNode([
        { name: "Inicio", path: "/" },
        { name: "Sistema de agendamiento online", path: SCHEDULING_SYSTEM_PATH },
      ]),
    ]);

    expect(graph["@graph"].map((node) => node["@type"])).toEqual([
      "Organization",
      "SoftwareApplication",
      "FAQPage",
      "BreadcrumbList",
    ]);
    expect(assertNoInventedReviewFields(graph)).toEqual({
      hasAggregateRating: false,
      hasReviewRating: false,
      hasRatingValue: false,
    });
    expect(JSON.stringify(graph)).not.toContain('"@type":"Review"');
    expect(pageSource).toContain("organizationRef()");
    expect(pageSource).toContain("softwareApplicationNode(");
    expect(pageSource).toContain("faqPageNode(faqs)");
    expect(pageSource).toContain("breadcrumbListNode(");
  });

  it("links to the required commercial hubs and does not advertise WhatsApp reminders", () => {
    expect(pageSource).toContain('href="/pricing"');
    expect(pageSource).toContain('href="/caracteristicas"');
    expect(pageSource).toContain('href="/soluciones"');
    expect(pageSource).toContain("getPublishedCaseStudies");
    expect(pageSource).not.toContain('href="/casos-de-exito/soccerbarber"');
    expect(pageSource).toContain("`/para/${audience.slug}`");
    expect(schedulingSystemAudiences.map((item) => item.slug)).toEqual([
      "barberias",
      "peluquerias",
      "estetica",
      "psicologos",
    ]);
    expect(schedulingSystemFeatures.some((feature) => feature.href === "/funciones/reservas-online-con-abono")).toBe(true);
    expect(schedulingSystemFeatures.some((feature) => feature.href === "/funciones/agenda-multiples-profesionales")).toBe(true);
    expect(schedulingSystemFaqs().some((item) => item.answer.includes("correo electrónico"))).toBe(true);
    const publishedCopy = JSON.stringify({
      ...schedulingSystemCopy,
      faqs: schedulingSystemFaqs(),
      features: schedulingSystemFeatures,
    });
    expect(publishedCopy).not.toMatch(/el mejor|l[íi]der del mercado|miles de negocios|10\.000 usuarios/i);
  });

  it("connects register CTAs to the existing sign_up tracking", () => {
    expect(pageSource).toContain('cta="register"');
    expect(pageSource).toContain('placement="hero"');
    expect(pageSource).toContain('placement="final_cta"');
    expect(pageSource).toContain('href="/register"');
    expect(toGoogleAnalyticsPagePath(SCHEDULING_SYSTEM_PATH)).toBe(SCHEDULING_SYSTEM_PATH);
  });

  it("adds the pillar to sitemap and llms.txt", async () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://www.puragenda.cl/sistema-de-agendamiento-online");
    expect(urls.filter((url) => url.endsWith("/sistema-de-agendamiento-online"))).toHaveLength(1);

    const body = await llmsGet().text();
    expect(body).toContain("https://www.puragenda.cl/sistema-de-agendamiento-online");
  });
});
