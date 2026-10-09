import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";
import { NOINDEX_HEADER_SOURCES } from "./src/lib/crawler-policy";
import { marketplaceAliasRedirects } from "./src/lib/marketplace/taxonomy";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const upgradeInsecureRequests = process.env.NODE_ENV === "production"
  ? " upgrade-insecure-requests;"
  : "";
const unsafeEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const noIndexRoutes = [...NOINDEX_HEADER_SOURCES];

// Permanent (308) when the request reaches Next.js. The live apex 307 is
// Vercel's domain-level redirect, which runs before this config. See the
// SEO-001 follow-up notes for the Vercel Domains change required.
const canonicalHostRedirects = [
  {
    source: "/:path*",
    has: [{ type: "host" as const, value: "puragenda.cl" }],
    destination: "https://www.puragenda.cl/:path*",
    permanent: true,
  },
  {
    source: "/:path*",
    has: [{ type: "host" as const, value: "puragenda.vercel.app" }],
    destination: "https://www.puragenda.cl/:path*",
    permanent: true,
  },
];

const securityPolicy = `default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'${unsafeEval} https://sdk.mercadopago.com https://cdn.paddle.com https://*.posthog.com https://www.googletagmanager.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://*.googletagmanager.com; font-src 'self' data:; connect-src 'self' https://api.mercadopago.com https://secure-fields.mercadopago.com https://*.paddle.com https://*.posthog.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://www.googletagmanager.com https://*.googletagmanager.com; worker-src 'self' blob: data:; frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com https://*.paddle.com; frame-ancestors 'none';${upgradeInsecureRequests}`;

const nextConfig: NextConfig = {
  devIndicators: process.env.WEBSITE_PINK_Y2K_PREVIEW === "1" ? false : undefined,
  skipProxyUrlNormalize: true,
  distDir: process.env.WEBSITE_PINK_Y2K_PREVIEW === "1" && process.env.NODE_ENV !== "production" ? ".next-pink-y2k" : process.env.WEBSITE_BUILD_QA === "1" ? ".next-websites-build" : process.env.WEBSITE_QA === "1" ? ".next-websites-qa" : ".next",
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID ?? "",
  },
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [...canonicalHostRedirects, ...marketplaceAliasRedirects()];
  },
  async headers() {
    return [
      {
        source: "/website-preview/pink-y2k",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      ...noIndexRoutes.map((source) => ({
        source,
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      })),
      // Global security headers (all routes except widget)
      {
        source: "/((?!widget).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: securityPolicy,
          },
        ],
      },
      // Only authenticated internal previews may embed in their own origin.
      {
        source: "/website-preview",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: securityPolicy.replace("frame-ancestors 'none'", "frame-ancestors 'self'") },
        ],
      },
      // Widget: permissive frame policy for embedding
      {
        source: "/widget/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
