import { describe, expect, it } from "vitest";
import { bellaConfigSchema } from "@/websites/config";
import { matchdayConfigSchema } from "@/websites/templates/matchday/config";
import { ritualConfigSchema, emptyRitualConfig, readRitualConfig } from "@/websites/templates/ritual/config";
import { ritualGallery, ritualGalleryCategories, ritualGalleryWindow, ritualServiceLimit } from "@/websites/templates/ritual/gallery";
import { parseRitualPreview } from "@/websites/templates/ritual/preview";
import { PREVIEW_PROTOCOL } from "@/websites/preview-transport";
import { RITUAL_PALETTES, ritualTokens, validRitualPalette } from "@/websites/templates/ritual/palettes";
import { ritualFixture, ritualTerapiasSecFixture, ritualTerapiasSecRealisticFixture } from "@/websites/fixtures/ritual";
import { resolveTemplate, templateRegistry } from "@/websites/registry";
import { templateSwitchDraft } from "@/websites/template-snapshots";
import { galleryCategoryLabelError } from "@/websites/gallery-categories";
describe("Ritual template", () => {
  it("is independently registered and has safe defaults", () => {
    expect(Object.keys(templateRegistry)).toEqual(["y2k", "bella", "matchday", "ritual"]);
    expect(resolveTemplate("ritual", 1).name).toBe("Ritual");
    expect(emptyRitualConfig().headline).toBe("Una pausa hecha a tu medida.");
  });
  it("does not accept Bella or Matchday configs", () => {
    expect(() => ritualConfigSchema.parse(bellaConfigSchema.parse({}))).toThrow();
    expect(() => ritualConfigSchema.parse(matchdayConfigSchema.parse({}))).toThrow();
  });
  it("uses manual gallery, then service images, then no section", () => {
    const view = ritualFixture("casa");
    expect(ritualGallery(view.config, view.catalog)).toHaveLength(new Set(view.catalog.services.filter(x => x.image).map(x => x.image)).size);
    expect(ritualGallery(emptyRitualConfig(), view.catalog).some(image => image.categoryIds?.length)).toBe(true);
    expect(ritualGalleryCategories(emptyRitualConfig(), view.catalog).length).toBeGreaterThan(0);
    const manual = ritualConfigSchema.parse({ gallery: [{ image: "/custom.webp", name: "Detalle", alt: "Detalle" }] });
    expect(ritualGallery(manual, view.catalog)[0].image).toBe("/custom.webp");
    const noImages = { ...view.catalog, services: view.catalog.services.map(service => ({ ...service, image: "" })) };
    expect(ritualGallery(emptyRitualConfig(), noImages)).toEqual([]);
  });
  it("migrates V1 palette and exposes V2 density controls", () => {
    const legacy = { schemaVersion: 1, customPalette: { accent: "#a85b3b", onAccent: "#fffaf2", paper: "#f3ede3", ink: "#2f241e", muted: "#78685b" } };
    const migrated = readRitualConfig(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.customPalette?.background).toBe("#f3ede3");
    expect(ritualServiceLimit(2)).toBe(2);
    expect(ritualServiceLimit(6)).toBe(6);
    expect(ritualServiceLimit(12)).toBe(6);
    expect(ritualGalleryWindow([1, 2, 3], 2, 6).items).toEqual([3, 1, 2]);
    expect(RITUAL_PALETTES.every(palette => validRitualPalette(ritualTokens({ accent: palette.key, paletteMode: "preset", customPalette: undefined })))).toBe(true);
  });
  it("migrates legacy sensorial copy and stable gallery categories", () => {
    const migrated = readRitualConfig({ sensorial: { eyebrow: "Antes" }, copy: { pauseTitle: "Llegar", pauseBody: "Respirar" }, gallery: [{ image: "/detail.webp", name: "Detalle", alt: "Detalle", category: "Espacio" }] });
    expect(migrated.sensorial.title).toBe("Llegar");
    expect(migrated.sensorial.body).toBe("Respirar");
    expect(migrated.galleryCategories[0]?.id).toMatch(/^cat-/);
    expect(migrated.gallery[0]?.categoryIds).toEqual([migrated.galleryCategories[0]?.id]);
  });
  it("accepts the live preview protocol and custom palette draft", () => {
    const config = emptyRitualConfig();
    const parsed = parseRitualPreview({ protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 1, config: { ...config, paletteMode: "custom", customPalette: { background: "#f3ede3", surface: "#fffaf2", text: "#2f241e", muted: "#78685b", accent: "#a85b3b", accentContrast: "#fffaf2", line: "#d8cabe", warm: "#d9b79c", dark: "#2f241e" } } }, "http://localhost:3005");
    expect(parsed.success).toBe(true);
  });
  it("keeps fixture tenants isolated", () => {
    const casa = ritualFixture("casa"), pulso = ritualFixture("pulso");
    expect(casa.business.id).not.toBe(pulso.business.id);
    expect(casa.catalog.services[0].id).not.toBe(pulso.catalog.services[0].id);
    expect(casa.config.displayName).not.toBe(pulso.config.displayName);
  });
  it("provides a Terapias SEC equivalent stress fixture", () => {
    const view = ritualTerapiasSecFixture(25);
    expect([2, 6, 12, 25].map(count => ritualTerapiasSecFixture(count).catalog.services.length)).toEqual([2, 6, 12, 25]);
    expect(view.business.name).toBe("Terapias SEC");
    expect(view.catalog.services).toHaveLength(25);
    expect(view.config.gallery).toHaveLength(12);
    expect(view.catalog.locations).toHaveLength(2);
    expect(view.catalog.services[0].optionCategories[0]?.name).toBe("Zona");
    expect(view.config.visibility.showGallery).toBe(true);
  });
  it("provides a sanitized realistic density fixture", () => {
    const view = ritualTerapiasSecRealisticFixture();
    expect(view.catalog.services.length).toBeGreaterThanOrEqual(20);
    expect(view.catalog.staff).toHaveLength(3);
    expect(view.catalog.services.some(service => !service.image)).toBe(true);
    expect(view.config.gallery).toHaveLength(7);
    expect(new Set(view.catalog.services.map(service => service.categoryId)).size).toBeGreaterThan(1);
  });
  it("keeps draft snapshots when switching Bella to Ritual and back", () => {
    const bella = bellaConfigSchema.parse({ heroImage: "/bella.webp", headline: "Bella" });
    const site = { templateKey: "bella", templateVersion: 1, draftConfig: bella, templateConfigs: {} };
    const ritual = templateSwitchDraft(site, "ritual", 1);
    expect(ritual.config.heroImage).toBe("/bella.webp");
    const back = templateSwitchDraft({ ...site, templateKey: "ritual", templateVersion: 1, draftConfig: ritual.config, templateConfigs: ritual.snapshots }, "bella", 1);
    expect(back.config.headline).toBe("Bella");
  });
  it("provides every public copy default and exactly five branded booking labels", () => {
    const config = emptyRitualConfig();
    expect(config.copy.featuredEyebrow).toBe("Tratamiento destacado");
    expect(config.copy.allServices).toBe("Mostrar {count} más");
    expect(config.copy.bookingSteps).toEqual(["Tratamiento", "Profesional", "Día y hora", "Tus datos", "Confirma"]);
    expect(config.copy.nav.reserve).toBe("Reservar");
    expect(ritualConfigSchema.safeParse({ ...config, copy: { ...config.copy, bookingSteps: ["Uno"] } }).success).toBe(false);
    expect(ritualConfigSchema.safeParse({ ...config, copy: { ...config.copy, bookingSteps: [...config.copy.bookingSteps, "Seis"] } }).success).toBe(false);
  });
  it("persists branded copy through parsing and switching snapshots without changing the template version", () => {
    const initial = emptyRitualConfig();
    const config = ritualConfigSchema.parse({ ...initial, heroCaption: "Tu pausa comienza aquí", copy: { ...initial.copy, featuredTitle: "A tu ritmo", staffNote: "Nuestro equipo", galleryNote: "Un lugar preparado", bookingTitle: "Encuentra tu hora", footerStatement: "Vuelve a ti", bookingSteps: ["Práctica", "Acompañante", "Momento", "Contacto", "Revisar"] } });
    expect(readRitualConfig(JSON.parse(JSON.stringify(config)))).toEqual(config);
    const site = { templateKey: "ritual", templateVersion: 1, draftConfig: config, templateConfigs: {} };
    const matchday = templateSwitchDraft(site, "matchday", 1);
    const restored = templateSwitchDraft({ ...site, templateKey: "matchday", draftConfig: matchday.config, templateConfigs: matchday.snapshots }, "ritual", 1);
    expect(restored.config).toEqual(config);
    expect(resolveTemplate("ritual", 1).version).toBe(1);
  });
  it("keeps the canonical sensorial values over legacy copy", () => {
    const config = readRitualConfig({ sensorial: { title: "Nuevo", body: "Actual" }, copy: { pauseTitle: "Viejo", pauseBody: "Anterior" } });
    expect(config.sensorial.title).toBe("Nuevo");
    expect(config.sensorial.body).toBe("Actual");
    expect(config.copy).not.toHaveProperty("pauseTitle");
  });
  it("rejects empty and duplicate category renames locally and in the write schema", () => {
    const categories = [{ id: "cat-a", label: "Masajes", order: 0 }, { id: "cat-b", label: "Rituales", order: 1 }];
    expect(galleryCategoryLabelError(" ", categories, "cat-a")).toBe("Escribe un nombre para la categoría.");
    expect(galleryCategoryLabelError(" mAsAjEs ", categories, "cat-b")).toBe("Ya existe una categoría con ese nombre.");
    expect(galleryCategoryLabelError("Masajes", categories, "cat-a")).toBeUndefined();
    expect(ritualConfigSchema.safeParse({ galleryCategories: [{ ...categories[0], label: " " }] }).success).toBe(false);
    expect(ritualConfigSchema.safeParse({ galleryCategories: [categories[0], { ...categories[1], label: "MASAJES" }] }).success).toBe(false);
  });
  it("accepts nested focus keys without accepting selector injection", () => {
    const envelope = { protocol: PREVIEW_PROTOCOL, type: "draft", sequence: 1, config: emptyRitualConfig() };
    expect(parseRitualPreview({ ...envelope, focus: "sensorial.title" }, "http://localhost:3005").success).toBe(true);
    expect(parseRitualPreview({ ...envelope, focus: "bookingSteps.4" }, "http://localhost:3005").success).toBe(true);
    expect(parseRitualPreview({ ...envelope, focus: 'x"]' }, "http://localhost:3005").success).toBe(false);
  });
});
