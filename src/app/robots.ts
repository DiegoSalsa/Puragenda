import type { MetadataRoute } from "next";
import {
  ROBOTS_DISALLOW_PREFIXES,
  SEARCH_AND_RETRIEVAL_USER_AGENTS,
} from "@/lib/crawler-policy";
import { absoluteUrl } from "@/lib/site";

const publicCrawlRule = {
  allow: "/",
  disallow: [...ROBOTS_DISALLOW_PREFIXES],
};

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        ...publicCrawlRule,
      },
      // One group per crawler: some auditors fail to apply Allow when several
      // User-agent lines share a single rule block.
      ...SEARCH_AND_RETRIEVAL_USER_AGENTS.map((userAgent) => ({
        userAgent,
        ...publicCrawlRule,
      })),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
