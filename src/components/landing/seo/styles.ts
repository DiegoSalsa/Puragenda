import { cn } from "@/lib/utils";

/** Shared visual grammar for SEO commercial landings. Keep the Puragenda canvas. */
export const seo = {
  wrap: "mx-auto w-full max-w-6xl px-6",
  section: "mx-auto w-full max-w-6xl px-6 py-14 sm:py-20",
  breadcrumb: "mb-8 text-sm font-semibold text-black/55 dark:text-white/55",
  breadcrumbLink:
    "underline decoration-black/25 underline-offset-4 transition-colors hover:text-[#7C3AED] hover:decoration-[#7C3AED] dark:decoration-white/30",
  eyebrow:
    "inline-flex items-center rounded-md border-2 border-black bg-[#E9D5FF] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-black dark:border-white",
  h1: "w-full max-w-full text-[1.65rem] font-black leading-[1.15] tracking-tight break-words sm:max-w-3xl sm:text-5xl lg:text-[3.25rem]",
  lead: "w-full max-w-xl text-base font-medium leading-7 text-black/75 break-words dark:text-white/75 sm:text-xl sm:leading-8",
  note: "w-full max-w-xl text-sm font-semibold leading-6 text-black/55 break-words dark:text-white/55",
  kicker: "text-[11px] font-black uppercase tracking-[0.18em] text-[#6D28D9] dark:text-[#C4B5FD]",
  h2: "w-full max-w-full text-3xl font-black tracking-tight break-words sm:max-w-3xl sm:text-4xl",
  h3: "text-xl font-black tracking-tight",
  body: "text-base font-medium leading-7 text-black/80 dark:text-white/80 sm:text-lg sm:leading-8",
  link: "font-bold text-[#5B21B6] underline underline-offset-4 hover:text-[#7C3AED] dark:text-[#C4B5FD]",
  primaryCta: cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-[3px] border-black bg-[#7C3AED] px-6 py-3.5 text-base font-black text-white shadow-[4px_4px_0_#000]",
    "transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]",
    "motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0",
    "dark:border-white",
  ),
  secondaryCta: cn(
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-[3px] border-black bg-white px-6 py-3.5 text-base font-black text-black shadow-[4px_4px_0_#000]",
    "transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]",
    "motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0",
    "dark:border-white dark:bg-black dark:text-white",
  ),
  panel: "rounded-[24px] border-2 border-black bg-white shadow-[6px_6px_0_#000] dark:border-white dark:bg-[#222222]",
  band: "border-y-2 border-black bg-[#F3E8FF] text-black dark:border-white dark:bg-[#251830] dark:text-white",
  bandWarm: "border-y-2 border-black bg-[#FFF6C8] text-black dark:border-white dark:bg-[#241e14] dark:text-white",
  bandQuiet: "border-y-2 border-black bg-white text-black dark:border-white dark:bg-[#0c0c0c] dark:text-white",
} as const;

export const eyebrowTone = {
  purple: "bg-[#E9D5FF]",
  cream: "bg-[#FFF5BA]",
  pink: "bg-[#FFB5E8]",
  mint: "bg-[#BFFCC6]",
  cyan: "bg-[#85E3FF]",
  sober: "bg-white",
} as const;
