import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET as llmsGet } from "@/app/llms.txt/route";
import sitemap from "@/app/sitemap";
import { toGoogleAnalyticsPagePath } from "@/lib/analytics/path";
import {
  CASE_STUDIES_PATH,
  caseStudies,
  caseStudyPath,
  formatCaseStudyDate,
  getCaseStudyTestimonial,
  getIndexableCaseStudyPaths,
  getIndexableCaseStudyPathsFrom,
  getPublishedCaseStudies,
  getPublishedCaseStudy,
  getPublishedCaseStudiesByIndustry,
  isPublishedCaseStudy,
} from "@/lib/data/case-studies";
import { customerTestimonials } from "@/lib/data/testimonials";
import { createPageMetadata } from "@/lib/seo";
import {
  articleNode,
  assertNoInventedReviewFields,
  breadcrumbListNode,
  collectionPageNode,
  jsonLdGraph,
  organizationRef,
} from "@/lib/json-ld";
import { MARKETPLACE_QUALITY_GATE } from "@/lib/marketplace";

const root = process.cwd();

function readSrc(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

const hubSource = readSrc("src/app/casos-de-exito/page.tsx");
const caseSource = readSrc("src/app/casos-de-exito/[slug]/page.tsx");
const caseDataSource = readSrc("src/lib/data/case-studies.ts");
const soccerbarber = getPublishedCaseStudy("soccerbarber");
const soccerbarberTestimonial = customerTestimonials.find((item) => item.business === "Soccerbarber");

const INVENTED_METRIC_PATTERN =
  /\d+\s*%|menos no-shows|reducimos las inasistencias|aument[oó] las reservas|ahorramos \d+|m[aá]s de \d+ clientes|ratingValue|aggregateRating/i;

describe("SEO-010 verifiable case studies", () => {
  it("publishes a unique hub title, H1, canonical and OpenGraph", () => {
    const metadata = createPageMetadata({
      title: "Casos de éxito de Puragenda",
      description:
        "Casos verificables de negocios que usan Puragenda. Publicamos solo evidencia autorizada, sin métricas inventadas.",
      path: CASE_STUDIES_PATH,
    });

    expect(CASE_STUDIES_PATH).toBe("/casos-de-exito");
    expect(hubSource).toContain("Casos de éxito de Puragenda");
    expect(hubSource).toContain("<h1");
    expect(metadata.alternates).toEqual({
      canonical: "https://www.puragenda.cl/casos-de-exito",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://www.puragenda.cl/casos-de-exito",
      locale: "es_CL",
      type: "website",
    });
  });

  it("publishes Soccerbarber with unique article metadata when the public testimonial exists", () => {
    expect(soccerbarber).toBeDefined();
    expect(soccerbarberTestimonial).toBeDefined();
    if (!soccerbarber) throw new Error("expected published Soccerbarber case");

    const metadata = createPageMetadata({
      title: soccerbarber.title,
      description: soccerbarber.description,
      path: caseStudyPath(soccerbarber.slug),
      type: "article",
      publishedTime: soccerbarber.publishedAt,
      modifiedTime: soccerbarber.updatedAt,
    });

    expect(soccerbarber.h1).toBe("Soccerbarber utiliza Puragenda para gestionar su barbería");
    expect(soccerbarber.title).not.toBe("Casos de éxito de Puragenda");
    expect(caseSource).toContain("{item.h1}");
    expect(metadata.alternates).toEqual({
      canonical: "https://www.puragenda.cl/casos-de-exito/soccerbarber",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://www.puragenda.cl/casos-de-exito/soccerbarber",
      type: "article",
      locale: "es_CL",
    });
    expect(toGoogleAnalyticsPagePath("/casos-de-exito")).toBe("/casos-de-exito");
    expect(toGoogleAnalyticsPagePath("/casos-de-exito/soccerbarber")).toBe("/casos-de-exito/soccerbarber");
  });

  it("reuses the canonical Soccerbarber testimonial without altering its words", () => {
    expect(soccerbarber).toBeDefined();
    if (!soccerbarber || !soccerbarberTestimonial) throw new Error("expected Soccerbarber evidence");

    expect(getCaseStudyTestimonial(soccerbarber)).toEqual(soccerbarberTestimonial);
    expect(caseSource).toContain("getCaseStudyTestimonial(item)");
    expect(caseSource).toContain("{testimonial.quote}");
    expect(caseSource).not.toContain(soccerbarberTestimonial.quote);
    expect(caseDataSource).not.toContain(soccerbarberTestimonial.quote);
  });

  it("does not hardcode invented quantitative results", () => {
    expect(caseDataSource).not.toMatch(INVENTED_METRIC_PATTERN);
    expect(hubSource).not.toMatch(INVENTED_METRIC_PATTERN);
    expect(caseSource).not.toMatch(INVENTED_METRIC_PATTERN);
    expect(JSON.stringify(soccerbarber)).not.toMatch(/\d+\s*%/);
    expect(JSON.stringify(soccerbarber)).not.toMatch(/menos no-shows/i);
    expect(caseDataSource).not.toContain("Cinnamon");
    expect(caseDataSource).not.toContain("Modern Women");
    expect(caseDataSource).not.toContain("Lotty");
    expect(hubSource).not.toContain("próximamente");
    expect(hubSource).not.toContain("coming soon");
  });

  it("emits Article and BreadcrumbList without Review, LocalBusiness or ratings", () => {
    expect(soccerbarber).toBeDefined();
    if (!soccerbarber) throw new Error("expected published Soccerbarber case");

    const graph = jsonLdGraph([
      organizationRef(),
      articleNode({
        headline: soccerbarber.title,
        description: soccerbarber.description,
        url: "https://www.puragenda.cl/casos-de-exito/soccerbarber",
        datePublished: soccerbarber.publishedAt,
        dateModified: soccerbarber.updatedAt,
      }),
      breadcrumbListNode([
        { name: "Inicio", path: "/" },
        { name: "Casos de éxito", path: CASE_STUDIES_PATH },
        { name: soccerbarber.businessName, path: caseStudyPath(soccerbarber.slug) },
      ]),
    ]);
    const hubGraph = jsonLdGraph([
      organizationRef(),
      collectionPageNode({
        name: "Casos de éxito de Puragenda",
        url: "https://www.puragenda.cl/casos-de-exito",
        parts: getPublishedCaseStudies().map((item) => ({
          headline: item.title,
          url: `https://www.puragenda.cl${caseStudyPath(item.slug)}`,
          dateModified: item.updatedAt,
        })),
      }),
    ]);

    expect(graph["@graph"].map((node) => node["@type"])).toEqual(["Organization", "Article", "BreadcrumbList"]);
    expect(JSON.stringify(graph)).not.toContain('"@type":"Review"');
    expect(JSON.stringify(graph)).not.toContain("LocalBusiness");
    expect(JSON.stringify(hubGraph)).not.toContain('"@type":"Review"');
    expect(assertNoInventedReviewFields(graph)).toEqual({
      hasAggregateRating: false,
      hasReviewRating: false,
      hasRatingValue: false,
    });
    expect(caseSource).toContain("articleNode(");
    expect(caseSource).toContain("breadcrumbListNode(");
    expect(hubSource).toContain("collectionPageNode(");
  });

  it("keeps unpublished cases out of sitemap, llms.txt and static params", async () => {
    const unpublished = {
      slug: "cinnamon-nails",
      published: false,
      testimonialBusiness: "Soccerbarber" as const,
    };
    const urls = sitemap().map((entry) => entry.url);

    expect(isPublishedCaseStudy(unpublished)).toBe(false);
    expect(getIndexableCaseStudyPathsFrom([unpublished, ...caseStudies])).toEqual([
      "/casos-de-exito",
      "/casos-de-exito/soccerbarber",
    ]);
    expect(getIndexableCaseStudyPaths()).toEqual(["/casos-de-exito", "/casos-de-exito/soccerbarber"]);
    expect(getPublishedCaseStudy("cinnamon-nails")).toBeUndefined();
    expect(urls).toContain("https://www.puragenda.cl/casos-de-exito");
    expect(urls).toContain("https://www.puragenda.cl/casos-de-exito/soccerbarber");
    expect(urls).not.toContain("https://www.puragenda.cl/casos-de-exito/cinnamon-nails");
    expect(urls.filter((url) => url.includes("/casos-de-exito")).length).toBe(1 + getPublishedCaseStudies().length);

    const body = await llmsGet().text();
    expect(body).toContain("https://www.puragenda.cl/casos-de-exito");
    expect(body).toContain("https://www.puragenda.cl/casos-de-exito/soccerbarber");
    expect(body).not.toContain("cinnamon-nails");
    expect(caseSource).toContain("getPublishedCaseStudies().map((item) => ({ slug: item.slug }))");
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
  });

  it("links commercial barbershop surfaces to the published case and back to product pages", () => {
    const barbershopLanding = readSrc("src/app/software-agenda-barberias/page.tsx");
    const schedulingLanding = readSrc("src/app/sistema-de-agendamiento-online/page.tsx");
    const industryPage = readSrc("src/app/para/[industry]/page.tsx");
    const footer = readSrc("src/components/landing/footer.tsx");

    expect(barbershopLanding).toContain('href="/casos-de-exito/soccerbarber"');
    expect(schedulingLanding).toContain('href="/casos-de-exito/soccerbarber"');
    expect(schedulingLanding).toContain('href="/casos-de-exito"');
    expect(industryPage).toContain("getPublishedCaseStudiesByIndustry");
    expect(industryPage).toContain("caseStudyPath(item.slug)");
    expect(footer).toContain('href="/casos-de-exito"');
    expect(getPublishedCaseStudiesByIndustry("barberias").map((item) => item.slug)).toEqual(["soccerbarber"]);
    expect(getPublishedCaseStudiesByIndustry("peluquerias")).toEqual([]);
    expect(caseSource).toContain("{item.relatedLinks.map");
    expect(caseSource).toContain("href={link.href}");
    expect(soccerbarber?.relatedLinks.map((link) => link.href)).toEqual([
      "/software-agenda-barberias",
      "/sistema-de-agendamiento-online",
      "/pricing",
    ]);
  });

  it("reuses register CTAs that already map to sign_up_cta_clicked", () => {
    expect(hubSource).toContain('cta="register"');
    expect(caseSource).toContain('cta="register"');
    expect(hubSource).toContain('placement="final_cta"');
    expect(caseSource).toContain('placement="final_cta"');
    expect(hubSource).not.toContain("sign_up_cta_clicked");
    expect(caseSource).not.toContain("track(");
    expect(formatCaseStudyDate("2026-09-04")).toBe("4 de septiembre de 2026");
  });
});
