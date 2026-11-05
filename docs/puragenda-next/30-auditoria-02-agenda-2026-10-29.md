# Auditoría 02 — Agenda y reservas

Fecha: 29-10-2026. Rama local: `fix/puragenda-next-audit-02-agenda`.

La auditoría 01 aprobada se integró por fast-forward y se publicó exclusivamente en [release/puragenda-next-rc1](https://github.com/DiegoSalsa/Puragenda/tree/release/puragenda-next-rc1), en `5dcea3d33012301eaa05b03a6005fb557dcbcc01`. La rama 02 se creó exactamente desde ese commit. No se publicó esta segunda rama ni se modificó `main`.

## Hallazgos y decisiones

| Hallazgo | Comprobación previa | Causa exacta | Corrección | Pruebas | Riesgo residual / límite |
| --- | --- | --- | --- | --- | --- |
| 1. Errores individuales FreeBusy | Reproducido con HTTP 200 y errores `notFound`, `internalError`, un motivo desconocido o ausencia de un calendario seleccionado. | Se concatenaba `calendars[id].busy ?? []` sin comprobar errores individuales; una consulta fallida parecía libre. | Se exige una respuesta completa y rangos válidos para cada calendario seleccionado. Cualquier fallo protege todo el intervalo solicitado mediante el manejo de error existente. | `google-calendar-multi-read.test.ts`: errores parciales, calendarios vacíos, HTTP 401/429/500, múltiples calendarios, fallback 403 a eventos, paginación, recurrencia y DST. | Una falla de un calendario reduce temporalmente toda la disponibilidad consultada; es la política conservadora solicitada. No se consultaron calendarios reales. |
| 2. Abono obligatorio | Verificado en el código anterior: la autorización del vendedor formaba parte de la condición para exigir el abono. | Un token nulo eliminaba el abono; un fallo de refresh terminaba en error genérico. | Si corresponde un importe positivo integrado y no puede obtenerse autorización, devuelve 503 `DEPOSIT_UNAVAILABLE` antes de crear citas, preferencias o notificaciones. | PostgreSQL/HTTP de la ruta real: autorización ausente, vencida no recuperable y refresh fallido; gratuitos, importe de abono cero, abono desactivado, enlace manual, preferencia fallida, recuperación con la misma clave e idempotencia. El reintento mantiene una retención de 10 minutos. | La recuperación real de OAuth sigue siendo una operación posterior del negocio; aquí se simularon los resultados del servicio de tokens, sin cobros ni llamadas a Mercado Pago. |
| 3. Disponibilidad interna/pública | Reproducidos días bloqueados y restricciones especiales omitidas, citas sin profesional ignoradas y ausencia del contexto Google del negocio. La comparación PostgreSQL detectó también que una excepción de sucursal para otra fecha borraba excepciones generales. | El dashboard usaba `buildSlots` con filtros distintos; no liberaba retenciones vencidas ni excluía pagos rechazados. La elección de excepciones se hacía por colección completa. El motor público tampoco heredaba el horario global si la asignación de sucursal tenía un arreglo vacío. | Reutiliza `buildBookingSlots`; añade días bloqueados, liberación existente de retenciones, filtro de pagos, ocupación sin profesional y contexto Google. Combina excepciones por fecha, con precedencia de sucursal. El horario global se hereda cuando no hay horario específico. | Comparación de slots reales entre motores con PostgreSQL: fechas bloqueadas, excepciones profesionales, bloqueos de sucursal, citas sin profesional, rechazo de pago, expiración, Google y herencia de horarios. Prueba de cierre general y reapertura específica de sucursal. También comparación HTTP con una zona horaria diferente. | Los bloqueos `PRIORITY` conservan la excepción manual autorizada del dashboard (`allowPrioritySlots`); la disponibilidad pública/interna sigue usando el predicado compartido de bloqueos. No se cambió esa decisión comercial. |
| 4. Edición concurrente | Verificado en la ruta anterior: `PUT` actualizaba únicamente por `id`, sin versión esperada ni transacción de cliente/cita. Los errores de capacidad podían llegar al catch 500. | Dos ediciones podían validar el mismo estado y la segunda sobrescribía la primera; la escritura no traducía el conflicto PostgreSQL. | `expectedUpdatedAt`, comprobación bajo el mismo bloqueo de capacidad, actualización condicionada y versión estrictamente creciente. Cliente y cita se guardan juntos. Versión obsoleta, desaparición o conflicto de capacidad devuelven 409. No se alteran triggers ni restricciones. | Dos PUT simultáneos con PostgreSQL y mediante HTTP: exactamente 200/409 y un solo conjunto de efectos. Una inserción real entre validación y actualización provoca el trigger PostgreSQL; se obtiene 409 y se revierten cliente/cita del intento perdedor. Versiones ausentes/obsoletas no modifican datos. | Un editor abierto con una versión vieja debe recargar. Los clientes antiguos que omitan la versión reciben 409 de forma segura. Los dos puntos de entrada actuales del editor incluyen versión y sucursal. |
| 5. Citas manuales y sucursales | Verificado en frontend y servidor: el selector de sucursal ya existía, pero el editor no enviaba su identificador y el resolver consultaba horario/zona general. | No se validaban pertenencia a sucursal ni horarios específicos, y creación/edición no persistían `locationId`. | Se transmite la sucursal seleccionada desde Agenda/Hoy y se muestra en el editor. Se validan sucursal activa del negocio, asignaciones, horarios, pausas, excepciones, fecha bloqueada y conflictos; se guarda `locationId`. Inferencia solo con una sucursal activa; sin sucursales se conserva el recorrido manual legacy. | PostgreSQL: alta y traslado entre sucursales, profesional/servicio no asignado, sucursal ajena/ambigua, horario cerrado, pausa y día no configurado; solicitudes antiguas con una sucursal y sin sucursales. HTTP: creación, persistencia y renderizado de la sucursal. | No se migran citas históricas. La interfaz reutiliza el selector de sucursal existente de la página; no incorpora un segundo selector dentro del diálogo. Las asignaciones necesarias deben existir. |
| 6. Horizonte de 90 días | Reproducido: desde el día 90, solicitar siete días devolvía fechas posteriores al límite. | Solo se validaba la fecha inicial. | Constante compartida con el motor público; se recortan fechas y rango de consulta al último día permitido, inclusive. | Prueba unitaria desde el día 90 y recorrido HTTP `days: 7`: devuelve un solo día, sin superar el límite. | El horizonte se calcula por fecha civil en la zona de la sucursal, igual que en disponibilidad pública. |

El contrato FreeBusy documenta los errores por calendario dentro de la respuesta y exige contemplar motivos desconocidos: [referencia oficial de Google](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query).

No se cambiaron los escenarios que ya estaban cubiertos: fallback 403 a eventos de Google, pagos manuales y legacy sin retención integrada, conciliación y liberación idempotente existentes, reservas recurrentes, selección de múltiples servicios, permisos y controles comerciales. Los fixtures y las respuestas de proveedores utilizados son sintéticos.

## Validaciones terminadas

| Verificación | Resultado |
| --- | --- |
| Suite general Vitest | 1.712 aprobadas; 451 condicionales se ejecutaron en sus entornos preparados, como se detalla abajo. Cero fallos. |
| PostgreSQL comercial | 294 aprobadas / 10 archivos / cero omisiones. Incluye registro V2, país/moneda de auditoría 01, contratos, Contact Flow, Puri y Mercado Pago V2. |
| PostgreSQL reservas/Agenda | 76 aprobadas / 5 archivos / cero omisiones. Incluye 26 pruebas de API pública y 19 nuevas de dashboard con PostgreSQL real. |
| PostgreSQL MCP | 53 aprobadas / 5 archivos / cero omisiones; preserva movimientos de citas y herramientas existentes. |
| PostgreSQL legacy | 85 aprobadas / 4 archivos / cero omisiones; abonos, suscripciones y contratación de sitios. |
| Registro y configuración, foco de auditoría 01 | 70 aprobadas antes de publicar RC1. |
| HTTP local de extremo a extremo | Bootstrap: 6 comprobaciones; Agenda: 11; recorrido integrado Puri/Contact Flow/worker: 20. Todas aprobadas. |
| Next typegen + TypeScript | Aprobados. |
| ESLint | Cero errores; 32 advertencias existentes, principalmente imágenes y variables sin uso ajenas a esta corrección. |
| Build Next.js | Aprobado con webpack, en copia aislada, entorno saneado y sin credenciales de proveedores. |
| Prisma | Esquema válido; migraciones existentes aplicadas en bases locales desechables. Ningún cambio de esquema ni migración nueva. |
| Revisión de secretos | Sin coincidencias con valores privados conocidos ni patrones de credenciales; sin nuevas rutas privadas versionadas. `.env` operativo y remitente transaccional sin cambios. |

Las 451 omisiones de la ejecución general corresponden exactamente a 294 pruebas comerciales, 45 de reservas/Agenda, 27 de PostgreSQL MCP y 85 legacy. Sus guardas exigen bases locales y esquemas exclusivos; todas se ejecutaron después mediante los cuatro lanzadores apropiados. Las 76 y 53 de sus respectivos lanzadores incluyen además 31 y 26 pruebas ya contadas en la suite general. Por tanto, se verificaron las **2.163 pruebas distintas**, sin ocultar omisiones de suites críticas ni sumar dos veces las pruebas compartidas.

La certificación HTTP utilizó una nueva copia de staging local y una base propia. No utilizó datos de clientes. Salida a proveedores bloqueada, credenciales comerciales ausentes y `CONTACT_FLOW_PRODUCTION_ENABLED=0`, `CONTACT_FLOW_EXTERNAL_RELEASE=false`. No se enviaron correos ni se escribieron calendarios reales. Esta validación HTTP no equivale a una nueva certificación visual ni a una prueba con proveedores productivos.

## Reproducción

Con PostgreSQL local preparado, establecer `COMMERCIAL_V2_TEST_DATABASE_URL` a una base de pruebas cuyo nombre cumpla la guarda `puragenda_commercial_test`. Los scripts rechazan destinos remotos y crean bases/esquemas exclusivos; no utilizar una URL productiva.

```powershell
node scripts/test-commercial-postgres.mjs
node scripts/test-rc1-booking-postgres.mjs
node scripts/test-rc1-booking-postgres.mjs --mcp
node scripts/test-rc1-legacy-postgres.mjs
```

Para el recorrido HTTP, preparar una copia nueva y mantener su servidor en otra consola:

```powershell
node scripts/prepare-next-staging.mjs --prepare-local
node scripts/run-next-staging.mjs
# En otra consola, desde el worktree:
node scripts/bootstrap-next-staging-http.mjs
node scripts/test-next-staging-agenda.mjs
node scripts/test-next-staging.mjs
```

El nuevo script de Agenda lee las credenciales generadas exclusivamente desde los archivos privados locales. El lanzador PostgreSQL serializa archivos porque comparten el esquema desechable; las carreras dentro de las pruebas siguen siendo concurrentes. Evidencias detalladas y accesos sintéticos permanecen ignorados, fuera de Git.

## Commits y estado de entrega

- `9f5d1a6`: errores parciales de FreeBusy.
- `4f96bc2`: abonos obligatorios y recuperación idempotente.
- `d6eba6a`: disponibilidad compartida y horizonte.
- `6725bb6`: sucursales, edición concurrente y pruebas PostgreSQL/HTTP.
- Este documento se incorpora mediante un commit de cierre separado.

RC1 y la rama de auditoría 01 permanecen en `5dcea3d33012301eaa05b03a6005fb557dcbcc01`. `main` local permanece en `a3d90a652268e7770dd0c53cac2786d6e5bf63e7` y `origin/main` en `e74c92237e47db43425a7d47209520967e51bfb0`. No se hizo merge hacia ninguna de ellas durante Agenda.

Se conservaron respaldos y datos locales de QA. Las protecciones de Preview de RC1 y auditoría 01 siguen intactas: despliegue Git deshabilitado y bloqueo temprano de build; RC1 solo admite un futuro Preview aislado con opt-in explícito. La rama 02 no tiene referencia remota. Antes de autorizar su futura publicación deberá revisarse y añadirse su protección Preview específica.

Pendiente: revisión del alcance de auditoría 02 por el usuario. No se hizo push de esta rama, deploy, activación de webhooks, instalación de secretos ni cambios en producción.

## Preparación posterior de publicación para revisión

El usuario autorizó publicar exclusivamente auditoría 02. Antes del push se verificó de nuevo la base exacta de cinco commits sobre RC1 y se añadió un sexto commit dedicado a protección: entrada explícita `git.deploymentEnabled=false`, salida temprana del build para la rama 02 en cualquier entorno y exclusión de sus jobs de GitHub Actions, incluso para pull requests o despacho manual. Las protecciones de RC1 y auditoría 01 se conservan.

La revisión autenticada de Vercel confirmó el proyecto `puragenda`, repositorio `DiegoSalsa/Puragenda`, producción desde `main` en `e74c922`, raíz del repositorio, sin overrides de comandos del proyecto, comportamiento automático de build y ausencia de deploy hooks. GitHub confirmó un único workflow activo (`security.yml`), con push limitado a `main`, y sin webhooks adicionales del repositorio. No se modificaron ajustes remotos. Referencias: [bloqueo Git por rama en Vercel](https://vercel.com/docs/project-configuration/git-configuration) y [condiciones de jobs en GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions).

## Cierre de los tres riesgos residuales

Correcciones posteriores a `851e04d`, exclusivamente en esta rama:

- **503 sin efectos de negocio:** la autorización de abonos se comprueba antes de la disponibilidad que libera retenciones y antes de CRM, consentimiento y perfil. Doce casos PostgreSQL comparan el estado completo antes/después, para clientes nuevos/existentes, v1/legacy y tres fallos de autorización. No cambian clientes, consentimientos/auditorías, perfiles ni citas, incluidas retenciones previas. Solo se conserva el recibo técnico de idempotencia para permitir el reintento seguro. Se comprobaron también consentimientos válidos verificados y anónimos, servicios gratuitos, enlaces manuales y retenciones de diez minutos.
- **Catálogo y consumidores:** `depositEnabled` representa el requisito comercial; los importes siguen siendo por servicio. `depositPaymentStatus` distingue `UNAVAILABLE` de `CHECK_AT_BOOKING`, por negocio/servicio, sin devolver credenciales ni refrescarlas durante lecturas. Widget y Bella, Pink Y2K (flujo compartido), Matchday y Ritual mantienen visible el abono y avisan cuando no puede procesarse. Los gratuitos y servicios sin abono siguen disponibles. El 503 explícito se trata como rechazo conocido; otros fallos inciertos conservan su protección contra reenvíos.
- **Datos de la sucursal:** un resolver compartido y limitado al negocio proporciona zona, dirección y Maps para confirmaciones, abonos confirmados, cancelaciones, recordatorios y Calendar. Las notificaciones de sesiones recurrentes y de reagendamiento conservan el contexto de sucursal; no se modificó el cálculo de recurrencias ni se migraron citas. Los correos de citas sin sucursal conservan los datos legacy. La misma cita `2026-07-04T04:30:00Z` se muestra el 4 de julio a las 00:30 en Santiago y el 3 a las 22:30 en Isla de Pascua. Creación y actualización de eventos Google conservan exactamente `dateTime` UTC; solo cambia su zona de presentación y dirección. Se contrastó con la [referencia de eventos de Google](https://developers.google.com/workspace/calendar/api/v3/reference/events).

Validación vigente: **1.758 pruebas generales aprobadas** y **466 condicionales ejecutadas** en entornos PostgreSQL preparados: 294 comerciales, 60 de reservas/Agenda, 27 MCP y 85 legacy. Los lanzadores completos aprobaron 294, 97, 53 y 85 respectivamente; incluyen pruebas compartidas que no se suman dos veces. Total: **2.224 pruebas distintas verificadas**. La selección de regresión específica aprobó 111 pruebas, incluidas las 17 de aislamiento de publicación. Typegen, TypeScript, Prisma y build webpack aislado aprobados; ESLint sin errores y con las 32 advertencias existentes.

HTTP local: 6 comprobaciones de bootstrap, 14 de Agenda y 20 del recorrido Puri/Contact Flow/worker, todas aprobadas. Incluye catálogo obligatorio sin autorización, 503 real y conservación de CRM/citas/consentimiento. Código de prueba reproducible en `scripts/test-next-staging-agenda.mjs`; los demás comandos anteriores se conservan. Evidencias y accesos sintéticos siguen fuera de Git. No hubo envíos ni operaciones con proveedores reales, cambios de esquema, integración a RC1 o cambios productivos. La actualización autorizada conserva las protecciones explícitas de Vercel y Actions de esta rama.

## Privacidad de notas internas en Google Calendar

La consulta de sincronización ahora selecciona explícitamente los campos necesarios y excluye `internalNotes`; el evento nunca incorpora esas notas, con invitados del cliente habilitados o deshabilitados. Las notas siguen disponibles en los módulos internos y se conservan al reagendar. Se revisaron confirmación, cancelación, portal y reagendamiento: sus respuestas públicas y datos de notificación son explícitos; las pruebas inspeccionan también los correos renderizados y sus enlaces de calendario.

Para evitar que una cancelación reutilice una descripción antigua, el helper compartido limpia únicamente `description` mediante `PATCH` con `sendUpdates=none` antes de borrar el evento con aviso a invitados. Abarca cancelación, cambio de calendario, eliminación y desconexión. Un fallo de limpieza conserva el vínculo y evita enviar la cancelación hasta poder reintentar; los 404 siguen siendo idempotentes. No cambian sucursal, zona ni instantes UTC. Referencia: [semántica de PATCH de Google Calendar](https://developers.google.com/workspace/calendar/api/v3/reference/events/patch).

Validación de esta corrección: 1.776 pruebas generales aprobadas; las 466 condicionales conservan sus guardas de entorno. Se reejecutó el lanzador de Agenda: 97 aprobadas, incluidas 60 con PostgreSQL real. Regresión focalizada: 133 aprobadas, incluidas las 17 de publicación. TypeScript, Prisma y build webpack aislado aprobados; ESLint sin errores y con las 32 advertencias existentes. Google y correo se verificaron mediante transportes simulados, sin envíos reales.

Riesgo residual histórico: este cambio no puede retirar invitaciones ya distribuidas ni copias guardadas por terceros. Los eventos antiguos se limpian cuando vuelven a sincronizarse o se eliminan; no se ejecutó una limpieza masiva en producción. Las protecciones de Vercel/Actions de esta rama se mantienen intactas; `main` y RC1 no se modifican.
