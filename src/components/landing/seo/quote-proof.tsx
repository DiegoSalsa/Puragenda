import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { seo } from "./styles";

export function QuoteProof({
  quote,
  author,
  business,
  initial,
  children,
}: {
  quote: string;
  author: string;
  business: string;
  initial: string;
  children?: ReactNode;
}) {
  return (
    <figure className={cn(seo.panel, "bg-[#FFF6C8] p-7 text-black dark:bg-[#222222] dark:text-white")}>
      <blockquote lang="es" className="text-lg font-medium leading-8 sm:text-xl">
        {quote}
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t-2 border-black/10 pt-4 dark:border-white/15">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-black bg-white text-lg font-black text-black shadow-[2px_2px_0_#000]">
          {initial}
        </div>
        <div>
          <p className="text-sm font-black">{author}</p>
          <p className="text-xs font-bold text-black/55 dark:text-white/55">{business}</p>
        </div>
      </figcaption>
      {children}
    </figure>
  );
}
