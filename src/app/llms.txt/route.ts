import { absoluteUrl } from "@/lib/site";

export const revalidate = 86400;

export function GET() {
  const body = `# Puragenda

> Puragenda es un sistema de reservas online para negocios de servicios en Chile. Permite gestionar citas, profesionales, clientes, abonos, recordatorios, encargos y disponibilidad desde un panel web.

## Información principal
- Producto: ${absoluteUrl("/")}
- Planes y precios: ${absoluteUrl("/pricing")}
- Características: ${absoluteUrl("/caracteristicas")}
- Soluciones por industria: ${absoluteUrl("/soluciones")}
- Preguntas frecuentes: ${absoluteUrl("/faq")}
- Guías editoriales: ${absoluteUrl("/guias")}
- Comparación con AgendaPro: ${absoluteUrl("/alternativa-agendapro")}
- Contacto: ${absoluteUrl("/contacto")}
- Empresa y equipo: ${absoluteUrl("/sobre-nosotros")}

## Guías destacadas
- Elegir un sistema de reservas en Chile: ${absoluteUrl("/guias/como-elegir-sistema-reservas-chile")}
- Cobrar abonos en reservas online: ${absoluteUrl("/guias/cobrar-abonos-reservas-online")}
- Reducir inasistencias: ${absoluteUrl("/guias/reducir-inasistencias-reservas")}
- Gestionar encargos con abono: ${absoluteUrl("/guias/agenda-encargos-con-abono")}

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
