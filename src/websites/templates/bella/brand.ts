import type { BellaConfig } from "../../config";
export function bellaBrand(config: BellaConfig, name: string) {
  const words = (config.displayName || name).trim().split(/\s+/);
  return { title: config.brandTitle || (words.length > 1 ? words.slice(1).join(" ") : words[0]), eyebrow: config.brandEyebrow || (words.length > 1 ? words[0] : "") };
}
