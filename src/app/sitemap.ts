import type { MetadataRoute } from "next";
import { industriesData } from "@/lib/data/industries";
import { guides } from "@/lib/data/guides";
import { absoluteUrl } from "@/lib/site";

const contentUpdatedAt = new Date("2026-07-23T00:00:00-04:00");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    ["/", "weekly", 1],
    ["/pricing", "monthly", 0.8],
    ["/soluciones", "monthly", 0.8],
    ["/caracteristicas", "monthly", 0.8],
    ["/faq", "monthly", 0.7],
    ["/contacto", "monthly", 0.6],
    ["/sobre-nosotros", "monthly", 0.7],
    ["/alternativa-agendapro", "monthly", 0.8],
    ["/terminos-y-condiciones", "yearly", 0.2],
    ["/politica-de-privacidad", "yearly", 0.2],
    ["/guias", "weekly", 0.9],
  ].map(([path, changeFrequency, priority]) => ({
    url: absoluteUrl(path as string),
    lastModified: contentUpdatedAt,
    changeFrequency: changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: priority as number,
  }));

  const industryRoutes: MetadataRoute.Sitemap = industriesData.map((industry) => ({
    url: absoluteUrl(`/para/${industry.slug}`),
    lastModified: contentUpdatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const guideRoutes: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: absoluteUrl(`/guias/${guide.slug}`),
    lastModified: new Date(`${guide.updatedAt}T00:00:00-04:00`),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...industryRoutes, ...guideRoutes];
}
