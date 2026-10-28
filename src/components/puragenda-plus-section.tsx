import Link from "next/link";
import { ArrowRight, LayoutTemplate } from "@/components/icons/hover-icons";
import { formatPublicClp, publicMonthlyQuote } from "@/lib/public-plans";

export function PuragendaPlusHomeSection() {
  return (
    <section className="mx-auto my-10 w-full max-w-6xl px-6" aria-labelledby="plus-home-title">
      <div className="grid items-center gap-6 rounded-3xl border-4 border-black bg-[#E9D8FF] p-6 text-black shadow-[6px_6px_0_#000] sm:p-8 md:grid-cols-[auto_1fr_auto]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-3 border-black bg-[#85E3FF] shadow-[3px_3px_0_#000]"><LayoutTemplate className="h-7 w-7" aria-hidden="true" /></div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#6D28D9]">Puragenda+</p>
          <h2 id="plus-home-title" className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">Tu agenda y tu sitio web, juntos.</h2>
          <p className="mt-3 max-w-xl font-bold leading-7 text-black/75">Todo Puragenda, más sitio web con reservas integradas, hosting y SSL, inteligencia comercial con Puri avanzado y automatizaciones Contact Flow para recuperar clientes y generar nuevas reservas.</p>
          <p className="mt-2 text-sm font-bold">Desde {formatPublicClp(publicMonthlyQuote("PURAGENDA_PLUS").monthlyTotal)} CLP/mes · IVA incluido · 1 profesional.</p>
        </div>
        <Link href="/puragenda-plus" className="inline-flex min-h-12 w-fit items-center gap-2 rounded-xl border-3 border-black bg-white px-4 py-3 text-sm font-black shadow-[3px_3px_0_#000] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]">Conocer Puragenda+ <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
