import { getCustomerTestimonialByBusiness, type CustomerTestimonial } from "@/lib/data/testimonials";

export const CASE_STUDIES_PATH = "/casos-de-exito";

export type CaseStudyRelatedLink = {
  href: string;
  label: string;
};

export type CaseStudyFact = {
  label: string;
  value: string;
};

export type CaseStudy = {
  slug: string;
  published: boolean;
  businessName: string;
  testimonialBusiness: CustomerTestimonial["business"];
  industrySlug: string;
  industryLabel: string;
  locationGeneral: string | null;
  title: string;
  h1: string;
  description: string;
  eyebrow: string;
  publishedAt: string;
  updatedAt: string;
  summary: string;
  context: string[];
  usage: string[];
  verifiedFacts: CaseStudyFact[];
  qualitativeResults: string[];
  relatedLinks: CaseStudyRelatedLink[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "soccerbarber",
    published: true,
    businessName: "Soccerbarber",
    testimonialBusiness: "Soccerbarber",
    industrySlug: "barberias",
    industryLabel: "Barbería",
    locationGeneral: "Chile",
    title: "Soccerbarber usa Puragenda para su barbería",
    h1: "Soccerbarber utiliza Puragenda para gestionar su barbería",
    description:
      "Soccerbarber es una barbería que usa Puragenda para el control de su agenda. El testimonio de Nicolás es público y verificable.",
    eyebrow: "Caso de barbería",
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    summary:
      "Soccerbarber es una barbería cliente de Puragenda. Nicolás describe que el sistema les ayuda a llevar el control del local y que hay disposición a escuchar su feedback.",
    context: [
      "Soccerbarber es una barbería. Puragenda ya publica un testimonio atribuido a Nicolás, de Soccerbarber.",
      "Este caso se limita a esa evidencia pública y al hecho de que el local usa Puragenda para su agenda. No agregamos cifras de reservas, inasistencias, clientes o facturación.",
    ],
    usage: [
      "Soccerbarber utiliza Puragenda para llevar el control de la barbería.",
      "El local gestiona reservas a través de la agenda online de Puragenda.",
    ],
    verifiedFacts: [
      { label: "Negocio", value: "Soccerbarber" },
      { label: "Rubro", value: "Barbería" },
      { label: "Producto", value: "Puragenda" },
      { label: "Uso", value: "Control de la barbería y reservas online" },
      { label: "Ubicación general", value: "Chile" },
      { label: "Fuente", value: "Testimonio público de Nicolás" },
    ],
    qualitativeResults: [
      "Nicolás indica que Puragenda les ha ayudado a llevar todo el control de la barbería.",
      "También destaca que hay disposición a escuchar el feedback del local.",
    ],
    relatedLinks: [
      { href: "/software-agenda-barberias", label: "Software de agenda para barberías" },
      { href: "/sistema-de-agendamiento-online", label: "Sistema de agendamiento online" },
      { href: "/pricing", label: "Planes y precios" },
    ],
  },
];

const SPANISH_MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export function formatCaseStudyDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const monthName = SPANISH_MONTHS[(month ?? 1) - 1];
  if (!year || !month || !day || !monthName) return isoDate;
  return `${day} de ${monthName} de ${year}`;
}

export function isPublishedCaseStudy(item: Pick<CaseStudy, "published" | "testimonialBusiness">) {
  return item.published === true && Boolean(getCustomerTestimonialByBusiness(item.testimonialBusiness));
}

export function caseStudyPath(slug: string) {
  return `${CASE_STUDIES_PATH}/${slug}`;
}

export function getIndexableCaseStudyPathsFrom(items: readonly Pick<CaseStudy, "slug" | "published" | "testimonialBusiness">[]) {
  const published = items.filter(isPublishedCaseStudy);
  return [CASE_STUDIES_PATH, ...published.map((item) => caseStudyPath(item.slug))];
}

export function getPublishedCaseStudies() {
  return caseStudies.filter(isPublishedCaseStudy);
}

export function getCaseStudy(slug: string) {
  return caseStudies.find((item) => item.slug === slug);
}

export function getPublishedCaseStudy(slug: string) {
  const item = getCaseStudy(slug);
  return item && isPublishedCaseStudy(item) ? item : undefined;
}

export function getPublishedCaseStudiesByIndustry(industrySlug: string) {
  return getPublishedCaseStudies().filter((item) => item.industrySlug === industrySlug);
}

export function getIndexableCaseStudyPaths() {
  return getIndexableCaseStudyPathsFrom(caseStudies);
}

export function getCaseStudyTestimonial(item: Pick<CaseStudy, "testimonialBusiness">) {
  return getCustomerTestimonialByBusiness(item.testimonialBusiness);
}
