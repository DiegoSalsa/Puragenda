import { resolveTemplate } from "./registry";
export type TemplateIdentity = { templateKey: string; templateVersion: number; publishedTemplateKey?: string | null; publishedTemplateVersion?: number | null };
export function websiteTemplate(site: TemplateIdentity, preview: boolean) {
  return preview ? { key: site.templateKey, version: site.templateVersion } : { key: site.publishedTemplateKey ?? site.templateKey, version: site.publishedTemplateVersion ?? site.templateVersion };
}
export function templateSnapshotKey(key: string, version: number) { return `${key}@${version}`; }
export function storedTemplateConfigs(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? { ...input as Record<string, unknown> } : {};
}
const universal = ["displayName", "logo", "favicon", "heroImage", "heroCaption", "intro", "about", "aboutImage", "phone", "whatsapp", "contactEmail", "instagram", "facebook", "seoTitle", "seoDescription", "socialImage", "mediaAssets", "gallery", "galleryCategories"] as const;
export function templateSwitchDraft(site: { templateKey: string; templateVersion: number; draftConfig: unknown; templateConfigs?: unknown }, key: string, version: number) {
  const current = resolveTemplate(site.templateKey, site.templateVersion);
  const target = resolveTemplate(key, version);
  const snapshots = storedTemplateConfigs(site.templateConfigs);
  snapshots[templateSnapshotKey(current.key, current.version)] = current.readConfig(site.draftConfig);
  const retained = snapshots[templateSnapshotKey(key, version)];
  if (retained) return { config: target.readConfig(retained), snapshots };
  const source = current.readConfig(site.draftConfig);
  const fields = Object.fromEntries(universal.filter(field => source[field] !== undefined).map(field => [field, source[field]]));
  return { config: target.parseDraft({ ...target.defaultConfig(), ...fields }), snapshots };
}
