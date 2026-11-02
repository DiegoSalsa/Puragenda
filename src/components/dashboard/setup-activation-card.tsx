import Link from "next/link";
import { PuriMascot } from "@/components/brand/puri-mascot";
import type { SetupSnapshot } from "@/server/onboarding/service";

export function SetupActivationCard({ snapshot }: { snapshot: SetupSnapshot }) {
  if (snapshot.dismissed || snapshot.activation === "habitual") return null;
  const copy = snapshot.activation === "incomplete" ? { title: "Tu Puragenda está casi lista.", body: "Continúa con Puri para revisar horarios, servicios y disponibilidad.", href: "/dashboard/setup", cta: "Continuar configuración" }
    : snapshot.activation === "unshared" ? { title: "Tu enlace de reservas está preparado.", body: "Revisa la experiencia pública y copia el enlace para compartirlo.", href: "/dashboard/setup", cta: "Revisar enlace" }
    : snapshot.activation === "no_bookings" ? { title: "Tu agenda está preparada para recibir reservas.", body: "Todavía no hay reservas registradas. Puedes revisar cómo se ve tu enlace público.", href: "/dashboard/setup", cta: "Revisar experiencia pública" }
    : { title: "Ya tienes una reserva registrada.", body: "Puri te muestra cómo revisar y gestionar esa atención.", href: "/dashboard/agenda?learn=appointments", cta: "Ver guía de reservas" };
  return <section data-tour="setup-progress" className="flex flex-wrap items-center gap-3 rounded-xl border border-border/25 bg-card px-4 py-3"><PuriMascot compact className="h-12 w-12 shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{copy.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{copy.body}</p></div><Link href={copy.href} className="inline-flex min-h-11 items-center rounded-lg bg-[#7C3AED] px-3 py-2 text-xs font-bold text-white">{copy.cta}</Link><form action={async () => { "use server"; const { dismissSetupCard } = await import("@/server/actions/setup.actions"); await dismissSetupCard(); }}><button type="submit" className="min-h-11 px-2 text-xs text-muted-foreground underline">Ocultar ayuda</button></form></section>;
}
