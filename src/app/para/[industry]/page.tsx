
import { LocalizedText } from "@/components/i18n/localized-text";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { LandingLayout } from "@/components/landing/landing-layout";
import { industriesData } from "@/lib/data/industries";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { absoluteUrl } from "@/lib/site";
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

  const url = absoluteUrl(`/para/${data.slug}`);

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
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description: data.description,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "12990",
      highPrice: "29990",
      priceCurrency: "CLP",
      offerCount: "2",
      url: absoluteUrl("/pricing"),
    },
  };

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Soluciones", item: absoluteUrl("/soluciones") },
      { "@type": "ListItem", position: 3, name: data.name, item: absoluteUrl(`/para/${data.slug}`) },
    ],
  };

  // Rotate accent colors for benefit cards
  const accentColors = ["bg-[#B28DFF]", "bg-[#FFB5E8]", "bg-[#85E3FF]", "bg-[#BFFCC6]"];

  return (
    <LandingLayout user={user} business={business}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }} />

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
              <LocalizedText id="NqC0Mo3B6h7f" /> <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
          <a href="/api/auth/demo">
            <button className="bg-white dark:bg-black text-black dark:text-white border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] hover:translate-y-1 hover:shadow-[3px_3px_0_#000] dark:hover:shadow-[3px_3px_0_#FFFFFF] transition-all mx-auto sm:mx-0">
              <LocalizedText id="vP-8OnnRFj1a" />
            </button>
          </a>
        </div>
        <p className="mt-8 text-sm font-bold opacity-50"><LocalizedText id="0-9SNZCT992I" /></p>
      </section>

      {/* BENEFITS */}
      <section className="border-t-4 border-black dark:border-white bg-[#FFF5BA] dark:bg-black py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#85E3FF] border-2 border-black dark:border-white px-4 py-1 mb-6 font-black uppercase text-sm text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
              <LocalizedText id="J_K6wcKNmdNt" /> {data.name}
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-black dark:text-white">
              <LocalizedText id="UNzN0nO8Ud1f" />
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
            <LocalizedText id="S5pMm6glV6EC" />
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl"><LocalizedText id="qxZSqw0Uc5Il" /></h2>
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
            <LocalizedText id="1oAUcpw8pq5F" /> {data.singularName.toLowerCase()} <LocalizedText id="tA-ba9YWWfmH" />
          </h2>
          <Link href="/pricing">
            <button className="bg-[#7C3AED] text-white border-4 border-black dark:border-white px-10 py-5 font-black uppercase text-2xl shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFFFF] hover:translate-y-2 hover:shadow-none transition-all flex items-center gap-4 mx-auto">
              <LocalizedText id="i8SlbEiuwp1f" /> <ArrowRight className="h-8 w-8" />
            </button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
