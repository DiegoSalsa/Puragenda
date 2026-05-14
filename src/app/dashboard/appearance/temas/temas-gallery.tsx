"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Check, Loader2, ChevronLeft, ChevronRight, X, Eye } from "lucide-react";
import { saveAppearanceAction } from "@/server/actions/dashboard.actions";

const CATEGORIES = ["Todos", "Oscuro", "Claro", "Colorido", "Minimalista"] as const;
const PER_PAGE = 12;

interface PresetColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  textMutedColor: string;
}

const PRESETS: (PresetColors & { id: string; name: string; category: string; description: string })[] = [
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
  // ——— Claro ———
  { id: "snow",        name: "Snow",         category: "Claro",       description: "Violeta limpio sobre blanco",            primaryColor: "#7C3AED", secondaryColor: "#5B21B6", backgroundColor: "#FFFFFF",  textColor: "#111827", textMutedColor: "#11182766" },
  { id: "pearl",       name: "Pearl",        category: "Claro",       description: "Azul sobre blanco frío",                 primaryColor: "#2563EB", secondaryColor: "#1D4ED8", backgroundColor: "#F8FAFC",  textColor: "#1E293B", textMutedColor: "#1E293B66" },
  { id: "ivory",       name: "Ivory",        category: "Claro",       description: "Verde teal sobre marfil",                primaryColor: "#0D9488", secondaryColor: "#0F766E", backgroundColor: "#FFFBF5",  textColor: "#1C1917", textMutedColor: "#1C191766" },
  { id: "frost",       name: "Frost",        category: "Claro",       description: "Índigo sobre azul cielo suave",           primaryColor: "#6366F1", secondaryColor: "#4F46E5", backgroundColor: "#F0F9FF",  textColor: "#0C4A6E", textMutedColor: "#0C4A6E66" },
  { id: "morning",     name: "Morning",      category: "Claro",       description: "Rosa coral sobre blanco cálido",          primaryColor: "#F43F5E", secondaryColor: "#E11D48", backgroundColor: "#FFF1F2",  textColor: "#1F1F1F", textMutedColor: "#1F1F1F66" },
  { id: "lavender",    name: "Lavender",     category: "Claro",       description: "Lavanda sobre lila muy suave",           primaryColor: "#7C3AED", secondaryColor: "#6D28D9", backgroundColor: "#F5F3FF",  textColor: "#1E1B4B", textMutedColor: "#1E1B4B66" },
  { id: "sage",        name: "Sage",         category: "Claro",       description: "Verde salvia sobre verde claro",         primaryColor: "#059669", secondaryColor: "#047857", backgroundColor: "#F0FDF4",  textColor: "#14532D", textMutedColor: "#14532D66" },
  // ——— Colorido ———
  { id: "sunset",      name: "Sunset",       category: "Colorido",    description: "Naranja y rojo sobre oscuro cálido",       primaryColor: "#F97316", secondaryColor: "#EF4444", backgroundColor: "#1A0A00", textColor: "#FFF7ED", textMutedColor: "#FFF7ED66" },
  { id: "ocean",       name: "Ocean",        category: "Colorido",    description: "Cian e índigo sobre negro profundo",       primaryColor: "#0EA5E9", secondaryColor: "#6366F1", backgroundColor: "#020617", textColor: "#E0F2FE", textMutedColor: "#E0F2FE66" },
  { id: "forest",      name: "Forest",       category: "Colorido",    description: "Verde vibrante sobre verde oscuro",       primaryColor: "#22C55E", secondaryColor: "#16A34A", backgroundColor: "#052E16", textColor: "#DCFCE7", textMutedColor: "#DCFCE766" },
  { id: "berry",       name: "Berry",        category: "Colorido",    description: "Rosa y violeta sobre morado oscuro",      primaryColor: "#EC4899", secondaryColor: "#A855F7", backgroundColor: "#1A0020", textColor: "#FCE7F3", textMutedColor: "#FCE7F366" },
  { id: "mango",       name: "Mango",        category: "Colorido",    description: "Amarillo y naranja sobre negro cálido",   primaryColor: "#FBBF24", secondaryColor: "#F97316", backgroundColor: "#0A0500", textColor: "#FFFBEB", textMutedColor: "#FFFBEB66" },
  { id: "aurora-mix",  name: "Aurora Mix",   category: "Colorido",    description: "Verde y violeta sobre negro polar",       primaryColor: "#34D399", secondaryColor: "#A855F7", backgroundColor: "#011C1A", textColor: "#ECFDF5", textMutedColor: "#ECFDF566" },
  { id: "neon-nights", name: "Neon Nights",  category: "Colorido",    description: "Rosa neón y ámbar sobre negro",            primaryColor: "#F472B6", secondaryColor: "#FBBF24", backgroundColor: "#0A000A", textColor: "#FDF4FF", textMutedColor: "#FDF4FF66" },
  { id: "tropical",    name: "Tropical",     category: "Colorido",    description: "Turquesa y coral sobre oscuro tropical",  primaryColor: "#14B8A6", secondaryColor: "#F97316", backgroundColor: "#001A1A", textColor: "#F0FDFA", textMutedColor: "#F0FDFA66" },
  // ——— Minimalista ———
  { id: "mono-dark",   name: "Mono Dark",    category: "Minimalista", description: "Blanco puro sobre negro total",           primaryColor: "#FFFFFF", secondaryColor: "#A1A1AA", backgroundColor: "#000000", textColor: "#FFFFFF", textMutedColor: "#FFFFFF66" },
  { id: "mono-light",  name: "Mono Light",   category: "Minimalista", description: "Negro total sobre blanco puro",           primaryColor: "#000000", secondaryColor: "#52525B", backgroundColor: "#FFFFFF", textColor: "#000000", textMutedColor: "#00000066" },
  { id: "ash",         name: "Ash",          category: "Minimalista", description: "Gris neutro sobre azul noche",            primaryColor: "#6B7280", secondaryColor: "#4B5563", backgroundColor: "#111827", textColor: "#F9FAFB", textMutedColor: "#F9FAFB66" },
  { id: "stone",       name: "Stone",        category: "Minimalista", description: "Marrón tierra sobre crema",                primaryColor: "#78716C", secondaryColor: "#57534E", backgroundColor: "#FAFAF9", textColor: "#1C1917", textMutedColor: "#1C191766" },
  { id: "zinc",        name: "Zinc",         category: "Minimalista", description: "Zinc oscuro sobre gris suave",            primaryColor: "#3F3F46", secondaryColor: "#52525B", backgroundColor: "#F4F4F5", textColor: "#18181B", textMutedColor: "#18181B66" },
  { id: "paper",       name: "Paper",        category: "Minimalista", description: "Casi negro sobre blanco papel",          primaryColor: "#1F2937", secondaryColor: "#374151", backgroundColor: "#FEFCE8", textColor: "#111827", textMutedColor: "#11182766" },
  { id: "fog",         name: "Fog",          category: "Minimalista", description: "Pizarra sobre gris neblina",              primaryColor: "#475569", secondaryColor: "#334155", backgroundColor: "#F8FAFC", textColor: "#0F172A", textMutedColor: "#0F172A66" },
  { id: "graphite",    name: "Graphite",     category: "Minimalista", description: "Plata grafito sobre carbón suave",        primaryColor: "#9CA3AF", secondaryColor: "#6B7280", backgroundColor: "#1C1C1E", textColor: "#F5F5F7", textMutedColor: "#F5F5F766" },
];

function isActive(current: PresetColors, preset: PresetColors) {
  return (
    current.primaryColor === preset.primaryColor &&
    current.backgroundColor === preset.backgroundColor
  );
}

function MiniPreview({ preset }: { preset: typeof PRESETS[0] }) {
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
          Reservar
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
        {["Corte + Barba", "Corte Clásico"].map((svc, i) => (
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
}: {
  currentColors: PresetColors;
  currentFontSize: number;
  currentLogoUrl?: string;
  widgetSlug: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Todos");
  const [page, setPage] = useState(1);
  const [applying, setApplying] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<typeof PRESETS[0] | null>(null);
  const [sortBy, setSortBy] = useState<"defecto" | "az" | "za">("defecto");

  const categoryCounts = CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === "Todos" ? PRESETS.length : PRESETS.filter((p) => p.category === cat).length;
    return acc;
  }, {});

  const filtered = PRESETS.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "Todos" || p.category === category;
    return matchSearch && matchCat;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "az") return a.name.localeCompare(b.name);
    if (sortBy === "za") return b.name.localeCompare(a.name);
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  async function handleApply(preset: typeof PRESETS[0]) {
    setApplying(preset.id);
    await saveAppearanceAction({
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
      textMutedColor: preset.textMutedColor,
      widgetFontSize: currentFontSize,
      logoUrl: currentLogoUrl,
    });
    setPreviewing(null);
    router.push("/dashboard/appearance/personalizado");
    router.refresh();
  }

  const previewUrl = (p: typeof PRESETS[0]) =>
    `/widget/${widgetSlug}?primary=${p.primaryColor.replace("#", "")}&secondary=${p.secondaryColor.replace("#", "")}&bg=${p.backgroundColor.replace("#", "")}&text=${p.textColor.replace("#", "")}&textSecondary=${p.textMutedColor.replace("#", "")}&fontSize=${currentFontSize}`;

  return (
    <div className="space-y-5">
      {/* Search + Filters */}
      <div className="space-y-3">
        {/* Search + sort row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, estilo o categoría..."
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

        {/* Result count + clear all */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{sorted.length}</span> tema{sorted.length !== 1 ? "s" : ""}
            {search && <> para <span className="font-medium text-foreground">&quot;{search}&quot;</span></>}
          </p>
          {(search || category !== "Todos") && (
            <button
              onClick={() => { setSearch(""); setCategory("Todos"); setSortBy("defecto"); setPage(1); }}
              className="flex items-center gap-1 text-xs text-[#7C3AED] hover:underline"
            >
              <X className="h-3 w-3" /> Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {paginated.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                      <Eye className="h-4 w-4" /> Vista previa
                    </div>
                  </button>
                  {active && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Check className="h-2.5 w-2.5" /> Activo
                    </div>
                  )}
                </div>

                {/* Info + actions */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{preset.name}</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{preset.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                  </div>

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
                    {isApplying ? "Aplicando…" : active ? "Tema activo" : "Aplicar tema"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          <Search className="mx-auto h-8 w-8 opacity-30 mb-3" />
          <p className="text-sm">No se encontraron temas para &quot;{search}&quot; en esta categoría.</p>
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
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 flex items-center gap-1.5"
          >
            Siguiente <ChevronRight className="h-4 w-4" />
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
                  {applying === previewing.id ? "Aplicando…" : isActive(currentColors, previewing) ? "✓ Activo" : "Aplicar tema"}
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
