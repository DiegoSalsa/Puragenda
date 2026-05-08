import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code2 } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Sobre Nosotros | Puragenda",
  description: "Conoce a PuroCode, el equipo detrás de Puragenda. Desarrollamos software SaaS de alta calidad para negocios locales en Chile y Latinoamérica.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.puragenda.cl"}/sobre-nosotros`,
  },
};

export default function AboutPage() {
  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PuroCode",
    url: "https://purocode.com",
    logo: "https://www.puragenda.cl/icon-512x512.png",
    description: "Agencia de desarrollo de software y creadores de Puragenda.",
    founder: {
      "@type": "Person",
      name: "Diego",
    },
    foundingLocation: {
      "@type": "Place",
      name: "Chile",
    },
    makesOffer: {
      "@type": "Offer",
      name: "Puragenda - Sistema de Reservas",
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
      <Navbar />

      <main className="mx-auto max-w-4xl px-6 py-20 lg:py-28">
        <div className="animate-fade-up space-y-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7C3AED]">Nuestra Misión</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Tecnología accesible para <br className="hidden sm:block" />
            negocios reales
          </h1>
        </div>

        <article className="prose prose-invert prose-purple mt-20 max-w-none">
          <div className="grid gap-12 md:grid-cols-2 md:items-start">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">El problema de las agendas</h2>
              <p className="leading-relaxed text-muted-foreground">
                Visitando cientos de negocios locales (peluquerías, clínicas, barberías), notamos un patrón: excelentes profesionales perdían ventas y tiempo valioso gestionando citas por WhatsApp o usando cuadernos de papel.
              </p>
              <p className="leading-relaxed text-muted-foreground">
                Las opciones del mercado eran gigantescas, costosas, o con soporte técnico inexistente (bots que nunca resuelven nada).
              </p>
            </div>
            
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]">
                <Code2 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-foreground">¿Qué es PuroCode?</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                PuroCode es la agencia de desarrollo detrás de Puragenda. Somos un equipo chileno dedicado a construir software de clase mundial para empresas latinoamericanas.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Nuestro compromiso es la calidad técnica (Sistemas rápidos, seguros y sin caídas) y el soporte humano directo.
              </p>
            </div>
          </div>

          <div className="mt-20 border-t border-border pt-20">
            <h2 className="text-center text-3xl font-bold text-foreground">Nuestros Principios</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">1. Sin contratos amarrados</h3>
                <p className="text-sm text-muted-foreground">Cobramos mes a mes. Si el software no te da valor, puedes irte cuando quieras. Debemos ganarnos tu negocio todos los meses.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">2. Soporte Humano</h3>
                <p className="text-sm text-muted-foreground">No usamos chatbots que te hacen perder el tiempo. Hablas directamente con las personas que construyen el sistema.</p>
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">3. Marca Blanca Real</h3>
                <p className="text-sm text-muted-foreground">Tu negocio es el protagonista. Nuestro widget se adapta a tus colores para que el cliente confíe en tu marca.</p>
              </div>
            </div>
          </div>
        </article>

        <div className="mt-20 flex justify-center border-t border-border pt-12">
          <Link href="/pricing">
            <button className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#5B21B6]">
              Únete a Puragenda <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
