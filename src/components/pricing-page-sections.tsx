"use client";

import { PricingCards } from "@/components/pricing-cards";

export function PricingHero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex rounded-full border-3 border-black bg-[#BFFCC6] px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000]">Puragenda y Puragenda+</p>
        <h1 className="mt-6 text-balance text-4xl font-black uppercase tracking-tighter sm:text-6xl">Elige cómo quieres hacer crecer tu negocio</h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-lg font-bold leading-8 text-black/70 dark:text-white/70">Organiza tu negocio con Puragenda o suma tu propio sitio web con Puragenda+. Elige cuántos profesionales atienden y compara el total de ambos planes.</p>
      </div>
      <div id="planes" className="mt-12"><PricingCards mode="landing" /></div>
    </section>
  );
}

type Cell = "Incluido" | "No incluido" | "Según cantidad elegida";

const comparisonRows: Array<[string, Cell, Cell]> = [
  ["Reservas online", "Incluido", "Incluido"],
  ["Agenda y operaciones", "Incluido", "Incluido"],
  ["Gestión de clientes y servicios", "Incluido", "Incluido"],
  ["Puri estándar", "Incluido", "Incluido"],
  ["Fidelización y gift cards", "Incluido", "Incluido"],
  ["Estadísticas operativas", "Incluido", "Incluido"],
  ["Profesionales adicionales", "Según cantidad elegida", "Según cantidad elegida"],
  ["Sitio web, editor y hosting", "No incluido", "Incluido"],
  ["Puri avanzado y análisis comercial", "No incluido", "Incluido"],
  ["Automatizaciones Contact Flow", "No incluido", "Incluido"],
];

export function PricingComparisonTable() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6" aria-labelledby="comparacion-planes">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#6D28D9]">Comparación clara</p>
        <h2 id="comparacion-planes" className="mt-2 text-3xl font-black uppercase tracking-tight sm:text-4xl">Puragenda vs. Puragenda+</h2>
        <p className="mt-3 font-bold leading-7 text-black/70 dark:text-white/70">Ambos planes comparten las herramientas del día a día. Puragenda+ suma sitio web, análisis del negocio con Puri avanzado y automatizaciones Contact Flow para generar nuevas reservas.</p>
      </div>
      <div className="overflow-hidden rounded-[1.5rem] border-4 border-black bg-white shadow-[7px_7px_0_#000] dark:border-white dark:bg-[#111] dark:shadow-[7px_7px_0_#fff]">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Comparación de funciones por plan">
          <table className="w-full table-fixed border-collapse text-left text-xs sm:text-base">
            <thead>
              <tr className="border-b-4 border-black bg-[#FFF5BA] text-black dark:border-white">
                <th scope="col" className="w-[40%] border-r-3 border-black p-2 text-[10px] font-black uppercase sm:p-4 sm:text-base">Funcionalidad</th>
                <th scope="col" className="w-[30%] border-r-3 border-black p-2 text-center text-[10px] font-black uppercase sm:p-4 sm:text-base">Puragenda</th>
                <th scope="col" className="w-[30%] p-2 text-center text-[10px] font-black uppercase sm:p-4 sm:text-base">Puragenda+</th>
              </tr>
            </thead>
            <tbody className="font-bold">
              {comparisonRows.map(([feature, puragenda, plus], index) => <tr key={feature} className={index === comparisonRows.length - 1 ? "" : "border-b-2 border-black/20"}>
                <th scope="row" className="border-r-2 border-black/20 px-2 py-3 font-black sm:p-4">{feature}</th>
                <td className="border-r-2 border-black/20 px-2 py-3 text-center text-[11px] sm:p-4 sm:text-sm">{puragenda}</td>
                <td className={`px-2 py-3 text-center text-[11px] sm:p-4 sm:text-sm ${plus === "Incluido" ? "bg-[#E9D8FF] text-black" : ""}`}>{plus}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-sm font-bold leading-6 text-black/65 dark:text-white/65">El sitio web, Puri avanzado y Contact Flow forman parte de Puragenda+. Las automatizaciones respetan el consentimiento de los clientes y los límites de uso del plan. La compra de un dominio propio no está incluida.</p>
    </section>
  );
}
