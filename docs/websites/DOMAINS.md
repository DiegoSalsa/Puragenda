# Runtime y dominios

`hostname → BusinessWebsite → Business → template/version → publishedConfig + catálogo canónico`.

`WEBSITE_ROOT_DOMAIN` usa `puragenda.cl` por defecto. El proxy reconoce un único hijo válido, excluye nombres reservados, normaliza el hostname y bloquea rutas de dashboard/admin del host público. Solo el sitio raíz, robots, sitemap, API de website y assets necesarios se sirven desde el tenant. Las rutas internas no permiten elegir otro negocio por path o headers del cliente.

## Subdominio

El modelo impone unicidad global del subdominio. El editor permite escogerlo; mientras el sitio esté publicado exige despublicar para cambiarlo. Localmente se usa `WEBSITE_ROOT_DOMAIN=localhost` y `bella-a.localhost:3005` / `bella-b.localhost:3005`. No se cambió el archivo hosts ni DNS real.

Para servir `negocio.puragenda.cl` posteriormente hacen falta DNS wildcard, routing del proveedor y TLS. Esta fase prepara y prueba el runtime; no configura esa infraestructura.

## Dominio propio

WebsiteDomain almacena hostname único, token aleatorio de 192 bits, `tenantVerifiedAt`, estado PENDING/VERIFIED/ACTIVE/FAILED y principal. El propietario registra el dominio y recibe un TXT `puragenda-verify=<token>` en `_puragenda.<dominio>`. La coincidencia es exacta y soporta registros TXT divididos en chunks. `WebsiteDomainAdapter` separa verificación de propiedad de activación del proveedor.

El alta solo crea el challenge y no adopta nombres en Vercel. La activación verifica primero el TXT tenant-specific; después reconcilia/agrega el hostname en el provider y exige que el proyecto y el DNS correspondan. Un mismo `projectId` de Vercel nunca se considera prueba de que dos tenants sean el mismo propietario.

El adapter incluido comprueba TXT mediante lectura DNS. Solo después de esa prueba el provider puede devolver VERIFIED/ACTIVE; si el challenge no coincide, no se adopta el dominio y se limpian las marcas de verificación/activación. Solo ACTIVE con tenantVerifiedAt se resuelve públicamente o puede convertirse en principal. Refresh sigue el mismo flujo y no permite saltarse el challenge. La UI conserva el TXT Puragenda junto con los registros del proveedor: debe permanecer publicado para nuevas verificaciones.

Vercel verifica nombre/projectId antes de cualquier POST de verificación; la conexión requiere dominio verificado y DNS correctamente configurado. SSL se provisiona por Vercel, sin emisión manual en Puragenda. Un fallo del provider se guarda como FAILED con mensaje seguro y sin principal. Desconectar una reserva antigua sin tenantVerifiedAt nunca borra el registro compartido en Vercel. Los tests usan DNS/transport mocks; HTTP local prueba reservas únicas y verify/disconnect/primary de A frente a B sin invocar DNS/Vercel real.

La migración incremental de ownership conserva los hostnames reservados y devuelve dominios previos a PENDING, rota el TXT y retira el principal; los propietarios deben verificar nuevamente antes de que vuelvan a enrutar. Esta consecuencia operativa se debe considerar al aplicar migraciones en staging. Un índice parcial permite un principal por website. SEO usa el principal probado; en caso contrario usa el subdominio.

No se usaron tokens Vercel ni se escribieron registros DNS. La UI incluye registro, verificación y selección de principal. El panel de superadmin permite inspeccionar sitios y solicitudes; la activación de infraestructura sigue siendo tarea posterior explícita.

## Solicitud de compra

DomainRequest guarda hostname, notas y REQUESTED/REVIEWING/QUOTED/COMPLETED/CANCELLED. El propietario puede solicitar cotización; la UI deja claro que no realiza compra. No se implementó checkout de dominios, registrar automático ni compra. El equipo revisa solicitudes mediante el diagnóstico de administración y el proceso operativo posterior.
