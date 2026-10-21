# 01 — Auditoría del estado actual

## Alcance y evidencia

La revisión se hizo sobre el commit 731582e6 de la rama reel/puragenda-publicitario-20261015, replicado en el worktree de feature/puragenda-next. Se inspeccionaron src/app, src/server, src/core, src/websites, prisma/schema.prisma, todas las migraciones relacionadas y las suites de tests/server, tests/core y pruebas de pricing. Las rutas citadas son relativas a la raíz del repositorio.

La aplicación usa el App Router de Next.js: páginas y Route Handlers viven en src/app; servicios de servidor en src/server; reglas puras en src/core. La documentación instalada de Next 16.3.8 confirma que un route.ts es el límite HTTP, que los POST no se cachean por defecto y que cada Server Action debe autenticar y autorizar internamente. Esto es relevante para billing, Contact Flow y publicación web.

## Inventario por dominio

| Dominio | Implementación actual comprobada | Evidencia |
| --- | --- | --- |
| Cuenta multi-tenant | Business es la cuenta comercial; BusinessLocation separa sucursales; StaffLocation asigna profesionales. | prisma/schema.prisma:585-800 |
| Agenda | Servicios, horarios, disponibilidad, reservas, reservas recurrentes, depósitos, POS y calendario. | src/server/booking, src/server/services/appointment.service.ts, src/app/api/appointments |
| Clientes | CRM por negocio, portal, consentimientos de marketing, historiales y fidelización. | prisma/schema.prisma:1742-1773, src/server/services/client.service.ts |
| Suscripción | Una fila Subscription por negocio con plan, estado, ciclo, trial, extras, descuentos y referencias a proveedores. | prisma/schema.prisma:449-570 |
| Billing Chile | Checkout y preapproval de Mercado Pago; webhook firmado; reconciliación de invoices y dunning. | src/app/api/billing/subscribe/route.ts, src/app/api/webhooks/mercadopago/route.ts, src/server/services/subscription-dunning.service.ts |
| Billing internacional | Checkout Paddle para negocios fuera de Chile; webhook firmado por webhooks.unmarshal. | src/server/lib/paddle.ts, src/app/api/webhooks/paddle/route.ts |
| Marketing | Campaña manual de win-back, una campaña mensual y lote Resend síncrono. | src/server/services/marketing.service.ts, src/app/api/marketing/send/route.ts |
| Puri | Orquestador de Responses API, 15 herramientas de lectura, permisos y contexto por sucursal. | src/server/puri/*.ts, src/app/api/dashboard/puri/route.ts |
| Webs | Editor, preview, publicación, media, plantillas Bella/Matchday/Ritual/Pink Y2K, subdominio y dominios propios. | src/app/dashboard/website, src/websites, src/server/websites |
| Analytics | PostHog/GA tras consentimiento y telemetría propia de Puri. | src/lib/analytics, modelos Puri* y Tracking* |
| Jobs | Cron de reminders, trial expiry, tracking retention, calendar sync y billing reconciliation. | vercel.json, src/app/api/cron |

## Suscripciones y precios actuales

SubscriptionPlan contiene INDIVIDUAL, EQUIPO y TEST; no existen PURAGENDA ni PURAGENDA_PLUS en el código auditado. src/core/constants.ts:36-65 define:

- Individual: 12.990 CLP/mes, un profesional.
- Equipo: 29.990 CLP/mes, cinco profesionales incluidos.
- Test: 1.000 CLP/mes.
- Extra Equipo: 3.000 CLP/mes.
- Anualidad: multiplicador 10, descrito como “10 meses”.
- Trial: 30 días.
- Marketing: 50 emails/mes Individual, 100 Equipo, 10 Test; una campaña/mes.
- Checkout público: limita extraStaffCount entre 0 y 20 (src/app/api/billing/subscribe/route.ts:60-68 y src/websites/commercial.ts:7-12).

src/server/services/subscription.service.ts:8-52 calcula límites y precio. La función solo aplica extras al plan Equipo y usa una tarifa plana. src/server/services/subscription-billing.service.ts:72-188 vuelve a calcular el importe, aplica descuentos/prizes/free months/overrides y fuerza el mínimo de 10 CLP para Mercado Pago. La existencia de dos cálculos separados exige una fuente única antes de implementar el nuevo catálogo.

La base representa importes como Int en CLP y la aplicación conserva currencyCode en Business. No hay un campo vatRate, taxIncluded o una conciliación tributaria. Por tanto, el IVA es una decisión pendiente; no debe inferirse a partir del precio actual.

## Estado y proveedores

SubscriptionStatus es ACTIVE, TRIALING, PAST_DUE, INACTIVE o CANCELLED. core/subscription-access.ts traduce estos estados a acceso operativo, incluyendo gracia para PAST_DUE. La ruta de billing rechaza crear una nueva suscripción cuando existe un pago pendiente (src/app/api/billing/subscribe/route.ts:102-112).

Mercado Pago:

1. billing/subscribe crea o actualiza una preapproval, guarda mpSubscriptionId y devuelve init_point.
2. El webhook verifica x-signature/x-request-id mediante WebhookSignatureValidator.
3. subscription_preapproval activa onboarding solo si la fila era inactiva/trial y no está fallida.
4. subscription_authorized_payment/payment busca la invoice, protege contra eventos viejos y aplica dunning.
5. billing-reconciliation revisa hasta 100 suscripciones cerca del vencimiento o en PAST_DUE.

La idempotencia se apoya en lastInvoiceId, lastPaymentId, timestamps y updateMany condicionados. Existe un ledger separado para notificaciones administrativas (SubscriptionPaymentNotification, único por proveedor/pago), pero no un ledger general de eventos provider para el catálogo nuevo.

Paddle:

- Los IDs paddleCustomerId, paddleSubscriptionId, paddlePriceIds, paddleLastEventAt y paddleLastEventId viven en Subscription.
- El webhook usa getPaddleServerClient().webhooks.unmarshal(rawBody, secret, signature) antes de procesar.
- paddle-webhook.service.ts sincroniza por customData.puragenda_business_id, ignora negocios CL y usa transaction.completed como prueba de cobro.
- getPaddleCheckoutItems modela base más un item de extras con quantity.

La rama feature/puragenda-chatgpt-mcp añade campos de transferencia bancaria y precio manual, pero no forma parte del HEAD auditado; se registra como evidencia de otra línea de desarrollo, no como capacidad disponible aquí.

## Profesionales y cupos

No existe una entidad de “slot contratado”. Subscription.extraStaffCount es un contador y Staff es el conjunto de personas activas. canAddStaff compara el número de Staff con un límite derivado del plan. Esto no conserva un historial comercial de cupos, no expresa una reducción futura y no evita por sí mismo que dos solicitudes concurrentes creen profesionales de más. La nueva regla requiere separar:

- profesionales históricos y activos;
- capacidad contratada efectiva;
- cambios programados;
- precio de cada escalón;
- evidencia de pago que autoriza un aumento.

El modelo actual sí tiene bloqueo transaccional en varios flujos de webs y checkout; se puede reutilizar como patrón, pero billing de base no bloquea explícitamente la fila Business al cambiar cupos.

## Puri actual

Puri es un asistente único, no dos modelos:

- openai-client.ts usa OPENAI_API_KEY y PURI_MODEL, por defecto gpt-6-luna.
- orchestrator.ts limita historial a 12 mensajes, cuatro rondas de herramientas y 1.200 tokens de salida; exige tool en la primera ronda y devuelve JSON estricto.
- context.ts resuelve negocio, permisos efectivos, profesional propio y sucursal activa.
- tools.ts ejecuta consultas deterministas: agenda, disponibilidad, clientes, actividad, ingresos, comparación, servicios, staff, fidelización, Gift Cards, recurrentes y stories.
- prompt.ts declara explícitamente que V1 es solo lectura y no crea, cobra, edita, envía ni cambia.
- rate-limit.ts usa ApiRateLimitBucket compartido: 30 solicitudes por usuario/negocio cada 10 minutos.
- La ruta registra PuriRequest, PuriToolCall, coste estimado, tokens, latencias y feedback sin guardar prompts ni resultados completos.
- analytics.ts proporciona panel Superadmin con filtros por plan, negocio, usuario, herramienta, intent, coste, latencia, calidad y retención.

Esto es reutilizable para Puri+, pero la separación actual es por permisos de dashboard y no por entitlement comercial. No hay herramientas de estrategia, simulación de impacto, aprobación, ejecución de Contact Flow ni atribución de reservas.

## Marketing actual

MarketingCampaign solo guarda businessId, subject, body, audienceSize y sentAt (prisma/schema.prisma:2065-2081). getWinBackAudience calcula por SQL clientes con acceptsMarketing = true y última cita ascendente. POST /api/marketing/send:

1. valida sesión, permiso marketing.manage y rate limiter;
2. cuenta campañas del mes calendario del servidor;
3. obtiene hasta el máximo del plan;
4. genera tokens de portal;
5. llama a resend.batch.send(emails);
6. registra la campaña después del envío.

No hay reserva atómica de cuota antes del envío, idempotency key, cola, reintento por destinatario, límite diario, supresión local, evento Resend, consentimiento versionado, atribución de reserva ni separación transaccional/comercial. Si el proveedor acepta el lote y falla el registro, una repetición puede enviar duplicado. Si dos requests pasan el contador antes de crear la fila, pueden superar la cuota.

## Webs y add-ons

BusinessWebsite conserva borrador, publicación, plantilla, versión, revisión, media y dominios. WebsiteMedia está ligado a la web y elimina EXIF/GPS con Sharp antes de Cloudinary. websiteIsVisible exige web publicada, entitlement del add-on, suscripción operativa y negocio no borrado.

WebsiteAddon es independiente de Subscription y permite Paddle o Mercado Pago. Las migraciones 20260930160000_websites_addon_v1, 20260930210000_website_visual_builder_v2, 20261001120000_website_launch_offers, 20261001120000_website_domain_tenant_ownership, 20261002190000_website_mercadopago y 20261003220000_website_purchase_intent son aditivas y conservan snapshots. Hay:

- ofertas BETA_FOUNDER ($5.990) y STANDARD ($9.990) en src/websites/offers.ts;
- trial founder de 15 días;
- WebsiteCheckoutOperation con estados CREATING, UNKNOWN, PENDING, AUTHORIZED;
- locks por Business y claves de idempotencia para creación MP;
- WebsiteBillingEvent para deduplicar eventos;
- suspensión de la web publicada cuando el add-on deja de estar activo;
- challenge TXT antes de adoptar un dominio del proveedor.

La contratación pública está protegida por WEBSITE_CHECKOUT_ENABLED y WEBSITE_PUBLIC_ACQUISITION_ENABLED; actualmente no debe asumirse que está habilitada. La política target de Plus debe conservar los datos aunque el entitlement cambie.

## Seguridad, aislamiento y jobs

Las tablas de billing, webs y Puri tienen RLS habilitado en migraciones y, en varias, privilegios revocados a anon y authenticated. La autorización principal se hace en servicios de servidor con getBusinessForUser, permisos efectivos y checks de propietario. Puri usa requireSameOrigin; el rate limiting compartido usa PostgreSQL.

vercel.json agenda tracking retention, trial expiry y reminders. Billing reconciliation existe como Route Handler, pero no aparece como cron en vercel.json; se invoca desde trial expiry o de forma operativa. Contact Flow no tiene worker ni cola.

## Ramas relevantes

| Rama | Hallazgo | Estado para Puragenda Next |
| --- | --- | --- |
| feature/puri-assistant | Puri operativo y analytics integrados junto con una versión anterior de webs. | La arquitectura de Puri está reflejada en el HEAD auditado; no fusionar a ciegas. |
| feature/puragenda-chatgpt-mcp | Conector MCP con OAuth/PKCE, 30 herramientas, rollout oculto y docs de seguridad; además ajustes de paginación de Puri. | Relevante como diseño futuro; no está en el baseline ni debe anunciarse como disponible. |
| feature/website-public-pricing | Diferencias grandes de templates y pricing web. | Revisar solo como historial; el baseline tiene más cambios de web. |
| feature/websites-addon-v1 | Primera versión del add-on y del editor. | El baseline incluye la evolución posterior y migraciones. |
| testingCobrosInternacionales | Variación extensa que elimina parte de webs/Puri en ese punto. | No es base segura para migrar. |
| feat/manual-bank-transfer-billing | Añade BANK_TRANSFER, precio manual y límites de staff override. | Reutilizable como referencia de excepciones, no está en HEAD. |

## Pruebas existentes y brechas

Hay 200 archivos de pruebas; 125 bajo tests/server y 32 bajo tests/core, además de suites de UI, i18n, booking y proveedores. Cobertura relevante existente:

- subscription-access, subscription-checkout-state, subscription-dunning, subscription-dunning-email-idempotency, subscription-payment-notification;
- paddle-webhook.service, mercadopago-webhook-signature;
- puri.* para contexto, herramientas, rate limit, orquestador, telemetría y Superadmin;
- website-* para editor, publicación, billing, MP, dominio, media y launch;
- website-public-pricing.test.ts para copy/precios actuales.

El catálogo PURAGENDA/PURAGENDA+ y su fórmula acumulativa ya tienen una suite pura aislada. Siguen faltando pruebas de concurrencia de cupos, prorrateo, migración de clientes existentes, entitlement combinado de Plus, cola de automatizaciones, idempotencia por destinatario, webhooks Resend, atribución y límites cruzados entre negocios.

## Riesgos confirmados

1. Dos calculadores de precio pueden divergir.
2. EQUIPO/extras y el límite 20 contradicen el nuevo catálogo.
3. Un cambio de plan actual puede mutar la fila de suscripción antes de que exista pago confirmado.
4. Mercado Pago y Paddle tienen modelos distintos; no se puede asumir que cambiar una preapproval equivale a prorratear.
5. acceptsMarketing por defecto true y el envío manual no satisfacen por sí solos consentimiento, supresión ni trazabilidad.
6. No hay ledger de capacidad ni worker de Contact Flow.
7. El add-on web separado necesita una política de grandfathering para no cobrar dos veces.
8. La telemetría de Puri conoce coste solo si se configura PURI_MODEL_PRICES_USD_PER_MILLION; con precios ausentes devuelve null.
9. El índice Git está sucio en el checkout original; mezclar esa rama con la entrega sería peligroso.

Los cambios correctivos de integración se reservan para las fases posteriores. Esta iteración implementa únicamente el catálogo puro, sin alterar billing, checkout, UI pública, providers ni permisos efectivos.
## Reconciliación de Iteración 2

La base de trabajo se actualizó desde el commit auditado 731582e6 hasta origin/main 34187de4. origin/main estaba 34 commits adelante y la rama promocional tenía 2 commits propios no presentes en origin/main. El nuevo HEAD incorpora payment holds/múltiples calendarios y el rollout MCP oculto ya mergeado. No se incorporaron las ramas de manual billing o MCP mediante merge adicional.

El checkout original mantiene sus cambios no relacionados. El worktree de Puragenda Next conserva la documentación y el código de esta iteración de forma aislada.
