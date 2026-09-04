import { absoluteUrl } from "@/lib/site";
import { featureSolutions } from "@/lib/data/feature-solutions";
import { industriesData } from "@/lib/data/industries";
import { getIndexableMarketplacePaths } from "@/lib/marketplace";
import { CASE_STUDIES_PATH, caseStudyPath, getPublishedCaseStudies } from "@/lib/data/case-studies";

export const revalidate = 86400;

export function GET() {
  const featureLines = featureSolutions
    .map((feature) => `- [${feature.title}](${absoluteUrl(`/funciones/${feature.slug}`)})`)
    .join("\n");
  const industryLines = industriesData
    .map((industry) => `- [${industry.name}](${absoluteUrl(`/para/${industry.slug}`)})`)
    .join("\n");
  const marketplacePaths = getIndexableMarketplacePaths();
  const marketplaceSection = marketplacePaths.length
    ? `\n## Directorio\n${marketplacePaths.map((path) => `- [${path}](${absoluteUrl(path)})`).join("\n")}\n`
    : "";
  const publishedCases = getPublishedCaseStudies();
  const caseStudySection = publishedCases.length
    ? `\n## Casos de éxito\n${publishedCases
        .map((item) => `- [${item.businessName}](${absoluteUrl(caseStudyPath(item.slug))})`)
        .join("\n")}\n`
    : "";

  const body = `# Puragenda

> Puragenda es un sistema de reservas online para negocios de servicios en Chile. Permite gestionar citas, profesionales, clientes, abonos, recordatorios, encargos y disponibilidad desde un panel web.

Last-updated: 2026-09-04

Este archivo ayuda a agentes a encontrar páginas públicas. No sustituye a [robots.txt](${absoluteUrl("/robots.txt")}) ni al [sitemap](${absoluteUrl("/sitemap.xml")}).

## Información principal
- [Producto](${absoluteUrl("/")})
- [Sistema de agendamiento online](${absoluteUrl("/sistema-de-agendamiento-online")})
- [Software de agenda para barberías](${absoluteUrl("/software-agenda-barberias")})
- [Software de agenda para peluquerías](${absoluteUrl("/software-agenda-peluquerias")})
- [Planes y precios](${absoluteUrl("/pricing")})
- [Características](${absoluteUrl("/caracteristicas")})
- [Soluciones por industria](${absoluteUrl("/soluciones")})
- [Preguntas frecuentes](${absoluteUrl("/faq")})
- [Guías editoriales](${absoluteUrl("/guias")})
- [Casos de éxito](${absoluteUrl(CASE_STUDIES_PATH)})
- [Comparación con AgendaPro](${absoluteUrl("/alternativa-agendapro")})
- [Contacto](${absoluteUrl("/contacto")})
- [Empresa y equipo](${absoluteUrl("/sobre-nosotros")})

## Funciones
${featureLines}

## Industrias
${industryLines}
${marketplaceSection}${caseStudySection}
## Guías destacadas
- [Elegir un sistema de reservas en Chile](${absoluteUrl("/guias/como-elegir-sistema-reservas-chile")})
- [Cobrar abonos en reservas online](${absoluteUrl("/guias/cobrar-abonos-reservas-online")})
- [Reducir inasistencias](${absoluteUrl("/guias/reducir-inasistencias-reservas")})
- [Gestionar encargos con abono](${absoluteUrl("/guias/agenda-encargos-con-abono")})

## Descubrimiento
- [robots.txt](${absoluteUrl("/robots.txt")})
- [sitemap.xml](${absoluteUrl("/sitemap.xml")})

## Identidad
- Marca: Puragenda
- Desarrollador: PuroCode, Chile
- Idioma editorial principal: español de Chile
- Correo: contacto@purocode.com

Las funciones, precios y condiciones vigentes deben verificarse siempre en las páginas oficiales anteriores.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
