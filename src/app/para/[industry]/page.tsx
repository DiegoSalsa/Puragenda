import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { industriesData } from "@/lib/data/industries";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const dynamicParams = true; // Changed to true to allow ISR fallback on Vercel

export function generateStaticParams() {
  return industriesData.map((ind) => ({
    industry: ind.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const { industry } = await params;
  const data = industriesData.find((i) => i.slug === industry);
  if (!data) return {};

  const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://puragenda.cl"}/para/${data.slug}`;

  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    openGraph: {
      title: data.title,
      description: data.description,
      url,
      type: "website",
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  const data = industriesData.find((i) => i.slug === industry);
  if (!data) notFound();

  // JSON-LD specific for the industry SoftwareApplication + FAQ
  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const jsonLdSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Puragenda",
    applicationCategory: "BusinessApplication",
    description: data.description,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      
      <Navbar />

      <main>
        {/* HERO */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-20 lg:pt-28">
          <div className="animate-fade-up space-y-8 text-center">
            <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-7xl">
              {data.heroHeadline}
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {data.heroSubheadline}
            </p>

            <div className="mx-auto mt-8 flex max-w-md flex-col justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <button className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#7C3AED] px-8 py-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all duration-300 hover:bg-[#6D28D9] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] sm:w-auto">
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
                  <span className="relative z-10 flex items-center gap-2">
                    Empezar Gratis <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              </Link>
              <Link href="/widget/purocode-demo">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/50 px-8 py-4 text-sm font-semibold text-foreground backdrop-blur-sm transition-all hover:bg-muted sm:w-auto">
                  Ver Demo
                </button>
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground/60">Sin tarjeta de crédito · Configura en 2 minutos · Cancela cuando quieras</p>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="mb-12 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7C3AED]">
                Diseñado para {data.name}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                ¿Por qué usar Puragenda en tu {data.name.toLowerCase()}?
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {data.benefits.map((benefit, i) => (
                <article key={i} className="rounded-2xl border border-border bg-background p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-3xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Preguntas Frecuentes</h2>
          </div>
          <Accordion className="w-full space-y-3">
            {data.faq.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="rounded-2xl border border-border bg-card px-5">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA */}
        <section className="border-t border-border py-20">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Empieza a digitalizar tu {data.name.toLowerCase()} hoy</h2>
            <Link href="/pricing">
              <button className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-[#7C3AED]/20 transition-all hover:bg-[#5B21B6]">
                Probar Gratis <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
