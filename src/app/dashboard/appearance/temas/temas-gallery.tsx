"use client";
import { useTranslations } from "next-intl";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Check, Loader2, ChevronLeft, ChevronRight, X, Eye, Copy, Trash2, SlidersHorizontal } from "lucide-react";
import { saveAppearanceAction } from "@/server/actions/dashboard.actions";
import { deleteWidgetThemeAction, duplicateWidgetThemeAction } from "@/server/actions/appearance-studio.actions";

const CATEGORIES = ["Todos", "Oscuro", "Claro", "Colorido", "Minimalista"] as const;
const PER_PAGE = 12;

interface PresetColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  textMutedColor: string;
}

interface ThemeCard extends PresetColors {
  id: string;
  name: string;
  category: string;
  description: string;
  customId?: string;
  fontSize?: number;
  cornerRadius?: number;
  shadowStyle?: string;
  headerAlign?: string;
  logoUrl?: string | null;
}

const PRESETS: ThemeCard[] = [
  // ——— Oscuro ———
  { id: "midnight",    name: "Midnight",     category: "Oscuro",      description: "Violeta sobre negro profundo",          primaryColor: "#7C3AED", secondaryColor: "#5B21B6", backgroundColor: "#0A0A0A", textColor: "#FFFFFF",  textMutedColor: "#FFFFFF66" },
  { id: "carbon",      name: "Carbon",       category: "Oscuro",      description: "Naranja fuego sobre carbón",              primaryColor: "#F97316", secondaryColor: "#EA580C", backgroundColor: "#111111", textColor: "#FFFFFF",  textMutedColor: "#FFFFFF66" },
  { id: "navy-depth",  name: "Navy Depth",   category: "Oscuro",      description: "Cian sobre azul marino",                 primaryColor: "#06B6D4", secondaryColor: "#0891B2", backgroundColor: "#0A1628", textColor: "#E2E8F0", textMutedColor: "#E2E8F066" },
  { id: "obsidian",   name: "Obsidian",      category: "Oscuro",      description: "Verde esmeralda sobre negro",            primaryColor: "#10B981", secondaryColor: "#059669", backgroundColor: "#030712", textColor: "#F9FAFB", textMutedColor: "#F9FAFB66" },
  { id: "slate-night", name: "Slate Night",  category: "Oscuro",      description: "Rojo carmín sobre slate oscuro",         primaryColor: "#F43F5E", secondaryColor: "#E11D48", backgroundColor: "#0F172A", textColor: "#F1F5F9", textMutedColor: "#F1F5F966" },
  { id: "amber-dark",  name: "Amber Dark",   category: "Oscuro",      description: "Dorado ámbar sobre marrón oscuro",        primaryColor: "#FBBF24", secondaryColor: "#F59E0B", backgroundColor: "#1C1917", textColor: "#FAFAF9", textMutedColor: "#FAFAF966" },
  { id: "aurora",      name: "Aurora",       category: "Oscuro",      description: "Verde aurora sobre negro polar",         primaryColor: "#00D9A3", secondaryColor: "#00B490", backgroundColor: "#001A14", textColor: "#E0FFF7", textMutedColor: "#E0FFF766" },
  { id: "dracula",     name: "Dracula",      category: "Oscuro",      description: "Violeta pastel sobre gris antracita",    primaryColor: "#BD93F9", secondaryColor: "#9580FF", backgroundColor: "#282A36", textColor: "#F8F8F2", textMutedColor: "#F8F8F266" },
  { id: "neon-cyber",  name: "Neon Cyber",   category: "Oscuro",      description: "Cian eléctrico sobre negro cyber",        primaryColor: "#00E5FF", secondaryColor: "#00B8D4", backgroundColor: "#050510", textColor: "#E0FFFF", textMutedColor: "#E0FFFF66" },
  { id: "crimson",     name: "Crimson",      category: "Oscuro",      description: "Rojo carmesí sobre negro profundo",       primaryColor: "#DC2626", secondaryColor: "#B91C1C", backgroundColor: "#0D0000", textColor: "#FEF2F2", textMutedColor: "#FEF2F266" },

  // ——— Oscuro Extra (25 temas) ———
  { id: "cyberpunk", name: "Cyberpunk", category: "Oscuro", description: "Cian neón y magenta sobre violeta abisal", primaryColor: "#00F0FF", secondaryColor: "#FF007F", backgroundColor: "#0F051D", textColor: "#FFFFFF", textMutedColor: "#FFFFFF66" },
  { id: "emerald-night", name: "Emerald Night", category: "Oscuro", description: "Verde menta y esmeralda sobre fondo oscuro", primaryColor: "#10B981", secondaryColor: "#34D399", backgroundColor: "#022C22", textColor: "#ECFDF5", textMutedColor: "#ECFDF566" },
  { id: "rust-iron", name: "Rust & Iron", category: "Oscuro", description: "Óxido de terracota sobre carbón profundo", primaryColor: "#D97706", secondaryColor: "#B45309", backgroundColor: "#1F2937", textColor: "#F9FAFB", textMutedColor: "#F9FAFB66" },
  { id: "blood-orchid", name: "Blood Orchid", category: "Oscuro", description: "Carmesí sobre borgoña profundo y negro", primaryColor: "#DC2626", secondaryColor: "#991B1B", backgroundColor: "#1A050D", textColor: "#FFF1F2", textMutedColor: "#FFF1F266" },
  { id: "tokyo-neon", name: "Tokyo Neon", category: "Oscuro", description: "Verde lima sobre azul eléctrico de neón", primaryColor: "#84CC16", secondaryColor: "#EC4899", backgroundColor: "#0B0F19", textColor: "#F8FAFC", textMutedColor: "#F8FAFC66" },
  { id: "plum-dream", name: "Plum Dream", category: "Oscuro", description: "Amatista y ciruela sobre violeta oscuro", primaryColor: "#A855F7", secondaryColor: "#C084FC", backgroundColor: "#1E1B4B", textColor: "#F5F3FF", textMutedColor: "#F5F3FF66" },
  { id: "golden-dust", name: "Golden Dust", category: "Oscuro", description: "Dorado ámbar sobre marrón chocolate", primaryColor: "#EAB308", secondaryColor: "#CA8A04", backgroundColor: "#1C1917", textColor: "#FAFAF9", textMutedColor: "#FAFAF966" },
  { id: "atlantis", name: "Atlantis", category: "Oscuro", description: "Turquesa y cian sobre azul oceánico profundo", primaryColor: "#14B8A6", secondaryColor: "#0F766E", backgroundColor: "#042F2E", textColor: "#F0FDFA", textMutedColor: "#F0FDFA66" },
  { id: "volcanic", name: "Volcanic", category: "Oscuro", description: "Naranja fuego y lava sobre gris ceniza", primaryColor: "#F97316", secondaryColor: "#EF4444", backgroundColor: "#18181B", textColor: "#FAFAFA", textMutedColor: "#FAFAFA66" },
  { id: "space-cadet", name: "Space Cadet", category: "Oscuro", description: "Violeta galaxia sobre azul espacial profundo", primaryColor: "#8B5CF6", secondaryColor: "#4F46E5", backgroundColor: "#03001C", textColor: "#E0D3FC", textMutedColor: "#E0D3FC66" },
  { id: "forest-mist", name: "Forest Mist", category: "Oscuro", description: "Esmeralda y verde menta sobre bosque oscuro", primaryColor: "#059669", secondaryColor: "#34D399", backgroundColor: "#064E3B", textColor: "#ECFDF5", textMutedColor: "#ECFDF566" },
  { id: "deep-amethyst", name: "Deep Amethyst", category: "Oscuro", description: "Lila brillante sobre amatista oscura", primaryColor: "#D8B4FE", secondaryColor: "#8B5CF6", backgroundColor: "#160620", textColor: "#FDF4FF", textMutedColor: "#FDF4FF66" },
  { id: "retro-arcade", name: "Retro Arcade", category: "Oscuro", description: "Rosa brillante y azul sobre negro arcade", primaryColor: "#F43F5E", secondaryColor: "#3B82F6", backgroundColor: "#090D16", textColor: "#F1F5F9", textMutedColor: "#F1F5F966" },
  { id: "ice-cave", name: "Ice Cave", category: "Oscuro", description: "Celeste glacial sobre azul ártico profundo", primaryColor: "#0EA5E9", secondaryColor: "#E0F2FE", backgroundColor: "#082F49", textColor: "#F0F9FF", textMutedColor: "#F0F9FF66" },
  { id: "desert-shadow", name: "Desert Shadow", category: "Oscuro", description: "Verde cactus sobre gris piedra", primaryColor: "#10B981", secondaryColor: "#F59E0B", backgroundColor: "#27272A", textColor: "#F4F4F5", textMutedColor: "#F4F4F566" },
  { id: "solar-storm", name: "Solar Storm", category: "Oscuro", description: "Amarillo brillante sobre ámbar profundo", primaryColor: "#FBBF24", secondaryColor: "#F97316", backgroundColor: "#1E1100", textColor: "#FFFBEB", textMutedColor: "#FFFBEB66" },
  { id: "neon-grape", name: "Neon Grape", category: "Oscuro", description: "Lima brillante sobre púrpura neón", primaryColor: "#A3E635", secondaryColor: "#8B5CF6", backgroundColor: "#120324", textColor: "#F5F3FF", textMutedColor: "#F5F3FF66" },
  { id: "stealth-teal", name: "Stealth Teal", category: "Oscuro", description: "Cian sobre gris antracita mate", primaryColor: "#2DD4BF", secondaryColor: "#0F766E", backgroundColor: "#202024", textColor: "#F0FDFA", textMutedColor: "#F0FDFA66" },
  { id: "bordeaux-night", name: "Bordeaux Night", category: "Oscuro", description: "Rojo burdeos sobre vino de medianoche", primaryColor: "#991B1B", secondaryColor: "#FB7185", backgroundColor: "#1E050B", textColor: "#FFE4E6", textMutedColor: "#FFE4E666" },
  { id: "synthwave-dark", name: "Synthwave Dark", category: "Oscuro", description: "Magenta y cian sobre violeta synthwave", primaryColor: "#D946EF", secondaryColor: "#06B6D4", backgroundColor: "#180030", textColor: "#FDF4FF", textMutedColor: "#FDF4FF66" },
  { id: "electric-storm", name: "Electric Storm", category: "Oscuro", description: "Amarillo eléctrico sobre tormenta azul", primaryColor: "#FACC15", secondaryColor: "#1D4ED8", backgroundColor: "#090F26", textColor: "#EFF6FF", textMutedColor: "#EFF6FF66" },
  { id: "nordic-winter", name: "Nordic Winter", category: "Oscuro", description: "Cian frío sobre pizarra nórdica", primaryColor: "#67E8F9", secondaryColor: "#475569", backgroundColor: "#0F172A", textColor: "#F8FAFC", textMutedColor: "#F8FAFC66" },
  { id: "deep-clay", name: "Deep Clay", category: "Oscuro", description: "Terracota y coral sobre arcilla oscura", primaryColor: "#F87171", secondaryColor: "#B91C1C", backgroundColor: "#272522", textColor: "#FFF5F5", textMutedColor: "#FFF5F566" },
  { id: "glow-worm", name: "Glow Worm", category: "Oscuro", description: "Verde neón y verde pálido sobre fango abisal", primaryColor: "#22C55E", secondaryColor: "#86EFAC", backgroundColor: "#022C22", textColor: "#F0FDF4", textMutedColor: "#F0FDF466" },
  { id: "velvet-night", name: "Velvet Night", category: "Oscuro", description: "Azul real y violeta sobre terciopelo negro", primaryColor: "#3B82F6", secondaryColor: "#7C3AED", backgroundColor: "#0D0826", textColor: "#EEF2FF", textMutedColor: "#EEF2FF66" },
  // ——— Claro ———
  { id: "snow",        name: "Snow",         category: "Claro",       description: "Violeta limpio sobre blanco",            primaryColor: "#7C3AED", secondaryColor: "#5B21B6", backgroundColor: "#FFFFFF",  textColor: "#111827", textMutedColor: "#11182766" },
  { id: "pearl",       name: "Pearl",        category: "Claro",       description: "Azul sobre blanco frío",                 primaryColor: "#2563EB", secondaryColor: "#1D4ED8", backgroundColor: "#F8FAFC",  textColor: "#1E293B", textMutedColor: "#1E293B66" },
  { id: "ivory",       name: "Ivory",        category: "Claro",       description: "Verde teal sobre marfil",                primaryColor: "#0D9488", secondaryColor: "#0F766E", backgroundColor: "#FFFBF5",  textColor: "#1C1917", textMutedColor: "#1C191766" },
  { id: "frost",       name: "Frost",        category: "Claro",       description: "Índigo sobre azul cielo suave",           primaryColor: "#6366F1", secondaryColor: "#4F46E5", backgroundColor: "#F0F9FF",  textColor: "#0C4A6E", textMutedColor: "#0C4A6E66" },
  { id: "morning",     name: "Morning",      category: "Claro",       description: "Rosa coral sobre blanco cálido",          primaryColor: "#F43F5E", secondaryColor: "#E11D48", backgroundColor: "#FFF1F2",  textColor: "#1F1F1F", textMutedColor: "#1F1F1F66" },
  { id: "lavender",    name: "Lavender",     category: "Claro",       description: "Lavanda sobre lila muy suave",           primaryColor: "#7C3AED", secondaryColor: "#6D28D9", backgroundColor: "#F5F3FF",  textColor: "#1E1B4B", textMutedColor: "#1E1B4B66" },
  { id: "sage",        name: "Sage",         category: "Claro",       description: "Verde salvia sobre verde claro",         primaryColor: "#059669", secondaryColor: "#047857", backgroundColor: "#F0FDF4",  textColor: "#14532D", textMutedColor: "#14532D66" },

  // ——— Claro Extra (25 temas) ———
  { id: "soft-mint", name: "Soft Mint", category: "Claro", description: "Verde menta y esmeralda sobre fondo menta claro", primaryColor: "#10B981", secondaryColor: "#065F46", backgroundColor: "#F0FDF4", textColor: "#065F46", textMutedColor: "#065F4688" },
  { id: "peach-fizz", name: "Peach Fizz", category: "Claro", description: "Melocotón y coral sobre fondo crema cálido", primaryColor: "#FF8A65", secondaryColor: "#E64A19", backgroundColor: "#FFF8F6", textColor: "#3E2723", textMutedColor: "#3E272388" },
  { id: "cherry-blossom", name: "Cherry Blossom", category: "Claro", description: "Rosa cerezo sobre fondo rosado suave", primaryColor: "#F472B6", secondaryColor: "#BE185D", backgroundColor: "#FFF1F2", textColor: "#4C0519", textMutedColor: "#4C051988" },
  { id: "blueberry-cream", name: "Blueberry Cream", category: "Claro", description: "Azul cobalto sobre fondo crema de arándano", primaryColor: "#2563EB", secondaryColor: "#1E3A8A", backgroundColor: "#F0F6FF", textColor: "#1E3A8A", textMutedColor: "#1E3A8A88" },
  { id: "matcha-latte", name: "Matcha Latte", category: "Claro", description: "Verde té sobre fondo leche de matcha", primaryColor: "#84CC16", secondaryColor: "#3F6212", backgroundColor: "#F7FEE7", textColor: "#3F6212", textMutedColor: "#3F621288" },
  { id: "lemon-sorbet", name: "Lemon Sorbet", category: "Claro", description: "Amarillo limón sobre fondo helado de limón", primaryColor: "#EAB308", secondaryColor: "#C2410C", backgroundColor: "#FEFCE8", textColor: "#451A03", textMutedColor: "#451A0388" },
  { id: "lavender-mist", name: "Lavender Mist", category: "Claro", description: "Púrpura real sobre lila muy claro", primaryColor: "#8B5CF6", secondaryColor: "#4C1D95", backgroundColor: "#F5F3FF", textColor: "#2E1065", textMutedColor: "#2E106588" },
  { id: "vanilla-bean", name: "Vanilla Bean", category: "Claro", description: "Cacao y ámbar sobre vainilla reconfortante", primaryColor: "#D97706", secondaryColor: "#78350F", backgroundColor: "#FDF8F2", textColor: "#451A03", textMutedColor: "#451A0388" },
  { id: "cotton-candy", name: "Cotton Candy", category: "Claro", description: "Azul cielo y rosa dulce sobre nube pastel", primaryColor: "#3B82F6", secondaryColor: "#EC4899", backgroundColor: "#FFF0F6", textColor: "#5B0E2D", textMutedColor: "#5B0E2D88" },
  { id: "eucalyptus-light", name: "Eucalyptus Light", category: "Claro", description: "Eucalipto y verde azulado sobre brisa marina", primaryColor: "#14B8A6", secondaryColor: "#115E59", backgroundColor: "#F0FDFA", textColor: "#042F2E", textMutedColor: "#042F2E88" },
  { id: "melon-dew", name: "Melon Dew", category: "Claro", description: "Melón y verde oliva sobre rocío matinal", primaryColor: "#10B981", secondaryColor: "#047857", backgroundColor: "#F0FDF4", textColor: "#14532D", textMutedColor: "#14532D88" },
  { id: "apricot-glow", name: "Apricot Glow", category: "Claro", description: "Albaricoque brillante sobre fondo crema suave", primaryColor: "#F97316", secondaryColor: "#C2410C", backgroundColor: "#FFF7ED", textColor: "#431407", textMutedColor: "#43140788" },
  { id: "sky-breeze", name: "Sky Breeze", category: "Claro", description: "Cian brillante sobre brisa celeste", primaryColor: "#0EA5E9", secondaryColor: "#1E3A8A", backgroundColor: "#F0F9FF", textColor: "#0C4A6E", textMutedColor: "#0C4A6E88" },
  { id: "lilac-garden", name: "Lilac Garden", category: "Claro", description: "Lila brillante y orquídea sobre jardín florido", primaryColor: "#D946EF", secondaryColor: "#701A75", backgroundColor: "#FDF4FF", textColor: "#4A044E", textMutedColor: "#4A044E88" },
  { id: "dunes-sand", name: "Dunes Sand", category: "Claro", description: "Dorado arena y tierra sobre dunas del desierto", primaryColor: "#EAB308", secondaryColor: "#78350F", backgroundColor: "#FEFCE8", textColor: "#451A03", textMutedColor: "#451A0388" },
  { id: "pistachio-cream", name: "Pistachio Cream", category: "Claro", description: "Verde pistacho sobre crema de frutos secos", primaryColor: "#4ADE80", secondaryColor: "#166534", backgroundColor: "#F0FDF4", textColor: "#14532D", textMutedColor: "#14532D88" },
  { id: "rosemary-garden", name: "Rosemary Garden", category: "Claro", description: "Menta herbal sobre brisa del bosque", primaryColor: "#0D9488", secondaryColor: "#115E59", backgroundColor: "#F0FDFA", textColor: "#042F2E", textMutedColor: "#042F2E88" },
  { id: "sea-salt-breeze", name: "Sea Salt Breeze", category: "Claro", description: "Celeste brillante sobre mist marino", primaryColor: "#06B6D4", secondaryColor: "#155E75", backgroundColor: "#ECFEFF", textColor: "#083344", textMutedColor: "#08334488" },
  { id: "marigold-yellow", name: "Marigold Yellow", category: "Claro", description: "Naranja caléndula sobre sol del atardecer", primaryColor: "#F59E0B", secondaryColor: "#B91C1C", backgroundColor: "#FFFBEB", textColor: "#451A03", textMutedColor: "#451A0388" },
  { id: "orchid-dream", name: "Orchid Dream", category: "Claro", description: "Orquídea suave sobre lila florido", primaryColor: "#C084FC", secondaryColor: "#581C87", backgroundColor: "#FAF5FF", textColor: "#3B0764", textMutedColor: "#3B076488" },
  { id: "winter-sun", name: "Winter Sun", category: "Claro", description: "Naranja suave sobre hielo ártico", primaryColor: "#FB923C", secondaryColor: "#7C2D12", backgroundColor: "#FFFDFB", textColor: "#431407", textMutedColor: "#43140788" },
  { id: "spearmint-fresh", name: "Spearmint Fresh", category: "Claro", description: "Verde menta fresco sobre brisa glacial", primaryColor: "#2DD4BF", secondaryColor: "#134E5E", backgroundColor: "#F0FDFA", textColor: "#042F2E", textMutedColor: "#042F2E88" },
  { id: "sherbet-cream", name: "Sherbet Cream", category: "Claro", description: "Rosa coral y naranja sobre crema dulce", primaryColor: "#FB7185", secondaryColor: "#EA580C", backgroundColor: "#FFF1F2", textColor: "#4C0519", textMutedColor: "#4C051988" },
  { id: "washed-denim", name: "Washed Denim", category: "Claro", description: "Azul índigo suave sobre fondo lino", primaryColor: "#6366F1", secondaryColor: "#312E81", backgroundColor: "#F5F3FF", textColor: "#1E1B4B", textMutedColor: "#1E1B4B88" },
  { id: "citrus-peel", name: "Citrus Peel", category: "Claro", description: "Lima cítrica y carbón sobre crema suave", primaryColor: "#84CC16", secondaryColor: "#1E293B", backgroundColor: "#FFFBEB", textColor: "#1C1917", textMutedColor: "#1C191766" },
  // ——— Colorido ———
  { id: "sunset",      name: "Sunset",       category: "Colorido",    description: "Naranja y rojo sobre oscuro cálido",       primaryColor: "#F97316", secondaryColor: "#EF4444", backgroundColor: "#1A0A00", textColor: "#FFF7ED", textMutedColor: "#FFF7ED66" },
  { id: "ocean",       name: "Ocean",        category: "Colorido",    description: "Cian e índigo sobre negro profundo",       primaryColor: "#0EA5E9", secondaryColor: "#6366F1", backgroundColor: "#020617", textColor: "#E0F2FE", textMutedColor: "#E0F2FE66" },
  { id: "forest",      name: "Forest",       category: "Colorido",    description: "Verde vibrante sobre verde oscuro",       primaryColor: "#22C55E", secondaryColor: "#16A34A", backgroundColor: "#052E16", textColor: "#DCFCE7", textMutedColor: "#DCFCE766" },
  { id: "berry",       name: "Berry",        category: "Colorido",    description: "Rosa y violeta sobre morado oscuro",      primaryColor: "#EC4899", secondaryColor: "#A855F7", backgroundColor: "#1A0020", textColor: "#FCE7F3", textMutedColor: "#FCE7F366" },
  { id: "mango",       name: "Mango",        category: "Colorido",    description: "Amarillo y naranja sobre negro cálido",   primaryColor: "#FBBF24", secondaryColor: "#F97316", backgroundColor: "#0A0500", textColor: "#FFFBEB", textMutedColor: "#FFFBEB66" },
  { id: "aurora-mix",  name: "Aurora Mix",   category: "Colorido",    description: "Verde y violeta sobre negro polar",       primaryColor: "#34D399", secondaryColor: "#A855F7", backgroundColor: "#011C1A", textColor: "#ECFDF5", textMutedColor: "#ECFDF566" },
  { id: "neon-nights", name: "Neon Nights",  category: "Colorido",    description: "Rosa neón y ámbar sobre negro",            primaryColor: "#F472B6", secondaryColor: "#FBBF24", backgroundColor: "#0A000A", textColor: "#FDF4FF", textMutedColor: "#FDF4FF66" },
  { id: "tropical",    name: "Tropical",     category: "Colorido",    description: "Turquesa y coral sobre oscuro tropical",  primaryColor: "#14B8A6", secondaryColor: "#F97316", backgroundColor: "#001A1A", textColor: "#F0FDFA", textMutedColor: "#F0FDFA66" },

  // ——— Colorido Extra (25 temas) ———
  { id: "retro-sun", name: "Retro Sun", category: "Colorido", description: "Amarillo solar y violeta profundo", primaryColor: "#FBBF24", secondaryColor: "#6D28D9", backgroundColor: "#2E1065", textColor: "#F5F3FF", textMutedColor: "#F5F3FF66" },
  { id: "hyperpop", name: "Hyperpop", category: "Colorido", description: "Amarillo neón y rosa neón sobre azul cobalto", primaryColor: "#FACC15", secondaryColor: "#F43F5E", backgroundColor: "#1E1B4B", textColor: "#FFFFFF", textMutedColor: "#93C5FD66" },
  { id: "neon-flamingo", name: "Neon Flamingo", category: "Colorido", description: "Rosa flamenco y cian neón sobre azul abisal", primaryColor: "#FF007F", secondaryColor: "#00F0FF", backgroundColor: "#0A001F", textColor: "#FDF4FF", textMutedColor: "#A5B4FC66" },
  { id: "berry-splash", name: "Berry Splash", category: "Colorido", description: "Frambuesa y lila brillante sobre mora silvestre", primaryColor: "#EC4899", secondaryColor: "#8B5CF6", backgroundColor: "#1F0022", textColor: "#FCE7F3", textMutedColor: "#D9F99D66" },
  { id: "tiki-fire", name: "Tiki Fire", category: "Colorido", description: "Naranja fuego y amarillo sobre verde jungla", primaryColor: "#EA580C", secondaryColor: "#FACC15", backgroundColor: "#064E3B", textColor: "#ECFDF5", textMutedColor: "#A7F3D066" },
  { id: "ultraviolet", name: "Ultraviolet", category: "Colorido", description: "Verde ácido y magenta brillante sobre espacio negro", primaryColor: "#A3E635", secondaryColor: "#D946EF", backgroundColor: "#0B001A", textColor: "#FDF4FF", textMutedColor: "#DDD6FE66" },
  { id: "aqua-neon", name: "Aqua Neon", category: "Colorido", description: "Turquesa y púrpura sobre noche fluorescente", primaryColor: "#00F5D4", secondaryColor: "#7B2CBF", backgroundColor: "#0F0C1B", textColor: "#EEF2FF", textMutedColor: "#C7D2FE66" },
  { id: "retro-wave", name: "Retro Wave", category: "Colorido", description: "Rosa neón y naranja sobre violeta profundo", primaryColor: "#FF0055", secondaryColor: "#FF5500", backgroundColor: "#1A0033", textColor: "#FFFFFF", textMutedColor: "#E5E7EB66" },
  { id: "cosmic-jade", name: "Cosmic Jade", category: "Colorido", description: "Esmeralda y violeta sobre abismo cósmico", primaryColor: "#10B981", secondaryColor: "#8B5CF6", backgroundColor: "#16062C", textColor: "#FDF4FF", textMutedColor: "#DDD6FE66" },
  { id: "acid-sunset", name: "Acid Sunset", category: "Colorido", description: "Lima y coral sobre negro de reactor", primaryColor: "#A3E635", secondaryColor: "#F43F5E", backgroundColor: "#050505", textColor: "#FAFAFA", textMutedColor: "#E4E4E766" },
  { id: "magic-mint", name: "Magic Mint", category: "Colorido", description: "Menta turquesa y rosa orquídea sobre noche mágica", primaryColor: "#2DD4BF", secondaryColor: "#F472B6", backgroundColor: "#0E0314", textColor: "#FDF4FF", textMutedColor: "#F5D0FE66" },
  { id: "electric-lime", name: "Electric Lime", category: "Colorido", description: "Lima y azul cobalto sobre azul noche", primaryColor: "#A3E635", secondaryColor: "#2563EB", backgroundColor: "#030712", textColor: "#FAFAFA", textMutedColor: "#9CA3AF66" },
  { id: "sunset-glow", name: "Sunset Glow", category: "Colorido", description: "Amarillo y carmín sobre terracota de atardecer", primaryColor: "#FBBF24", secondaryColor: "#EF4444", backgroundColor: "#290800", textColor: "#FFE4E6", textMutedColor: "#FCA5A566" },
  { id: "miami-vice", name: "Miami Vice", category: "Colorido", description: "Rosa chicle y cian brillante sobre noche miami", primaryColor: "#FF66B2", secondaryColor: "#00FFFF", backgroundColor: "#0B0A1A", textColor: "#FDF4FF", textMutedColor: "#CBD5E166" },
  { id: "jungle-fever", name: "Jungle Fever", category: "Colorido", description: "Verde lima y naranja vibrante sobre tierra fértil", primaryColor: "#22C55E", secondaryColor: "#F97316", backgroundColor: "#1C1917", textColor: "#FAFAF9", textMutedColor: "#E7E5E466" },
  { id: "neon-poison", name: "Neon Poison", category: "Colorido", description: "Verde ácido y cian sobre abismo atlántico", primaryColor: "#84CC16", secondaryColor: "#06B6D4", backgroundColor: "#020617", textColor: "#F8FAFC", textMutedColor: "#94A3B866" },
  { id: "psychedelic", name: "Psychedelic", category: "Colorido", description: "Magenta y violeta eléctrico sobre espacio profundo", primaryColor: "#EC4899", secondaryColor: "#8B5CF6", backgroundColor: "#09001F", textColor: "#FFFFFF", textMutedColor: "#E5E7EB66" },
  { id: "deep-safari", name: "Deep Safari", category: "Colorido", description: "Dorado terracota y menta sobre jungla tropical", primaryColor: "#EAB308", secondaryColor: "#10B981", backgroundColor: "#062C1C", textColor: "#ECFDF5", textMutedColor: "#A7F3D066" },
  { id: "cyber-coral", name: "Cyber Coral", category: "Colorido", description: "Rojo coral y lima sobre negro cyber", primaryColor: "#FF4B4B", secondaryColor: "#A3E635", backgroundColor: "#08080C", textColor: "#F3F4F6", textMutedColor: "#9CA3AF66" },
  { id: "bubblegum-sweet", name: "Bubblegum Sweet", category: "Colorido", description: "Rosa chicle y cian sobre índigo dulce", primaryColor: "#F472B6", secondaryColor: "#38BDF8", backgroundColor: "#1E1B4B", textColor: "#F5F3FF", textMutedColor: "#C7D2FE66" },
  { id: "electric-sky", name: "Electric Sky", category: "Colorido", description: "Cian neón y dorado sobre cielo tormentoso", primaryColor: "#00FFF0", secondaryColor: "#FACC15", backgroundColor: "#0A1128", textColor: "#F3F4F6", textMutedColor: "#9CA3AF66" },
  { id: "lava-lamp", name: "Lava Lamp", category: "Colorido", description: "Naranja magma y púrpura sobre abismo líquido", primaryColor: "#FF4E00", secondaryColor: "#8F00FF", backgroundColor: "#09000F", textColor: "#FFFFFF", textMutedColor: "#E5E7EB66" },
  { id: "laser-tag", name: "Laser Tag", category: "Colorido", description: "Azul láser y magenta sobre mate oscuro", primaryColor: "#0066FF", secondaryColor: "#FF00CC", backgroundColor: "#050508", textColor: "#FFFFFF", textMutedColor: "#E5E7EB66" },
  { id: "wild-flower", name: "Wild Flower", category: "Colorido", description: "Púrpura y dorado sobre bosque nocturno", primaryColor: "#8B5CF6", secondaryColor: "#FBBF24", backgroundColor: "#230628", textColor: "#FDF4FF", textMutedColor: "#F5D0FE66" },
  { id: "candy-apple", name: "Candy Apple", category: "Colorido", description: "Verde manzana y rojo sobre regaliz negro", primaryColor: "#A3E635", secondaryColor: "#DC2626", backgroundColor: "#0D0004", textColor: "#FFF5F5", textMutedColor: "#FCA5A566" },
  // ——— Minimalista ———
  { id: "mono-dark",   name: "Mono Dark",    category: "Minimalista", description: "Blanco puro sobre negro total",           primaryColor: "#FFFFFF", secondaryColor: "#A1A1AA", backgroundColor: "#000000", textColor: "#FFFFFF", textMutedColor: "#FFFFFF66" },
  { id: "mono-light",  name: "Mono Light",   category: "Minimalista", description: "Negro total sobre blanco puro",           primaryColor: "#000000", secondaryColor: "#52525B", backgroundColor: "#FFFFFF", textColor: "#000000", textMutedColor: "#00000066" },
  { id: "ash",         name: "Ash",          category: "Minimalista", description: "Gris neutro sobre azul noche",            primaryColor: "#6B7280", secondaryColor: "#4B5563", backgroundColor: "#111827", textColor: "#F9FAFB", textMutedColor: "#F9FAFB66" },
  { id: "stone",       name: "Stone",        category: "Minimalista", description: "Marrón tierra sobre crema",                primaryColor: "#78716C", secondaryColor: "#57534E", backgroundColor: "#FAFAF9", textColor: "#1C1917", textMutedColor: "#1C191766" },
  { id: "zinc",        name: "Zinc",         category: "Minimalista", description: "Zinc oscuro sobre gris suave",            primaryColor: "#3F3F46", secondaryColor: "#52525B", backgroundColor: "#F4F4F5", textColor: "#18181B", textMutedColor: "#18181B66" },
  { id: "paper",       name: "Paper",        category: "Minimalista", description: "Casi negro sobre blanco papel",          primaryColor: "#1F2937", secondaryColor: "#374151", backgroundColor: "#FEFCE8", textColor: "#111827", textMutedColor: "#11182766" },
  { id: "fog",         name: "Fog",          category: "Minimalista", description: "Pizarra sobre gris neblina",              primaryColor: "#475569", secondaryColor: "#334155", backgroundColor: "#F8FAFC", textColor: "#0F172A", textMutedColor: "#0F172A66" },
  { id: "graphite",    name: "Graphite",     category: "Minimalista", description: "Plata grafito sobre carbón suave",        primaryColor: "#9CA3AF", secondaryColor: "#6B7280", backgroundColor: "#1C1C1E", textColor: "#F5F5F7", textMutedColor: "#F5F5F766" },

  // ——— Minimalista Extra (25 temas) ———
  { id: "pure-obsidian", name: "Pure Obsidian", category: "Minimalista", description: "Plata helado sobre negro de obsidiana", primaryColor: "#0B0F17", secondaryColor: "#E2E8F0", backgroundColor: "#020617", textColor: "#F8FAFC", textMutedColor: "#94A3B866" },
  { id: "matte-slate", name: "Matte Slate", category: "Minimalista", description: "Pizarra mate sobre gris bruma", primaryColor: "#475569", secondaryColor: "#F8FAFC", backgroundColor: "#0F172A", textColor: "#F1F5F9", textMutedColor: "#94A3B866" },
  { id: "sandstone", name: "Sandstone", category: "Minimalista", description: "Ámbar y piedra sobre crema cálida", primaryColor: "#B45309", secondaryColor: "#F5F5F4", backgroundColor: "#FDFBF7", textColor: "#44403C", textMutedColor: "#78716C66" },
  { id: "cream-charcoal", name: "Cream & Charcoal", category: "Minimalista", description: "Arena y carbón sobre crema suave", primaryColor: "#D6D3D1", secondaryColor: "#1C1917", backgroundColor: "#FAF8F5", textColor: "#1C1917", textMutedColor: "#78716C66" },
  { id: "foggy-coast", name: "Foggy Coast", category: "Minimalista", description: "Gris niebla y azul marino sobre lino costero", primaryColor: "#94A3B8", secondaryColor: "#334155", backgroundColor: "#F8FAFC", textColor: "#1E293B", textMutedColor: "#64748B66" },
  { id: "zinc-gray", name: "Zinc Gray", category: "Minimalista", description: "Gris zinc sobre plata cepillada", primaryColor: "#71717A", secondaryColor: "#18181B", backgroundColor: "#F4F4F5", textColor: "#18181B", textMutedColor: "#71717A66" },
  { id: "earthy-stone", name: "Earthy Stone", category: "Minimalista", description: "Marrón arcilla y tierra sobre piedra suave", primaryColor: "#78716C", secondaryColor: "#1C1917", backgroundColor: "#FAF9F6", textColor: "#1C1917", textMutedColor: "#78716C66" },
  { id: "muted-sage", name: "Muted Sage", category: "Minimalista", description: "Gris salvia y bosque sobre lino herbal", primaryColor: "#6B7280", secondaryColor: "#1F2937", backgroundColor: "#F4F6F4", textColor: "#111827", textMutedColor: "#4B556366" },
  { id: "olive-drab", name: "Olive Drab", category: "Minimalista", description: "Verde oliva y musgo sobre crema de sol", primaryColor: "#65A30D", secondaryColor: "#3F6212", backgroundColor: "#FFFBEB", textColor: "#1C1917", textMutedColor: "#1C191766" },
  { id: "taupe-linen", name: "Taupe Linen", category: "Minimalista", description: "Marrón taupe sobre fondo de lino orgánico", primaryColor: "#A8A29E", secondaryColor: "#44403C", backgroundColor: "#FAF8F6", textColor: "#292524", textMutedColor: "#78716C66" },
  { id: "espresso-rich", name: "Espresso Rich", category: "Minimalista", description: "Café moca y marrón oscuro sobre marfil", primaryColor: "#78350F", secondaryColor: "#451A03", backgroundColor: "#FFFDF9", textColor: "#451A03", textMutedColor: "#78350F66" },
  { id: "alabaster-slate", name: "Alabaster Slate", category: "Minimalista", description: "Pizarra oscura sobre blanco alabastro", primaryColor: "#E2E8F0", secondaryColor: "#0F172A", backgroundColor: "#FCFCFC", textColor: "#0F172A", textMutedColor: "#47556966" },
  { id: "driftwood-gray", name: "Driftwood Gray", category: "Minimalista", description: "Madera y tierra gris sobre arena marina", primaryColor: "#854D0E", secondaryColor: "#3F3F46", backgroundColor: "#FAFAF9", textColor: "#27272A", textMutedColor: "#71717A66" },
  { id: "chalk-charcoal", name: "Chalk & Charcoal", category: "Minimalista", description: "Carbón mate sobre tiza de cal", primaryColor: "#3F3F46", secondaryColor: "#D4D4D8", backgroundColor: "#FDFDFD", textColor: "#18181B", textMutedColor: "#71717A66" },
  { id: "muted-plum-cream", name: "Muted Plum", category: "Minimalista", description: "Ciruela suave y berenjena sobre crema", primaryColor: "#C084FC", secondaryColor: "#3B0764", backgroundColor: "#FFFDFD", textColor: "#3B0764", textMutedColor: "#581C8766" },
  { id: "warm-pebble", name: "Warm Pebble", category: "Minimalista", description: "Gris piedra sobre crema de guijarro", primaryColor: "#A8A29E", secondaryColor: "#78350F", backgroundColor: "#FAF9F5", textColor: "#44403C", textMutedColor: "#78716C66" },
  { id: "dusk-blue", name: "Dusk Blue", category: "Minimalista", description: "Azul atardecer sobre gris nocturno suave", primaryColor: "#60A5FA", secondaryColor: "#1E3A8A", backgroundColor: "#F1F5F9", textColor: "#0F172A", textMutedColor: "#47556966" },
  { id: "winter-spruce", name: "Winter Spruce", category: "Minimalista", description: "Pino esmeralda sobre nieve de invierno", primaryColor: "#0D9488", secondaryColor: "#115E59", backgroundColor: "#F0FDF4", textColor: "#0F172A", textMutedColor: "#47556966" },
  { id: "urban-clay", name: "Urban Clay", category: "Minimalista", description: "Rojo arcilla sobre cemento urbano", primaryColor: "#F87171", secondaryColor: "#991B1B", backgroundColor: "#F9F9FB", textColor: "#111827", textMutedColor: "#6B728066" },
  { id: "raw-linen", name: "Raw Linen", category: "Minimalista", description: "Lino natural y negro mate sobre lino crudo", primaryColor: "#D6D3D1", secondaryColor: "#09090B", backgroundColor: "#FAF9F6", textColor: "#09090B", textMutedColor: "#71717A66" },
  { id: "shadow-matte", name: "Shadow Matte", category: "Minimalista", description: "Blanco nieve sobre carbón absoluto", primaryColor: "#3F3F46", secondaryColor: "#FFFFFF", backgroundColor: "#121214", textColor: "#F4F4F5", textMutedColor: "#A1A1AA66" },
  { id: "soft-copper", name: "Soft Copper", category: "Minimalista", description: "Cobre cálido y cacao sobre crema dulce", primaryColor: "#CA8A04", secondaryColor: "#451A03", backgroundColor: "#FFFDF5", textColor: "#451A03", textMutedColor: "#78350F66" },
  { id: "aero-blue", name: "Aero Blue", category: "Minimalista", description: "Celeste aéreo y azul marino sobre nube blanca", primaryColor: "#38BDF8", secondaryColor: "#0C4A6E", backgroundColor: "#F8FAFC", textColor: "#0C4A6E", textMutedColor: "#33415566" },
  { id: "bonsai-green", name: "Bonsai Green", category: "Minimalista", description: "Verde musgo y tierra sobre lino puro", primaryColor: "#15803D", secondaryColor: "#1E293B", backgroundColor: "#F9FAF8", textColor: "#1E293B", textMutedColor: "#47556966" },
  { id: "steel-gray", name: "Steel Gray", category: "Minimalista", description: "Gris acero y pizarra sobre acero cepillado", primaryColor: "#64748B", secondaryColor: "#0F172A", backgroundColor: "#F8FAFC", textColor: "#0F172A", textMutedColor: "#64748B66" },
];

function isActive(current: PresetColors, preset: PresetColors) {
  return (
    current.primaryColor === preset.primaryColor &&
    current.backgroundColor === preset.backgroundColor
  );
}

function MiniPreview({ preset }: { preset: ThemeCard }) {
  const legacy = useTranslations("legacy");
  return (
    <div
      className="relative h-40 w-full overflow-hidden rounded-xl"
      style={{ backgroundColor: preset.backgroundColor }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="space-y-1">
          <div className="h-2 w-24 rounded-full opacity-80" style={{ backgroundColor: preset.textColor }} />
          <div className="h-1.5 w-16 rounded-full opacity-40" style={{ backgroundColor: preset.textColor }} />
        </div>
        <div
          className="flex h-7 items-center rounded-lg px-3 text-[10px] font-bold text-white shadow-sm"
          style={{ backgroundColor: preset.primaryColor }}
        >
          <LocalizedText id="8URcXhRpqHKE" />
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex gap-1 px-4 pb-2">
        {["Servicio", "Fecha", "Datos"].map((tab, i) => (
          <div
            key={tab}
            className="rounded-md px-2 py-0.5 text-[9px] font-medium"
            style={
              i === 0
                ? { backgroundColor: preset.primaryColor, color: "#fff" }
                : { backgroundColor: `${preset.textColor}15`, color: `${preset.textColor}88` }
            }
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Service cards */}
      <div className="space-y-1.5 px-4">
        {["Corte + Barba", legacy("H1uNoa7gITz_")].map((svc, i) => (
          <div
            key={svc}
            className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{
              backgroundColor: i === 0 ? `${preset.primaryColor}22` : `${preset.textColor}08`,
              border: `1px solid ${i === 0 ? preset.primaryColor + "44" : preset.secondaryColor + "22"}`,
            }}
          >
            <div>
              <div className="h-1.5 w-16 rounded-full mb-1" style={{ backgroundColor: preset.textColor, opacity: 0.8 }} />
              <div className="h-1 w-10 rounded-full" style={{ backgroundColor: preset.textColor, opacity: 0.35 }} />
            </div>
            <div
              className="rounded-md px-2 py-0.5 text-[9px] font-semibold"
              style={{ backgroundColor: `${preset.primaryColor}33`, color: preset.primaryColor }}
            >
              $8.000
            </div>
          </div>
        ))}
      </div>

      {/* Color swatch strip at bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex">
        {[preset.backgroundColor, preset.primaryColor, preset.secondaryColor, preset.textColor].map((c, i) => (
          <div key={i} className="h-1.5 flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

export function TemasGallery({
  currentColors,
  currentFontSize,
  currentLogoUrl,
  widgetSlug,
  savedThemes,
}: {
  currentColors: PresetColors;
  currentFontSize: number;
  currentLogoUrl?: string;
  widgetSlug: string;
  savedThemes: {
    id: string; name: string; category: string; primaryColor: string; secondaryColor: string;
    backgroundColor: string; textColor: string; textMutedColor: string; fontSize: number;
    cornerRadius: number; shadowStyle: string; headerAlign: string; logoUrl: string | null;
  }[];
}) {
  const legacy = useTranslations("legacy");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Todos");
  const [page, setPage] = useState(1);
  const [applying, setApplying] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<ThemeCard | null>(null);
  const [sortBy, setSortBy] = useState<"defecto" | "az" | "za">("defecto");
  const [origin, setOrigin] = useState<"todos" | "catalogo" | "mios">("todos");
  const [colorFamily, setColorFamily] = useState("Todos");
  const [mutating, setMutating] = useState<string | null>(null);

  const customThemes: ThemeCard[] = savedThemes.map((theme) => ({
    id: `custom-${theme.id}`,
    customId: theme.id,
    name: theme.name,
    category: theme.category,
    description: "Tema guardado por tu equipo",
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    textMutedColor: theme.textMutedColor,
    fontSize: theme.fontSize,
    cornerRadius: theme.cornerRadius,
    shadowStyle: theme.shadowStyle,
    headerAlign: theme.headerAlign,
    logoUrl: theme.logoUrl,
  }));
  const allThemes = [...customThemes, ...PRESETS];

  function getColorFamily(hex: string) {
    const value = hex.replace("#", "").slice(0, 6);
    if (value.length !== 6) return "Neutro";
    const r = parseInt(value.slice(0, 2), 16) / 255;
    const g = parseInt(value.slice(2, 4), 16) / 255;
    const b = parseInt(value.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min < 0.12) return "Neutro";
    let hue = 0;
    if (max === r) hue = ((g - b) / (max - min) + 6) % 6;
    else if (max === g) hue = (b - r) / (max - min) + 2;
    else hue = (r - g) / (max - min) + 4;
    hue *= 60;
    if (hue < 25 || hue >= 345) return "Rojo";
    if (hue < 55) return "Naranja";
    if (hue < 170) return "Verde";
    if (hue < 250) return "Azul";
    return "Violeta";
  }

  const categoryCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === "Todos" ? allThemes.length : allThemes.filter((p) => p.category === cat).length;
    return acc;
  }, {});

  const filtered = allThemes.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || p.category === category;
    const matchOrigin = origin === "todos" || (origin === "mios" ? !!p.customId : !p.customId);
    const matchColor = colorFamily === "Todos" || getColorFamily(p.primaryColor) === colorFamily;
    return matchSearch && matchCat && matchOrigin && matchColor;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "az") return a.name.localeCompare(b.name);
    if (sortBy === "za") return b.name.localeCompare(a.name);
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handleApply(preset: ThemeCard) {
    setApplying(preset.id);
    await saveAppearanceAction({
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
      textMutedColor: preset.textMutedColor,
      widgetFontSize: preset.fontSize ?? currentFontSize,
      widgetCornerRadius: preset.cornerRadius ?? 16,
      widgetShadowStyle: preset.shadowStyle ?? "soft",
      widgetHeaderAlign: preset.headerAlign ?? "left",
      logoUrl: preset.logoUrl ?? currentLogoUrl,
    });
    setPreviewing(null);
    router.push("/dashboard/appearance/personalizado");
    router.refresh();
  }

  async function handleDuplicate(themeId: string) {
    setMutating(themeId);
    await duplicateWidgetThemeAction(themeId);
    setMutating(null);
    router.refresh();
  }

  async function handleDelete(themeId: string) {
    setMutating(themeId);
    await deleteWidgetThemeAction(themeId);
    setMutating(null);
    router.refresh();
  }

  const previewUrl = (p: ThemeCard) => {
    const params = new URLSearchParams({
      primary: p.primaryColor.replace("#", ""),
      secondary: p.secondaryColor.replace("#", ""),
      bg: p.backgroundColor.replace("#", ""),
      text: p.textColor.replace("#", ""),
      textSecondary: p.textMutedColor.replace("#", ""),
      fontSize: String(p.fontSize ?? currentFontSize),
      radius: String(p.cornerRadius ?? 16),
      shadow: p.shadowStyle ?? "soft",
      headerAlign: p.headerAlign ?? "left",
    });
    return `/widget/${widgetSlug}?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      {/* Search + Filters */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4" data-tour="theme-filters">
        <div className="flex items-center gap-2 text-sm font-bold"><SlidersHorizontal className="h-4 w-4 text-[#7C3AED]" /> <LocalizedText id="e25ZDmqlUpM7" /></div>
        {/* Search + sort row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={legacy("NWyza6OKEIk3")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-9 text-sm outline-none transition-colors focus:border-[#7C3AED]/40"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as "defecto" | "az" | "za"); setPage(1); }}
            className="rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#7C3AED]/40 transition-colors cursor-pointer"
          >
            <option value="defecto">Ordenar: Defecto</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>

        {/* Category chips with counts */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1); }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-[#7C3AED] text-white shadow-sm"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                category === cat ? "bg-white/20 text-white" : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {categoryCounts[cat]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-muted-foreground"><LocalizedText id="FnqUDGJ4inrs" /></span>
          {([["todos", "Todos"], ["catalogo", legacy("3Hq6vETMljUH")], ["mios", `Mis temas (${savedThemes.length})`]] as const).map(([value, label]) => (
            <button key={value} onClick={() => { setOrigin(value); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${origin === value ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-border text-muted-foreground hover:text-foreground"}`}>{label}</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-muted-foreground"><LocalizedText id="a3MZGgpLZ0IO" /></span>
          {["Todos", "Violeta", "Azul", "Verde", "Rojo", "Naranja", "Neutro"].map((family) => (
            <button key={family} onClick={() => { setColorFamily(family); setPage(1); }} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${colorFamily === family ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]" : "border-border text-muted-foreground"}`}>
              {family !== "Todos" && <span className={`h-2.5 w-2.5 rounded-full ${family === "Violeta" ? "bg-violet-500" : family === "Azul" ? "bg-sky-500" : family === "Verde" ? "bg-emerald-500" : family === "Rojo" ? "bg-red-500" : family === "Naranja" ? "bg-orange-500" : "bg-zinc-500"}`} />}
              {family}
            </button>
          ))}
        </div>

        {/* Result count + clear all */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{sorted.length}</span> <LocalizedText id="fASFNh3jAgXM" />{sorted.length !== 1 ? "s" : ""}
            {search && <> <LocalizedText id="oUU_OA-p8aCO" /> <span className="font-medium text-foreground"><LocalizedText id="SXVYIwAnGSDR" />{search}<LocalizedText id="SXVYIwAnGSDR" /></span></>}
          </p>
          {(search || category !== "Todos" || origin !== "todos" || colorFamily !== "Todos") && (
            <button
              onClick={() => { setSearch(""); setCategory("Todos"); setOrigin("todos"); setColorFamily("Todos"); setSortBy("defecto"); setPage(1); }}
              className="flex items-center gap-1 text-xs text-[#7C3AED] hover:underline"
            >
              <X className="h-3 w-3" /> <LocalizedText id="v8LRYjWGjnzE" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {paginated.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" data-tour="theme-gallery">
          {paginated.map((preset) => {
            const active = isActive(currentColors, preset);
            const isApplying = applying === preset.id;

            return (
              <div
                key={preset.id}
                className={`group overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-lg ${
                  active ? "border-[#7C3AED]/50 ring-1 ring-[#7C3AED]/20" : "border-border hover:border-[#7C3AED]/30"
                } bg-card`}
              >
                {/* Mini widget preview */}
                <div className="relative">
                  <MiniPreview preset={preset} />
                  {/* Hover overlay with "Vista previa" */}
                  <button
                    onClick={() => setPreviewing(preset)}
                    className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100"
                  >
                    <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20">
                      <Eye className="h-4 w-4" /> <LocalizedText id="xTQfGY_C9PhH" />
                    </div>
                  </button>
                  {active && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Check className="h-2.5 w-2.5" /> <LocalizedText id="cjhYFEvVSC1K" />
                    </div>
                  )}
                </div>

                {/* Info + actions */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{preset.name}</span>
                      <div className="flex items-center gap-1.5">
                        {preset.customId && <span className="rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]"><LocalizedText id="ZUHHL4fw4nHf" /></span>}
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{preset.category}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                  </div>

                  {preset.customId && (
                    <div className="grid grid-cols-2 gap-2">
                      <button disabled={mutating === preset.customId} onClick={() => handleDuplicate(preset.customId!)} className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /> <LocalizedText id="iPdyh8vbqCdl" /></button>
                      <button disabled={mutating === preset.customId} onClick={() => handleDelete(preset.customId!)} className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-xs font-medium text-red-500 hover:bg-red-500/20"><Trash2 className="h-3.5 w-3.5" /> <LocalizedText id="yYlM8AL5C9C-" /></button>
                    </div>
                  )}

                  {/* Palette */}
                  <div className="flex items-center gap-1.5">
                    {[preset.backgroundColor, preset.primaryColor, preset.secondaryColor, preset.textColor].map((c, i) => (
                      <div
                        key={i}
                        title={c}
                        className="h-5 w-5 rounded-full border border-white/10 shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <span className="ml-auto text-[11px] text-muted-foreground font-mono">{preset.primaryColor}</span>
                  </div>

                  <button
                    onClick={() => handleApply(preset)}
                    disabled={!!applying || active}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "border border-green-500/20 bg-green-500/10 text-green-400"
                        : "bg-[#7C3AED] text-white hover:bg-[#5B21B6] shadow-sm"
                    }`}
                  >
                    {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <Check className="h-4 w-4" /> : null}
                    {isApplying ? "Aplicando…" : active ? legacy("Z7e1oLdDlIS-") : "Aplicar tema"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          <Search className="mx-auto h-8 w-8 opacity-30 mb-3" />
          <p className="text-sm"><LocalizedText id="uOjZlZEaPJAY" />{search}<LocalizedText id="vTvxY0npSOrG" /></p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 flex items-center gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" /> <LocalizedText id="5M58CdUeO4gx" />
          </button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 flex items-center gap-1.5"
          >
            <LocalizedText id="SWg7ccas9SJB" /> <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Preview modal */}
      {previewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPreviewing(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative z-10 flex w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="font-semibold">{previewing.name}</h3>
                <p className="text-xs text-muted-foreground">{previewing.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApply(previewing)}
                  disabled={!!applying || isActive(currentColors, previewing)}
                  className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-60 transition-colors"
                >
                  {applying === previewing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {applying === previewing.id ? "Aplicando…" : isActive(currentColors, previewing) ? legacy("VCkfu3qZ20FS") : "Aplicar tema"}
                </button>
                <button
                  onClick={() => setPreviewing(null)}
                  className="rounded-xl border border-border p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Iframe preview */}
            <iframe
              src={previewUrl(previewing)}
              className="h-[600px] w-full border-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
