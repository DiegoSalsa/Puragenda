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
