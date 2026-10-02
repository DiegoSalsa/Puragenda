import { describe, expect, it } from "vitest";
import { fixtureView } from "@/websites/fixtures/views";
import { websiteStructuredData, serializeWebsiteStructuredData } from "@/websites/metadata";
describe("public Website structured data", () => {
  it("uses only published public business data and canonical services", () => {
    const view = fixtureView("a"); const data = websiteStructuredData(view, "https://tenant.example.cl/");
    expect(data.name).toBe(view.business.name); expect(data.url).toBe("https://tenant.example.cl/");
    expect(data.hasOfferCatalog.itemListElement[0].price).toBe(view.catalog.services[0].price);
    expect(data.hasOfferCatalog.itemListElement[0].priceCurrency).toBe(view.catalog.business.currency);
    expect(data).not.toHaveProperty("businessId"); expect(data).not.toHaveProperty("aggregateRating");
  });
  it("escapes script injection while retaining valid JSON", () => {
    const text = '</script><script>alert(1)</script>';
    const serialized = serializeWebsiteStructuredData({ name: text });
    expect(serialized).not.toContain("</script>"); expect(JSON.parse(serialized).name).toBe(text);
  });
});
