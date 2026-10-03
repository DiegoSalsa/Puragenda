# Expansión SEO — tanda 01

Fecha: **2026-10-03**, America/Santiago. Rama: **`seo/expansion-batch-01`**.

Base: `main`, commit **`582896455102b8bc79a02126ec1008e6f50cb81a`** (`merge: release websites feature`). Implementación en el worktree aislado `C:/Users/diego/.codex/worktrees/seo-expansion-batch-01/agenda`. El diff inicial de este worktree estaba vacío. No se hizo merge, push, deploy, modificación de DNS/GSC ni solicitud de indexación.

El checkout original `C:/Users/diego/Desktop/agenda`, en `webs` (`5e7a333a28df90a187f355a174a3241cd07644f7`), se conservó con sus cambios previos. No se utilizó contenido de esa rama como prueba de disponibilidad. La tanda describe el widget embebible existente; no incorpora landings del producto Website.

Se revisaron la arquitectura SEO, sitemap, funciones, guías, landings comerciales, componentes, analytics, tests y ambos documentos de baseline/priorización vertical antes de implementar. El baseline fija D+28 para 2026-10-02; esta implementación no añade mediciones de rendimiento D+28 ni infiere resultados de GSC.

## Intención y contenido propio

Todas las rutas de las tablas corresponden al origen canónico `https://www.puragenda.cl`. Estado de las diez: construidas en la rama, comprobadas localmente y listas para revisión; aún no publicadas por este trabajo.

| URL | Intención propietaria / keywords orientativas | Contenido diferencial | Enlaces relacionados principales |
| --- | --- | --- | --- |
| `/funciones/recordatorios-citas-email` | Recordatorios de citas; recordatorios automáticos de citas; recordatorio de hora por email | Ejecución diaria, selección de mañana por zona horaria, estados excluidos, reservas tardías y límites de entrega | `/guias/reducir-inasistencias-reservas`, `/sistema-de-agendamiento-online`, `/funciones/reservas-online-con-abono` |
| `/funciones/reservas-sin-cuenta` | Reservas sin registro; agenda online sin crear cuenta; clientes reservan sin app | Formulario de contacto sin contraseña, recorrido de invitado, registro posterior opcional y excepción de Gift Cards | `/sistema-de-agendamiento-online`, `/funciones/widget-reservas-web`, `/guias/dejar-de-agendar-por-whatsapp` |
| `/funciones/widget-reservas-web` | Widget de reservas para página web; insertar agenda; agenda iframe web | Código iframe para un sitio existente, personalización real y catálogo/disponibilidad del negocio | `/funciones/reservas-sin-cuenta`, `/caracteristicas`, `/register?trial=1`, `/demo` |
| `/funciones/agenda-multiples-sucursales` | Agenda para varias sucursales; reservas múltiples locales; agenda multi sucursal | Ubicaciones, servicios, profesionales y jornadas; comprobación del selector de sucursal | `/funciones/agenda-multiples-profesionales`, `/sistema-de-agendamiento-online`, `/guias/organizar-agenda-varios-profesionales` |
| `/funciones/gift-cards` | Gift cards para negocios; gift cards para salón; vender gift cards online | Monto/servicios, emisión manual, requisitos de venta online, destinatario/mensaje, código y canje con cuenta | `/caracteristicas`, `/sistema-de-agendamiento-online`, `/funciones/reservas-sin-cuenta` |
| `/guias/dejar-de-agendar-por-whatsapp` | Cómo dejar de agendar por WhatsApp; organizar reservas sin WhatsApp; automatizar agenda clientes | Transición gradual desde coordinación manual: disponibilidad, contexto y conversaciones; WhatsApp sigue siendo canal de comunicación | `/sistema-de-agendamiento-online`, `/funciones/reservas-sin-cuenta`, `/funciones/recordatorios-citas-email` |
| `/guias/google-calendar-vs-sistema-reservas` | Google Calendar vs sistema de reservas; Google Calendar para agendar clientes | Decidir entre calendario y operación de reservas, reconocer appointment schedules e integración complementaria | `/funciones/agenda-google-calendar`, `/sistema-de-agendamiento-online`, `/funciones/reservas-online-con-abono` |
| `/guias/organizar-agenda-varios-profesionales` | Cómo organizar agenda de varios profesionales; agenda para equipo; evitar choques de horarios empleados | Matriz servicio/persona/jornada, descansos, ausencias, permisos, pruebas y mantenimiento operativo | `/funciones/agenda-multiples-profesionales`, `/funciones/agenda-multiples-sucursales`, `/sistema-de-agendamiento-online` |
| `/alternativa-calendly` | Alternativa a Calendly para negocios de servicios presenciales | Evaluar catálogo, profesionales, abonos y operación del local frente a programación de reuniones, sin ganador universal | `/sistema-de-agendamiento-online`, `/funciones/agenda-multiples-profesionales`, `/funciones/reservas-online-con-abono`, `/pricing`, `/demo` |
| `/alternativa-fresha` | Alternativa a Fresha; alternativa Fresha Chile | Recorrido de evaluación para salón: especialidades, sucursales, widget, abonos y Gift Cards; condiciones locales por verificar | `/sistema-de-agendamiento-online`, `/funciones/gift-cards`, `/funciones/agenda-multiples-sucursales`, `/pricing`, `/demo` |

H1, title, description, respuesta directa, narrativa, ejemplos, FAQ y CTA son propios. La guía de equipo explica organización; la función existente explica capacidad del producto. Los ejemplos de recordatorios, iframe, canje, sucursales y transición de chat no funcionan mediante simple sustitución de keywords. Comparten únicamente estructura visual y componentes. El texto visible va de 825 a 1.174 palabras por página; el conteo es una comprobación descriptiva, no un objetivo editorial ni prueba de calidad por sí solo. Las ilustraciones indican que son representaciones del flujo, sin presentarse como capturas de clientes.

## Claims verificadas y límites

Las siguientes fuentes pertenecen al código activo de la base, no a backups. Las líneas son referencias de la versión revisada; los archivos de producto no se modificaron.

| Capacidad publicada | Evidencia interna | Alcance y límite reflejado en el contenido |
| --- | --- | --- |
| Recordatorio por email | `vercel.json:14`; `src/app/api/cron/reminders/route.ts:25`; `src/lib/date.ts:108` | Cron `0 14 * * *`: 14:00 UTC. Selecciona citas de mañana en la zona del negocio con `reminderSent: false`, excluyendo CANCELLED, CHECKED_IN, COMPLETED y NO_SHOW. No es exactamente 24 horas antes. Una reserva para mañana creada después de la ejecución puede quedar sin ese aviso. No se promete WhatsApp/SMS ni reducción garantizada de inasistencias. |
| Contenido/acciones del email | `src/app/api/cron/reminders/route.ts:70`; `src/server/services/customer-appointment-action.service.ts` | Información de la cita y enlaces de acciones sujetos a configuración/reglas. La marca de enviado depende de aceptación del proveedor; no garantiza bandeja de entrada. |
| Reserva ordinaria sin cuenta | `src/app/widget/[slug]/widget-client.tsx:896`; `src/app/api/business/[slug]/book/route.ts:245`; `src/server/validations/booking.ts` | El navegador envía datos de contacto y selección al endpoint público sin contraseña. El registro posterior es opcional (`widget-client.tsx:975`). Cuenta y app no son requisitos de la reserva ordinaria. |
| Excepción de Gift Cards | `src/app/api/business/[slug]/book/route.ts:387`; `src/server/services/gift-card.service.ts:202` y `:219` | Reclamar la tarjeta y canjearla en la reserva requiere cuenta del portal del cliente. No se extiende el claim de invitado a ese flujo. |
| Widget/iframe | `src/app/dashboard/settings/page.tsx:73`, `:341`, `:368`; `src/app/widget/[slug]/page.tsx:198`; `src/app/dashboard/appearance/appearance-form.tsx:225` | Código embebible, colores, tamaño de texto, esquinas, sombra y alineación disponibles. Catálogo y disponibilidad del mismo negocio. No se promete un constructor de sitio completo ni selección de familias tipográficas. |
| Sucursales | `src/server/services/location.service.ts:60`, `:96`, `:142`; `src/server/booking/read.service.ts`; `src/app/widget/[slug]/widget-client.tsx:293`, `:404`, `:475`, `:1376` | Ubicaciones y asociaciones de profesionales/servicios, horarios y selección según configuración. El parámetro público de ubicación puede contextualizar el widget. No se añade reporting consolidado, stock, caja por local ni cálculo de traslados. |
| Gift Cards por monto/servicios | `src/core/gift-cards.ts`; `src/server/validations/gift-card.ts`; `src/server/services/gift-card.service.ts:113`, `:171`, `:196` | BALANCE/SERVICE, emisión desde venta manual, destinatario/mensaje, código y gestión. Registrar una transferencia como pagada no significa que Puragenda procese automáticamente esa transferencia. |
| Gift Cards online | `src/app/api/business/[slug]/gift-cards/checkout/route.ts:29`; `src/app/api/webhooks/gift-cards/route.ts`; rutas dashboard de plantillas/manual/resend | Plantilla pública activa, acceso operativo, Mercado Pago habilitado y moneda compatible. Emisión tras pago aprobado. No se inventan integraciones o condiciones comerciales. |
| Profesionales y permisos | `src/core/booking-availability.ts`; `src/server/booking/read.service.ts`; `src/server/services/dashboard-availability.service.ts`; `src/core/permissions.ts` | Elegibilidad por servicio/persona, jornadas, descansos y bloqueos; permisos del panel. No se confunde disponibilidad de una persona con reserva automática de una cabina/equipo físico compartido. |
| Abonos | `src/app/api/business/[slug]/book/route.ts:686`, `:727`, `:1086`; `src/server/services/deposit.service.ts`; tests de depósitos existentes | Dependen de configuración, servicio y método habilitado. No se publican tarifas, conciliación universal ni devoluciones automáticas. |
| Google Calendar | `src/server/services/google-calendar.service.ts:549`, `:572`, `:721`, `:747`; `src/server/services/appointment.service.ts` | Crea/actualiza eventos de citas, retira el evento mapeado cuando corresponde y consulta intervalos ocupados del calendario conectado. No promete edición completa en ambas direcciones ni actualización instantánea garantizada. |
| Cancelación/reprogramación | `src/server/services/customer-appointment-action.service.ts`; `src/app/api/client-portal/appointments/[appointmentId]/cancel/route.ts:25`; `src/app/api/client-portal/appointments/[appointmentId]/reschedule/route.ts:25` | Acciones sujetas a permisos/configuración, estado, anticipación y restricciones de abonos. No se promete que cualquier cita puede cambiarse ni reembolso automático. |

## Fuentes externas

Consulta **2026-10-03**. Las referencias también son visibles en las páginas correspondientes; las filas comparativas enlazan a su evidencia.

- [Calendly — Scheduling](https://calendly.com/scheduling): programación, disponibilidad/calendarios, equipos y distribución de reuniones. No se inventa que Calendly solo sirve a una persona. No se comparan sus precios, límites de planes ni disponibilidad local de funciones.
- [Fresha — For business](https://www.fresha.com/for-business): orientación a belleza/bienestar y descripción de agenda, equipo/locales, pagos y marketplace. No se trasladan condiciones globales a Chile ni se comparan tarifas, comisiones o políticas.
- [Google Calendar — crear una programación de citas](https://support.google.com/calendar/answer/10729749?hl=es): appointment schedules y condiciones de acceso según cuenta. Se reconoce esta capacidad; no se reduce Calendar a eventos manuales.

Se usó redacción propia, sin copiar descripciones ni atribuir intenciones al competidor. Se explica que el contenido lo publica Puragenda y no existe afiliación con los proveedores comparados. Las dimensiones no verificadas se omiten o se remiten al proveedor. La elección depende del recorrido del negocio.

## Arquitectura

1. **Funciones:** `FeatureSolution` se extiende con `detail` opcional. La colección original `featureSolutions` conserva sus tres entradas y su contenido para mantener `/soluciones`. `getAllFeatureSolutions()` reúne las originales y las cinco nuevas para lookup, rutas estáticas y sitemap. `ExpansionFeaturePage` se aplica únicamente a los nuevos detalles. Las cinco ilustraciones tienen composición específica: email, pasos de invitado, iframe, sucursales y tarjeta.
2. **Guías:** el sistema `guides` incorpora tres entradas con `GuideDetail`. `ExpansionGuidePage` usa encabezado editorial, autor/fecha, respuesta directa antes del índice, lectura larga, ejemplos y CTA contextual. Las entradas previas conservan contenido y renderer.
3. **Alternativas:** `AlternativePage` y `AlternativeLandingPage` separan datos revisados y presentación. Dos rutas explícitas consumen dos entradas. El modelo puede representar Booksy, Reservio, SimplyBook.me y AgendaPro, pero no contiene ni genera esas páginas. La ruta manual existente de AgendaPro permanece igual.
4. **Comunes nuevos:** FAQ, fuentes y enlaces relacionados viven en `expansion-content.tsx`. `seo-expansion.ts` contiene helpers separados de metadata/schema. No fue necesario modificar componentes reutilizables existentes usados por el experimento.
5. **Registro editorial:** `seoExpansionPages` contiene exactamente diez rutas y sus IDs/intenciones. Es una clasificación explícita, no un generador de páginas por keywords.

Se reutilizan el design system `seo`, botones, iconos y `ProductFrame`. No se añaden stock imagery, testimonios, ratings ni métricas inventadas. No se modificaron dependencias o archivos de configuración para esta tanda.

## Interlinking y descubrimiento

Las páginas nuevas enlazan a soluciones y funciones pertinentes, entre sí y a demo/pricing/registro según intención. `/guias` incorpora las tres tarjetas editoriales y un bloque de recursos con enlaces a las cinco funciones y las dos alternativas. Así, las diez reciben entrada desde un hub público existente sin alterar `/soluciones`, navegación/footer compartidos o hubs/spokes congelados.

Los destinos críticos se validan en tests y en el navegador. No se añadieron enlaces desde las páginas verticales protegidas. Las breadcrumbs tienen destino real: Inicio, Características o Guías, página actual.

## Analytics

Batch: **`seo-expansion-2026-10-b01`**. Clusters: `feature`, `guide`, `alternative`. Se agregan `seo_content_id`, `seo_cluster`, `seo_batch`, `seo_intent` a los eventos existentes `page_view` y `landing_cta_clicked` cuando el pathname actual coincide exactamente con una ruta del registro. Los eventos conservan nombre y propiedades previas. La clasificación acompaña los page views/CTAs de first-party y PostHog, y el mapeo existente de CTA a GA4 `sign_up_cta_clicked`.

La whitelist solo acepta valores editoriales conocidos. No obtiene IDs de clientes, emails, teléfonos, tokens o query strings. Se conserva el consentimiento y la normalización de rutas privadas. Las dos alternativas se incluyen en la taxonomía de rutas públicas de GA; los slugs arbitrarios siguen protegidos.

**Límite:** GA4 envía page views desde su instrumentación separada y no añade allí estos cuatro campos. Sus URLs públicas siguen permitiendo segmentar la tanda. El first-touch existente generaliza `/funciones/[slug]` y `/guias/[slug]`; no se diseñó una persistencia de cohorte hasta `registration_completed`/checkout. La atribución de conversión completa, y si interesa registrar dimensiones personalizadas en GA4, queda como trabajo posterior autorizado por separado. No se cambió ninguna cuenta externa.

El QA acepta consentimiento en el navegador de prueba, intercepta `/api/analytics/track` y comprueba un `page_view` y un CTA con los cuatro campos. No guarda esos eventos en la base ni llama a proveedores. Los tests verifican sanitización, taxonomía y mapeo GA4.

## SEO, schemas y sitemap

- Diez canonicals propios bajo `https://www.puragenda.cl`; metadata `index, follow`, title absoluto sin duplicar marca, description propia, OG con URL correcta y H1 único.
- Funciones y alternativas: `WebPage`, `BreadcrumbList` y `FAQPage`. Guías: `Article`, `BreadcrumbList` y `FAQPage`; autor/fecha visibles. FAQ deriva de los mismos datos que el contenido y coincide exactamente en el DOM renderizado. No se agrega Review/AggregateRating ni ofertas sin evidencia. Schema no implica elegibilidad garantizada para resultados enriquecidos.
- El sitemap local contiene **44 URLs** en esta configuración: cada nueva URL una vez. Conserva prioridades, fechas y frecuencias previas; adopta los valores ya usados por su tipo. `lastModified` de nuevas entradas: 2026-10-03 con offset de Chile `-03:00`. No se modificó robots ni políticas de indexación globales. La cifra puede variar con la configuración futura de marketplace.
- “Indexable” significa que las directivas técnicas locales lo permiten; no afirma publicación, rastreo o inclusión en Google.

## Validación ejecutada

| Check | Resultado exacto |
| --- | --- |
| Tests nuevos de tanda | **38 aprobados** |
| Suite relevante SEO/analytics/landings | **15 archivos, 148 pruebas aprobadas**, 0 omitidas |
| Suite completa | **183 archivos aprobados, 3 omitidos; 1.116 pruebas aprobadas, 51 omitidas**, 0 fallidas |
| `npm run lint` | Exit 0; **0 errores, 33 warnings existentes** |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; las diez rutas presentes en salida estática/SSG de producción |
| `git diff --check` | Exit 0 |
| Baseline de archivos | **206 hashes SHA-256 sin cambios** |
| Render del experimento | **11 snapshots coincidentes**: diez verticales y `/soluciones` |
| QA navegador producción | **30 verificaciones**: diez páginas × 1440/390/360 px; HTTP 200, metadata, H1, FAQ/schema, enlaces y overflow; sitemap y descubrimiento aprobados |
| Cohorte en navegador | `page_view` y `landing_cta_clicked` aprobados con consentimiento, request interceptado |

Las tres suites omitidas son opt-in: depósitos PostgreSQL (`TEST_DATABASE_URL`), booking API (`PURAGENDA_BOOKING_TEST_DATABASE_URL`) y Website Mercado Pago (`WEBSITE_BILLING_TEST_DATABASE_URL`). No se omitió ninguna prueba SEO. Vite emite un aviso previo sobre config ESM cargada como CommonJS. Lint mantiene warnings de archivos ajenos a esta implementación; no se modificaron para ampliar el alcance.

El build primero detectó un tipo demasiado amplio en el clasificador; se corrigió su retorno a `Record<string, string>`. Luego el prerender existente de marketplace necesitó configuración de base de datos. Se creó una **base PostgreSQL local nueva y vacía**, `puragenda_seo_expansion_b01_20261003`, en 127.0.0.1:5432, verificando que no existía; `prisma db push` se aplicó únicamente a esa base. El build y servidor de QA usan `DATABASE_URL`/`DIRECT_URL` temporales del proceso, sin copiar secretos, añadir `.env` al repositorio ni tocar datos reales. La base no se seedió. No hubo pagos ni envío real de email en esta validación.

Logs y capturas locales en `artifacts/seo-expansion-b01/` (ignorados por Git): `tests-seo.log`, `tests-full.log`, `lint.log`, `typecheck.log`, `build.log`, `db-qa-setup.log`, `qa-production.log`, `qa-results.json`, snapshots y PNG. Los scripts y las pruebas sí quedan versionados.

### Reproducción

Desde el worktree, con dependencias instaladas:

```powershell
node scripts/seo-expansion-baseline.mjs
npm run lint
npm run typecheck
npm run test -- tests/seo-expansion-batch-01.test.ts tests/seo.test.ts tests/seo-link-graph.test.ts tests/json-ld.test.ts tests/crawler-policy.test.ts tests/analytics-path.test.ts tests/analytics-events.test.ts tests/google-events.test.ts tests/google-analytics.test.ts tests/barbershop-software-landing.test.ts tests/salon-software-landing.test.ts tests/manicure-software-landing.test.ts tests/aesthetics-software-landing.test.ts tests/psychologists-software-landing.test.ts tests/scheduling-system-landing.test.ts
npm run test
# Configurar DATABASE_URL y DIRECT_URL para una base local aislada antes del build.
npm run build
git diff --check
```

Para render QA: arrancar ese build en 127.0.0.1:3107, configurar `SEO_QA_URL=http://127.0.0.1:3107` y `SEO_PLAYWRIGHT_MODULE` con una instalación de Playwright, y ejecutar `node scripts/qa-seo-expansion.mjs`. Se usó Chromium de Microsoft Edge (`channel: msedge`). El comparador requiere el snapshot `artifacts/seo-expansion-b01/frozen-before.json`, capturado **antes** de implementar mediante `--baseline`. Los hashes versionados sirven como prueba durable; el JSON con HTML completo queda como artefacto local. No recapturar la baseline final como sustituto de la inicial.

## QA visual

Revisión de las diez páginas en **1440, 390 y 360 px**, sobre build de producción. Capturas completas, hero, FAQ y CTA para cada combinación; tablas para ambas alternativas. Se revisaron seis hojas de contacto y detalles de comparativas/FAQ/CTAs.

- Funciones: distintas representaciones de producto, títulos con saltos legibles, CTAs que se acomodan al ancho y breadcrumbs intactas.
- Guías: composición editorial, párrafos legibles y respuesta directa antes del índice. El índice lateral de desktop pasa al flujo vertical en móvil.
- Alternativas: tabla en desktop y filas convertidas en tarjetas apiladas en móvil; columnas de texto ya no quedan comprimidas a pocas letras. Fuentes visibles y enlaces accesibles.
- FAQ y cierres: preguntas/respuestas completas, botones legibles y sin desbordes. Ninguna de las 30 páginas presenta overflow horizontal del documento o sus elementos de contenido.

Para capturas de detalle se oculta solo la navegación fija durante la captura, evitando que tape el primer renglón. Las capturas hero/completas conservan la navegación. El primer intento final por `localhost` se interrumpió por timeout de conexión; se repitió contra la dirección IPv4 explícita. Esto no requirió cambios de producto.

## Control del experimento

**Confirmación explícita: no se modificaron el contenido, metadata, H1, estructura, intención o enlaces principales de los diez hubs/spokes congelados. `/soluciones` conserva su selección y contenido.**

Antes de editar se capturó `expansion-batch-01-baseline.json`: base, rama, diff inicial vacío y 206 hashes de archivos relevantes. Los hashes normalizan CRLF/LF para evitar falsos cambios por checkout Windows. La verificación final confirma igualdad. También se comparan las colecciones originales de funciones y guías con `git show` de la base.

El navegador capturó las diez páginas verticales y `/soluciones` antes y después. Coinciden title, canonical, description, robots, JSON-LD, enlaces y HTML de `main`. La comparación normaliza únicamente comentarios de React y atributos de IDs generados de Base UI que cambian entre dev/producción; conserva contenido, elementos, clases y atributos escritos. **No es un hash de la respuesta HTTP completa ni oculta cambios editoriales.** `expansion-batch-01-render-proof.json` registra por URL los hashes iguales antes/después de estos snapshots normalizados.

Rutas protegidas: `/software-agenda-barberias`, `/software-agenda-peluquerias`, `/software-agenda-manicure`, `/software-agenda-estetica`, `/software-agenda-psicologos`, `/para/barberias`, `/para/peluquerias`, `/para/manicure`, `/para/estetica`, `/para/psicologos`. Ambos documentos históricos de baseline/prioridad también conservan sus hashes. No hubo modificaciones de componentes existentes del landing, CSS global, layout, navegación/footer, robots ni datos de industrias. La clasificación analytics solo asigna esta cohorte a las diez nuevas URLs.

## Archivos creados/modificados

**Modificados (10):**

```text
src/app/funciones/[slug]/page.tsx
src/app/guias/[slug]/page.tsx
src/app/guias/page.tsx
src/app/sitemap.ts
src/lib/analytics/client.ts
src/lib/analytics/events.ts
src/lib/analytics/google-events.ts
src/lib/analytics/path.ts
src/lib/data/feature-solutions.ts
src/lib/data/guides.ts
```

**Creados (17):**

```text
docs/seo/expansion-batch-01.md
docs/seo/expansion-batch-01-baseline.json
docs/seo/expansion-batch-01-render-proof.json
scripts/qa-seo-expansion.mjs
scripts/seo-expansion-baseline.mjs
src/app/alternativa-calendly/page.tsx
src/app/alternativa-fresha/page.tsx
src/components/landing/seo/alternative-page.tsx
src/components/landing/seo/expansion-content.tsx
src/components/landing/seo/expansion-feature-page.tsx
src/components/landing/seo/expansion-guide-page.tsx
src/lib/data/alternatives.ts
src/lib/data/expansion-features.ts
src/lib/data/expansion-guides.ts
src/lib/data/seo-expansion.ts
src/lib/seo-expansion.ts
tests/seo-expansion-batch-01.test.ts
```

## Riesgos, limitaciones y pendientes

1. Verificar código y documentación no equivale a ejecutar correos, OAuth Google Calendar, canjes o pagos de extremo a extremo en producción. Esta tanda no cambia esos servicios y no usa datos de clientes.
2. Las comparaciones son una fotografía de fuentes oficiales del 2026-10-03. Revalidarlas antes de futuras afirmaciones comerciales o cambios de condiciones; no hay monitor automático añadido.
3. La atribución completa desde cohorte hasta registro/checkout requiere diseño posterior. Esta entrega permite medir exposición y CTA consentidos y segmentar rutas públicas.
4. Indexabilidad técnica, fuentes y schema no garantizan ranking, tráfico, indexación o rich results. No se fabricó volumen de keywords ni resultados D+28. La evaluación futura debe usar datos reales después de una publicación autorizada.
5. No se ensayó la matriz de todos los navegadores; QA visual usa Edge/Chromium. No se añadieron promesas de accesibilidad o rendimiento medidas sin auditoría específica.
6. Los 33 warnings previos y las 51 pruebas opt-in omitidas se mantienen identificados. El build necesita una base accesible por páginas dinámicas existentes; se validó con una fixture vacía local.
7. El siguiente paso operativo, fuera de esta tarea, es revisión de rama y publicación solo cuando se autorice. No hay merge/deploy automático ni pendientes necesarios para cerrar esta implementación.

## Tabla final de estado

“Sí” en indexable se refiere al build local. “1 vez” en sitemap se comprobó tanto en datos como en XML. Tests incluye suite SEO y HTTP/render; mobile incluye 390/360 px, con desktop 1440 también aprobado.

| URL | Cluster | Intent | Estado | Indexable | Sitemap | Tests | QA mobile |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/funciones/recordatorios-citas-email` | feature | recordatorios-email | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
| `/funciones/reservas-sin-cuenta` | feature | reserva-sin-registro | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
| `/funciones/widget-reservas-web` | feature | widget-embebible | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
| `/funciones/agenda-multiples-sucursales` | feature | agenda-sucursales | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
| `/funciones/gift-cards` | feature | venta-canje-gift-cards | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
| `/guias/dejar-de-agendar-por-whatsapp` | guide | transicion-desde-chat | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
| `/guias/google-calendar-vs-sistema-reservas` | guide | calendario-vs-reservas | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
| `/guias/organizar-agenda-varios-profesionales` | guide | organizacion-equipo | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
| `/alternativa-calendly` | alternative | evaluacion-calendly | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
| `/alternativa-fresha` | alternative | evaluacion-fresha-chile | Lista para revisión | Sí | 1 vez | PASS | PASS 390/360 |
