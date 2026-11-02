import { describe, expect, it } from "vitest";
import config from "../../next.config";

describe("Auditoría 08 / privacidad de enlaces firmados en Next", () => {
  it("places the strict opt-out policy after general headers", async () => {
    const rules = await config.headers!();
    const index = rules.findIndex(rule => rule.source === "/contact-flow/:path*");
    expect(index).toBeGreaterThan(rules.findIndex(rule => rule.source === "/((?!widget).*)"));
    expect(rules[index].headers).toEqual(expect.arrayContaining([
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store" },
    ]));
  });
  it("protects signed widget URLs without changing ordinary widget embedding", async () => {
    const rules = await config.headers!();
    const plain = rules.findIndex(rule => rule.source === "/widget/:path*" && !rule.has && rule.headers.some(header => header.key === "Content-Security-Policy"));
    const signed = rules.findIndex(rule => rule.source === "/widget/:path*" && rule.has?.some(condition => condition.type === "query" && condition.key === "cf_ref"));
    expect(signed).toBeGreaterThan(plain);
    expect(rules[signed].headers).toContainEqual({ key: "Referrer-Policy", value: "no-referrer" });
    expect(rules[plain].headers).toContainEqual({ key: "Content-Security-Policy", value: "frame-ancestors *" });
  });
});
