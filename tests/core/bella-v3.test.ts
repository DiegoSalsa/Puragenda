import { describe, expect, it } from "vitest";
import { bellaConfigSchema, emptyBellaConfig } from "@/websites/config";
import { assignCategory, categoryId, categoryIdsForImage, normalizeGalleryCategories, removeCategoryFromConfig } from "@/websites/templates/bella/categories";
import { contrastRatio, validatePalette } from "@/websites/palettes";
describe("Bella V3 copy, categories and controlled palettes", () => {
  it("keeps V1 config compatible and supplies typed copy defaults", () => {
    const config = bellaConfigSchema.parse({ schemaVersion: 1, headline: "Título muy largo" });
    expect(config.schemaVersion).toBe(1); expect(config.copy.gallery.title).toBe("En primer plano."); expect(config.galleryCategories).toEqual([]);
  });
  it("migrates legacy labels to stable category IDs and supports multiple assignments", () => {
    const base = emptyBellaConfig(); const categories = normalizeGalleryCategories({ ...base, galleryFilters: ["Chrome", "Nail art"] });
    const image = assignCategory({ image: "/work.webp", name: "Trabajo", alt: "", category: "Chrome", filters: ["Chrome"] }, [categories[0].id, categories[1].id], categories);
    expect(categories[0].id).toBe(categoryId("Chrome")); expect(categoryIdsForImage(image, categories)).toEqual([categories[0].id, categories[1].id]);
    const removed = removeCategoryFromConfig({ ...base, galleryCategories: categories, gallery: [image] }, categories[0].id);
    expect(removed.gallery[0].categoryIds).toEqual([categories[1].id]); expect(removed.gallery).toHaveLength(1);
  });
  it("validates essential custom color contrast without altering user input", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeGreaterThan(20); expect(validatePalette({ primary: "#ffff00", text: "#ffffff", background: "#ffffff", ink: "#ffffff" }).valid).toBe(false);
  });
  it("accepts adversarial copy lengths within controlled limits", () => {
    const config = bellaConfigSchema.parse({ copy: { gallery: { marquee: ["x".repeat(120)] } }, displayName: "Centro Integral de Estética y Belleza Carolina Fernández" });
    expect(config.copy.gallery.marquee[0]).toHaveLength(120);
  });
});
