import type { MetadataRoute } from "next";
import { isNoIndexPath, isPathDisallowedForCrawler } from "@/lib/crawler-policy";
import { industriesData } from "@/lib/data/industries";
import { guides } from "@/lib/data/guides";
import { getIndexableMarketplaceSitemapEntries } from "@/lib/marketplace";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { featureSolutions } from "@/lib/data/feature-solutions";
import { CASE_STUDIES_PATH, caseStudyPath, getIndexableCaseStudyPaths, getPublishedCaseStudies } from "@/lib/data/case-studies";

const contentUpdatedAt = new Date("2026-09-01T00:00:00-04:00");

function sitemapUrl(path: string) {
  // Homepage canonical is https://www.puragenda.cl (no trailing slash).
  return path === "/" ? SITE_URL : absoluteUrl(path);
}

function isSitemapEligible(path: string) {
  return !isPathDisallowedForCrawler(path) && !isNoIndexPath(path);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    ["/", "weekly", 1],
    ["/sistema-de-agendamiento-online", "weekly", 0.9],
    ["/software-agenda-barberias", "weekly", 0.9],
    ["/software-agenda-peluquerias", "weekly", 0.9],
    ["/software-agenda-manicure", "weekly", 0.9],
    ["/pricing", "monthly", 0.8],
    ["/soluciones", "monthly", 0.8],
    ["/caracteristicas", "monthly", 0.8],
    ["/faq", "monthly", 0.7],
    ["/contacto", "monthly", 0.6],
    ["/sobre-nosotros", "monthly", 0.7],
    ["/alternativa-agendapro", "monthly", 0.8],
    ["/terminos-y-condiciones", "yearly", 0.2],
    ["/politica-de-privacidad", "yearly", 0.2],
    ["/politica-de-reembolsos", "yearly", 0.2],
    ["/guias", "weekly", 0.9],
  ]
    .filter(([path]) => isSitemapEligible(path as string))
    .map(([path, changeFrequency, priority]) => ({
      url: sitemapUrl(path as string),
      lastModified: contentUpdatedAt,
      changeFrequency: changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
      priority: priority as number,
    }));

  const industryRoutes: MetadataRoute.Sitemap = industriesData
    .map((industry) => `/para/${industry.slug}`)
    .filter(isSitemapEligible)
    .map((path) => ({
      url: sitemapUrl(path),
      lastModified: contentUpdatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  const guideRoutes: MetadataRoute.Sitemap = guides
    .map((guide) => ({ guide, path: `/guias/${guide.slug}` }))
    .filter(({ path }) => isSitemapEligible(path))
    .map(({ guide, path }) => ({
      url: sitemapUrl(path),
      lastModified: new Date(`${guide.updatedAt}T00:00:00-04:00`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  const featureRoutes: MetadataRoute.Sitemap = featureSolutions
    .map((feature) => `/funciones/${feature.slug}`)
    .filter(isSitemapEligible)
    .map((path) => ({
      url: sitemapUrl(path),
      lastModified: contentUpdatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    }));

  const publishedCases = getPublishedCaseStudies();
  const caseStudyRoutes: MetadataRoute.Sitemap = getIndexableCaseStudyPaths()
    .filter(isSitemapEligible)
    .map((path) => {
      const item = publishedCases.find((entry) => caseStudyPath(entry.slug) === path);
      return {
        url: sitemapUrl(path),
        lastModified: item ? new Date(`${item.updatedAt}T00:00:00-04:00`) : contentUpdatedAt,
        changeFrequency: (path === CASE_STUDIES_PATH ? "weekly" : "monthly") as MetadataRoute.Sitemap[number]["changeFrequency"],
        priority: 0.8,
      };
    });

  const marketplaceRoutes = getIndexableMarketplaceSitemapEntries().filter((entry) => {
    const path = new URL(entry.url).pathname === "/" ? "/" : new URL(entry.url).pathname;
    return isSitemapEligible(path);
  });

  return [...staticRoutes, ...featureRoutes, ...industryRoutes, ...guideRoutes, ...caseStudyRoutes, ...marketplaceRoutes];
}
