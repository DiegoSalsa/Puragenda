import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const upgradeInsecureRequests = process.env.NODE_ENV === "production"
  ? " upgrade-insecure-requests;"
  : "";
const unsafeEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const noIndexRoutes = [
  "/dashboard/:path*",
  "/login",
  "/register",
  "/widget/:path*",
  "/cita/:path*",
  "/encargo/:path*",
  "/mi-plan/:path*",
  "/mis-premios/:path*",
  "/reagendar/:path*",
  "/responder/:path*",
  "/para/x7k9m2v4q8/:path*",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
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
            value: `default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'${unsafeEval} https://sdk.mercadopago.com https://cdn.paddle.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self' data:; connect-src 'self' https://api.mercadopago.com https://secure-fields.mercadopago.com https://*.paddle.com; frame-src 'self' https://*.mercadopago.com https://*.mercadolibre.com https://*.paddle.com; frame-ancestors 'none';${upgradeInsecureRequests}`,
          },
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
