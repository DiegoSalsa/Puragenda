"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  restoreWidgetStudioVersionAction,
  rollbackWidgetStudioAction,
} from "@/server/actions/widget-studio.actions";

type HistoryVersion = {
  id: string;
  versionNumber: number;
  checksum: string;
  changeSummary: string | null;
  createdAt: string;
  publishedBy: { name: string; email: string };
};

export function WidgetStudioHistory({
  versions,
  activeId,
  fallbackId,
  slug,
}: {
  versions: HistoryVersion[];
  activeId: string | null;
  fallbackId: string | null;
  slug: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function restore(version: HistoryVersion) {
    setBusyId(version.id);
    setMessage("");
    const result = await restoreWidgetStudioVersionAction(version.id);
    setBusyId(null);
    if (!("error" in result)) {
      router.push("/dashboard/appearance/personalizado");
      router.refresh();
    } else setMessage(result.error);
  }

  async function rollback() {
    setBusyId("rollback");
    setMessage("");
    const result = await rollbackWidgetStudioAction();
    setBusyId(null);
    if (!("error" in result)) {
      setMessage("Rollback aplicado. La versión de respaldo quedó activa.");
      router.refresh();
    } else setMessage(result.error);
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7C3AED]">Operación segura</p>
          <h2 className="mt-1 text-xl font-bold">Publicaciones inmutables</h2>
          <p className="mt-1 text-sm text-muted-foreground">Restaurar crea un borrador; no cambia producción hasta volver a publicar.</p>
        </div>
        <button
          type="button"
          onClick={() => void rollback()}
          disabled={!fallbackId || busyId !== null}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold transition hover:bg-muted disabled:opacity-40"
        >
          {busyId === "rollback" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
          Rollback inmediato
        </button>
      </section>
      {message && <p role="status" className="rounded-xl border border-[#7C3AED]/20 bg-[#7C3AED]/10 p-3 text-sm">{message}</p>}
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {versions.map((version) => {
          const active = version.id === activeId;
          const fallback = version.id === fallbackId;
          return (
            <article key={version.id} className="grid gap-4 border-b border-border p-5 last:border-0 md:grid-cols-[100px_minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="text-2xl font-bold">v{version.versionNumber}</p>
                {active && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Activa</span>}
                {fallback && !active && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-700"><ShieldCheck className="h-3 w-3" /> Respaldo</span>}
              </div>
              <div>
                <p className="font-semibold">{version.changeSummary || "Publicación sin resumen"}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {format(new Date(version.createdAt), "d MMM yyyy · HH:mm", { locale: es })}</span>
                  <span>{version.publishedBy.name}</span>
                  <span className="font-mono">{version.checksum.slice(0, 10)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/widget/${slug}/preview?version=${version.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted"><ExternalLink className="h-3.5 w-3.5" /> Preview</a>
                {!active && <button type="button" onClick={() => void restore(version)} disabled={busyId !== null} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#7C3AED] px-3 py-2 text-xs font-bold text-white hover:bg-[#6D28D9] disabled:opacity-45">{busyId === version.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Restaurar a borrador</button>}
              </div>
            </article>
          );
        })}
        {!versions.length && <div className="p-12 text-center text-sm text-muted-foreground">Todavía no hay publicaciones. Edita y publica la primera versión.</div>}
      </div>
    </div>
  );
}
