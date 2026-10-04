# Contratación pública: Puragenda + Sitio Web

Rama `feature/website-public-pricing`, desde `main` `4d009e6714a69c7178b2dd9fd22b9f68cae8423f`. Implementación y QA locales; rama publicada para auditoría. Sin merge, deploy manual, cambios GSC, cobros reales, mutaciones de suscripciones remotas ni cambios del snapshot Founder. De los Previews automáticos de Vercel solo se consulta el estado de build.

## Decisión de lanzamiento

**NO-GO de adquisición pública.** La implementación está preparada y se prueba localmente con proveedores simulados. En producción no existe `WEBSITE_PUBLIC_ACQUISITION_ENABLED`: su ausencia mantiene deshabilitado el CTA público de contratación del sitio cuando se despliegue este código. Seleccionar el complemento permite conservar el interés e iniciar únicamente la prueba de Puragenda, con explicación visible. Los sitios y contratos existentes mantienen su política.

Para habilitar adquisición pública se requieren `WEBSITE_PUBLIC_ACQUISITION_ENABLED=1`, `WEBSITE_CHECKOUT_ENABLED=1` y presencia de token/secreto MP en el servidor, **después** de registrar GO operativo y aplicar la nueva migración. La UI recibe solo un booleano. Este flag no activa entitlement ni sustituye al webhook. No se modificaron variables Vercel durante esta tarea.

## Producción auditada antes de los cambios

Auditoría read-only del 3 de octubre de 2026. Vercel Project `puragenda`, deployment READY `dpl_HNdXqQbxv6yANp666ontfnStLVBs`, SHA `4d009e6714a69c7178b2dd9fd22b9f68cae8423f`. Los valores de configuración se consultaron mediante CLI/API oficial, con salida limitada a flags, fecha y presencia/ámbito; no se imprimieron credenciales.

| Evidencia | Estado observado |
| --- | --- |
| WEBSITE_CHECKOUT_ENABLED | `1`, Production |
| WEBSITE_LAUNCH_ENABLED | `1`, Production |
| WEBSITE_LAUNCH_AT | `2026-10-03T01:20:00Z`, Production |
| WEBSITE_PUBLIC_ACQUISITION_ENABLED | Ausente |
| AUTH_SECRET, DATABASE_URL, DIRECT_URL, token y secreto MP | Presentes; cada variable comparte el registro/valor entre Production y Preview |
| Migraciones launch offers y Website MP | Aplicadas, no revertidas; tablas/columnas presentes y RLS observado |
| Snapshot/ofertas | 3 registros de snapshot, 6 miembros/ofertas BETA_FOUNDER; no recalculados ni modificados |
| Operaciones Website MP | 1 PENDING / providerStatus pending |
| Eventos comerciales | 1 trial_started, 1 published, 1 standard_checkout_started; ninguna activación pagada registrada |
| GET MP /users/me | HTTP 200, sitio MLC; no demuestra un cobro |
| Prueba oficial del primer débito diferido | NOT_RUN; no vendedor/comprador oficial de test disponible en el entorno auditado |
| Nueva migración purchase intent | Preparada y comprobada localmente; **no aplicada en producción** |

La documentación del 2 de octubre sobre flags ausentes quedó histórica. Los flags encendidos y el acuerdo pendiente no demuestran que la matriz oficial MP esté aprobada. Preview comparte secretos/DB con Production y no es un entorno aislado adecuado para QA de pagos. No se crearon cuentas de test remotas ni se usó dinero real. Evidencia local sin PII: `artifacts/website-commercial/production-audit.json`.

## Catálogos y periodicidad

`PRICING`, `EXTRA_STAFF_COST`, `ANNUAL_MULTIPLIER`, `WEBSITE_CATALOG` y `WEBSITE_ONBOARDING_OPTION` siguen siendo las fuentes de verdad. `src/websites/commercial.ts` deriva cotizaciones y URLs; no contiene un segundo catálogo.

| Selección mensual | BASE | WEBSITE STANDARD | Total |
| --- | ---: | ---: | ---: |
| Individual | $12.990 | $9.990 | $22.980 |
| Equipo | $29.990 | $9.990 | $39.980 |
| Equipo + 2 profesionales extra | $35.990 | $9.990 | $45.980 |

Importes CLP. Profesional extra Equipo: catálogo actual $3.000/mes. Anual BASE: 10 mensualidades; Individual $129.900/año, Equipo $299.900/año, profesional extra $30.000/año. Website continúa en $9.990/mes y nunca recibe el descuento anual. La cotización anual devuelve `monthlyTotal=null`: UI y registro muestran BASE/año + WEBSITE/mes. El checkout BASE anual configura frecuencia **12 meses**, sin sumar Website.

Founder sigue en $5.990/mes exclusivamente para la oferta persistida del negocio. No hay precio Founder público, nueva elegibilidad ni trial Standard de 15 días. Se preservan el beneficio y el trial Founder ya existentes.

## Home, Pricing y registro

Home incorpora una sección neo-brutalista antes del CTA final: agenda y sitio conectados, servicios/profesionales/identidad/reservas y enlace `/pricing#sitio-web`. Pricing conserva dos cards, selección de Website desactivada por defecto, nombre/total/desglose al seleccionar, periodicidades separadas y prueba BASE secundaria. Incluye sección visual con previews reales Bella, Matchday y Ritual y enlaces a `/website-preview?template=...`.

Hosting, SSL, subdominio y reservas integradas forman parte del complemento. Dominio propio compatible mediante el flujo del dashboard; **compra de dominio no incluida**. La tabla distingue el widget iframe, que inserta agenda en una web existente, del producto Website que crea/publica el sitio. No se promete SEO garantizado, diseño a medida ni clientes ficticios.

Registro conserva `plan`, `trial`, `extraStaff`, añade `cycle` y `website=1`. El body usa **`websiteIntent` booleano**: `website` sigue siendo el honeypot existente. El schema ignora amount/tier/providerPriceId y valida el ciclo. El servidor persiste intent solo para un negocio CL con plan comercial; el ciclo y profesionales se guardan en Subscription. El registro internacional mantiene su checkout existente y no recibe este bundle CLP.

Con NO-GO no se inicia Website ni se presenta un botón habilitado «Contratar Puragenda + Sitio Web». El trial secundario conserva la selección y habilita solo la prueba de 30 días de BASE. No hay cargo o entitlement de Website automático.

## Persistencia y secuencia BASE → WEBSITE

`WebsitePurchaseIntent` es una entidad operacional, PK/FK `businessId`, borrado en cascada y RLS. No guarda PII, importe, precio Founder ni entitlement. `selectedAt` persiste una vez mediante upsert vacío; refrescar o volver del proveedor recupera el mismo registro. No depende de query/localStorage ni de analytics/WebsiteCommercialEvent.

La continuación privada está en **`/onboarding/website`**, con sesión y propietario verificados, fuera del PaymentWall: un pago pendiente puede mostrar estado y comprobar la suscripción. No es una landing SEO y tiene noindex/nofollow. Dashboard Website y PaymentWall enlazan a la continuación cuando corresponde.

1. Registrar cuenta/negocio y selección, o guardar selección desde Pricing autenticado mediante POST con same-origin y owner check. El cliente no elige un businessId.
2. BASE crea su propia PreApproval. Plan, profesionales y ciclo del bundle se leen de Subscription persistida; manipular plan TEST/extras/amount no modifica el cargo. Retorno: `/onboarding/website`.
3. Mostrar «Estamos confirmando tu suscripción Puragenda» mientras está pendiente. «Comprobar suscripción» usa el verificador existente; ninguna query de retorno cambia Subscription.
4. BASE debe estar ACTIVE, no-trial y con currentPeriodEnd futuro. PAST_DUE, incluso durante grace, no habilita el segundo checkout del bundle nuevo. Trial no basta.
5. El cliente pulsa explícitamente «Continuar con Sitio Web». Se reutiliza el checkout Website existente y sus operaciones; la comprobación BASE/flag se repite **dentro del lock Business** antes de crear la operación MP.
6. Website permanece INACTIVE hasta invoice/payment verificados. Authorized o retorno de navegador no conceden acceso. Los handlers, ledger, firma y política de publicación existentes siguen siendo autoridad.

Pricing autenticado no modifica la elegibilidad: Website activo dirige a administrar; PAST_DUE dirige a recuperar el contrato existente; sin complemento dirige a los pasos con la suscripción real del negocio. Founder conserva catálogo/oferta. Las dos suscripciones, dunning y cancelaciones siguen independientes. Cancelar Website no toca BASE; cancelar BASE afecta visibilidad por la política previa.

Con adquisición pública **OFF**, Pricing autenticado muestra «Ir a Sitio Web» y navega directamente a `/dashboard/website`, sin POST ni nuevo intent. El endpoint también devuelve ese destino seguro sin escribir, borrar o modificar intents, ofertas, add-ons ni Subscription. Así, una selección informativa no transforma una cuenta existente en un bundle restringido por el flag público. El checkout interno sigue sujeto a su flag y política existentes. Con adquisición pública **ON**, el CTA dice «Continuar con Sitio Web» y puede persistir intent; el onboarding usa exclusivamente la Subscription vigente. Pricing avisa a usuarios autenticados que los cambios de plan se gestionan desde su suscripción: elegir visualmente Equipo nunca cambia una cuenta Individual.

El flag público controla nueva adquisición, no el lifecycle de un contrato. `hasExistingWebsiteBillingLifecycle()` reconoce evidencia persistida: ACTIVE/PAST_DUE, IDs de acuerdo MP/suscripción Paddle/transacción de checkout, período pagado/cancelación, u operación CREATING/UNKNOWN/PENDING/AUTHORIZED. No concede entitlement ni cambia fechas/precios. Un intent solo, un INACTIVE vacío o una operación cancelada sin acuerdo no bastan. Dashboard y el guard Website dentro del lock Business usan la misma distinción: PAST_DUE con intent conserva recovery al apagar el flag; un acuerdo pendiente se revisa/cancela sin duplicarlo; UNKNOWN conserva la conciliación y nunca crea otra operación. Las políticas de BASE, el flag de checkout interno, verificación de pago y controles de cada proveedor siguen aplicándose. Pricing y el endpoint OFF permanecen como en la corrección anterior.

## Idempotencia y resultados inciertos

BASE del bundle usa el mismo registro de intent como claim operacional: `baseOperationKey`, `baseState`, `baseProviderId`, `baseCheckoutUrl`. Business FOR UPDATE serializa la transición NONE → CREATING **antes** de contactar MP. Otros clicks no crean una segunda PreApproval. PENDING reutiliza el acuerdo verificado/URL; no modifica Subscription. Una respuesta incierta pasa a UNKNOWN y bloquea reintentos nuevos. `external_reference=base-bundle:<operationKey>` permite conciliación por el operador sin asumir una garantía de idempotencia del proveedor.

No hay TTL que libere una operación incierta automáticamente. Para sustituir un acuerdo conocido, primero se verifica que MP lo haya cancelado. En CREATING/UNKNOWN la UI muestra confirmación pendiente; si persiste, soporte debe consultar MP y conciliar el ID/estado antes de habilitar un nuevo intento. No borrar el claim ni crear un segundo cobro a ciegas. Website conserva su propio WebsiteCheckoutOperation y su política UNKNOWN/PENDING. Las referencias de BASE y WEBSITE están separadas.

`baseActivatedAt` registra una sola observación de BASE pagada desde el estado persistido. Es información operacional, no concede acceso. No depende de recibir analytics.

## Analytics con consentimiento

| Etapa | Medición |
| --- | --- |
| Pricing visto | page_view existente, page_type=pricing |
| Seleccionar/deseleccionar Website | website_addon_toggled: selected boolean, plan, billing_cycle |
| Elegir BASE/bundle | pricing_plan_selected existente + website_intent boolean |
| Registro iniciado/completado | Eventos existentes + website_intent boolean |
| BASE checkout nuevo | checkout_started existente + website_intent; reutilizar checkout no vuelve a emitir desde continuación |
| BASE activada | base_subscription_activated al primer baseActivatedAt observado; actualización condicional evita duplicar con reload |
| Continuación explícita | website_purchase_continued: plan, billing_cycle |
| Website checkout/activación | WebsiteCommercialEvent existente, standard/beta_checkout_started y standard/beta_activated, una vez por operación/evento verificado |

No se añaden eventos duplicados para un mismo significado ni se usa tracking como autoridad. Props nuevas: booleanos y enums permitidos. El funnel comercial elimina referrer/UTM/businessSlug de su payload y evita enviar el origen en `$current_url`. No envía email, businessId, hostname/domain ni tokens en props. El tracking de navegador sigue sujeto a consentimiento; puede faltar si se rechaza. Activaciones verificadas y abandono se pueden medir con la entidad operacional y el ledger Website, agregando en servidor sin exportar IDs de negocio al navegador.

Para conversión Individual vs Equipo: pricing_plan_selected/website_addon_toggled → registration_started/checkout_started; en datos internos relacionar intent y Subscription.plan con las operaciones/eventos Website. Separar intent/click de checkout realmente creado; no sumar el mismo evento de distintos almacenes.

## SEO y protección

Pricing mantiene canonical `/pricing`, actualiza description/title y FAQ visible/schema con facturación/dominio/trial exactos. SoftwareApplication conserva **solo los offers BASE**; no fuerza el complemento como incluido. Sitemap no incorpora onboarding ni cambia URLs. No hay AggregateRating/Review añadido, nueva landing SEO, cambio GSC ni cambio de las 10 páginas Batch 01/hubs/spokes.

Baseline original de 206 archivos sin sobrescribir: 205 byte-identical; el componente **exclusivo de Home** tiene las dos inserciones autorizadas (prop + slot). El test y `node scripts/seo-expansion-baseline.mjs --website-public-pricing` normalizan únicamente esas dos cadenas exactas y verifican todos los bytes originales restantes. El modo original sin esa opción señala esa modificación de Home; no se afirma que su hash sea idéntico. Los contenidos/canonicals/metadata de Batch 01 siguen cubiertos por su suite.

## Verificación y QA

Comandos locales, sin credenciales de proveedores reales:

```powershell
$env:WEBSITE_PUBLIC_TEST_DATABASE_URL='postgresql://websiteqa@127.0.0.1:55439/websiteqa'
$env:WEBSITE_BILLING_TEST_DATABASE_URL=$env:WEBSITE_PUBLIC_TEST_DATABASE_URL
npm test -- --maxWorkers=4
npm run lint
npm run typecheck
node scripts/dev-website-public-pricing.mjs --build --off
node scripts/test-website-public-pricing-migration.mjs
node scripts/seo-expansion-baseline.mjs --website-public-pricing
git diff --check
```

La nueva migración se aplica a un schema limpio del main auditado en una DB descartable: cero drift Prisma, FK/check y RLS comprobados. Integración real con PostgreSQL local: refresh, aislamiento, owner/country, concurrencia, UNKNOWN, gate OFF, BASE pendiente/morosa y dos operaciones independientes. Contrato MP mock: cargo anual BASE, extras persistidos, rechazo de payload TEST/amount, reutilización y ambigüedad. La suite Website previa conserva pruebas de pago verificado, rechazo/duplicados, Founder y cancelación independiente.

`scripts/dev-website-public-pricing.mjs` usa exclusivamente 127.0.0.1:55439/websiteqa; desactiva correo/domains/media reales y sustituye ambos proveedores por simuladores locales. `--off` prueba el bloqueo público. No debe usarse como configuración de deployment. Para el QA de navegador, iniciar ese servidor y ejecutar `scripts/qa-website-public-pricing.mjs` con Playwright instalado o `WEBSITE_QA_PLAYWRIGHT_MODULE` apuntando al módulo del runtime local.

QA A–L: Individual, Individual+Website, Equipo+Website, extras, anual, registro/BASE/Website, usuarios existentes, Website activo, Founder, Website PAST_DUE, BASE PAST_DUE, concurrencia/reload y mobile. Capturas Home/Pricing/Registro en **1440/390/360**, sin overflow horizontal. Evidencia: `artifacts/website-commercial/qa-report.json`, PNGs y logs locales de checks. Pagos/endpoints oficiales reales no ejecutados; un PASS SIMULATED no equivale a GO financiero.

Regresiones del acceso público autenticado: `scripts/qa-website-public-access.mjs --off` contra el helper local OFF, y sin ese argumento contra el helper local ON. Comprueban ausencia de POST desde Pricing OFF, respuesta directa del endpoint, conservación exacta de intent/BASE/Founder/add-on, disponibilidad del checkout/recovery interno previo, trial anónimo, copy contextual y plan Individual real al pulsar Equipo. Ambos modos cubren 1440/390/360 y no crean operaciones de pago. La integración PostgreSQL también ejercita el endpoint y los props del onboarding con la Subscription real. La migración y las políticas de billing permanecen intactas.

La matriz combinada agrega contratos con intent y flag OFF: PAST_DUE, ACTIVE, pending, authorized, UNKNOWN y Founder; contrasta intent solo e INACTIVE vacío. En navegador se abre el panel de billing y se observa `REGULARIZAR MI PAGO` habilitado. Pulsar la operación UNKNOWN muestra conciliación; el número de acuerdos/operaciones y los datos del intent no cambian. Las operaciones de las fixtures son exclusivamente locales y simuladas. Las integraciones comprueban además reutilización y cancelación de la solicitud pendiente, precio Founder, contrato Paddle existente sin crear uno MP paralelo, ON → OFF y conservación del checkout interno sin intent.

## Pendientes externos y orden seguro

1. Disponer de vendedor/comprador oficiales MP Chile y Preview con DB y credenciales de test aisladas; actualmente no disponibles bajo esta auditoría.
2. Completar y conservar evidencia de débito diferido exacto, rechazo/replay/cancelación/recovery y separación BASE/Website, sin modificar contratos de clientes reales. Validar la periodicidad anual contra MP test.
3. Backup recuperable y aplicar `20261003220000_website_purchase_intent` con el SHA aprobado antes de desplegar código que consulta la tabla. Esta tarea no migra producción.
4. Smoke del deployment aprobado: checkout/retorno/webhook, uploads, hosting/TLS/subdominio y conexión de dominio autorizada. No repetir snapshots existentes ni cambiar su fecha.
5. Registrar GO operativo y habilitar el nuevo flag público de forma explícita mediante un deployment aprobado que incorpore esa configuración. Mientras tanto, **NO-GO público** y CTA de Website bloqueado.

## Resultado final de verificación local

| Check | Resultado |
| --- | --- |
| Suite completa, con integraciones Website habilitadas sobre PostgreSQL local | **1.214 tests passed, 21 skipped**; 188 archivos passed y 2 skipped; cero fallos |
| Lifecycle, Public Pricing, WebsitePurchaseIntent y checkout bundle | PASS: 65 tests, incluida la matriz combinada de contrato/operación + intent + flag OFF y el contraste ON → OFF |
| Suite Website/Mercado Pago | PASS: 269 tests en 27 archivos |
| Batch 01 y suite SEO | PASS dentro de la suite completa; 41 tests Batch 01 |
| Lint | PASS: cero errores, 33 warnings |
| Typecheck | PASS |
| Build de producción con adquisición pública OFF | PASS: 147/147 páginas generadas |
| Migración desde el schema del main auditado | PASS: cero drift Prisma; FK, check y RLS presentes |
| QA A–L con proveedores simulados | PASS; registro real local, persistencia, BASE primero, reutilización al recargar y segundo checkout explícito |
| Home/Pricing/Registro en 1440, 390 y 360 | PASS: nueve capturas, sin overflow horizontal |
| Pricing OFF sobre el build de producción, en los tres anchos | PASS: CTA de contratación bloqueado, title con una marca y canonical idéntico |
| Regresión Pricing y lifecycle autenticado OFF/ON en 1440/390/360 | PASS: 39 comprobaciones OFF y 3 ON; PAST_DUE + intent con recovery habilitado, pending/authorized sin duplicados, UNKNOWN con conciliación y nueva adquisición Standard bloqueada OFF |
| Baseline con excepción exacta de inserción comercial Home | PASS: 205 archivos idénticos y todos los bytes originales del componente Home preservados |
| Diff de las rutas y datos SEO protegidos respecto de main | Vacío |
| git diff --check | PASS |

Logs y capturas locales en `artifacts/website-commercial/`, ignorados por Git. Las 21 pruebas skipped no se presentan como aprobadas. El QA financiero externo sigue NOT_RUN: estos resultados no cierran el NO-GO de Mercado Pago ni autorizan un lanzamiento público.

## Archivos de este cambio

41 archivos respecto de main: 23 modificados y 18 nuevos, incluidos los scripts y regresiones de acceso/lifecycle añadidos después de la implementación inicial de 38 archivos. La lista incluye exclusivamente implementación, migración, documentación y validación de este frente comercial.

```text
docs/websites/PRODUCTION-READINESS.md
docs/websites/PUBLIC-COMMERCIAL-LAUNCH.md
docs/websites/RELEASE-RUNBOOK.md
prisma/schema.prisma
prisma/migrations/20261003220000_website_purchase_intent/migration.sql
scripts/dev-website-public-pricing.mjs
scripts/qa-website-public-access.mjs
scripts/qa-website-public-pricing.mjs
scripts/seo-expansion-baseline.mjs
scripts/test-website-public-pricing-migration.mjs
src/app/api/auth/register/route.ts
src/app/api/billing/subscribe/route.ts
src/app/api/dev/payment-simulator/route.ts
src/app/api/websites/purchase-intent/route.ts
src/app/dashboard/layout.tsx
src/app/dashboard/website/page.tsx
src/app/onboarding/website/page.tsx
src/app/onboarding/website/purchase-flow.tsx
src/app/page.tsx
src/app/pricing/page.tsx
src/app/register/page.tsx
src/app/register/register-form.tsx
src/components/landing/ThemeNeoBrutalism.tsx
src/components/pricing-cards.tsx
src/components/pricing-page-sections.tsx
src/components/website-commercial-section.tsx
src/lib/analytics/client.ts
src/lib/analytics/events.ts
src/server/services/auth.service.ts
src/server/validations/auth.ts
src/server/websites/mercadopago-billing.ts
src/server/websites/public-acquisition.ts
src/server/websites/purchase-intent.ts
src/websites/billing-lifecycle.ts
src/websites/commercial.ts
tests/seo-expansion-batch-01.test.ts
tests/server/local-payment-simulator.route.test.ts
tests/server/website-billing-lifecycle.test.ts
tests/server/website-purchase-checkout.route.test.ts
tests/server/website-purchase-intent.integration.test.ts
tests/website-public-pricing.test.ts
```
