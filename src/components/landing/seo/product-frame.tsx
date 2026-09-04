import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProductFrame({
  label,
  caption = "Ejemplo ilustrativo. No es un negocio real.",
  children,
  className,
  tone = "cream",
}: {
  label: string;
  caption?: string;
  children: ReactNode;
  className?: string;
  tone?: "cream" | "white" | "sober" | "pink";
}) {
  const shell =
    tone === "sober"
      ? "bg-[#F8F7FC] dark:bg-[#0c0c0c]"
      : tone === "white"
        ? "bg-white dark:bg-[#222222]"
        : tone === "pink"
          ? "bg-[#FFD6F0] dark:bg-[#222222]"
          : "bg-[#FFF5BA] dark:bg-[#222222]";

  return (
    <figure className={cn("rounded-[24px] border-2 border-black p-3 shadow-[7px_7px_0_#000] dark:border-white", shell, className)}>
      <div className="overflow-hidden rounded-[18px] border-2 border-black bg-white text-black dark:border-white dark:bg-[#0c0c0c] dark:text-white">
        <div className="flex items-center justify-between gap-3 border-b-2 border-black px-4 py-2.5 dark:border-white">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em]">{label}</p>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
      {caption ? <figcaption className="mt-2.5 text-center text-[11px] font-semibold text-black/50 dark:text-white/50">{caption}</figcaption> : null}
    </figure>
  );
}
