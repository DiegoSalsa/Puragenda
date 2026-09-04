import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { seo } from "./styles";

export function SectionIntro({
  id,
  kicker,
  title,
  children,
  align = "left",
  className,
}: {
  id?: string;
  kicker?: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto max-w-3xl text-center", className)}>
      {kicker ? <p className={seo.kicker}>{kicker}</p> : null}
      <h2 id={id} className={cn(seo.h2, kicker && "mt-3", align === "center" && "mx-auto")}>
        {title}
      </h2>
      {children ? <div className={cn(seo.body, "mt-4", align === "center" && "mx-auto")}>{children}</div> : null}
    </div>
  );
}
