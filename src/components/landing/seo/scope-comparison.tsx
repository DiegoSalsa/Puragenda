import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { seo } from "./styles";

export function ScopeComparison({
  left,
  right,
}: {
  left: { title: string; children: ReactNode };
  right: { title: string; children: ReactNode };
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <article className={cn(seo.panel, "p-6 sm:p-7")}>
        <h3 className={seo.h3}>{left.title}</h3>
        <div className={cn(seo.body, "mt-4 text-base")}>{left.children}</div>
      </article>
      <article className={cn(seo.panel, "bg-[#F8F7FC] p-6 sm:p-7 dark:bg-[#222222]")}>
        <h3 className={seo.h3}>{right.title}</h3>
        <div className={cn(seo.body, "mt-4 text-base")}>{right.children}</div>
      </article>
    </div>
  );
}
