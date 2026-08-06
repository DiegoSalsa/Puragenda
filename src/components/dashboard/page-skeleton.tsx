
import { LocalizedText } from "@/components/i18n/localized-text";
import Image from "next/image";

export function PageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-7" role="status" aria-label="Cargando contenido">
      <div className="flex items-center gap-4">
        <div className="relative h-11 w-11">
          <Image src="/icon-512x512.png" alt="" width={44} height={44} className="h-11 w-11 animate-pulse" />
          <span className="absolute -inset-1 animate-ping rounded-2xl border border-[#7C3AED]/40" />
        </div>
        <div className="space-y-2">
          <div className="h-7 w-52 animate-pulse rounded-lg bg-muted" />
          <div className="h-3.5 w-72 max-w-[60vw] animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-12 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="h-32 animate-pulse rounded-xl bg-muted" style={{ animationDelay: `${index * 70}ms` }} />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded-xl bg-muted" />
          </div>
        ))}
      </div>
      <span className="sr-only"><LocalizedText id="WuyNzoRGgAOq" /></span>
    </div>
  );
}
