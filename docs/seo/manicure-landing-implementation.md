# SEO-016 — Landing B2B de manicure

Fecha: 4 de septiembre de 2026. Alcance: `/software-agenda-manicure` y ajuste contextual de `/para/manicure`, con enlaces entrantes, sitemap y medición existentes. SEO-001 a SEO-015 permanecen cerradas. No se inicia SEO-017.

## 1. Verificación del producto y discrepancias

Se revisó implementación funcional, no se tomaron las landings anteriores como prueba. Esta verificación es de código y tests locales: no acredita el estado de credenciales externas ni configura negocios reales.

| Capacidad | Evidencia en el repositorio | Uso en la landing |
|---|---|---|
| Crear servicios, duración, precio y opciones | `src/server/validations/booking.ts`, `src/server/services/service.service.ts`, editor de `src/app/dashboard/services/services-client.tsx` | Catálogo propio, servicios separados con tiempos completos y opciones de precio sin cambio de duración. |
| Selección, precio y validación de reserva | `src/app/widget/[slug]/widget-client.tsx`, `src/app/api/business/[slug]/book/route.ts` | La clienta selecciona, el servidor valida los servicios/opciones y calcula el total. No se promete detección de técnica o retiro. |
| Duración y disponibilidad | `src/core/availability.ts`, selector del widget y validación de horarios del endpoint `book` | Un servicio de 90 minutos no cabe en un bloque de 60. El ejemplo editorial se comprueba con `buildSlots`, función real del producto. |
| Profesionales, servicios, jornadas y bloqueos | Filtro `canStaffPerformAllServices` del widget; endpoint `book`; `src/server/services/schedule-block.service.ts`; `src/core/subscription-plan.ts` | Equipo usa horarios por integrante; Individual usa el horario del negocio. No se promete asignación de competencias por opción. |
| Abonos Mercado Pago | `src/app/api/mercadopago/deposit-preference/route.ts`, `src/server/services/deposit.service.ts` | Requiere activar abonos, configurar monto y conectar Mercado Pago. No se efectuaron cobros ni cambios de cuenta. |
| Recordatorios email | `src/app/api/cron/reminders/route.ts` | Citas del día siguiente; sin prometer un envío exactamente 24 horas antes. Depende de cron/proveedor configurados. |
| Cancelar y reagendar | `src/app/api/appointments/manage/route.ts`, `src/server/actions/appointment.actions.ts`, `src/server/services/deposit.service.ts` | Enlaces habilitados/válidos, plazos y disponibilidad. Cita con abono aprobado requiere coordinación manual con el negocio. |
| Clientes e historial administrativo | `src/server/services/client.service.ts`, dashboard de clientes y citas | Consultar citas/servicios anteriores; no inferir necesidades del próximo mantenimiento. |
| Google Calendar | `src/server/services/google-calendar.service.ts` y pantalla de conexión | Se enlaza a la función existente; no se promete una modalidad de sincronización o videollamada. |
| Link, widget, iframe y marca | `src/app/dashboard/copy-widget-link.tsx`, `src/app/dashboard/settings/page.tsx`, `src/app/dashboard/appearance/appearance-form.tsx` | Enlace en Instagram, iframe en web, logo y colores. No app nativa. |
| Pricing y prueba | `src/core/constants.ts` | Individual/Equipo, límites y adicionales centrales; prueba de `TRIAL_DURATION_DAYS`. No se expone el plan Test. |

### Limitación funcional detectada antes de escribir

El widget suma `durationDelta` en `totalDuration` y el endpoint de reserva vuelve a sumar las opciones. Sin embargo, al generar los slots de **un solo servicio**, usa `selectedService?.duration` en lugar de la duración con opciones. No se verificó un recorrido coherente de punta a punta para una opción que añade minutos; podría mostrar un bloque con duración base y luego fallar la validación del servidor.

Se informó esta discrepancia durante el trabajo. **No se modificó el widget dentro de SEO-016.** La landing usa dos servicios independientes y opciones que conservan duración; recomienda publicar otro servicio cuando retiro/diseño añade tiempo. Esto evita convertir una posibilidad del modelo de datos en una promesa funcional. La restricción sobre abonos aprobados y la diferencia Individual/Equipo también fueron comunicadas antes de implementar.

## 2. Keyword e intención

- Principal: **software de agenda para manicure**.
- Cluster natural: agenda para manicuristas, sistema de reservas para manicure, agenda online para uñas, software para nail studio, programa para salón de uñas.
- Un solo hub: `/software-agenda-manicure`. No se crean aliases por sinónimo.
- Comprador B2B: manicurista o administración del estudio. No se dirige a búsquedas de locales cercanos o reserva de servicios por ciudad.

## 3. Arquitectura y diferenciación

Title: **Software de agenda para manicure y uñas**. H1: **Software de agenda para manicure y nail studios**.

El Server Component contiene hero, respuesta breve, problemas del rubro, catálogo ficticio tabulado, recorrido operativo, Individual/Equipo, abonos, Instagram/web, cambios/email/historial, comparación conceptual, precios centrales, ocho FAQ visibles y CTA.

La pregunta que estructura la página es «¿el retiro está incluido?». Se trabaja cómo esa respuesta cambia el servicio y bloque elegido. Otros contenidos propios: mantenimiento, diseño a evaluar antes de reservar, técnica por profesional y diferencia entre historial anterior y trabajo actual. Las opciones se presentan con el alcance realmente utilizable en este recorrido.

**Prueba editorial del 80%:** no bastaría sustituir «manicure» por «barbería». El catálogo con retiro, el acabado como opción sin cambio de duración, el mantenimiento y la selección de técnica perderían sentido. El contenido reutilizable corresponde a funciones transversales como planes y email, no al argumento principal. Es una evaluación editorial, no un porcentaje calculado de similitud.

## 4. Ejemplo ficticio

Rotulado **«Ejemplo de configuración»** y **«Catálogo ficticio»**, con advertencia de que no son tarifas recomendadas ni datos de un cliente:

| Servicio ficticio | Duración | Precio ficticio | Profesional |
|---|---:|---:|---|
| Esmaltado permanente | 60 min | $18.000 CLP | A o B |
| Esmaltado permanente con retiro | 90 min | $23.000 CLP | B |

Con B libre de 10:00 a 11:00 y otra cita después, cabe el primero y no el segundo. El test verifica el resultado con el cálculo de slots real. No se crearon servicios, profesionales, clientes o reservas en ninguna base de datos. Los precios de esta tabla son datos editoriales ficticios; las suscripciones se obtienen de la fuente central.

## 5. Spoke y fronteras

`/para/manicure` cambia a title **Puragenda para manicuristas y nail studios** y H1 **Así organiza sus citas un nail studio con Puragenda**. Description, hero, tres beneficios y tres FAQ pasan a instrucciones contextuales: describir lo incluido, preparar la jornada y consultar visitas previas. Las keywords del spoke dejan de perseguir software/sistema/programa.

El campo existente `softwareHub` lo conecta al hub desde la plantilla compartida. Dos ajustes condicionados exclusivamente a manicure evitan heredar la tarjeta «Reducir inasistencias» y la descripción de estética sobre cabinas: se muestra la guía de abonos y descripciones contextuales de los rubros vecinos. Los demás verticales conservan su salida. No se copian el hero, ejemplo, recorrido completo, comparación, precios ni FAQ del hub.

Se revisaron `/software-agenda-peluquerias`, `/para/peluquerias` y `/para/estetica`: mantienen sus rutas y contenido. Manicure posee uñas/esmaltado/retiro; peluquería conserva cabello/corte/color; estética mantiene su contexto existente. No se reabren sus fases ni se implementa el hub de estética. La separación descrita es editorial; no se midió canibalización de rankings en Search Console.

## 6. Structured data, enlaces y analytics

- Se reutilizan `organizationRef`, `softwareApplicationNode`, `faqPageNode`, `breadcrumbListNode` y `jsonLdGraph`. No se cambia SEO-002.
- FAQ JSON-LD y texto visible provienen del mismo array. Las ocho respuestas están en HTML, sin depender de interacción.
- No hay `Review`, `aggregateRating` ni `LocalBusiness`. Las ofertas provienen de los planes centrales.
- Enlaces salientes: `/para/manicure`, pillar, funciones de abono/equipo/Google Calendar, guía de abonos, `/pricing`, `/demo`, `/register`.
- Enlaces entrantes: `/para/manicure` mediante `softwareHub`, `/soluciones` y `/sistema-de-agendamiento-online`.
- CTA con `TrackedLink`, `cta="register"`, placements `hero` y `final_cta`. SEO-004 transforma `landing_cta_clicked` en **`sign_up_cta_clicked`**; no se crea otro evento.
- Se añade la URL a `STATIC_PATHS` de analytics para conservar `source_page`; el primer test detectó que, sin esa entrada, se agrupaba como `/software-agenda-manicure/[other]`.

## 7. Indexación, performance y alcance

Metadata con canonical propio `https://www.puragenda.cl/software-agenda-manicure`, `index: true` y `follow: true`; una entrada en el sitemap público. El spoke conserva canonical propio.

`MARKETPLACE_QUALITY_GATE.indexingEnabled` permanece `false`. No se crean `/manicure`, `/manicure/[city]`, aliases por sinónimo ni landings de estética/psicólogos.

Página Server Component, sin nuevas dependencias, imágenes, video, animaciones ni componentes cliente propios. Solo reutiliza layout y CTA compartidos. La tabla tiene desplazamiento horizontal local en pantallas pequeñas. No se declara una mejora de Core Web Vitals sin medición.

## 8. Archivos y validación

Archivos del cambio:

- `src/app/software-agenda-manicure/page.tsx`
- `src/lib/data/manicure-software-landing.ts`
- `src/lib/data/industries.ts` — únicamente datos de manicure
- `src/app/para/[industry]/page.tsx` — recomendaciones condicionadas a manicure
- `src/app/soluciones/page.tsx`
- `src/app/sistema-de-agendamiento-online/page.tsx`
- `src/app/sitemap.ts`
- `src/lib/analytics/path.ts`
- `tests/manicure-software-landing.test.ts`
- Este informe.

Los nueve tests específicos renderizan el hub y el spoke aislando navegación compartida, traducciones estáticas, accordion y tracking de navegador; comprueban metadata, canonical, H1 único, catálogo, cálculo de slots, pricing, schema, FAQ visibles, enlaces, hub/spoke, recomendaciones heredadas, mapping GA4 y ausencia de claims/nombres/rutas no autorizados. Las expresiones sobre claims se aplican al contenido de manicure; no certifican el contenido histórico de todas las páginas enlazadas. El HTML de producción local se revisa además sin mocks.

Resultados finales verificados:

- `npm test`: **95 archivos pasados y 1 omitido; 480 tests pasados y 2 omitidos**, incluidos los nueve nuevos. No se modificaron los tests omitidos.
- ESLint sobre los nueve archivos TypeScript/TSX tocados: **exit 0**.
- `npm run typecheck`: **exit 0**.
- `npm run build`: **exit 0**; la nueva ruta se genera como página estática con revalidación de una hora. Compilación y generación de páginas completadas.
- HTTP sobre ese build local: hub y spoke **200**, **index, follow**, canonical propio y **un H1** cada uno. `/sitemap.xml`, `/soluciones` y el pillar responden **200** y contienen la nueva URL.
- Navegador: portada de escritorio y viewport móvil de **390 × 844** revisados. El catálogo ficticio conserva scroll horizontal local; ancho del documento igual al viewport útil (375 px, descontada la barra), sin desbordamiento horizontal de la página. H1 contextual y enlace spoke → hub comprobados.
- `git diff --check`: sin errores de whitespace. Logs de test/build/HTTP quedan en `.seo-cache/`, fuera del commit.

La respuesta 200 comprobada corresponde al build local. **No se realizó despliegue ni push**; no se afirma que la URL esté disponible en producción o indexada por Google.

## 9. Claims descartados, límites y siguientes pasos

Se omiten recordatorios WhatsApp/SMS, app nativa, comisiones, inventario, stock, POS, paquetes, combinaciones automáticas, resultados cuantificados, reducción de inasistencias, aumento de ingresos, cifras de clientes y superlativos. No se usan nombres/logos/testimonios de clientes ni una caja que anuncie su ausencia.

No se prometen ajustes automáticos de duración por opción en este recorrido, devolución automática o autogestión de una cita con abono aprobado. No se certifican entregas email, conexión Google Calendar o pagos reales: esas integraciones dependen de configuración externa y no se probaron con clientes.

Recomendación posterior: tratar la discrepancia de duración por opción como un trabajo funcional independiente, con prueba de un servicio más una opción que añada minutos en selección, disponibilidad y confirmación. Después de un despliegue autorizado, verificar esta URL en producción y observar queries/conversiones con la medición existente. Ninguna de esas acciones se ejecuta como avance a SEO-017.
