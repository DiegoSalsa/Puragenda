"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createWidgetStudioDraftAction } from "@/server/actions/widget-studio.actions";

export function WidgetStudioEntry({ widgetSlug }: { widgetSlug: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function createDraft() {
    setCreating(true);
    setError("");
    const result = await createWidgetStudioDraftAction();
    setCreating(false);
    if (!("error" in result)) router.refresh();
    else setError(result.error);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
      <section className="overflow-hidden rounded-3xl border border-border bg-black p-3 shadow-2xl">
        <div className="mb-3 flex items-center justify-between px-2 py-1 text-xs text-white/70">
          <span>Vista previa actual</span>
          <a href={`/widget/${widgetSlug}`} target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:underline">Abrir widget</a>
        </div>
        <iframe title="Widget actual" src={`/widget/${widgetSlug}`} className="min-h-[720px] w-full rounded-2xl bg-white" />
      </section>
      <section className="flex flex-col justify-center rounded-3xl border border-[#7C3AED]/30 bg-gradient-to-br from-[#7C3AED]/10 via-background to-background p-6 sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25"><Sparkles className="h-6 w-6" /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#7C3AED]">Nuevo Editor del widget</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Personaliza sin arriesgar tu widget público</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Crearemos un borrador equivalente a tu diseño actual. Podrás añadir fotos, banners, textos y posiciones avanzadas; nada cambia para tus clientes hasta que publiques.</p>
        <ul className="mt-6 space-y-3">
          {[
            "Preview privada con el flujo real de reservas",
            "Borrador automático y publicación explícita",
            "Diseño responsive para móvil, tablet y escritorio",
            "Versiones, historial, restauración y rollback",
          ].map((item) => <li key={item} className="flex items-start gap-3 text-sm"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="h-3 w-3" /></span>{item}</li>)}
        </ul>
        <div className="mt-7 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><ShieldCheck className="h-4 w-4" /> Compatibilidad opt-in</p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">El renderer actual se conserva. V2 solo se activa cuando confirmes la primera publicación.</p>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={createDraft} disabled={creating} className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#7C3AED]/20 transition hover:bg-[#6D28D9] disabled:opacity-50">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {creating ? "Preparando borrador seguro…" : "Crear borrador desde mi diseño"}
          {!creating && <ArrowRight className="h-4 w-4" />}
        </button>
      </section>
    </div>
  );
}
