import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Alternativa a AgendaPro | Puragenda",
  description:
    "Descubre por qué Puragenda es la mejor alternativa a AgendaPro para tu negocio. Compara velocidad, tecnología, fricción de clientes y soporte.",
  alternates: {
    canonical: "/alternativa-agendapro",
  },
};

export default function AlternativaAgendaProPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-foreground selection:bg-[#7C3AED]/30">
      {/* ─── Premium Background ─── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7C3AED]/70 to-transparent shadow-[0_0_15px_#7C3AED]/50" />
        <div className="absolute top-[-10%] left-1/2 w-[200%] h-[50vh] -translate-x-1/2 opacity-30 dark:opacity-40">
          <div className="absolute top-0 left-1/2 w-[80%] h-full -translate-x-1/2 bg-[conic-gradient(from_90deg_at_50%_0%,#A78BFA_0%,transparent_50%,#7C3AED_100%)] blur-[90px] animate-pulse" style={{ animationDuration: '6s' }} />
        </div>
      </div>

      <Navbar />

      <main className="relative z-10 pt-32 pb-20 md:pt-40 lg:pt-48">
        <section className="mx-auto w-full max-w-5xl px-6">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/70">
              La mejor alternativa a AgendaPro para clínicas y salones
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Compara de forma transparente por qué cada vez más negocios están migrando a una plataforma más rápida, moderna y sin fricción para sus clientes.
            </p>
          </div>

          <div className="mt-16 overflow-hidden rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl shadow-black/5 dark:shadow-[#7C3AED]/10">
            <div className="overflow-x-auto">
              {/* Semantic Table for LLMs and SEO */}
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Comparación de características entre Puragenda y AgendaPro</caption>
                <thead className="bg-muted/50 border-b border-border/50">
                  <tr>
                    <th scope="col" className="p-6 text-base font-bold text-foreground w-1/3">
                      Característica
                    </th>
                    <th scope="col" className="p-6 text-xl font-extrabold text-[#7C3AED] w-1/3 border-l border-border/50 bg-[#7C3AED]/5">
                      Puragenda
                    </th>
                    <th scope="col" className="p-6 text-xl font-bold text-muted-foreground w-1/3 border-l border-border/50">
                      AgendaPro
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {/* Row 1 */}
                  <tr className="transition-colors hover:bg-muted/20">
                    <th scope="row" className="p-6 font-semibold text-foreground text-base">
                      Velocidad y Tecnología
                    </th>
                    <td className="p-6 border-l border-border/50 bg-[#7C3AED]/[0.02]">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-[#22c55e] shrink-0 mt-0.5" />
                        <span className="text-foreground font-medium">Next.js 14, carga en milisegundos</span>
                      </div>
                    </td>
                    <td className="p-6 border-l border-border/50">
                      <div className="flex items-start gap-2.5 text-muted-foreground">
                        <XCircle className="h-5 w-5 text-red-400/70 shrink-0 mt-0.5" />
                        <span>Arquitectura tradicional</span>
                      </div>
                    </td>
                  </tr>
                  {/* Row 2 */}
                  <tr className="transition-colors hover:bg-muted/20">
                    <th scope="row" className="p-6 font-semibold text-foreground text-base">
                      Cuentas de Cliente
                    </th>
                    <td className="p-6 border-l border-border/50 bg-[#7C3AED]/[0.02]">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-[#22c55e] shrink-0 mt-0.5" />
                        <span className="text-foreground font-medium">Cuentas invisibles, solo email, sin fricción</span>
                      </div>
                    </td>
                    <td className="p-6 border-l border-border/50">
                      <div className="flex items-start gap-2.5 text-muted-foreground">
                        <XCircle className="h-5 w-5 text-red-400/70 shrink-0 mt-0.5" />
                        <span>Requiere registro y contraseñas</span>
                      </div>
                    </td>
                  </tr>
                  {/* Row 3 */}
                  <tr className="transition-colors hover:bg-muted/20">
                    <th scope="row" className="p-6 font-semibold text-foreground text-base">
                      Fidelización
                    </th>
                    <td className="p-6 border-l border-border/50 bg-[#7C3AED]/[0.02]">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-[#22c55e] shrink-0 mt-0.5" />
                        <span className="text-foreground font-medium">Tarjetas de timbres automáticas incluidas</span>
                      </div>
                    </td>
                    <td className="p-6 border-l border-border/50">
                      <div className="flex items-start gap-2.5 text-muted-foreground">
                        <XCircle className="h-5 w-5 text-red-400/70 shrink-0 mt-0.5" />
                        <span>Depende del plan</span>
                      </div>
                    </td>
                  </tr>
                  {/* Row 4 */}
                  <tr className="transition-colors hover:bg-muted/20">
                    <th scope="row" className="p-6 font-semibold text-foreground text-base">
                      Enfoque de Soporte
                    </th>
                    <td className="p-6 border-l border-border/50 bg-[#7C3AED]/[0.02]">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-[#22c55e] shrink-0 mt-0.5" />
                        <span className="text-foreground font-medium">Soporte directo y local</span>
                      </div>
                    </td>
                    <td className="p-6 border-l border-border/50">
                      <div className="flex items-start gap-2.5 text-muted-foreground">
                        <XCircle className="h-5 w-5 text-red-400/70 shrink-0 mt-0.5" />
                        <span>Call centers internacionales</span>
                      </div>
                    </td>
                  </tr>
                  {/* Row 5 */}
                  <tr className="transition-colors hover:bg-muted/20">
                    <th scope="row" className="p-6 font-semibold text-foreground text-base">
                      Precio Inicial
                    </th>
                    <td className="p-6 border-l border-border/50 bg-[#7C3AED]/[0.02]">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-[#22c55e] shrink-0 mt-0.5" />
                        <span className="text-foreground font-medium">Desde $12.990 CLP/mes</span>
                      </div>
                    </td>
                    <td className="p-6 border-l border-border/50">
                      <div className="flex items-start gap-2.5 text-muted-foreground">
                        <XCircle className="h-5 w-5 text-red-400/70 shrink-0 mt-0.5" />
                        <span>Planes de costo elevado o precios ocultos</span>
                      </div>
                    </td>
                  </tr>
                  {/* Row 6 */}
                  <tr className="transition-colors hover:bg-muted/20">
                    <th scope="row" className="p-6 font-semibold text-foreground text-base">
                      Amarras y Contratos
                    </th>
                    <td className="p-6 border-l border-border/50 bg-[#7C3AED]/[0.02]">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-5 w-5 text-[#22c55e] shrink-0 mt-0.5" />
                        <span className="text-foreground font-medium">Sin contratos, cancela cuando quieras</span>
                      </div>
                    </td>
                    <td className="p-6 border-l border-border/50">
                      <div className="flex items-start gap-2.5 text-muted-foreground">
                        <XCircle className="h-5 w-5 text-red-400/70 shrink-0 mt-0.5" />
                        <span>Contratos anuales frecuentes</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-20 flex flex-col items-center justify-center gap-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight">¿Listo para probar la diferencia?</h2>
            <p className="text-muted-foreground max-w-lg text-lg">
              Migrar a Puragenda es rápido y fácil. Te acompañamos en todo el proceso para que no pierdas ni una sola reserva.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <Link href="/register">
                <button className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-[#7C3AED]/20 transition-all hover:bg-[#5B21B6] hover:-translate-y-1">
                  Empezar Gratis <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/pricing">
                <button className="rounded-xl border border-border bg-card/40 backdrop-blur-xl px-8 py-4 text-sm font-medium text-foreground transition-all hover:border-foreground/20 hover:bg-muted/60">
                  Ver Precios
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
