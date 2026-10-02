# Auditoría final de preproducción — 2026-10-02

Rama `webs`. PREPRODUCTION_HEAD_INITIAL: `ae6e735602f206125df765d99dc8fe06aa6102f6`.
Código final auditado: `84c9df516c55044fae70edeaa68ff977a5f8c139`.
Las variables del checkout que apuntan a producción se usaron para diagnóstico de solo lectura. La QA que escribe datos usó exclusivamente PostgreSQL aislado y nombres de fixtures locales. No hubo merge, deploy, DNS, compras, pagos, correos, snapshot aplicado ni Paddle live.

`PASS REAL` significa ejecución real del componente indicado, especificando **local** cuando corresponde. `PASS SIMULATED` significa proveedor/tiempo simulado, aunque HTTP y persistencia sean reales. `NOT_RUN` no cuenta como aprobado. `FAIL` identifica una condición comprobada que no cumple el requisito.

## Cierre operacional P0 — segunda pasada

| P0 | CURRENT STATE | ACTION | RESULT | REQUIRES ME | BLOCKS RELEASE |
| --- | --- | --- | --- | --- | --- |
| MercadoPago webhook secret | Vercel: presente en Production+Preview; valor no revelado | Mantener Secret en Production; URL `/api/webhooks/mercadopago`; topics `subscription_preapproval`, `subscription_authorized_payment`, `payment` | Configurado por nombre/ámbito; provider test NOT_RUN | Separar Preview con secret/test token y probar firma oficial | Sí |
| Auth secret | Vercel: `AUTH_SECRET` presente; `NEXTAUTH_SECRET` ausente; valor/longitud no revelados | Usar único `AUTH_SECRET` ≥32 bytes; validator corregido para no aceptar `GIFT_CARD_SECRET` | `NOT_VERIFIABLE` estructuralmente sin revelar | Confirmar valor válido en ventana sin imprimirlo | Sí |
| Production migrations | Preflight `BEGIN READ ONLY`: exactamente 2 pendientes; 0 waiting/strong locks | Backup + ventana; `npm run db:migrate:deploy`; post-check tablas/RLS/drift | READY_TO_RUN, NOT_EXECUTED | Backup y ventana autorizada | Sí |
| MP official deferred billing | Sin vendedor/comprador test ni Preview/DB aislada | Crear cuentas oficiales test del mismo país y PreApproval 5990 con `start_date` futuro | NOT_RUN | Credenciales/entorno test aislado | Sí |
| MP real webhook | Route/HMAC local PASS; callback provider real no ejecutado | Conectar URL test y validar firma→GET→binding→add-on | NOT_RUN | Test application/secret y endpoint aislado | Sí |
| Website/base isolation | 30 integration + 7 route local PASS; BASE intacta en simulador | Repetir con provider test y DB aislada | PASS REAL local / provider NOT_RUN | Fixture provider test | Sí |
| Website launch date | `WEBSITE_LAUNCH_AT` ausente | Diego debe entregar ISO UTC exacta | Correctamente sin snapshot | Fecha de Diego | Sí |
| Founder snapshot | No aplicado ni creado real | Dos dry runs después de fecha; luego apply autorizado | NOT_RUN por diseño | Fecha + confirmación operativa | Sí |
| Feature-off | `WEBSITE_CHECKOUT_ENABLED`, `WEBSITE_LAUNCH_ENABLED` ausentes; runtime default off | Mantener ausentes/0 hasta GO | Adquisición/comunicación apagadas | Ninguno ahora | No |

La UI de Vercel mostró que las credenciales MP actuales tienen alcance Preview y Production. No se hizo ninguna llamada autenticada MP ni modificación externa: Preview no es sandbox y debe aislarse antes del test.

## A. VEREDICTO

**NO-GO PARA PRODUCCIÓN CHILE.** La presencia de secretos P0 en Vercel quedó comprobada sin revelar valores; siguen bloqueando el release las migraciones no ejecutadas, provider E2E, webhook provider real, fecha de lanzamiento y snapshot deliberadamente no creado. No habilitar adquisición/comunicación.

## B. P0

| Bloqueador | Evidencia / estado | Cierre necesario |
| --- | --- | --- |
| MERCADOPAGO_WEBHOOK_SECRET local ausente | Vercel presente Production+Preview; local checkout no representa Vercel | Separar Preview y verificar firma con aplicación test |
| AUTH_SECRET local ausente | Vercel `AUTH_SECRET` presente; longitud no revelada | Confirmar estructuralmente en ventana sin exponer; validator exige la variable real |
| Schema de producción incompleto | FAIL; faltan launch offers y Mercado Pago | Backup, migrate deploy y verificación de DDL/RLS/drift |
| Primer débito diferido y ciclo MP oficial | NOT_RUN; solo simulador y SDK mock | Vendedor/comprador de prueba compatibles; probar start_date, aprobación, rechazo, cancelación y recovery |
| Corte/snapshot fundador no preparado en producción | NOT_RUN; WEBSITE_LAUNCH_AT ausente | Fijar corte aprobado, doble dry run estable y sellado en release autorizado |

Los tests locales detectaron y cerraron: reloj del panel desactualizado tras iniciar trial; billing inaccesible en Ritual; foco de modal que podía escapar; cancelación de período PAST_DUE/refund que podía devolver acceso; reactivación sin comprobar base/kill switch; falta de JSON-LD público. No quedan fallos conocidos de esos casos en el código auditado.

## C. P1

Subdominio/hosting/TLS, uploads Cloudinary y asociación Vercel reales: **NOT_RUN**. Son smoke externos previos al lanzamiento; la validación local de ownership, asset en uso y estados de dominio usa mocks. Verificar env efectiva del hosting: esta auditoría inspecciona la env del checkout, no el panel del deployment. El modal, precios, mobile, changelog y diagnóstico de soporte fueron corregidos/validados localmente.

## D. P2

47 warnings ESLint existentes (principalmente imágenes y dependencias de hooks); 0 errores. Touch físico y dispositivos reales NOT_RUN. No se afirma CWV medido, pentest, pixel-perfect o certificación de accesibilidad. Paddle internacional NOT_RUN y no bloquea Chile. Recordatorios por email preparados como copy, sin dispatcher nuevo ni envíos.

## E. MERCADOPAGO

La URL operativa es `https://www.puragenda.cl/api/webhooks/mercadopago`. El secret se obtiene en la aplicación Mercado Pago → Webhooks/Notifications → secret signature y se guarda como `MERCADOPAGO_WEBHOOK_SECRET` Secret en Vercel Production. Los tres topics que procesa la ruta son `subscription_preapproval`, `subscription_authorized_payment` y `payment`. La guía de configuración y la separación segura Preview/Production están en [PRODUCTION-READINESS](PRODUCTION-READINESS.md).

**Arquitectura:** `checkout.ts` elige MP para CL. `WebsiteAddon.mpSubscriptionId` es distinto de `Subscription.mpSubscriptionId` BASE. `WebsiteCheckoutOperation` guarda UUID/referencia `website:<UUID>`, tier/monto/moneda/primer cobro, estado y binding a add-on. Owner, businessId y precio se resuelven en servidor. Mensual CLP 5990 founder / 9990 standard, descripción Sitio Web Puragenda; no mezcla staff ni ciclo/descuentos base.

**Early conversion:** se envía `auto_recurring.start_date = trialEndsAt`, siguiendo el campo oficial del API/SDK. Se comprueban días 1/5/10/14. Invoice temprana se rechaza para entitlement; esto no revierte dinero si un proveedor llegara a debitar. **Débito diferido oficial NOT_RUN, P0**. Founder expirado mantiene 5990 sin otro trial; standard paga 9990 desde activación.

**Fuente de verdad:** firma válida antes de fetch; GET del recurso y Payment aprobado, referencia/binding/monto/moneda/periodicidad correctos. `pending`, regreso/query/callback y acuerdo `authorized` por sí solos no conceden paid access. Trial aún vigente conserva su acceso. Rejected/PAST_DUE permite recovery con confirmación canónica; no inventa pago.

**Idempotencia:** lock por negocio, operación durable y ledger único. Triple click crea una operación/acuerdo. Versiones duplicadas no repiten activación/analytics; versiones viejas no revierten estado. Pending reutiliza checkout; pasado TTL local se cancela antes de reemplazar. CREATING/UNKNOWN bloquea retry ambiguo y exige conciliación; no se presume garantía de idempotencia del POST del proveedor.

**Cancelación/reactivación:** MP no documenta cancel-at-period-end. Se cancela recurrencia ahora y se conserva únicamente el período ya pagado. Acuerdo cancelado necesita nuevo checkout; primer débito después del período restante. Paused puede reactivarse mediante el flujo correspondiente, con base operativa y adquisición habilitada. Cancelar/recover Website toca solo MP-WEB; MP-BASE intacta. Founder sigue siendo 5990 al reactivar, incluso un año después. PAST_DUE/refund no recupera acceso por una fecha futura sola.

### Payment test matrix

| Caso | Unit / route | Integration PostgreSQL | MP test/sim | Estado |
| --- | --- | --- | --- | --- |
| Founder trial checkout | Oferta/entitlement PASS REAL local | Monto y start_date PASS REAL local | SDK mock | PASS SIMULATED |
| Founder expired checkout | Oferta PASS REAL local | 5990 permanente PASS REAL local; HTTP | SDK/simulador | PASS SIMULATED |
| Standard checkout | Oferta PASS REAL local | 9990, sin trial, client tampering ignorado; HTTP | Simulador | PASS SIMULATED |
| Early días 1/5/10/14 y boundary | Boundary PASS REAL local | Primer cargo exacto/rechazo temprano PASS REAL local | Reloj y SDK simulados | PASS SIMULATED |
| Pending / authorized / abandono | Entitlement PASS REAL local | Sin ACTIVE por retorno/acuerdo PASS REAL local | SDK/simulador | PASS SIMULATED |
| Rejected | Entitlement PASS REAL local | No paid access; trial conserva acceso | SDK/simulador | PASS SIMULATED |
| Approved | Entitlement PASS REAL local | Invoice/Payment verificadas, período, evento único | SDK/simulador | PASS SIMULATED |
| Duplicate callback / triple click | Route no confiere acceso | Una operación/acuerdo | SDK mock | PASS SIMULATED |
| Duplicate / old webhook | Routing PASS REAL local | Ledger y orden PASS REAL local | Recursos remotos mock | PASS SIMULATED |
| Invalid webhook | HMAC real con clave ficticia PASS REAL local | No fetch/activación | Sin proveedor real | PASS REAL local (firma) |
| Wrong business / binding | Route PASS REAL local | Rechazo referencia ajena y operación B | SDK/simulador | PASS SIMULATED |
| Wrong amount / currency | Route PASS REAL local | Rechazo amount=1/9990 inválido/moneda errónea | SDK mock | PASS SIMULATED |
| Cancellation | Entitlement PASS REAL local | Conserva período, BASE intacta | SDK mock | PASS SIMULATED |
| Reactivation | Oferta PASS REAL local | 5990, nuevo acuerdo, días pagados, base/flag | SDK mock | PASS SIMULATED |
| Past due / refund recovery | Entitlement PASS REAL local | No acceso al cancelar; reemplaza solo Website | SDK/simulador | PASS SIMULATED |
| Base/Website isolation | Routing PASS REAL local | Cancel/recovery no altera BASE | SDK mock | PASS SIMULATED |
| Mercado Pago oficial E2E y débito diferido | — | — | No cuenta de test compatible probada | NOT_RUN |

30 casos MP integration y 7 de route webhook incluidos en la suite completa. GET /users/me con env de producción: HTTP200/MLC, **PASS REAL read-only**; no acredita pagos. Ningún pago real.

Referencias oficiales consultadas: [PreApproval/start_date](https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/create-preapproval/post), [gestión](https://www.mercadopago.cl/developers/es/docs/subscriptions/subscription-management), [webhooks](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks), [pruebas de suscripciones](https://www.mercadopago.cl/developers/es/news/2023/11/16/Questions-on-how-to-test-your-integration--). No se infiere entorno compatible por el prefijo del token.

## F. TRIAL

PASS REAL local: inicio explícito, exactamente 15×24h, una vez por businessId; startedAt/endsAt/consumedAt persistidos. now>=endsAt corta publish/runtime sin borrar contenido. El evento expired se registra una vez en la próxima visita gestionada; el cutoff no depende de cron. Preview/builder permanecen disponibles. Same owner/new business: STANDARD, no hereda founder. Dry run local repetido: 3 candidatos / 1 marcado / 2 nuevos; sin --apply. Dry run de producción NOT_RUN por falta de corte, no se inventó fecha.

La [state machine F0–F9/S0–S6](PREPRODUCTION-STATES.md) define access, CTA, precio y checkout por estado. Eligibility, trial, billing, publicación y BASE son independientes. F3 exige un período pagado verificado independiente; `authorized` nunca crea F3.

## G. POPUP

PASS REAL local navegador: founder AVAILABLE, TRIALING, EXPIRED y STANDARD; CTA inicia trial una sola vez; dismiss/reload/navegación no reinician ni repiten automáticamente el anuncio. Paid segmentation PASS REAL unit; paid popup browser NOT_RUN. Desktop/390; Tab y ShiftTab quedan dentro, ESC cierra y devuelve foco. Native dialog, crema/amarillo/borde negro, tres previews existentes. Variante A elegida entre tres propuestas con comparación editorial en [LAUNCH-COPY](LAUNCH-COPY.md). Copy: “Llegaste antes. Este precio es tuyo.” Beneficio por negocio, 15 días, 5990 para siempre; standard no recibe oferta founder.

Capturas: [desktop](qa-preproduction/founder-launch-1440.jpg), [mobile](qa-preproduction/founder-launch-390.jpg), [trial](qa-preproduction/founder-trial-390.jpg), [expired](qa-preproduction/founder-expired-390.jpg), [standard](qa-preproduction/standard-launch-390.jpg).

## H. CHANGELOG

PASS REAL local: v2.2.0, 2 octubre 2026; Bella, Matchday, Ritual y beneficios; precio/CTA segmentados en servidor. Historial accesible, versión vista persistida y reapertura manual mediante Ver anuncio. [Desktop](qa-preproduction/changelog-1440.jpg) / [mobile](qa-preproduction/changelog-390.jpg). No comunicación en producción.

## I. BELLA

PASS REAL local: select/preview/builder, autosave/reload/publicación, catálogo, staff/galería/contacto, SEO y Appointment por HTTP. Navegador en desktop/390/360, sin overflow. Capturas `bella-public-*` y `bella-builder-*` en [evidencia](qa-preproduction/). Upload externo NOT_RUN; comportamiento media/ownership PASS SIMULATED.

## J. MATCHDAY

PASS REAL local: mismos flujos, staff y galería, booking/Appointment por HTTP, draft separado de publicado y restore de configuración. Desktop/390/360 sin overflow; capturas `matchday-public-*` / `matchday-builder-*`. Provider media externo NOT_RUN.

## K. RITUAL

PASS REAL local: mismos flujos y reserva completa desde navegador → Appointment único PENDING (negocio exige aprobación). [Reserva recibida](qa-preproduction/ritual-browser-booking-360.jpg). Fixture Terapias SEC realista y stress 25 servicios/30 imágenes/10 profesionales. Services: 6 iniciales, +6, filtro/reset. Gallery/staff next/prev y contadores; lightbox ArrowLeft/ESC/restauración de foco. Seis colores HEX editados, autosave, lectura DB, reload y publicación; [custom](qa-preproduction/ritual-custom-builder-1440.jpg). Touch físico NOT_RUN.

## L. BUILDER

PASS REAL local HTTP/DB: switch draft no cambia public, publish cambia snapshot, tres configuraciones conservadas. Revision de segunda sesión rechazada, no overwrite silencioso. UI billing accesible en las tres plantillas. Media mock: validación, blob preview, guardar/reload/remove/asset en uso/cross tenant cubiertos por tests; upload/red remota NOT_RUN. Sync de servicios y staff canónicos comprobado por HTTP; copy editorial separado. No se afirma media externa E2E.

## M. BOOKING

PASS REAL local: en Bella/Matchday/Ritual, availability canónica → POST booking → Appointment del tenant. Replay retorna el mismo ID; otro cliente mismo slot 409; service/staff/location ajenos rechazados. Suite de concurrencia PostgreSQL opt-in activa. Navegador Ritual: tratamiento, primera disponibilidad, sucursal, día/slot, datos ficticios y confirmar; DB count=1, PENDING. Emails deshabilitados. No citas ni datos de clientes de producción.

## N. DOMAINS

Subdominio válido/ocupado/inválido/reservado y routing: PASS REAL local/tests. Custom domain pending/verified/misconfigured/active/primary/disconnect y TXT/ownership: PASS SIMULATED provider, con HTTP/DB local real. Migración de dominio legacy exige challenge tenant nuevo y conserva reserva; no adopta asociación previa sin prueba. DNS, TLS y provider Vercel real NOT_RUN; no se compraron dominios.

## O. SEO

PASS REAL local HTTP: title/description/canonical/OpenGraph y aislamiento en tres templates. JSON-LD LocalBusiness con datos públicos y ofertas del catálogo, sin ratings inventados, PII privada ni API keys. Escape de cierre de script y U+2028/U+2029 probado. Imágenes sociales obedecen media disponible; crawling/indexación externa NOT_RUN. [Contrato Schema.org](https://schema.org/LocalBusiness).

## P. SECURITY

PASS REAL local: auth/owner/origin, tenant scope en config/media/domain/service/staff/booking, idempotency y concurrencia. Firma MP real con clave ficticia; payload/proveedor mock. Simulador exige non-production + flags + loopback/DB fija y ownership; runtime de producción lo rechaza. Nuevas tablas server-only RLS y revoke, sin acceso público directo. Logs seguros y analytics sin PII: events únicos para trial/checkout/activation/cancel/reactivation/template/publish; seen/dismiss dedup por apertura y consentimiento. Rechazo por falta de consentimiento no bloquea producto. Superadmin diagnóstico protegido, sin edición libre de founder; operación UNKNOWN/PENDING muestra referencia/monto para conciliación. Pentest externo NOT_RUN.

## Q. MOBILE

PASS REAL local navegador: public y builder Bella/Matchday/Ritual 1440, 390×844, 360×844; métricas DOM y capturas. Overflow horizontal del documento 0 dentro de tolerancia 2px; rails internos desplazables por diseño. Ritual realistic/stress incluidos. Las capturas nativas pueden excluir scrollbar/bordes; `layout.json` registra el viewport real. Dispositivos/touch físico NOT_RUN.

## R. TESTS

| Ejecución final sobre código auditado | Files passed / skipped / failed | Tests passed / skipped / failed |
| --- | --- | --- |
| npm test | 182 / 3 / 0 (185 total) | 1078 / 51 / 0 (1129 total) |
| PostgreSQL opt-in completo | 185 / 0 / 0 | 1129 / 0 / 0 |

HTTP adicionales: 52 comerciales +29 públicos +18 acciones, todos PASS; no se suman a Vitest. Proveedor MP/Cloudinary/Vercel simulado donde aplica. La primera repetición comercial tras dejar B sin pago bloqueó la request antes de validar service ajeno (404); se restauró **fixture local B pagada** como precondición y la prueba adversarial devolvió el rechazo esperado. No se modificó producción ni se ocultó un bug del producto.

Lint 0 errores /47 warnings; typecheck PASS; Prisma validate/generate PASS; build producción aislado PASS, 135 páginas. Resultados, hashes de archivos, object IDs y comandos en [validation.json](qa-preproduction/validation.json). La repetición P0 está resumida en [second-pass-output.txt](qa-preproduction/second-pass-output.txt); logs completos quedan en scratch ignorado; extractos previos en [test-output.txt](qa-preproduction/test-output.txt). Verificación final de HEAD se registra fuera del commit para evitar un SHA autorreferencial.

## S. MIGRATIONS

PASS REAL local: baseline MAIN, 8 incrementales, checkpoints V1→V2, legacy-domain ownership, sin drift; RLS en 10 tablas Website. Historia aplicada no reescrita en esta pasada; nueva migración `20261002190000_website_mercadopago` aditiva. Producción read-only detectó pendientes:

- `20261001120000_website_launch_offers`
- `20261002190000_website_mercadopago`

No se ejecutó migrate deploy ni db push remoto. Fallo de migración/recuperación previstos en runbook.

## T. ENV

[PRODUCTION-READINESS](PRODUCTION-READINESS.md), [production-readonly.json](qa-preproduction/production-readonly.json), [production-preflight-readonly.json](qa-preproduction/production-preflight-readonly.json) y [vercel-readonly.json](qa-preproduction/vercel-readonly.json): DB conectada dentro de BEGIN READ ONLY/ROLLBACK, exactamente dos migraciones pendientes, cero locks de espera, MP GET200/MLC, y Vercel muestra MP token/webhook, AUTH_SECRET, DB y URL presentes. Secretos nunca guardados. Checkout/launch flags ausentes → apagados; root no explícito → fallback puragenda.cl; launchAt ausente. Preview comparte credenciales MP Production y debe aislarse antes de provider test. .env reales y .agents no trackeados; .env.example contiene placeholders y defaults feature-off.

## U. RELEASE RUNBOOK

[RELEASE-RUNBOOK](RELEASE-RUNBOOK.md): Vercel/env read-only → backup recuperable → preflight locks/migration → migrate deploy → post-check → deploy feature-off → smoke base/runtime → MP test aislado → corte/doble dry run/snapshot → resolver P0/P1 y GO → habilitar adquisición → comunicación → monitor. Checklist post-deploy exacto preparado, **NOT_RUN**. WEBSITE_CHECKOUT_ENABLED=0 bloquea nuevas pruebas/checkouts/recovery sin retirar acceso pagado. WEBSITE_LAUNCH_ENABLED=0 bloquea nuevo anuncio. Runtime conserva política de base/publicación/entitlement; suspensión individual existente evita un kill switch global innecesario.

## V. ROLLBACK

Runbook cubre deployment, migración, MP, runtime, dominio y débito temprano. Conservar contenido/snapshots/media/ofertas/ledger y procesador MP compatible; no cancelar BASE. UNKNOWN no se borra para reintentar. Reversión de código antiguo sola no sirve para acuerdos MP Website nuevos. Backup y recuperación reales NOT_RUN; requieren operación autorizada.

## W. HEAD FINAL

Los fixes de producto y hardening están en `b0044c764defd89393ffc3bd26b80f8dff8bb07e` y `84c9df516c55044fae70edeaa68ff977a5f8c139`. El commit posterior añade solo docs/evidencia: los object IDs de `src`, `prisma`, `tests`, `scripts` y configuración prueban equivalencia del producto. PREPRODUCTION_HEAD_FINAL se obtiene **después** del commit de evidencia y se entrega en el informe final y `scratch/PREPRODUCTION_HEAD_FINAL.json`; el commit no puede incluir su propio hash. Se repiten comprobaciones finales sobre ese HEAD y se verifica igualdad con origin/webs. No se presenta un SHA previo como HEAD final.

## X. COMMITS

- `b0044c7` — feat(websites): harden Chile Mercado Pago billing and launch flows.
- `84c9df5` — fix(websites): enforce production auth and preflight migrations.
- Commit posterior de docs — informe NO-GO, evidencia y actualización QA/DELIVERY; SHA exacto en la entrega final.

Diff acumulado clasificado en [final-diff-inventory.json](qa-preproduction/final-diff-inventory.json): producto, billing, migraciones, tests, docs, scripts y config. Revisión de secretos/paths documentada en validation.json. Rama webs subida tras validación; no merge ni deploy.
