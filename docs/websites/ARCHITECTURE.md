# Sitio Web Puragenda · V1

Único template disponible: Bella v1. Implementación en Puragenda; `purocode-demos` es referencia de solo lectura. No se realizó merge, deploy ni cambios de DNS o infraestructura remota.

## Límites del producto

`BusinessWebsite` guarda identidad del sitio, estado, versión de template y dos configuraciones independientes. `draftConfig` contiene la edición guardada. `publishedConfig` es el snapshot que utiliza exclusivamente la web pública. `revision` aplica concurrencia optimista: guardar o publicar una revisión antigua devuelve un error, sin sobrescribir la sesión más reciente. Publicar valida esquema, portada, titular, suscripción base y entitlement del add-on. Despublicar conserva ambos snapshots.

Los estados son `DRAFT`, `PUBLISHED` y `SUSPENDED`. Un sitio publicado no se sirve si el negocio está eliminado, el plan base perdió acceso operativo o el add-on expiró. Cancelar al fin del período conserva acceso hasta el menor límite entre la vigencia pagada y la cancelación programada. Una reactivación de billing conserva el contenido; se publica explícitamente después de una suspensión.

No existen WebsiteService ni WebsiteStaff. `loadBookingContext` y `toBookingCatalog` leen Business, BusinessLocation, Service, opciones, asignaciones y Staff actuales. El sitio se renderiza dinámicamente: un cambio canónico aparece en la siguiente carga sin volver a publicar el contenido editorial.

## Organización

| Responsabilidad | Archivos |
| --- | --- |
| Configuración estricta, DTO, políticas, registry | `src/websites/{config,types,policy,registry,catalog}.ts` |
| Composición y diseño propios | `src/websites/templates/bella/` |
| Fixtures explícitos A/B | `src/websites/fixtures/` |
| Autorización, resolución, dominios, billing, booking | `src/server/websites/` |
| Mutaciones autenticadas y errores seguros | `src/server/actions/website.actions.ts` |
| Editor controlado | `src/app/dashboard/website/` |
| Preview privado sin layout del dashboard | `src/app/website-preview/` |
| Runtime público | `src/app/sites/[hostname]/` y `src/app/api/website/` |
| Diagnóstico para superadmin | `src/app/para/x7k9m2v4q8/(panel)/websites/` |
| Routing por transporte Host | `src/proxy.ts` |

## Registry y futuras versiones

El registry tipado declara `key`, nombre, versión, industrias, capacidades, esquema Zod y carga del componente. Solo resuelve `bella:1`; rechaza cualquier otra combinación. La configuración es propia del template y no prescribe componentes del dashboard. Un futuro template debe aportar su esquema y renderer y definir una migración explícita de configuración/versiones. No se implementaron templates adicionales.

## Prisma y migración

`20260930160000_websites_addon_v1` agrega:

- BusinessWebsite: relación única con Business, subdominio único, snapshots y revisiones.
- WebsiteDomain: hostname único, token de propiedad, estados y dominio principal.
- DomainRequest: solicitud, notas y estados de revisión/cotización/compra.
- WebsiteAddon: relación única con Business, proveedor, subscription/checkout IDs, vigencia y cancelación.
- WebsiteBillingEvent: ledger de IDs de eventos Paddle procesados.

No altera los campos canónicos de servicios, staff, reservas o suscripción base. Incluye claves foráneas, índices, CHECK de snapshot publicado y subdominio, un único dominio principal por sitio y RLS en las cinco tablas. Revoca acceso de los roles Supabase `anon` y `authenticated` si existen. No hay políticas de lectura desde el navegador: Prisma requiere conexión privilegiada del servidor.

La migración se probó exclusivamente en PostgreSQL local aislado. La preparación desde cero de QA genera el esquema actual y aplica las restricciones de la migración; no sustituye la historia de migraciones de un entorno existente.

## Seguridad

El manager procede de sesión firmada, negocio del usuario y permiso `website.manage`; dominio y billing requieren propietario. Todas las mutaciones y consultas privadas se limitan a ese negocio. Nunca se acepta businessId del cliente para elegir tenant. El proxy sobrescribe `x-puragenda-website-host` desde Host validado, ignora `x-forwarded-host` y protege el acceso directo a `/sites/otro-host`.

Preview exige autorización en cada carga, devuelve noindex/no-store y no crea citas. Sus consultas de disponibilidad usan el negocio autenticado. El iframe móvil permite framing únicamente del mismo origen en esta ruta privada; el resto conserva DENY. Las URLs de imágenes admiten recursos locales seguros o Cloudinary HTTPS; se rechazan esquemas peligrosos, traversal codificado y credenciales. Los uploads validan tamaño/formato, decodifican con límite de píxeles y normalizan a WebP sin metadatos.

El runtime conserva los providers compartidos de idioma y tema. `RuntimeChrome` excluye banners de cookies, PWA, analytics y scripts de marketing cuando está presente Bella. Esta base conserva algo de carga compartida; no se presenta como una optimización completa de bundles/CWV.

## Reservas

Bella conserva la UI original de cinco pasos y su reducer. La disponibilidad real llama `getBookingAvailability`; los precios y duraciones llaman `quoteBookingSelection`. El adaptador de escritura delega **en proceso** al POST canónico `/api/business/[slug]/book`, reutilizando validación, locks de colisión, idempotencia, abonos, notificaciones y creación de Appointment. No contiene un segundo motor de disponibilidad ni hace loopback HTTP.

El navegador envía selección y datos del cliente; no recibe API keys ni decide precio/duración/endTime. La escritura exige origen del mismo host y clave de idempotencia. El resultado distingue cita recibida, confirmada, abono y recuperación pendiente. Un resultado incierto no invita a repetir/pagar otra vez. Los fixtures generan disponibilidad demostrativa; preview real consulta disponibilidad canónica pero termina la simulación sin POST.
