import { describe, expect, it } from "vitest";
import { createPageMetadata, serializeJsonLd } from "@/lib/seo";

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
});
