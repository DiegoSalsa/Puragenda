import { bellaConfigSchema, type BellaConfig } from "../../config";

export type BellaCategory = BellaConfig["galleryCategories"][number];
const slug = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "categoria";
export const categoryId = (label: string, used: Iterable<string> = []) => {
  const existing = new Set(used); const base = `cat-${slug(label)}`; let next = base; let index = 2;
  while (existing.has(next)) next = `${base}-${index++}`;
  return next;
};

export function normalizeGalleryCategories(config: Pick<BellaConfig, "galleryCategories" | "galleryFilters" | "gallery">) {
  const categories: BellaCategory[] = [];
  const seen = new Set<string>();
  const add = (label: string, id?: string) => {
    const clean = label.trim(); if (!clean || seen.has(clean.toLowerCase())) return;
    const stable = id && /^cat-[a-z0-9-]{1,60}$/.test(id) && !categories.some(item => item.id === id) ? id : categoryId(clean, categories.map(item => item.id));
    seen.add(clean.toLowerCase()); categories.push({ id: stable, label: clean, order: categories.length });
  };
  for (const item of config.galleryCategories ?? []) add(item.label, item.id);
  for (const item of config.galleryFilters ?? []) add(item);
  for (const item of config.gallery ?? []) { add(item.category); for (const label of item.filters ?? []) add(label); }
  return categories.map((item, order) => ({ ...item, order }));
}

export function categoryIdsForImage(image: BellaConfig["gallery"][number], categories: BellaCategory[]) {
  const labels = [image.category, ...(image.filters ?? [])].filter(Boolean).map(value => value.toLowerCase());
  return categories.filter(item => labels.includes(item.label.toLowerCase())).map(item => item.id);
}

export function assignCategory(image: BellaConfig["gallery"][number], ids: string[], categories: BellaCategory[]) {
  const selected = categories.filter(item => ids.includes(item.id));
  return { ...image, categoryIds: selected.map(item => item.id), category: selected[0]?.label ?? "", filters: selected.map(item => item.label) };
}

export function removeCategoryFromConfig(config: BellaConfig, id: string) {
  const categories = config.galleryCategories.filter(item => item.id !== id).map((item, order) => ({ ...item, order }));
  const gallery = config.gallery.map(image => assignCategory(image, (image.categoryIds ?? categoryIdsForImage(image, config.galleryCategories)).filter(value => value !== id), categories));
  return { ...config, galleryCategories: categories, gallery };
}

/** Convert V1 label/filter data to the stable-ID representation before persistence. */
export function migrateBellaCategories(input: unknown): BellaConfig {
  const config = bellaConfigSchema.parse(input);
  const categories = normalizeGalleryCategories(config);
  const gallery = config.gallery.map(image => assignCategory(image, image.categoryIds?.length ? image.categoryIds : categoryIdsForImage(image, categories), categories));
  return { ...config, galleryCategories: categories, galleryFilters: [], gallery };
}
