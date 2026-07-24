import { ThemeNeoBrutalism } from "@/components/landing/ThemeNeoBrutalism";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { absoluteUrl } from "@/lib/site";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Puragenda — Reservas online, abonos y agenda para negocios" },
  description:
    "Recibe reservas y encargos, cobra abonos online y controla clientes, profesionales y capacidad desde un solo lugar. Prueba gratis por 30 días.",
  alternates: { canonical: absoluteUrl("/") },
};

export default async function HomePage() {
  const user = await getCurrentSessionUser();
  const business = user ? await getBusinessForUser(user.id) : null;

  // SEO: JSON-LD Structured Data
  const jsonLdSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Puragenda",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description:
      "Sistema de reservas online para negocios de servicios y encargos. Incluye reservas 24/7, abonos, widget personalizable, clientes y agendas por profesional.",
    offers: [
      {
        "@type": "Offer",
        name: "Plan Individual",
        price: "12990",
        priceCurrency: "CLP",
        priceValidUntil: "2027-12-31",
        description: "Para un profesional, con reservas ilimitadas.",
        availability: "https://schema.org/InStock",
        url: absoluteUrl("/pricing"),
      },
      {
        "@type": "Offer",
        name: "Plan Equipo",
        price: "29990",
        priceCurrency: "CLP",
        priceValidUntil: "2027-12-31",
        description: "Para equipos, con hasta cinco profesionales incluidos y roles de acceso.",
        availability: "https://schema.org/InStock",
        url: absoluteUrl("/pricing"),
      },
    ],
    creator: {
      "@type": "Organization",
      name: "PuroCode",
      url: "https://purocode.com",
    },
  };

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${absoluteUrl("/")}#organization`,
    name: "Puragenda",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/android-chrome-512x512.png"),
    description: "Plataforma SaaS de agendamiento online para negocios de servicios en Latinoamérica.",
    email: "contacto@purocode.com",
    telephone: "+56949255006",
    areaServed: {
      "@type": "Country",
      name: "Chile",
    },
    parentOrganization: {
      "@type": "Organization",
      name: "PuroCode",
      url: "https://purocode.com",
      sameAs: ["https://www.instagram.com/purocodecl/"],
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "contacto@purocode.com",
      telephone: "+56949255006",
      availableLanguage: ["es"],
      areaServed: "CL",
    },
  };

  const jsonLdWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: "Puragenda",
    url: absoluteUrl("/"),
    inLanguage: "es-CL",
    publisher: { "@id": `${absoluteUrl("/")}#organization` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }} />
      <ThemeNeoBrutalism user={user} business={business} />
    </>
  );
}
