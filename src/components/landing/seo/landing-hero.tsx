import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LandingBreadcrumb, type LandingCrumb } from "./landing-breadcrumb";
import { LandingCtaGroup, type LandingCta } from "./landing-cta-group";
import { eyebrowTone, seo } from "./styles";

export function LandingHero({
  breadcrumbs,
  eyebrow,
  tone = "purple",
  h1,
  lead,
  note,
  primaryCta,
  secondaryCta,
  visual,
  align = "split",
}: {
  breadcrumbs: LandingCrumb[];
  eyebrow?: string;
  tone?: keyof typeof eyebrowTone;
  h1: ReactNode;
  lead: ReactNode;
  note?: ReactNode;
  primaryCta: LandingCta;
  secondaryCta?: LandingCta;
  visual?: ReactNode;
  align?: "split" | "center";
}) {
  const centered = align === "center";

  return (
    <section className={cn(seo.wrap, "pt-6 pb-12 sm:pt-8 sm:pb-16")}>
      <LandingBreadcrumb items={breadcrumbs} />
      <div
        className={cn(
          "grid items-start gap-10 lg:gap-14 lg:items-center",
          visual && !centered ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]" : "",
          centered && "text-center",
        )}
      >
        <div className={cn(centered && "mx-auto max-w-3xl")}>
          {eyebrow ? <p className={cn(seo.eyebrow, eyebrowTone[tone])}>{eyebrow}</p> : null}
          <h1 className={cn(seo.h1, eyebrow && "mt-5", centered && "mx-auto")}>{h1}</h1>
          <div className={cn(seo.lead, "mt-5", centered && "mx-auto")}>{lead}</div>
          <LandingCtaGroup
            primary={primaryCta}
            secondary={secondaryCta}
            align={centered ? "center" : "start"}
            className="mt-8"
          />
          {note ? <p className={cn(seo.note, "mt-5", centered && "mx-auto")}>{note}</p> : null}
        </div>
        {visual ? <div className={cn(centered && "mx-auto w-full max-w-3xl")}>{visual}</div> : null}
      </div>
    </section>
  );
}
