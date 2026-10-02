import type { RitualConfig } from "./config";
export type RitualPalette = { background: string; surface: string; text: string; muted: string; accent: string; accentContrast: string; line: string; warm: string; dark: string };
export const RITUAL_PALETTES = [
  { key: "earth", name: "Tierra", description: "Arcilla, crema y cacao", colors: ["#a85b3b", "#fffaf2", "#2f241e", "#78685b", "#d8cabe", "#d9b79c"] },
  { key: "sage", name: "Salvia", description: "Marfil, verde seco y carbón", colors: ["#50624f", "#f7f5ed", "#202923", "#687167", "#cbd1c5", "#c8cdbb"] },
  { key: "stone", name: "Piedra", description: "Arena, humo y marrón profundo", colors: ["#655447", "#f5f0e9", "#302a26", "#6b625c", "#d4cbc0", "#b8a99a"] },
  { key: "ember", name: "Brasa", description: "Azul noche, coral y papel", colors: ["#8d4031", "#f8f1e8", "#17232b", "#66727a", "#cad0d1", "#e2ad8b"] },
] as const;
export function ritualTokens(config: Pick<RitualConfig, "accent" | "paletteMode" | "customPalette">): RitualPalette {
  if (config.paletteMode === "custom" && config.customPalette) return config.customPalette;
  const p = RITUAL_PALETTES.find(item => item.key === config.accent) ?? RITUAL_PALETTES[0];
  return { background: p.colors[1], surface: p.colors[1], text: p.colors[2], muted: p.colors[3], accent: p.colors[0], accentContrast: p.colors[1], line: p.colors[4], warm: p.colors[5], dark: p.colors[2] };
}
function channel(value: number) { const v = value / 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }
export function ritualContrast(a: string, b: string) { const lum = (hex: string) => { const c = [0, 2, 4].map(i => channel(Number.parseInt(hex.slice(i + 1, i + 3), 16))); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }; const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
export function validRitualPalette(tokens: RitualPalette) { return ritualContrast(tokens.text, tokens.background) >= 4.5 && ritualContrast(tokens.accentContrast, tokens.accent) >= 4.5 && ritualContrast(tokens.text, tokens.surface) >= 4.5; }
