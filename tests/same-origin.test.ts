import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { requireSameOrigin } from "@/server/security/same-origin";

describe("requireSameOrigin", () => {
  it("accepts the browser-visible forwarded host on Vercel", () => {
    const request = new NextRequest("https://internal-deployment.vercel.app/api/analytics/consent", {
      method: "POST",
      headers: { origin: "https://preview.example.com", host: "internal-deployment.vercel.app", "x-forwarded-host": "preview.example.com" },
    });
    expect(requireSameOrigin(request)).toBeNull();
  });

  it("rejects missing and cross-origin requests", () => {
    const missing = new NextRequest("https://preview.example.com/api/analytics/consent", { method: "POST" });
    const foreign = new NextRequest("https://preview.example.com/api/analytics/consent", { method: "POST", headers: { origin: "https://evil.example", host: "preview.example.com" } });
    expect(requireSameOrigin(missing)?.status).toBe(403);
    expect(requireSameOrigin(foreign)?.status).toBe(403);
  });
});
