"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  MapPin,
  Search,
  Store,
} from "@/components/icons/hover-icons";

export type MarketplacePromptDropdownGroup = {
  label?: string;
  options: Array<{ value: string; label: string }>;
};

type MarketplacePromptDropdownProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  groups: MarketplacePromptDropdownGroup[];
  onChange: (value: string) => void;
  tone: "category" | "locality";
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  optionsLabel?: string;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function MarketplacePromptDropdown({
  id,
  label,
  value,
  placeholder,
  groups,
  onChange,
  tone,
  searchable = false,
  searchPlaceholder = "Buscar…",
  noResultsLabel = "No encontramos resultados",
  optionsLabel = "opciones",
}: MarketplacePromptDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = `${id}-listbox`;
  const selected = groups
    .flatMap((group) => group.options)
    .find((option) => option.value === value);
  const filteredGroups = useMemo(() => {
    const normalizedQuery = normalizeSearch(query.trim());
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => (
          normalizeSearch(`${option.label} ${group.label ?? ""}`).includes(normalizedQuery)
        )),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, query]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, searchable]);

  const accent = tone === "category" ? "#7C3AED" : "#E91E8C";
  const Icon = tone === "category" ? Store : MapPin;

  function closeDropdown() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative min-w-0 sm:min-w-64">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        onClick={() => {
          if (open) closeDropdown();
          else setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex w-full min-w-0 items-center gap-2 rounded-full border-2 border-[#1A1E24] bg-white py-2 pl-3 pr-3 text-left text-sm font-bold shadow-[2px_2px_0_#1A1E24] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1A1E24] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B28DFF]/40 dark:border-white/80 dark:bg-white/10 dark:shadow-[2px_2px_0_#7C3AED]"
      >
        <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} />
        <span className="shrink-0 text-[#71717A] dark:text-zinc-400">{label}:</span>
        <span className="min-w-0 flex-1 truncate font-black text-[#1A1E24] dark:text-white">
          {selected?.label ?? placeholder}
        </span>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-transform"
          style={{ backgroundColor: `${accent}18`, color: accent }}
          aria-hidden="true"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-3 w-[min(24rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border-2 border-[#1A1E24] bg-[#FFFAEB] shadow-[6px_6px_0_#1A1E24] dark:border-white dark:bg-[#17131F] dark:shadow-[6px_6px_0_#7C3AED]">
          <div className="flex items-center justify-between border-b-2 border-[#1A1E24] bg-[#B28DFF] px-4 py-3 text-[#1A1E24] dark:border-white">
            <span className="text-xs font-black uppercase tracking-[0.12em]">{label}</span>
            <span className="rounded-full border-2 border-[#1A1E24] bg-[#FFF5BA] px-2 py-0.5 text-[10px] font-black">
              {groups.reduce((total, group) => total + group.options.length, 0)} {optionsLabel}
            </span>
          </div>

          {searchable ? (
            <div className="border-b-2 border-[#1A1E24] bg-white/80 p-3 dark:border-white dark:bg-white/5">
              <div className="flex items-center gap-2 rounded-xl border-2 border-[#1A1E24] bg-white px-3 py-2 shadow-[2px_2px_0_#1A1E24] focus-within:ring-4 focus-within:ring-[#FFB5E8]/60 dark:border-white dark:bg-black/20 dark:shadow-[2px_2px_0_#E91E8C]">
                <Search className="h-4 w-4 shrink-0 text-[#7C3AED]" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#1A1E24] outline-none placeholder:text-[#71717A] dark:text-white"
                />
              </div>
            </div>
          ) : null}

          <div id={listboxId} role="listbox" aria-labelledby={id} className="max-h-72 overflow-y-auto overscroll-contain p-2">
            {filteredGroups.length > 0 ? filteredGroups.map((group) => (
              <div key={group.label ?? "options"} role="group" aria-label={group.label}>
                {group.label ? (
                  <div className="sticky top-0 z-10 mb-1 mt-1 flex items-center gap-2 rounded-lg bg-[#FFF5BA] px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#1A1E24] dark:bg-[#2A2038] dark:text-white">
                    <span className="h-2 w-2 rounded-full bg-[#E91E8C]" aria-hidden="true" />
                    {group.label}
                  </div>
                ) : null}
                {group.options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(option.value);
                        closeDropdown();
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                        isSelected
                          ? "bg-[#7C3AED] text-white"
                          : "text-[#3F3F46] hover:bg-[#FFB5E8]/50 dark:text-zinc-200 dark:hover:bg-white/10"
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#BFFCC6] text-[#1A1E24]" aria-hidden="true">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )) : (
              <div className="px-4 py-8 text-center text-sm font-semibold text-[#71717A] dark:text-zinc-400">
                {noResultsLabel}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
