import { contrastRatio } from "../../palettes";
import type { MatchdayConfig } from "./config";
export const MATCHDAY_PALETTES = [
  { key: "signal", name: "Signal", description: "Rojo de campaña / marfil / tinta", colors: ["#c92e22", "#fff9f0", "#f3efe4", "#171815"] },
  { key: "ice", name: "Ice", description: "Azul eléctrico / blanco frío / carbón", colors: ["#2456df", "#ffffff", "#edf1f4", "#131a23"] },
  { key: "terrain", name: "Terrain", description: "Verde profundo / crema / carbón", colors: ["#315c43", "#fff9ed", "#ece6d5", "#20251e"] },
] as const;
export function matchdayTokens(config: Pick<MatchdayConfig, "accent" | "paletteMode" | "customPalette">) {
  if (config.paletteMode === "custom" && config.customPalette) return config.customPalette;
  const p = MATCHDAY_PALETTES.find(p => p.key === config.accent) ?? MATCHDAY_PALETTES[0];
  return { accent: p.colors[0], onAccent: p.colors[1], paper: p.colors[2], ink: p.colors[3] };
}
export function validMatchdayPalette(tokens: ReturnType<typeof matchdayTokens>) {
  return contrastRatio(tokens.ink, tokens.paper) >= 4.5 && contrastRatio(tokens.onAccent, tokens.accent) >= 4.5;
}
