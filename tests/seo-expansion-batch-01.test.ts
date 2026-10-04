import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { featureSolutions, getAllFeatureSolutions, getFeatureSolution } from "@/lib/data/feature-solutions";
import { guides, getGuide } from "@/lib/data/guides";
import { alternatives } from "@/lib/data/alternatives";
import { expansionFeatureSolutions } from "@/lib/data/expansion-features";
import { SEO_EXPANSION_BATCH, seoExpansionPages, seoContentProperties } from "@/lib/data/seo-expansion";
import { expansionMetadata, expansionSchema } from "@/lib/seo-expansion";
import { sanitizeTrackingProperties } from "@/lib/analytics/events";
import { googleAnalyticsEventsFor } from "@/lib/analytics/google-events";
import { toGoogleAnalyticsPagePath } from "@/lib/analytics/path";
import { generateStaticParams as featureParams, generateMetadata as featureMetadata } from "@/app/funciones/[slug]/page";
import { generateStaticParams as guideParams, generateMetadata as guideMetadata } from "@/app/guias/[slug]/page";
import { metadata as calendlyMetadata } from "@/app/alternativa-calendly/page";
import { metadata as freshaMetadata } from "@/app/alternativa-fresha/page";

const baseline = JSON.parse(readFileSync("docs/seo/expansion-batch-01-baseline.json", "utf8")) as { base: string; initialDiff: string; hashes: Record<string, string> };
const pages = seoExpansionPages.map((entry) => {
  const content = entry.cluster === "feature" ? getFeatureSolution(entry.id)! :
    entry.cluster === "guide" ? getGuide(entry.id)! :
    alternatives.find((item) => item.slug === entry.id)!;
  const h1 = "headline" in content ? content.headline : content.title;
  const directAnswer = "directAnswer" in content ? content.directAnswer : getGuide(entry.id)!.detail!.directAnswer;
  return { ...entry, content, h1, directAnswer };
});

function originalData(path: string, name: string, ref = baseline.base) {
  const original = execFileSync("git", ["show", ref + ":" + path], { encoding: "utf8" });
  const code = ts.transpileModule(original, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(code, { exports });
  return exports[name];
}

describe("SEO expansion batch 01", () => {
  it("registers exactly the 10 approved routes in existing systems", () => {
    expect(pages).toHaveLength(10);
    for (const page of pages) {
      expect(page.content).toBeDefined();
      if (page.cluster === "feature") expect(featureParams()).toContainEqual({ slug: page.id });
      if (page.cluster === "guide") expect(guideParams()).toContainEqual({ slug: page.id });
      if (page.cluster === "alternative") expect(readFileSync("src/app/" + page.id + "/page.tsx", "utf8")).toContain('getAlternative("' + page.id + '")');
    }
    expect(alternatives.map((page) => page.slug)).toEqual(["alternativa-calendly", "alternativa-fresha"]);
  });

  it.each(pages)("preserves canonical, single-brand social metadata and Googlebot directives for $path", async (page) => {
    const metadata = page.cluster === "feature" ? await featureMetadata({ params: Promise.resolve({ slug: page.id }) }) :
      page.cluster === "guide" ? await guideMetadata({ params: Promise.resolve({ slug: page.id }) }) :
      page.id === "alternativa-calendly" ? calendlyMetadata : freshaMetadata;
    const brandedTitle = page.content.title + " | Puragenda";
    expect(metadata.alternates?.canonical).toBe("https://www.puragenda.cl" + page.path);
    expect(metadata.title).toEqual({ absolute: brandedTitle });
    expect(metadata.openGraph).toMatchObject({
      url: "https://www.puragenda.cl" + page.path,
      title: brandedTitle,
      images: [{ alt: page.content.title + " — Puragenda" }],
    });
    expect(metadata.twitter).toMatchObject({ title: brandedTitle });
    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toMatch(/Puragenda — Puragenda|Puragenda \| Puragenda/);
    const finalTitle = typeof metadata.title === "object" && metadata.title && "absolute" in metadata.title ? metadata.title.absolute : metadata.title;
    for (const title of [finalTitle, metadata.openGraph?.title, metadata.twitter?.title]) {
      expect(typeof title).toBe("string");
      expect(String(title).match(/Puragenda/g)).toHaveLength(1);
    }
    const images = metadata.openGraph?.images;
    const image = Array.isArray(images) ? images[0] : images;
    expect(image).toBeTypeOf("object");
    expect(String((image as { alt: string }).alt).match(/Puragenda/g)).toHaveLength(1);
    expect(metadata.robots).toEqual({
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    });
  });

  it("brands legacy suffixed input once without duplicating the social image alt", () => {
    const input = { title: "Reservas online sin crear cuenta", description: "Reserva desde el navegador.", path: "/funciones/reservas-sin-cuenta" };
    expect(expansionMetadata({ ...input, title: input.title + " | Puragenda" })).toEqual(expansionMetadata(input));
  });

  it("preserves audited feature content except for removing title branding", () => {
    const approved = originalData("src/lib/data/expansion-features.ts", "expansionFeatureSolutions", "26d8b035958d02f943f9d13b56347649a2ab2223") as typeof expansionFeatureSolutions;
    expect(expansionFeatureSolutions).toEqual(approved.map((feature) => ({ ...feature, title: feature.title.replace(/ \| Puragenda$/, "") })));
    for (const feature of expansionFeatureSolutions) expect(feature.title).not.toContain("Puragenda");
  });

  it("preserves the sitemap URL list from audited SHA 26d8b035958d02f943f9d13b56347649a2ab2223", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(createHash("sha256").update(JSON.stringify(urls)).digest("hex")).toBe("e40ffbf3ec93fc18700d1e911aee76f2bb3336a1956a357963d6af8352b4f76c");
  });

  it("has distinct titles, H1s, descriptions, answers and FAQ questions", () => {
    for (const values of [pages.map((p) => p.content.title), pages.map((p) => p.h1), pages.map((p) => p.content.description), pages.map((p) => p.directAnswer)]) {
      expect(new Set(values).size).toBe(10);
    }
    for (const page of pages) {
      expect(page.directAnswer.length).toBeGreaterThan(130);
      expect(page.content.faq.length).toBeGreaterThanOrEqual(5);
      expect(new Set(page.content.faq.map((q) => q.question)).size).toBe(page.content.faq.length);
    }
  });

  it.each(pages)("includes $path exactly once in the sitemap", (page) => {
    expect(sitemap().filter((entry) => entry.url === "https://www.puragenda.cl" + page.path)).toHaveLength(1);
  });

  it("has no duplicated sitemap URLs", () => {
    const entries = sitemap().map((entry) => entry.url);
    expect(new Set(entries).size).toBe(entries.length);
  });

  it.each(pages)("uses the visible FAQ data in the schema for $path", (page) => {
    const graph = expansionSchema({ path: page.path, title: page.content.title, description: page.content.description, date: "2026-10-03", faq: page.content.faq, parent: { name: "Guías", path: "/guias" }, article: page.cluster === "guide" });
    const faq = graph["@graph"].find((node) => node["@type"] === "FAQPage");
    expect(faq?.mainEntity).toEqual(page.content.faq.map((item) => ({
      "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer },
    })));
    expect(JSON.stringify(graph)).not.toMatch(/AggregateRating|reviewCount|ratingValue/);
  });

  it("contains the critical interlinks and only existing public internal destinations", () => {
    const critical: Record<string, string[]> = {
      "recordatorios-citas-email": ["/guias/reducir-inasistencias-reservas", "/sistema-de-agendamiento-online"],
      "reservas-sin-cuenta": ["/sistema-de-agendamiento-online", "/funciones/widget-reservas-web"],
      "widget-reservas-web": ["/funciones/reservas-sin-cuenta", "/caracteristicas"],
      "agenda-multiples-sucursales": ["/funciones/agenda-multiples-profesionales", "/sistema-de-agendamiento-online"],
      "gift-cards": ["/caracteristicas", "/funciones/reservas-sin-cuenta"],
      "dejar-de-agendar-por-whatsapp": ["/sistema-de-agendamiento-online", "/funciones/reservas-sin-cuenta"],
      "google-calendar-vs-sistema-reservas": ["/funciones/agenda-google-calendar", "/sistema-de-agendamiento-online"],
      "organizar-agenda-varios-profesionales": ["/funciones/agenda-multiples-profesionales"],
      "alternativa-calendly": ["/sistema-de-agendamiento-online", "/funciones/agenda-multiples-profesionales"],
      "alternativa-fresha": ["/sistema-de-agendamiento-online", "/funciones/gift-cards"],
    };
    const known = new Set(sitemap().map((entry) => new URL(entry.url).pathname));
    for (const page of pages) {
      const links = "links" in page.content ? page.content.links : page.content.detail!.links;
      for (const path of critical[page.id]) expect(links.map((link) => link.href)).toContain(path);
      for (const link of links) expect(known.has(link.href), link.href).toBe(true);
    }
  });

  it("avoids known false claims and unsupported competitor prices", () => {
    const all = JSON.stringify(pages.map((p) => p.content));
    expect(all).not.toMatch(/reduc(?:e|ción de).*\d+\s*%|garantiza(?:mos)? (?:la asistencia|cero)|IA que persigue|WhatsApp automático incluido|SMS incluidos|sincronización bidireccional completa garantizada/i);
    for (const page of alternatives) {
      expect(JSON.stringify(page)).not.toMatch(/(?:\$\s*\d|\d+\s*(?:%|CLP|USD|EUR)|más barato|mejor que|ganador universal garantizado)/i);
      expect(page.sources.every((source) => source.consultedAt === "2026-10-03")).toBe(true);
      expect(page.dimensions.every((row) => page.sources.some((source) => source.url === row.sourceUrl))).toBe(true);
    }
    const reminder = JSON.stringify(getFeatureSolution("recordatorios-citas-email"));
    expect(reminder).toContain("14:00 UTC");
    expect(reminder).toContain("día siguiente");
    expect(reminder).toContain("después del envío diario");
    expect(JSON.stringify(getFeatureSolution("gift-cards"))).toContain("cuenta del portal");
    expect(JSON.stringify(getFeatureSolution("widget-reservas-web"))).toContain("No incluye crear el sitio completo");
  });

  it("preserves all protected sources, existing feature selection and original guide content", () => {
    expect(baseline.initialDiff).toBe("");
    for (const [path, hash] of Object.entries(baseline.hashes)) {
      // The commercial task explicitly authorizes adding a section to home.
      // Check every original byte, allowing only its two exact insertion points.
      let source = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
      if (path === "src/components/landing/ThemeNeoBrutalism.tsx") source = source
        .replace("{ user, business, commercialSection }: LandingIdentityProps & { commercialSection?: React.ReactNode }", "{ user, business }: LandingIdentityProps")
        .replace("        {commercialSection}\n", "");
      const current = createHash("sha256").update(source).digest("hex");
      expect(current, path).toBe(hash);
    }
    expect(featureSolutions).toEqual(originalData("src/lib/data/feature-solutions.ts", "featureSolutions"));
    expect(guides.filter((guide) => !guide.detail)).toEqual(originalData("src/lib/data/guides.ts", "guides"));
    expect(getAllFeatureSolutions().filter((feature) => !feature.detail)).toEqual(featureSolutions);
  });

  it("classifies only exact reviewed public paths without copying query strings or PII", () => {
    for (const page of pages) {
      const properties = seoContentProperties(page.path);
      expect(properties).toMatchObject({ seo_content_id: page.id, seo_batch: SEO_EXPANSION_BATCH, seo_cluster: page.cluster, seo_intent: page.intent });
      expect(sanitizeTrackingProperties("page_view", properties)).toEqual(properties);
      expect(toGoogleAnalyticsPagePath(page.path)).toBe(page.path);
    }
    for (const path of ["/funciones/private-token", "/widget/client@example.com", "/software-agenda-barberias", "/alternativa-fresha?email=client@example.com"]) expect(seoContentProperties(path)).toEqual({});
    expect(sanitizeTrackingProperties("page_view", { seo_content_id: "client@example.com", seo_intent: "some-token", seo_batch: "other", email: "client@example.com" })).toEqual({});
    expect(sanitizeTrackingProperties("booking_created", seoContentProperties(pages[0].path))).toEqual({});
  });

  it("keeps CTA event names and preserves cohort fields in the existing GA mapping", () => {
    const cohort = seoContentProperties("/funciones/reservas-sin-cuenta");
    const event = googleAnalyticsEventsFor("landing_cta_clicked", { cta: "register", placement: "feature_reservas-sin-cuenta", ...cohort }, { pagePath: "/funciones/reservas-sin-cuenta" });
    expect(event).toEqual([{ name: "sign_up_cta_clicked", params: { source_page: "/funciones/reservas-sin-cuenta", cta_location: "feature_reservas-sin-cuenta", ...cohort } }]);
    expect(googleAnalyticsEventsFor("page_view", cohort, { pagePath: "/funciones/reservas-sin-cuenta" })).toEqual([]);
  });
});
