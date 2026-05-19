import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { LandingLayout } from "@/components/landing/landing-layout";
import { industriesData } from "@/lib/data/industries";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
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

  const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.puragenda.cl"}/para/${data.slug}`;

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

  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

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

  // Rotate accent colors for benefit cards
  const accentColors = ["bg-[#B28DFF]", "bg-[#FFB5E8]", "bg-[#85E3FF]", "bg-[#BFFCC6]"];

  return (
    <LandingLayout user={user} business={business}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />

      {/* HERO */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16 text-center">
        <div className="inline-block bg-[#B28DFF] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
          {data.name}
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter sm:text-7xl mb-6">
          {data.heroHeadline}
        </h1>
        <p className="text-xl font-bold opacity-80 max-w-3xl mx-auto mb-10">
          {data.heroSubheadline}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/register">
            <button className="bg-[#7C3AED] text-white border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] hover:translate-y-1 hover:shadow-[3px_3px_0_#000] dark:hover:shadow-[3px_3px_0_#FFFFFF] transition-all flex items-center gap-3 mx-auto sm:mx-0">
              Empezar Gratis <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
          <Link href="/widget/purocode-demo">
            <button className="bg-white dark:bg-black text-black dark:text-white border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] hover:translate-y-1 hover:shadow-[3px_3px_0_#000] dark:hover:shadow-[3px_3px_0_#FFFFFF] transition-all mx-auto sm:mx-0">
              Ver Demo
            </button>
          </Link>
        </div>
        <p className="mt-8 text-sm font-bold opacity-50">Sin tarjeta de crédito · Configura en 2 minutos · Cancela cuando quieras</p>
      </section>

      {/* BENEFITS */}
      <section className="border-t-4 border-black dark:border-white bg-[#FFF5BA] dark:bg-black py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#85E3FF] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
              Diseñado para {data.name}
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-black dark:text-white">
              ¿Por qué usar Puragenda?
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {data.benefits.map((benefit, i) => (
              <article key={i} className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-3xl p-8 shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_#FFFFFF] hover:-translate-y-2 transition-transform">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-black ${accentColors[i % accentColors.length]} text-black mb-6 shadow-[4px_4px_0_#000]`}>
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-black uppercase mb-3 text-black dark:text-white">{benefit.title}</h3>
                <p className="font-bold opacity-80 text-black dark:text-white">{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-4xl px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-block bg-[#FFB5E8] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
            Dudas
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">Preguntas Frecuentes</h2>
        </div>
        <Accordion className="w-full space-y-4">
          {data.faq.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white dark:bg-[#111] border-4 border-black dark:border-white rounded-2xl px-6 py-2 shadow-[4px_4px_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_#FFFFFF] transition-all hover:-translate-y-1"
            >
              <AccordionTrigger className="text-[15px] font-black uppercase hover:no-underline py-4 text-black dark:text-white">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm font-bold opacity-80 pb-5">
                {faq.answer}
              </AccordionContent>
              <div className="sr-only" aria-hidden="true">{faq.answer}</div>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="border-t-4 border-black dark:border-white py-24 bg-[#BFFCC6] dark:bg-black text-center">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-8 text-black dark:text-white">
            Digitaliza tu {data.singularName.toLowerCase()} hoy
          </h2>
          <Link href="/pricing">
            <button className="bg-[#7C3AED] text-white border-4 border-black dark:border-white px-10 py-5 font-black uppercase text-2xl shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF] hover:translate-y-2 hover:shadow-none transition-all flex items-center gap-4 mx-auto">
              Probar Gratis <ArrowRight className="h-8 w-8" />
            </button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
