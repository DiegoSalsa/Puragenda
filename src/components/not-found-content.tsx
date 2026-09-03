import Link from "next/link";

export function NotFoundContent() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="select-none text-8xl font-black text-muted-foreground/20">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Página no encontrada</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Esta dirección no existe o ya no está disponible.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
