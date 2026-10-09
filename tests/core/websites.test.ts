import { describe, expect, it } from "vitest";
import { hasWebsiteEntitlement, websiteIsVisible, normalizeHostname, validSubdomain, websiteSubdomain } from "@/websites/policy";
import { bellaConfigSchema, emptyBellaConfig } from "@/websites/config";
import { resolveTemplate, templateRegistry } from "@/websites/registry";
import { fixtureView } from "@/websites/fixtures/views";
import { quoteService } from "@/websites/templates/bella/_lib/puragenda/validation";
import { quoteBookingSelection } from "@/core/booking-selection";
const now = new Date("2026-09-30T12:00:00Z");
const addon = { status: "ACTIVE", validUntil: "2026-10-30T12:00:00Z" };
const site = { status: "PUBLISHED", publishedConfig: {} };
describe("website visibility and entitlement", () => {
  it("requires published snapshot, operational subscription and paid addon", () => {
    expect(websiteIsVisible(site, addon, { status: "ACTIVE" }, null, now)).toBe(true);
    for (const state of ["DRAFT", "SUSPENDED"]) expect(websiteIsVisible({ ...site, status: state }, addon, { status: "ACTIVE" }, null, now)).toBe(false);
    expect(websiteIsVisible({ ...site, publishedConfig: null }, addon, { status: "ACTIVE" }, null, now)).toBe(false);
    expect(websiteIsVisible(site, null, { status: "ACTIVE" }, null, now)).toBe(false);
    expect(websiteIsVisible(site, addon, { status: "ACTIVE" }, now, now)).toBe(false);
  });
  it("retains entitlement only until the end of scheduled cancellation", () => {
    const scheduled = { ...addon, cancelAt: "2026-10-01T00:00:00Z" };
    expect(hasWebsiteEntitlement(scheduled, now)).toBe(true);
    expect(hasWebsiteEntitlement(scheduled, new Date(scheduled.cancelAt))).toBe(false);
    expect(hasWebsiteEntitlement({ ...addon, validUntil: "invalid" }, now)).toBe(false);
    expect(hasWebsiteEntitlement({ ...addon, validUntil: "2026-09-29", cancelAt: "2026-11-01" }, now)).toBe(false);
    for (const status of ["INACTIVE", "PAST_DUE", "CANCELLED"]) expect(hasWebsiteEntitlement({ ...addon, status }, now)).toBe(false);
  });
  it("uses existing trial/dunning rules for the base plan", () => {
    expect(websiteIsVisible(site, addon, { status: "TRIALING", isTrial: true, trialEndsAt: "2026-10-01" }, null, now)).toBe(true);
    expect(websiteIsVisible(site, addon, { status: "TRIALING", isTrial: true, trialEndsAt: "2026-09-01" }, null, now)).toBe(false);
    expect(websiteIsVisible(site, addon, { status: "PAST_DUE", gracePeriodEndsAt: "2026-10-01" }, null, now)).toBe(true);
    expect(websiteIsVisible(site, addon, { status: "PAST_DUE", gracePeriodEndsAt: "2026-09-01" }, null, now)).toBe(false);
    expect(websiteIsVisible(site, addon, { status: "CANCELLED" }, null, now)).toBe(false);
  });
});
describe("hostname resolution", () => {
  it("matches exactly one subdomain, never suffix tricks or reserved names", () => {
    expect(websiteSubdomain("bella.puragenda.cl")).toBe("bella");
    expect(websiteSubdomain("bella-a.localhost:3005", "localhost")).toBe("bella-a");
    for (const host of ["www.puragenda.cl", "bella.puragenda.cl.evil.cl", "puragenda.cl", "a.b.puragenda.cl"]) expect(websiteSubdomain(host)).toBeNull();
    for (const value of ["WWW", "admin", "bad_name", "-bad", "bad-", "a".repeat(64)]) expect(validSubdomain(value)).toBe(false);
    expect(normalizeHostname("Bella.Example.cl:3005")).toBe("bella.example.cl");
    for (const host of ["x/../b", "x@y.cl", "x,y.cl", "x..cl", "x\ny.cl"]) expect(() => normalizeHostname(host)).toThrow();
  });
});
describe("template schema and tenant content", () => {
  it("provides Y2K, Bella, Matchday and Ritual v1 and rejects unknown keys and versions", () => {
    expect(Object.keys(templateRegistry)).toEqual(["y2k", "bella", "matchday", "ritual"]);
    expect(resolveTemplate("y2k", 1).name).toBe("Y2K");
    expect(resolveTemplate("bella", 1).name).toBe("Bella");
    expect(resolveTemplate("ritual", 1).name).toBe("Ritual");
    expect(() => resolveTemplate("bella", 2)).toThrow();
    expect(() => resolveTemplate("fake", 1)).toThrow();
  });
  it("rejects custom CSS, duplicate commerce data, unsafe links/media and oversized galleries", () => {
    for (const input of [{ css: "body{}" }, { services: [] }, { heroImage: "javascript:alert(1)" }, { heroImage: "//evil.cl/img" }, { heroImage: "/%2e%2e/private" }, { heroImage: "/%5cprivate" }, { heroImage: "/%00.webp" }, { instagram: "http://example.cl" }, { gallery: Array(31).fill({ image: "/a.webp" }) }, { accent: "anything" }]) expect(bellaConfigSchema.safeParse(input).success).toBe(false);
    expect(emptyBellaConfig().gallery).toEqual([]);
    expect(emptyBellaConfig().heroImage).toBe("");
  });
  it("A/B share design with separate brands, catalogs, staff and images", () => {
    const a = fixtureView("a"), b = fixtureView("b");
    expect(a.config.schemaVersion).toBe(b.config.schemaVersion);
    expect(a.business.name).not.toBe(b.business.name);
    expect(a.config.heroImage).not.toBe(b.config.heroImage);
    expect(a.config.accent).not.toBe(b.config.accent);
    expect(b.catalog.services.every(service => !a.catalog.services.some(other => other.id === service.id))).toBe(true);
    expect(b.catalog.staff.every(staff => !a.catalog.staff.some(other => other.id === staff.id))).toBe(true);
  });
  it("uses canonical option pricing instead of a template pricing engine", () => {
    const service = fixtureView("a").catalog.services.find(item => item.id === "nail-art")!;
    expect(quoteBookingSelection([service], ["medio"])).toMatchObject(quoteService(service, ["medio"]));
  });
});
