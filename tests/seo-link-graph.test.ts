import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRelatedIndustries, industriesData } from "@/lib/data/industries";
import { PUBLIC_CONTACT } from "@/lib/json-ld";
import sitemap from "@/app/sitemap";

const root = process.cwd();

function readSrc(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

const MARKETING_SOURCES = [
  "src/components/landing/footer.tsx",
  "src/components/landing/navbar.tsx",
  "src/components/landing/ThemeNeoBrutalism.tsx",
  "src/components/landing/Theme70s.tsx",
  "src/components/landing/hero-section.tsx",
  "src/components/landing/contact-page-content.tsx",
  "src/app/layout.tsx",
  "src/app/alternativa-agendapro/page.tsx",
  "src/app/para/[industry]/page.tsx",
  "src/app/caracteristicas/page.tsx",
  "src/app/soluciones/page.tsx",
  "src/app/guias/page.tsx",
  "src/app/guias/[slug]/page.tsx",
  "src/app/funciones/[slug]/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/faq/page.tsx",
  "src/app/sobre-nosotros/page.tsx",
  "src/app/contacto/page.tsx",
];

const FOOTER_INDUSTRIES = ["peluquerias", "estetica", "barberias", "clinicas"];
const UNDERLINKED_INDUSTRIES = ["psicologos", "kinesiologos", "manicure", "tatuadores"];

describe("SEO-003 public link graph", () => {
  it("points the public footer dashboard entry at the 200 login URL", () => {
    const footer = readSrc("src/components/landing/footer.tsx");
    expect(footer).not.toContain('href="/dashboard"');
    expect(footer).toContain('href="/login"');
  });

  it("uses the canonical PuroCode Instagram profile in the footer", () => {
    const footer = readSrc("src/components/landing/footer.tsx");
    expect(PUBLIC_CONTACT.purocodeInstagram).toBe("https://www.instagram.com/purocodecl/");
    expect(footer).toContain("PUBLIC_CONTACT.purocodeInstagram");
    expect(footer).not.toContain("ig_web_button_share_sheet");
    expect(footer).not.toContain("igsh=");
  });

  it("points the document author link at the live www PuroCode URL", () => {
    const layout = readSrc("src/app/layout.tsx");
    expect(layout).toContain('url: "https://www.purocode.com"');
    expect(layout).not.toContain('url: "https://purocode.com"');
  });

  it("links the AgendaPro comparison to the current Chile destination", () => {
    const page = readSrc("src/app/alternativa-agendapro/page.tsx");
    expect(page).toContain('href="https://agendapro.com/cl"');
    expect(page).not.toContain("https://www.agendapro.com/");
  });

  it("does not emit absolute internal links to apex, http or Vercel preview hosts", () => {
    const sources = MARKETING_SOURCES.map(readSrc).join("\n");
    expect(sources).not.toMatch(/href=["']https?:\/\/puragenda\.cl/);
    expect(sources).not.toMatch(/href=["']http:\/\/www\.puragenda\.cl/);
    expect(sources).not.toMatch(/href=["']https?:\/\/puragenda\.vercel\.app/);
  });

  it("connects the four underlinked industry pages from related hubs", () => {
    const inbound = new Map<string, string[]>();
    for (const industry of industriesData) {
      for (const related of getRelatedIndustries(industry.slug)) {
        inbound.set(related.slug, [...(inbound.get(related.slug) ?? []), industry.slug]);
      }
    }

    for (const slug of UNDERLINKED_INDUSTRIES) {
      const parents = inbound.get(slug) ?? [];
      expect(parents.some((parent) => FOOTER_INDUSTRIES.includes(parent)), slug).toBe(true);
    }

    const home = readSrc("src/components/landing/ThemeNeoBrutalism.tsx");
    expect(home).toContain('href="/para/psicologos"');
    expect(home).toContain("Agenda online para psicólogos");
    expect(home).toContain('href="/para/manicure"');
    expect(home).toContain("Reservas para manicure");

    const industryPage = readSrc("src/app/para/[industry]/page.tsx");
    expect(industryPage).toContain("getRelatedIndustries");
    expect(industryPage).toContain("`/para/${item.slug}`");
  });

  it("keeps sitemap hubs and industry URLs discoverable from public navigation", () => {
    const footer = readSrc("src/components/landing/footer.tsx");
    const soluciones = readSrc("src/app/soluciones/page.tsx");
    expect(footer).toContain('href="/guias"');
    expect(footer).toContain('href="/alternativa-agendapro"');
    expect(soluciones).toContain("`/para/${industry.slug}`");
    expect(soluciones).toContain("`/funciones/${feature.slug}`");

    const sitemapPaths = sitemap().map((entry) => {
      const url = new URL(entry.url);
      return url.pathname === "/" ? "/" : url.pathname;
    });

    for (const industry of industriesData) {
      expect(sitemapPaths).toContain(`/para/${industry.slug}`);
      expect(getRelatedIndustries(industry.slug).length).toBeGreaterThan(0);
    }
  });
});
