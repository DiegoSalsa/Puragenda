import { describe, expect, it } from "vitest";
import { resolveTemplate } from "@/websites/registry";
import { DEFAULT_MATCHDAY_MARQUEE, emptyMatchdayConfig, matchdayConfigSchema, readMatchdayConfig } from "@/websites/templates/matchday/config";
import { matchdayTokens, validMatchdayPalette } from "@/websites/templates/matchday/palettes";
import { matchdayGallery } from "@/websites/templates/matchday/gallery";
import { templateSwitchDraft, websiteTemplate } from "@/websites/template-snapshots";
import { fixtureView } from "@/websites/fixtures/views";
import { matchdayFixture } from "@/websites/fixtures/matchday";
import { parseMatchdayPreview } from "@/websites/templates/matchday/preview";
import { PREVIEW_PROTOCOL, trustedPreviewSender } from "@/websites/preview-protocol";
import { storedMediaUrls } from "@/websites/stored-media";
describe("Matchday 1 and template independence", () => {
  it("resolves separate schema/editor capabilities and rejects unknown versions", () => {
    expect(resolveTemplate("matchday", 1).capabilities).toMatchObject({ staffEditorial: true, process: false });
    expect(resolveTemplate("bella", 1).capabilities).toMatchObject({ staffEditorial: false, process: true });
    expect(() => resolveTemplate("matchday", 2)).toThrow();
    expect(() => resolveTemplate("__proto__", 1)).toThrow();
    expect(matchdayConfigSchema.safeParse(fixtureView("a").config).success).toBe(false);
    expect(() => resolveTemplate("bella", 1).configSchema.parse(emptyMatchdayConfig())).toThrow();
  });
  it("restores both configs without mutating canonical data or published identity", () => {
    const bella = fixtureView("a");
    const site = { templateKey: "bella", templateVersion: 1, draftConfig: bella.config, publishedTemplateKey: "bella", publishedTemplateVersion: 1 };
    const switched = templateSwitchDraft(site, "matchday", 1);
    expect(switched.config.heroImage).toBe(bella.config.heroImage);
    expect("process" in switched.config).toBe(false);
    const custom = { ...switched.config, headline: "Nuestro corte", staffEditorial: { one: { visualNumber: "73", label: "Detalle", visible: true } } };
    const back = templateSwitchDraft({ ...site, templateKey: "matchday", draftConfig: custom, templateConfigs: switched.snapshots }, "bella", 1);
    expect(back.config).toEqual(resolveTemplate("bella", 1).readConfig(bella.config));
    expect(templateSwitchDraft({ ...site, draftConfig: back.config, templateConfigs: back.snapshots }, "matchday", 1).config).toEqual(custom);
    expect(websiteTemplate({ ...site, templateKey: "matchday" }, false)).toEqual({ key: "bella", version: 1 });
    expect(bella.catalog.staff).toEqual(fixtureView("a").catalog.staff);
  });
  it("prefers manual gallery, falls back exclusively to real service images, otherwise hides", () => {
    const view = matchdayFixture("soccerbarber");
    expect(matchdayGallery(view.config, view.catalog)).toEqual(view.config.gallery);
    const fallback = matchdayGallery({ gallery: [] }, view.catalog);
    expect(fallback.every(image => view.catalog.services.some(service => service.image === image.image))).toBe(true);
    expect(new Set(fallback.map(i => i.image)).size).toBe(fallback.length);
    expect(matchdayGallery({ gallery: [] }, { ...view.catalog, services: view.catalog.services.map(s => ({ ...s, image: "" })) })).toEqual([]);
    expect(emptyMatchdayConfig().heroImage).toBe("");
    expect(emptyMatchdayConfig().gallery).toEqual([]);
    expect(emptyMatchdayConfig().marquee).toEqual([...DEFAULT_MATCHDAY_MARQUEE]);
    expect(readMatchdayConfig({ marquee: [] }).marquee).toEqual([...DEFAULT_MATCHDAY_MARQUEE]);
  });
  it.each(["signal", "ice", "terrain"] as const)("validates %s palette and blocks unreadable custom colors", accent => {
    expect(validMatchdayPalette(matchdayTokens({ ...emptyMatchdayConfig(), accent }))).toBe(true);
    expect(validMatchdayPalette({ accent: "#ffffff", onAccent: "#ffffff", paper: "#ffffff", ink: "#ffffff" })).toBe(false);
  });
  it("validates gallery references, rejects scripts and foreign blob origins", () => {
    expect(matchdayConfigSchema.safeParse({ heroImage: "javascript:alert(1)" }).success).toBe(false);
    expect(matchdayConfigSchema.safeParse({ staffEditorial: { one: { name: "rename canonical staff" } } }).success).toBe(false);
    const config = matchdayFixture("soccerbarber").config;
    expect(matchdayConfigSchema.safeParse({ ...config, gallery: [{ ...config.gallery[0], categoryIds: ["cat-missing"] }] }).success).toBe(false);
    const message = { protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 1, config: { ...config, heroImage: "blob:http://localhost:3005/123" } };
    expect(parseMatchdayPreview(message, "http://localhost:3005").success).toBe(true);
    expect(parseMatchdayPreview(message, "https://foreign.test").success).toBe(false);
    const parent = {} as Window;
    expect(trustedPreviewSender({ origin: "http://localhost:3005", source: parent }, parent, "http://localhost:3005")).toBe(true);
    expect(trustedPreviewSender({ origin: "http://localhost:3005", source: {} as Window }, parent, "http://localhost:3005")).toBe(false);
    expect(storedMediaUrls({ "matchday@1": config })).toContain(config.heroImage);
  });
  it("adapts to distinct local businesses and arbitrary names without brand dependencies", () => {
    const a = matchdayFixture("soccerbarber"), b = matchdayFixture("distrito");
    expect(a.catalog.staff[1].serviceIds).toHaveLength(1);
    expect(a.config.accent).not.toBe(b.config.accent);
    expect(a.config.copy.staffTitle).not.toBe(b.config.copy.staffTitle);
    for (const brandTitle of ["BARBER 73", "DISTRITO", "BLACKLINE BARBER SHOP", "CENTRO DE BARBERÍA Y PELUQUERÍA MASCULINA FERNÁNDEZ"]) expect(matchdayConfigSchema.parse({ brandTitle }).brandTitle).toBe(brandTitle);
  });
});
