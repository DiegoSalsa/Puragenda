import Image from "next/image";

export default function DashboardLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Cargando Puragenda">
      <div className="flex items-center gap-4">
        <div className="relative h-12 w-12">
          <Image src="/icon-512x512.png" alt="" width={48} height={48} className="h-12 w-12 animate-pulse" />
          <span className="absolute -inset-1 animate-ping rounded-2xl border-2 border-[#7C3AED]/30" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="h-3 w-72 max-w-[65vw] animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-border bg-card p-5">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-5 h-7 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-xl bg-muted/70" style={{ animationDelay: `${index * 80}ms` }} />
        ))}
      </div>
      <span className="sr-only">Cargando contenido…</span>
    </div>
  );
}
