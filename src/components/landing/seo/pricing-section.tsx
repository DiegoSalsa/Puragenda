import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { seo } from "./styles";

export function PricingSection({
  id,
  kicker = "Precios vigentes",
  title,
  intro,
  individual,
  team,
  footer,
  className,
}: {
  id: string;
  kicker?: string;
  title: string;
  intro?: ReactNode;
  individual: { name: string; price: string; detail: ReactNode };
  team: { name: string; price: string; detail: ReactNode };
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(seo.section, className)} aria-labelledby={id}>
      <div className="mx-auto max-w-3xl text-center">
        <p className={seo.kicker}>{kicker}</p>
        <h2 id={id} className={cn(seo.h2, "mx-auto mt-3")}>
          {title}
        </h2>
        {intro ? <div className={cn(seo.body, "mx-auto mt-4")}>{intro}</div> : null}
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <article className={cn(seo.panel, "p-7")}>
          <h3 className={seo.h3}>{individual.name}</h3>
          <p className="mt-4 text-4xl font-black tracking-tight">
            {individual.price} <span className="text-base font-bold text-black/55">CLP / mes</span>
          </p>
          <div className={cn(seo.body, "mt-4 text-base")}>{individual.detail}</div>
        </article>
        <article className={cn(seo.panel, "border-[#7C3AED] p-7")}>
          <h3 className={seo.h3}>{team.name}</h3>
          <p className="mt-4 text-4xl font-black tracking-tight">
            {team.price} <span className="text-base font-bold text-black/55">CLP / mes</span>
          </p>
          <div className={cn(seo.body, "mt-4 text-base")}>{team.detail}</div>
        </article>
      </div>
      {footer ? <div className={cn(seo.body, "mt-8 text-center text-base")}>{footer}</div> : null}
    </section>
  );
}

export function PricingFooterLink() {
  return (
    <Link href="/pricing" className={seo.link}>
      Comparar planes
    </Link>
  );
}
