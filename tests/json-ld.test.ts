import { describe, expect, it } from "vitest";
import { PRICING } from "@/core/constants";
import { industriesData } from "@/lib/data/industries";
import { featureSolutions } from "@/lib/data/feature-solutions";
import { serializeJsonLd } from "@/lib/seo";
import {
  ORGANIZATION_ID,
  SOFTWARE_ID,
  WEBSITE_ID,
  articleNode,
  assertNoInventedReviewFields,
  breadcrumbListNode,
  faqPageNode,
  jsonLdGraph,
  organizationNode,
  publishedSoftwareOffers,
  softwareApplicationNode,
  websiteNode,
} from "@/lib/json-ld";

function graphTypes(data: ReturnType<typeof jsonLdGraph>) {
  return data["@graph"].map((node) => node["@type"]);
}

describe("JSON-LD helpers", () => {
  it("builds a canonical Organization, WebSite and SoftwareApplication graph", () => {
    const graph = jsonLdGraph([organizationNode(), websiteNode(), softwareApplicationNode()]);
    expect(graphTypes(graph)).toEqual(["Organization", "WebSite", "SoftwareApplication"]);
    expect(JSON.parse(serializeJsonLd(graph))).toEqual(graph);
    expect(organizationNode()["@id"]).toBe(ORGANIZATION_ID);
    expect(websiteNode().publisher).toEqual({ "@id": ORGANIZATION_ID });
    expect(softwareApplicationNode()["@id"]).toBe(SOFTWARE_ID);
    expect(softwareApplicationNode().publisher).toEqual({ "@id": ORGANIZATION_ID });
    expect(WEBSITE_ID).toBe("https://www.puragenda.cl#website");
    expect(organizationNode().parentOrganization.url).toBe("https://www.purocode.com");
  });

  it("uses published plan prices as Offer, not AggregateOffer", () => {
    const offers = publishedSoftwareOffers();
    expect(offers).toHaveLength(2);
    expect(offers.every((offer) => offer["@type"] === "Offer")).toBe(true);
    expect(offers.map((offer) => offer.price)).toEqual([
      String(PRICING.INDIVIDUAL.monthly),
      String(PRICING.EQUIPO.monthly),
    ]);
    expect(offers.every((offer) => offer.priceCurrency === "CLP")).toBe(true);
    expect(JSON.stringify(softwareApplicationNode())).not.toContain("AggregateOffer");
    expect(JSON.stringify(softwareApplicationNode())).not.toContain("priceValidUntil");
    expect(JSON.stringify(softwareApplicationNode())).not.toContain("InStock");
  });

  it("does not invent ratings or review markup", () => {
    const home = jsonLdGraph([organizationNode(), websiteNode(), softwareApplicationNode()]);
    const industry = jsonLdGraph([
      softwareApplicationNode(industriesData[0].description),
      faqPageNode(industriesData[0].faq),
    ]);
    for (const payload of [home, industry, softwareApplicationNode()]) {
      expect(assertNoInventedReviewFields(payload)).toEqual({
        hasAggregateRating: false,
        hasReviewRating: false,
        hasRatingValue: false,
      });
      expect(JSON.stringify(payload)).not.toContain('"@type":"Review"');
    }
  });

  it("keeps FAQ copy identical to the visible items", () => {
    const faq = featureSolutions[0].faq;
    const node = faqPageNode(faq);
    expect(node.mainEntity).toHaveLength(faq.length);
    expect(node.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: faq[0].question,
      acceptedAnswer: { "@type": "Answer", text: faq[0].answer },
    });
  });

  it("emits consecutive breadcrumb positions with public URLs", () => {
    const node = breadcrumbListNode([
      { name: "Inicio", path: "/" },
      { name: "Soluciones", path: "/soluciones" },
      { name: "Barberías", path: "/para/barberias" },
    ]);
    expect(node.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(node.itemListElement[2].item).toBe("https://www.puragenda.cl/para/barberias");
  });

  it("escapes script-breaking characters and omits empty review fields on articles", () => {
    const article = articleNode({
      headline: "Guía",
      description: "Texto </script><script>alert(1)</script>",
      url: "https://www.puragenda.cl/guias/demo",
      datePublished: "2026-08-31",
      dateModified: "2026-08-31",
    });
    const serialized = serializeJsonLd(article);
    expect(serialized).not.toContain("<");
    expect(serialized).toContain("\\u003c/script>");
    expect(article.image).toBe("https://www.puragenda.cl/opengraph-image");
    expect(article.publisher["@id"]).toBe(ORGANIZATION_ID);
  });

  it("covers every industry and feature template with Offer-based software markup", () => {
    expect(industriesData).toHaveLength(8);
    expect(featureSolutions).toHaveLength(3);
    for (const industry of industriesData) {
      const offers = softwareApplicationNode(industry.description).offers;
      expect(offers[0]["@type"]).toBe("Offer");
      expect(faqPageNode(industry.faq).mainEntity.length).toBeGreaterThan(0);
    }
  });
});
