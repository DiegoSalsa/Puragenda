# Preparación de producción Chile

## Verificación de Vercel — lectura 2026-10-02

Se inspeccionó el proyecto `puragenda` desde el panel autenticado de Vercel, sin revelar valores ni editar variables. El detalle sanitizado está en [vercel-readonly.json](qa-preproduction/vercel-readonly.json).

| Variable | Vercel Production | Resultado seguro |
| --- | --- | --- |
| `MERCADOPAGO_ACCESS_TOKEN` | Present, Production+Preview | Configured; value not revealed |
| `MERCADOPAGO_WEBHOOK_SECRET` | Present, Production+Preview | Configured; signature/E2E NOT_RUN |
| `AUTH_SECRET` | Present, Production+Preview | `NOT_VERIFIABLE` structurally without revealing value; runtime uses it first |
| `NEXTAUTH_SECRET` | Absent | Not needed while valid `AUTH_SECRET` is used |
| `DATABASE_URL`, `DIRECT_URL` | Present, Production+Preview | Values not revealed; checkout DB preflight is separate |
| `NEXT_PUBLIC_APP_URL` | Present, Production+Preview | Value not revealed |
| `WEBSITE_CHECKOUT_ENABLED` | Absent | Runtime default `0` / acquisition off |
| `WEBSITE_LAUNCH_ENABLED` | Absent | Runtime default off |
| `WEBSITE_LAUNCH_AT` | Absent | No snapshot permitted |
| `WEBSITE_ROOT_DOMAIN` | Absent | Runtime fallback `puragenda.cl`; set explicitly before release |

La env local del checkout no es la env del proyecto Vercel. Por eso los valores ausentes localmente no se reportan como ausentes en Vercel. El proyecto muestra Production `Ready` y una Preview `webs` `Ready`; esta tarea no promovió ni modificó ninguna de las dos. Actualmente las credenciales MP de producción están compartidas con Preview: **no ejecutar una prueba de proveedor desde Preview** hasta separar Preview con credenciales oficiales de test y una base aislada.

El mecanismo de sesión real es el HMAC de `puragenda_session` en `src/server/auth/session.ts`; usa `AUTH_SECRET` y solo cae a `NEXTAUTH_SECRET`. `scripts/vercel-build.mjs` valida ahora específicamente esa pareja y exige también `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET`; un secreto de otro propósito ya no puede ocultar una configuración de auth inválida.

## Qué debe configurar el operador MP

En la aplicación de Mercado Pago de Puragenda, en Developers → Your integrations → Webhooks/Notifications:

1. URL de producción: `https://www.puragenda.cl/api/webhooks/mercadopago`.
2. Registrar `subscription_preapproval`, `subscription_authorized_payment` y `payment` para Website. La ruta verifica `x-signature` antes de hacer GET y separa Website de BASE por la operación vinculada.
3. Copiar el **secret signature del webhook**, no el Access Token, a Vercel → Project `puragenda` → Settings → Environment Variables → `MERCADOPAGO_WEBHOOK_SECRET`, ámbito Production, tipo Secret.
4. Para Preview, usar otra aplicación/cuenta oficial de test, `MERCADOPAGO_ACCESS_TOKEN` de test, su secret de webhook y una DB aislada. No compartir credenciales MP de producción con Preview.

Mercado Pago documenta que las notificaciones se configuran por aplicación y que la secret signature permite validar autenticidad; también permite una test URL con credenciales de prueba. [Webhooks oficiales](https://www.mercadopago.cl/developers/en/docs/zero-dollar-auth/additional-content/your-integrations/notifications/webhooks).

Para `AUTH_SECRET`, configurar un único secreto de sesión Production de al menos 32 caracteres, generado fuera del repositorio (por ejemplo `openssl rand -base64 32`). No revelar, registrar ni pegar el valor en tickets. No crear `NEXTAUTH_SECRET` adicional salvo que se decida usar el fallback explícitamente.

Vercel aplica cambios de variables solo a nuevos deployments; no se debe asumir que un deployment anterior recibió una corrección. [Vercel Environment Variables](https://vercel.com/docs/environment-variables).

## Preflight de migraciones

El preflight inicial (`PRODUCTION_PREFLIGHT_CONFIRM=READ_ONLY_ONLY node scripts/preflight-website-production.mjs docs/websites/qa-preproduction/production-preflight-readonly.json`) terminó con `BEGIN READ ONLY`, **exactamente** estas dos pendientes y cero locks. Después, `npm run db:migrate:deploy` aplicó ambas; el post-check read-only está en [production-migration-postcheck.json](qa-preproduction/production-migration-postcheck.json), con cero pendientes, tablas MP/RLS y columnas MP presentes.

- `20261001120000_website_launch_offers`
- `20261002190000_website_mercadopago`

El SQL es aditivo: crea enum/tablas/índices, añade columnas MP y habilita RLS/revoca acceso público; no contiene `DROP`, `TRUNCATE` ni reemplazo de tablas existentes. La nueva operación tiene FK a `WebsiteAddon` con cascade al borrar el add-on y debe revisarse en backup/recovery. `CREATE UNIQUE INDEX` y `ALTER TABLE` requieren una ventana corta sin locks conflictivos.

Comando ejecutado contra la conexión aprobada del checkout:

```powershell
$env:DIRECT_URL = '<secret connection string from the approved release environment>'
$env:DATABASE_URL = '<runtime connection string from the approved release environment>'
npm run db:migrate:deploy
```

`prisma migrate status` quedó al día; el post-check read-only confirmó `WebsiteCheckoutOperation`, `WebsiteCommercialEvent`, `WebsiteLaunchSnapshot`, `WebsiteOfferEligibility`, RLS y columnas `mpCustomerId`/`mpSubscriptionId`. Si aparece una incidencia, detener adquisición, conservar cualquier backup operativo y hacer un forward-fix aprobado; no usar `db push` ni marcar una migración parcialmente aplicada como resuelta. No existe rollback SQL automático seguro para estas migraciones.

Auditoría 2026-10-02: **NO-GO**. Se inspeccionó `.env` del checkout y DB remota con BEGIN READ ONLY/ROLLBACK; luego se aplicaron las dos migraciones y se verificó el schema en lectura. No hubo deploy Vercel, cobro, correo, snapshot ni DNS. El servidor local 3006 no dispone de los secretos Vercel-only de auth/webhook.

| Variable | Uso | Observación del checkout |
| --- | --- | --- |
| DATABASE_URL | Prisma runtime/pool | Presente, conexión remota de solo lectura PASS REAL |
| DIRECT_URL | Migración/snapshot | Presente; operador debe verificar conexión apta para migraciones |
| AUTH_SECRET o NEXTAUTH_SECRET | Sesión, mínimo 32 caracteres | Vercel `AUTH_SECRET` presente; **NOT_VERIFIABLE** sin revelar valor; nueva validación de build exige esta pareja |
| NEXT_PUBLIC_APP_URL | Retorno MP, origen público HTTPS | Presente; validar origen del deployment |
| WEBSITE_ROOT_DOMAIN | Routing/canonical | No explícita; fallback puragenda.cl |
| WEBSITE_LAUNCH_AT | Corte ISO UTC fijo del snapshot | **Ausente; no inventar fecha** |
| WEBSITE_CHECKOUT_ENABLED | 1 habilita trial/checkout/recovery | Ausente: adquisición apagada por defecto |
| WEBSITE_LAUNCH_ENABLED | 1 expone popup/changelog v2.2.0 | Ausente: comunicación apagada |
| MERCADOPAGO_ACCESS_TOKEN | SDK servidor/vendedor Chile | Presente; GET /users/me HTTP200, MLC. No prueba pagos |
| MERCADOPAGO_WEBHOOK_SECRET | Firma del webhook | Vercel presente Production+Preview; firma/provider E2E **NOT_RUN** |
| CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET | Uploads | Presentes; escritura remota NOT_RUN |
| WEBSITE_DOMAIN_PROVIDER=vercel | Provider dominios propios | Activar tras comprobar ownership/infraestructura |
| WEBSITE_VERCEL_WRITES_ENABLED=true, VERCEL_TOKEN, VERCEL_PROJECT_ID | Escrituras al proyecto esperado | NOT_RUN; no habilitados/usados en QA |
| VERCEL_TEAM_ID | Equipo si aplica | Opcional |
| NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, NEXT_PUBLIC_POSTHOG_HOST | Analytics con consentimiento | Opcionales; rechazo no bloquea producto |
| RESEND_API_KEY | Correos existentes de reserva | Entrega remota NOT_RUN; campaña solo borradores |
| WEBSITE_QA, WEBSITE_BILLING_SIMULATOR, WEBSITE_MEDIA_MOCK, WEBSITE_BUILD_QA | QA local | No configurar en deployment |
| WEBSITE_PRICE_STANDARD, WEBSITE_PRICE_BETA_FOUNDER y variables Paddle sandbox | Internacional | No requeridas para Chile; NOT_RUN |

Actualización read-only 2026-10-03: las dos migraciones launch offers/Mercado Pago están aplicadas. Snapshot/ofertas/eventos/operaciones y columnas MP existen; hay 6 ofertas Founder y una operación Standard pendiente. Vercel Production tiene CHECKOUT_ENABLED/LAUNCH_ENABLED en `1` y LAUNCH_AT `2026-10-03T01:20:00Z`. Los registros de entorno MP/DB/auth abarcan Production y Preview. La tabla anterior refleja la auditoría histórica del 2 de octubre, no el estado actual. Ver [PUBLIC-COMMERCIAL-LAUNCH.md](PUBLIC-COMMERCIAL-LAUNCH.md) para evidencia y el bloqueo independiente de adquisición pública; no se modificó producción en esta auditoría.

El API oficial documenta auto_recurring.start_date para el primer cobro. Se envía trialEndsAt y se verificaron días 1/5/10/14 con simulador. **Primer cobro diferido real NOT_RUN: bloquea GO**. No hay credenciales oficiales de vendedor/comprador de test ni Preview aislado disponibles en esta pasada; el Access Token de producción y un GET de cuenta no sirven como prueba de checkout de test. Mercado Pago exige cuentas de prueba compatibles del mismo país y tarjeta/saldo de prueba. [Cuentas de prueba oficiales](https://www.mercadopago.cl/developers/es/news/2023/11/16/Questions-on-how-to-test-your-integration--).

Para GO: secretos/origen correctos, backup recuperable, migraciones sin drift, matriz oficial MP con cobro diferido/cancelación/recovery/BASE intacta, fecha aprobada y snapshot sellado, smoke de hosting/TLS/subdominio/uploads. Dominios propios quedan pendientes de validación externa autorizada.

Fuentes: [PreApproval](https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/create-preapproval/post), [gestión](https://www.mercadopago.cl/developers/es/docs/subscriptions/subscription-management), [webhooks](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks), [cuentas de prueba](https://www.mercadopago.cl/developers/es/news/2023/11/16/Questions-on-how-to-test-your-integration--).
