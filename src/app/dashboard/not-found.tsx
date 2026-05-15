import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center px-6">
      <p className="text-8xl font-black text-muted-foreground/20 select-none">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Página no encontrada</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Esta sección no existe o fue movida.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al dashboard
      </Link>
    </div>
  );
}
