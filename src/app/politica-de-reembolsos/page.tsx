import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "@/components/icons/hover-icons";
import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de reembolsos",
  description: "Política de reembolsos de las suscripciones a Puragenda.",
  alternates: { canonical: absoluteUrl("/politica-de-reembolsos") },
};

export default function PoliticaDeReembolsosPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-[#7C3AED]/30">
      <Navbar />

      <main className="relative overflow-hidden pb-20 pt-24 lg:pt-32">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED]/10 blur-[120px]" />

        <div className="mx-auto w-full max-w-4xl px-6">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-[#7C3AED]"
          >
            <ChevronLeft className="h-4 w-4" /> Volver al inicio
          </Link>

          <div className="relative rounded-3xl border border-border/50 bg-card/30 p-8 shadow-2xl backdrop-blur-2xl sm:p-12 md:p-16">
            <div className="absolute inset-0 -z-10 rounded-3xl ring-1 ring-inset ring-white/5" />

            <header className="mb-12 border-b border-border/50 pb-8 text-center sm:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Política de Reembolsos
              </h1>
              <p className="mt-4 text-sm font-medium uppercase tracking-widest text-[#7C3AED]">
                Última actualización: Agosto 2026
              </p>
            </header>

            <article className="text-base leading-relaxed text-muted-foreground [&_h2]:mb-6 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_p]:mb-6 [&_ul]:mb-6 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6 [&_ul]:marker:text-[#7C3AED]">
              <p>
                Esta política aplica a las suscripciones de Puragenda, plataforma operada por PuroCode SpA.
              </p>

              <h2>1. Suscripciones y período de prueba</h2>
              <p>
                Las suscripciones se cobran por adelantado y se renuevan de forma mensual, salvo que se indique otra frecuencia al momento de contratar. Cuando se ofrezca un período de prueba, no se realiza ningún cargo hasta que dicho período finalice.
              </p>

              <h2>2. Reembolsos</h2>
              <p>
                Una vez procesado un cobro de suscripción, no realizamos reembolsos por períodos ya iniciados ni por uso parcial del Servicio. Las excepciones se aplicarán únicamente cuando una norma obligatoria de protección al consumidor lo exija.
              </p>

              <h2>3. Cancelación</h2>
              <p>
                Puedes cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta. La cancelación evita la renovación siguiente; conservarás el acceso al Servicio hasta el final del período ya pagado.
              </p>

              <h2>4. Cobros incorrectos</h2>
              <p>
                Si consideras que un cobro fue realizado por error, contáctanos con los antecedentes de tu cuenta a <a className="text-[#7C3AED] underline transition-colors hover:text-[#A78BFA]" href="mailto:contacto@purocode.com">contacto@purocode.com</a>. Revisaremos cada caso y, cuando corresponda, corregiremos el cobro o efectuaremos el reembolso aplicable.
              </p>

              <h2>5. Contacto</h2>
              <p>
                Para consultas sobre esta política, escríbenos a <a className="text-[#7C3AED] underline transition-colors hover:text-[#A78BFA]" href="mailto:contacto@purocode.com">contacto@purocode.com</a>.
              </p>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
