import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/icons/hover-icons";
import { TrackedCtaAnchor, TrackedLink } from "@/components/analytics/tracked-link";
import { cn } from "@/lib/utils";
import { seo } from "./styles";

export type LandingCta = {
  href: string;
  label: ReactNode;
  cta?: string;
  placement?: string;
  external?: boolean;
  tracked?: boolean;
};

export function LandingCtaGroup({
  primary,
  secondary,
  align = "start",
  className,
}: {
  primary: LandingCta;
  secondary?: LandingCta;
  align?: "start" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap",
        align === "center" && "items-center justify-center sm:justify-center",
        className,
      )}
    >
      <TrackedLink href={primary.href} cta={primary.cta ?? "register"} placement={primary.placement ?? "hero"} className={cn(seo.primaryCta, "w-full sm:w-auto")}>
        {primary.label}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </TrackedLink>
      {secondary ? (
        secondary.tracked === false ? (
          <Link href={secondary.href} className={cn(seo.secondaryCta, "w-full sm:w-auto")}>
            {secondary.label}
          </Link>
        ) : secondary.external || secondary.href === "/demo" || secondary.href.startsWith("/demo") ? (
          <TrackedCtaAnchor href={secondary.href} cta={secondary.cta ?? "demo"} placement={secondary.placement ?? "hero"} className={cn(seo.secondaryCta, "w-full sm:w-auto")}>
            {secondary.label}
          </TrackedCtaAnchor>
        ) : (
          <TrackedLink href={secondary.href} cta={secondary.cta ?? "secondary"} placement={secondary.placement ?? "hero"} className={cn(seo.secondaryCta, "w-full sm:w-auto")}>
            {secondary.label}
          </TrackedLink>
        )
      ) : null}
    </div>
  );
}
