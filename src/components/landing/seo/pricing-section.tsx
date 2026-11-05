import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatPublicClp, PUBLIC_PLAN_CODES, publicMonthlyQuote } from "@/lib/public-plans";
import { seo } from "./styles";

export function PricingSection({
  id,
  kicker = "Precios vigentes",
  title,
  intro,
  footer,
  className,
}: {
  id: string;
  kicker?: string;
  title: string;
  intro?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(seo.section, className)} aria-labelledby={id}>
      <div className="mx-auto max-w-3xl text-center">
        <p className={seo.kicker}>{kicker}</p>
        <h2 id={id} className={cn(seo.h2, "mx-auto mt-3")}>{title}</h2>
        {intro ? <div className={cn(seo.body, "mx-auto mt-4")}>{intro}</div> : null}
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {PUBLIC_PLAN_CODES.map((plan) => {
          const quote = publicMonthlyQuote(plan);
          return (
            <article key={plan} className={cn(seo.panel, "p-6 sm:p-7", plan === "PURAGENDA_PLUS" && "border-[#7C3AED]")}>
              <h3 className={seo.h3}>{quote.displayName}</h3>
              <p className="mt-4 text-3xl font-black tracking-tight sm:text-4xl"><span className="mb-1 block text-sm tracking-normal">Desde</span>{formatPublicClp(quote.monthlyTotal)} <span className="text-base font-bold">CLP/mes</span></p>
              <p className="mt-2 text-sm font-bold">IVA incluido · 1 profesional.</p>
              <p className={cn(seo.body, "mt-4 text-base")}>{plan === "PURAGENDA" ? "Reservas online, clientes, profesionales y Puri para el día a día de tu negocio." : "Todo Puragenda, más sitio web con hosting y reservas integradas, inteligencia comercial con Puri avanzado y automatizaciones Contact Flow."}</p>
              <Link href="/pricing" className={cn(seo.link, "mt-5 inline-flex min-h-11 items-center")}>Elegir profesionales y comparar →</Link>
            </article>
          );
        })}
      </div>
      <p className={cn(seo.body, "mt-6 text-center text-sm")}>Ambos planes permiten sumar profesionales. Consulta el total para tu negocio en Precios.</p>
      {footer ? <div className={cn(seo.body, "mt-8 text-center text-base")}>{footer}</div> : null}
    </section>
  );
}

export function PricingFooterLink() {
  return <Link href="/pricing" className={seo.link}>Comparar planes</Link>;
}
