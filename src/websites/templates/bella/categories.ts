import { bellaConfigBaseSchema, bellaConfigSchema, type BellaConfig } from "../../config";

export type BellaCategory = BellaConfig["galleryCategories"][number];
import { categoryId } from "../../gallery-categories";
export { categoryId } from "../../gallery-categories";

export function normalizeGalleryCategories(config: Pick<BellaConfig, "galleryCategories" | "galleryFilters" | "gallery">) {
  const categories: BellaCategory[] = [];
  const seen = new Set<string>();
  const add = (label: string, id?: string) => {
    const clean = label.trim(); if (!clean || seen.has(clean.toLowerCase())) return;
    const stable = id && /^cat-[a-z0-9-]{1,60}$/.test(id) && !categories.some(item => item.id === id) ? id : categoryId(clean, categories.map(item => item.id));
    seen.add(clean.toLowerCase()); categories.push({ id: stable, label: clean, order: categories.length });
  };
  for (const item of config.galleryCategories ?? []) add(item.label, item.id);
  // Once IDs exist, labels are display data and cannot recreate deleted rows.
  if (config.galleryCategories.length || config.gallery.some(image => image.categoryIds !== undefined)) return categories;
  for (const item of config.galleryFilters ?? []) add(item);
  for (const item of config.gallery ?? []) { add(item.category); for (const label of item.filters ?? []) add(label); }
  return categories.map((item, order) => ({ ...item, order }));
}

export function categoryIdsForImage(image: BellaConfig["gallery"][number], categories: BellaCategory[]) {
  if (image.categoryIds !== undefined) return image.categoryIds.filter(id => categories.some(item => item.id === id));
  const labels = [image.category, ...(image.filters ?? [])].filter(Boolean).map(value => value.toLowerCase());
  return [...new Set(labels.map(label => categories.find(item => item.label.toLowerCase() === label)?.id).filter((id): id is string => !!id))];
}

export function assignCategory(image: BellaConfig["gallery"][number], ids: string[], categories: BellaCategory[]) {
  const selected = [...new Set(ids)].map(id => categories.find(item => item.id === id)).filter((item): item is BellaCategory => !!item);
  return { ...image, categoryIds: selected.map(item => item.id), category: selected[0]?.label ?? "", filters: selected.map(item => item.label) };
}

export function removeCategoryFromConfig(config: BellaConfig, id: string) {
  const categories = config.galleryCategories.filter(item => item.id !== id).map((item, order) => ({ ...item, order }));
  const gallery = config.gallery.map(image => assignCategory(image, (image.categoryIds ?? categoryIdsForImage(image, config.galleryCategories)).filter(value => value !== id), categories));
  const process = config.process.map(image => ({ ...image, ...assignCategory(image, categoryIdsForImage(image, config.galleryCategories).filter(value => value !== id), categories) }));
  return { ...config, galleryCategories: categories, gallery, process };
}

/** Convert V1 label/filter data to the stable-ID representation before persistence. */
export function migrateBellaCategories(input: unknown): BellaConfig {
  const config = bellaConfigSchema.parse(input);
  const categories = normalizeGalleryCategories(config);
  const gallery = config.gallery.map(image => assignCategory(image, categoryIdsForImage(image, categories), categories));
  const process = config.process.map(image => ({ ...image, ...assignCategory(image, categoryIdsForImage(image, categories), categories) }));
  return bellaConfigSchema.parse({ ...config, schemaVersion: 2, galleryCategories: categories, galleryFilters: [], gallery, process });
}

/** Stored legacy data is repaired on read; new writes still pass the strict schema. */
export function readBellaConfig(input: unknown): BellaConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) return bellaConfigSchema.parse(input);
  const raw = input as Record<string, unknown>;
  const rows = Array.isArray(raw.galleryCategories) ? raw.galleryCategories : [];
  const categories: BellaCategory[] = [];
  const aliases = new Map<string, string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const label = typeof item.label === "string" ? item.label.trim().slice(0, 80) : "";
    if (!label) continue;
    const existing = categories.find(category => category.label.toLowerCase() === label.toLowerCase());
    const id = typeof item.id === "string" && /^cat-[a-z0-9-]{1,60}$/.test(item.id) && !categories.some(category => category.id === item.id) ? item.id : categoryId(label, categories.map(category => category.id));
    const canonical = existing?.id ?? id;
    if (!existing) categories.push({ id: canonical, label, order: categories.length });
    if (typeof item.id === "string" && !aliases.has(item.id)) aliases.set(item.id, canonical);
  }
  const images = (value: unknown) => Array.isArray(value) ? value.map(image => {
    if (!image || typeof image !== "object") return image;
    const item = image as Record<string, unknown>;
    return { ...item, ...(Array.isArray(item.categoryIds) ? { categoryIds: [...new Set(item.categoryIds.map(id => aliases.get(String(id))).filter((id): id is string => !!id))] } : {}) };
  }) : value;
  const config = bellaConfigBaseSchema.parse({ ...raw, galleryCategories: categories, ...(raw.gallery ? { gallery: images(raw.gallery) } : {}), ...(raw.process ? { process: images(raw.process) } : {}) });
  return migrateBellaCategories(config);
}
