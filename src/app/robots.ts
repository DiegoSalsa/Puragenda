import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

const privateRoutes = [
  "/dashboard/",
  "/api/",
  "/admin/",
  "/auth/",
  "/cita/",
  "/encargo/",
  "/mi-plan/",
  "/mis-premios/",
  "/reagendar/",
  "/responder/",
  "/para/x7k9m2v4q8/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateRoutes,
      },
      {
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "Googlebot",
          "bingbot",
          "PerplexityBot",
          "Perplexity-User",
          "Claude-SearchBot",
          "Claude-User",
        ],
        allow: "/",
        disallow: privateRoutes,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
