import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LandingCtaGroup, type LandingCta } from "./landing-cta-group";
import { seo } from "./styles";

export function FinalCta({
  id,
  title,
  children,
  primary,
  secondary,
  footer,
}: {
  id: string;
  title: ReactNode;
  children?: ReactNode;
  primary: LandingCta;
  secondary?: LandingCta;
  footer?: ReactNode;
}) {
  return (
    <section className="border-t-2 border-black bg-[#FFF6C8] py-16 text-center dark:border-white dark:bg-black sm:py-20" aria-labelledby={id}>
      <div className="mx-auto max-w-3xl px-6">
        <h2 id={id} className={cn(seo.h2, "mx-auto text-black dark:text-white")}>
          {title}
        </h2>
        {children ? <div className={cn(seo.body, "mx-auto mt-4")}>{children}</div> : null}
        <LandingCtaGroup primary={primary} secondary={secondary} align="center" className="mt-8" />
        {footer ? <div className="mt-8">{footer}</div> : null}
      </div>
    </section>
  );
}
