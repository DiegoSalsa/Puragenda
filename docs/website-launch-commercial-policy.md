# Política comercial de Sitio Web Puragenda

La oferta se resuelve por `businessId`, nunca por usuario o correo. `WebsiteOfferEligibility` es el registro persistente de la promesa comercial; `WebsiteAddon` contiene únicamente el estado de billing. La elegibilidad no se recalcula por `createdAt` después del lanzamiento.

## Catálogo

| Tier | Precio | Configuración |
| --- | ---: | --- |
| `BETA_FOUNDER` | $5.990 CLP/mes | `WEBSITE_PRICE_BETA_FOUNDER` |
| `STANDARD` | $9.990 CLP/mes | `WEBSITE_PRICE_STANDARD` |

Los IDs son de Paddle Sandbox y deben corresponder al monto mensual indicado. No se crean ni modifican precios LIVE en esta entrega. La compra de dominios es un extra separado.

## Snapshot

`scripts/grant-website-beta-founder.ts` usa `WEBSITE_LAUNCH_AT`, muestra candidatos, marcados y nuevos, y por defecto solo ejecuta dry-run. Para mutar se requieren `--apply` y `WEBSITE_LAUNCH_SNAPSHOT_CONFIRM=<snapshotId>`. Un snapshot creado es inmutable. El candidato debe tener negocio no eliminado, suscripción base `ACTIVE`, no estar en trial base y un período pagado vigente en el cutoff; una cancelación programada sigue `ACTIVE` hasta su fecha efectiva.

## Trial y acceso

El fundador inicia una sola prueba de 15 días pulsando “Probar mi sitio”. Se guardan `trialStartedAt`, `trialEndsAt` y `trialConsumedAt`; el final es exclusivo (`now < trialEndsAt`). El trial permite editar, publicar, subdominio, reservas, uploads, galería y dominio propio. No incluye comprar el dominio. Al vencer, el runtime deja de servir la web, pero conserva borradores, publicación, medios, dominios y configuración.

`hasWebsiteEntitlement` es `paidAccess || trialAccess`. Tener la oferta fundadora no concede acceso por sí mismo. Paddle webhooks son la fuente de verdad del estado pagado; el checkout no marca `ACTIVE` desde el navegador.

## Conversión y administración

El servidor elige el price ID según el snapshot. Un negocio estándar no puede solicitar el ID fundador aunque manipule el cliente. Cancelar el add-on conserva `WebsiteOfferEligibility`; reactivar meses después vuelve a resolver `BETA_FOUNDER`. La pantalla de superadmin muestra oferta, elegibilidad, trial, billing y price ID sin permitir edición.

La analítica usa eventos sin PII: `website_beta_offer_seen`, `website_trial_started`, `website_trial_day_remaining`, `website_trial_expired`, checkouts/activaciones por tier y cancelación/reactivación. La comunicación in-app está preparada; no se envían correos en esta fase.

## Verificación pendiente de entorno

Configurar en Sandbox `WEBSITE_PRICE_STANDARD`, `WEBSITE_PRICE_BETA_FOUNDER`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` y `WEBSITE_LAUNCH_AT`. Ejecutar el script primero en dry-run. No ejecutar snapshot en producción, no enviar emails, no usar Paddle LIVE.
