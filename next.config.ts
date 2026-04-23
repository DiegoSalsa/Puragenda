import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-api-key" },
        ],
      },
      {
        source: "/widget/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
