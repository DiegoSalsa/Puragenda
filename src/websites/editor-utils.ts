import type { BellaConfig } from "./config";
export function normalizeSocial(raw: string, network: "instagram" | "facebook") {
  const value = raw.trim(); if (!value) return "";
  if (/^[\w.]+$/.test(value.replace(/^@/, ""))) return `https://www.${network}.com/${value.replace(/^@/, "")}`;
  const url = new URL(/^https?:\/\//.test(value) ? value : `https://${value}`);
  if (![`${network}.com`, `www.${network}.com`, `m.${network}.com`].includes(url.hostname) || url.username || url.password) throw new Error(`Usa tu usuario o un enlace de ${network === "instagram" ? "Instagram" : "Facebook"}`);
  url.protocol = "https:"; return url.toString();
}
export function reorderGallery<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const result = [...items]; const [item] = result.splice(from, 1); result.splice(to, 0, item); return result;
}
export function mediaUrls(config: BellaConfig) { return [config.logo, config.favicon, config.heroImage, config.aboutImage, config.socialImage, ...config.gallery.map(item => item.image), ...config.process.map(item => item.image)].filter(Boolean); }
export function referencedAssets(config: BellaConfig) { const urls = new Set(mediaUrls(config)); return (config.mediaAssets ?? []).filter(asset => urls.has(asset.secureUrl)); }
