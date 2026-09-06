import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MARKETPLACE_AUTHORIZATION_COPY, MARKETPLACE_QUALITY_GATE } from "@/lib/marketplace";

describe("marketplace-ready registration UI", () => {
  const form = readFileSync(join(process.cwd(), "src/app/register/register-form.tsx"), "utf8");
  const sitemap = readFileSync(join(process.cwd(), "src/app/sitemap.ts"), "utf8");

  it("keeps directory authorization optional and unchecked by default", () => {
    expect(form).toContain('const [marketplaceAuthorized, setMarketplaceAuthorized] = useState(false)');
    expect(form).toContain('id="marketplaceAuthorized"');
    expect(form).not.toMatch(/id="marketplaceAuthorized"[\s\S]{0,200}required/);
  });

  it("uses the approved authorization copy", () => {
    expect(MARKETPLACE_AUTHORIZATION_COPY).toEqual({
      checkbox: "Quiero que mi negocio pueda aparecer en el directorio público de Puragenda.",
      details: "Puragenda podrá mostrar información pública de tu negocio, como nombre, rubro, ciudad y enlace para reservar. Puedes retirar esta autorización posteriormente.",
      disclaimer: "Autorizar la publicación no garantiza que el negocio aparezca inmediatamente en el directorio.",
    });
  });

  it("keeps marketplace indexing disabled and does not add marketplace expansion to the sitemap", () => {
    expect(MARKETPLACE_QUALITY_GATE.indexingEnabled).toBe(false);
    expect(sitemap).not.toContain("indexableMarketplaceCities");
    expect(sitemap).not.toContain("barberias/[city]");
  });
});
