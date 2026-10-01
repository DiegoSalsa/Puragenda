# Runtime y dominios

`hostname → BusinessWebsite → Business → template/version → publishedConfig + catálogo canónico`.

`WEBSITE_ROOT_DOMAIN` usa `puragenda.cl` por defecto. El proxy reconoce un único hijo válido, excluye nombres reservados, normaliza el hostname y bloquea rutas de dashboard/admin del host público. Solo el sitio raíz, robots, sitemap, API de website y assets necesarios se sirven desde el tenant. Las rutas internas no permiten elegir otro negocio por path o headers del cliente.

## Subdominio

El modelo impone unicidad global del subdominio. El editor permite escogerlo; mientras el sitio esté publicado exige despublicar para cambiarlo. Localmente se usa `WEBSITE_ROOT_DOMAIN=localhost` y `bella-a.localhost:3005` / `bella-b.localhost:3005`. No se cambió el archivo hosts ni DNS real.

Para servir `negocio.puragenda.cl` posteriormente hacen falta DNS wildcard, routing del proveedor y TLS. Esta fase prepara y prueba el runtime; no configura esa infraestructura.

## Dominio propio

WebsiteDomain almacena hostname único, token aleatorio, estado PENDING/VERIFIED/ACTIVE/FAILED y principal. El propietario registra el dominio y recibe un TXT en `_puragenda.<dominio>`. `WebsiteDomainAdapter` separa verificación de propiedad de activación del proveedor.

El adapter incluido comprueba TXT mediante lectura DNS y puede marcar VERIFIED. **Nunca marca ACTIVE automáticamente**: no tiene permiso ni implementación de mutación Vercel. Un adapter futuro debe comprobar propiedad, destino y TLS antes de activar. Solo ACTIVE se resuelve públicamente. Un índice parcial permite un principal por website. SEO usa ese dominio cuando está activo y es principal; en caso contrario usa el subdominio.

No se usaron tokens Vercel ni se escribieron registros DNS. La UI incluye registro, verificación y selección de principal. El panel de superadmin permite inspeccionar sitios y solicitudes; la activación de infraestructura sigue siendo tarea posterior explícita.

## Solicitud de compra

DomainRequest guarda hostname, notas y REQUESTED/REVIEWING/QUOTED/COMPLETED/CANCELLED. El propietario puede solicitar cotización; la UI deja claro que no realiza compra. No se implementó checkout de dominios, registrar automático ni compra. El equipo revisa solicitudes mediante el diagnóstico de administración y el proceso operativo posterior.
