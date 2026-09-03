import { describe, expect, it } from "vitest";
import { createPageMetadata, serializeJsonLd } from "@/lib/seo";
import { industriesData } from "@/lib/data/industries";

describe("SEO helpers", () => {
  it("builds canonical and social metadata for a public page", () => {
    const metadata = createPageMetadata({
      title: "Agenda para psicólogos",
      description: "Reservas online para consultas.",
      path: "/para/psicologos",
    });

    expect(metadata.alternates).toEqual({ canonical: "https://www.puragenda.cl/para/psicologos" });
    expect(metadata.openGraph).toMatchObject({
      url: "https://www.puragenda.cl/para/psicologos",
      locale: "es_CL",
      siteName: "Puragenda",
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("escapes opening tags in JSON-LD", () => {
    expect(serializeJsonLd({ text: "</script><script>alert(1)</script>" })).not.toContain("<");
    expect(serializeJsonLd({ text: "</script>" })).toContain("\\u003c/script>");
  });

  it("keeps the barbershop industry spoke distinct from the software landing", () => {
    const barberias = industriesData.find((industry) => industry.slug === "barberias");

    expect(barberias).toMatchObject({
      title: "Puragenda para barberías",
      heroHeadline: "Puragenda para barberías",
    });
    expect(barberias?.title).not.toBe("Software de agenda para barberías");
    expect(barberias?.keywords).not.toContain("software para barberías");
    expect(barberias?.faq.some((item) => item.question.includes("Cuánto cuesta"))).toBe(true);
    expect(barberias?.faq.some((item) => item.answer.includes("navegador del celular"))).toBe(true);
  });
});
