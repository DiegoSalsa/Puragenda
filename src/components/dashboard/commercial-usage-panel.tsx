"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { CommercialUsageSummary } from "@/core/commercial-usage";
const notices = {
  AVAILABLE: "", NEAR_LIMIT: "Te acercas al límite de este periodo.", EXHAUSTED: "Cupo agotado. Podrás volver a utilizarlo al renovar tu cupo.",
  PAUSED: "Temporalmente en pausa mientras verificamos el consumo.", UNCONFIGURED: "Estamos preparando el cupo de tu plan. El consumo sigue protegido.",
  EXCLUSIVE: "Incluido en Puragenda+.", INACTIVE: "Tu periodo terminó. Activa tu plan para volver a utilizarlo; tus datos se conservan.",
};
export function CommercialUsagePanel({ initial, compact = false, refreshKey = 0 }: { initial?: CommercialUsageSummary | null; compact?: boolean; refreshKey?: number }) {
  const [data, setData] = useState(initial ?? null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const changed = () => setRefresh(n => n + 1);
    window.addEventListener("commercial:usage-changed", changed);
    return () => window.removeEventListener("commercial:usage-changed", changed);
  }, []);
  useEffect(() => {
    let active = true;
    void fetch("/api/dashboard/usage", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(body => { if (active && body) setData(body.usage); }).catch(() => undefined);
    return () => { active = false; };
  }, [refreshKey, refresh]);
  if (!data) return null;
  const date = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(data.resetsAt));
  const items = compact ? data.items.filter(item => item.key === "STANDARD_INTERACTIVE") : data.items;
  return <section aria-label="Consumo de tu plan" className="min-w-0 space-y-3 rounded-2xl border-2 border-black bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-black">{compact ? "Tu cupo de Puri" : "Consumo de tu plan"}</h2><p className="text-xs text-neutral-600">{data.trial ? "Prueba hasta" : "Tu cupo se renueva el"} {date} · {data.periodLabel}</p></div><button type="button" className="text-xs font-bold underline" onClick={() => setRefresh(n => n + 1)}>Actualizar consumo</button></div>
    <div className={compact ? "space-y-2" : "grid gap-3 sm:grid-cols-2"}>{items.map(item => <div key={item.key} className="min-w-0 rounded-xl border border-neutral-300 p-3 text-sm">
      {!compact && <h3 className="font-bold">{item.title}</h3>}
      {item.included && item.configured && <><p>{item.used} utilizados · {item.reserved} en curso</p><p className="font-semibold">{item.remaining} de {item.limit} {item.key === "CONTACT_FLOW" ? "correos" : "créditos"} disponibles</p><progress aria-label={`Consumo de ${item.title}`} max={Math.max(1, item.limit)} value={Math.min(item.limit, item.used + item.reserved)} className="mt-2 h-2 w-full accent-purple-700" /></>}
      {notices[item.state] && <p role={["NEAR_LIMIT", "EXHAUSTED", "PAUSED"].includes(item.state) ? "status" : undefined} className="mt-1 text-xs">{notices[item.state]}</p>}
      {item.resetsAt && item.included && <p className="mt-1 text-xs">{data.trial ? "Vigente hasta" : "Se renueva el"} {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(item.resetsAt))}</p>}
      {item.state === "EXCLUSIVE" && <Link href="/dashboard/settings#plan" className="mt-1 inline-block font-bold underline">Ver Puragenda+</Link>}
    </div>)}</div>
    {!compact && <p className="text-xs text-neutral-600">Los créditos y el cupo total del plan se comparten entre las funciones y los usuarios del negocio. Una consulta puede usar varios créditos según el trabajo requerido. Puri estándar ayuda con la agenda y la gestión; Puri avanzado analiza oportunidades y prepara propuestas. Cada campaña requiere tu autorización.</p>}
  </section>;
}
