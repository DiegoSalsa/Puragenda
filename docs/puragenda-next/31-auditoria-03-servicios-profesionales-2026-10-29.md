# Auditoría 03 — Servicios y profesionales

Fecha: 29-10-2026. Rama: `fix/puragenda-next-audit-03-services-staff`.
Base exacta: `8a32522875bc35d55c25bf5d39277f0eec49624f` (RC1 y auditorías 01/02 aprobadas).

## Preparación y alcance

Se verificaron referencias locales y `git ls-remote`: RC1 local y remoto coincidían con el SHA aprobado. El checkout de auditoría estaba limpio; desde él se creó la rama independiente. El directorio original `Desktop/agenda`, en `reel/puragenda-publicitario-20261015`, tenía 148 archivos versionados modificados y material sin versionar: se conservó intacto y no se incorporó a esta rama.

Se añadieron exclusiones explícitas para auditoría 03 en Vercel, su build y ambos jobs de Actions, conservando las protecciones anteriores. No hubo push, merge, despliegue, migración remota ni operaciones con proveedores reales. Las pruebas utilizaron PostgreSQL propio en loopback, bases/esquemas desechables, credenciales sintéticas, correo sin clave y salida HTTP a proveedores bloqueada. La instancia habitual del equipo no se utilizó.

## Hallazgos y correcciones

Antes de implementar se ejecutaron cuatro pruebas sobre RC1 con PostgreSQL real. Fallaron las cuatro: desapareció una cita completada; cambiaron IDs de opciones; desapareció un profesional; el nuevo profesional quedó sin sucursal. La evidencia previa permanece en `scratch/audit-03/reproduction-before-fix.log`, ignorado por Git.

| Hallazgo | Reproducción | Causa | Corrección | Archivos principales | Pruebas | Riesgo residual |
| --- | --- | --- | --- | --- | --- | --- |
| 01. Borrado de servicios | La cita completada devolvió `null` tras `deleteService`, con cliente, importe y abono previamente registrados. | Borrado físico y cascada desde `Service` hacia citas y otros dependientes. Otras FK restrictivas protegían algunos servicios, no todos. | `Service.isActive`, archivado/restauración por negocio y filtros de catálogo efectivos. Guardas PostgreSQL bloquean el borrado físico y nuevas citas, contratos recurrentes y encargos de servicios archivados; los bloqueos de fila cubren carreras. Citas futuras, pagos, comprobantes, clientes, informes, gift cards y contratos existentes conservan sus referencias. | `service.service.ts`, API de servicios, catálogo compartido, widget, consumidores públicos y migración. | Historial completo, referencias MP/comprobante, suma de informes, reservas futuras, restauración, nuevas reservas/servicios adicionales rechazados, carrera real y aislamiento. Recurrencias y encargos conservados. | Los derechos ya vendidos en gift cards se conservan; resolver su cumplimiento o reactivar el servicio corresponde al negocio. No se sustituyen automáticamente. |
| 02. Borrado de profesionales | Tras la acción desaparecieron el registro y horario; las citas perdieron la asignación. | La supuesta eliminación lógica desvinculaba todas las citas y ejecutaba `staff.delete`. El fallback de permisos tampoco exigía una pertenencia activa. | Desactivación lógica idempotente, sin desvincular citas ni borrar horarios, cuentas o calendarios. Se bloquea con cantidad explícita de reservas futuras/planes vigentes y enlaces a Agenda/Planes. Reactivación con el bloqueo de capacidad existente, incluidos cupos V2 y reducciones pendientes. Permisos y conexiones personales exigen pertenencia activa. | `staff.service.ts`, `staff-capacity.service.ts`, acciones, permisos, Calendar y módulo Profesionales. | Históricos/futuros, contratos sin sesiones materializadas, usuario/calendario asociado, otro negocio del mismo usuario, acceso revocado, ambos planes, reducción pendiente, último cupo y activación duplicada. | La cuenta owner conserva el acceso que proviene de ser dueña; solo se retira su capacidad profesional. Las conexiones Google y eventos históricos se conservan, sin revocación externa ni limpieza remota. |
| 03. IDs y contrato al editar | Una edición de nombre con opciones completas cambió IDs de categoría y alternativa. | Se borraban todas las categorías y se recreaban. El editor/reagendamiento podía cotizar con valores actuales una selección ya contratada. | Actualización diferencial bajo transacción y versión de catálogo; IDs existentes validados contra servicio/negocio, duplicados y retirados rechazados. Solo se modifican campos distintos. Retiro lógico de categorías/alternativas, sin reutilizar IDs. Mover una selección existente conserva snapshots, precio, duración y descuentos; el editor muestra esos valores y permite el servicio archivado de la cita. | `service.service.ts`, validaciones/API, `appointment-management.service.ts`, PUT de citas y editor/detalle. | Nombre/precio sin cambiar opciones ni timestamps, editar/agregar/retirar/reordenar, IDs ajenos/duplicados, ediciones concurrentes, opción a domicilio retirada y movimiento de servicio archivado. SSR del editor e integración HTTP. | Cambiar explícitamente el servicio o las opciones sigue cotizando una selección nueva. Los editores antiguos sin versión reciben 409 y deben recargar. En datos legacy sin importe contratado se conserva el fallback existente. |
| 04. Alta sin sucursal | El profesional creado con una única sucursal activa tuvo cero asignaciones. | El alta atómica User/Staff no incluía `StaffLocation`. | Una sucursal activa se asigna automáticamente; varias requieren selección explícita. Se validan y bloquean las sucursales del negocio dentro de la misma transacción, deduplicando asignaciones. Se crean siete días inicialmente cerrados para configurar el horario; la UI explica el pendiente. Se conserva el recorrido legacy sin sucursales y el uso del horario del negocio en Individual. | `staff.service.ts`, `dashboard.actions.ts`, lista de profesionales. | Una/varias/ninguna sucursal, inactiva/ajena, duplicados, horarios cerrados, límite y fallo tardío de asignación con rollback de cuenta, profesional y horarios. | No se migran asignaciones existentes ni se diseña un onboarding nuevo. Un negocio con sucursales existentes pero todas inactivas debe activar una antes del alta. |

La revisión transversal mantuvo las lecturas históricas sin filtro de actividad. Se filtraron selecciones nuevas en Agenda/Hoy, API pública, widget, sitios (catálogo compartido), Puri/MCP, marketplace, historias de disponibilidad, Contact Flow y nuevas ventas de gift cards de servicios retirados. No se borraron campañas, compras ni entitlements existentes. Las asignaciones restringidas a servicios archivados no se convierten accidentalmente en autorización para todos los servicios.

El reagendamiento público actual crea una cita nueva y cancela la anterior. Para un servicio archivado se devuelve ahora una explicación antes de escribir: la reserva se conserva y el cliente debe contactar al negocio. El dashboard puede mover esa cita conservando el contrato. Las reservas recurrentes ya contratadas pueden continuar generando sus sesiones; un contrato nuevo sobre un servicio archivado se rechaza.

## Validaciones ejecutadas

| Categoría | Resultado final |
| --- | --- |
| Suite general Vitest | 1.785 aprobadas; 499 condicionales omitidas en esta invocación por sus guardas de base. Se ejecutaron separadamente todas las condicionales, como se explica abajo. |
| PostgreSQL específico auditoría 03 | 33 aprobadas, sin omisiones, sobre una base nueva con migraciones reales; incluye handlers HTTP con Prisma real y barreras transaccionales de concurrencia. |
| PostgreSQL comercial / registro V2 | Lanzador completo: 325 aprobadas (294 de regresión comercial/registro/Contact Flow/Puri/MP V2 y 31 de auditoría 03 existentes en esa ejecución). Las 33 finales de auditoría se revalidaron después con el lanzador específico. |
| PostgreSQL Agenda/reservas | 97 aprobadas, sin omisiones; 60 condicionales y 37 compartidas con la suite general. |
| PostgreSQL MCP | 53 aprobadas, sin omisiones; 27 condicionales y 26 compartidas. |
| PostgreSQL legacy | 85 aprobadas, sin omisiones: abonos, contratación manual y sitios. Se adaptó una expectativa antigua para exigir resolver la cita futura antes de desactivar y liberar el cupo. |
| HTTP real Next.js + PostgreSQL aislado | 52 comprobaciones aprobadas: bootstrap 6, Agenda 14, Puri/Contact Flow/worker 19, servicios/profesionales 13. El recorrido Puri registra además una métrica de duración que no se cuenta como aserción. No equivalen a pruebas con proveedores reales. |
| Interfaz gráfica | Renderizado local de Servicios y Profesionales inspeccionado: archivados/inactivos consultables y acciones reversibles visibles. Interacción gráfica completa **parcial**, por bloqueo de la automatización al manejar la confirmación nativa. No se declara aprobada esa parte. Los recorridos de escritura sí se verificaron por HTTP; el editor histórico tiene dos pruebas de renderizado SSR. |
| Next typegen + TypeScript | Aprobados. |
| Prisma validate | Aprobado. Migración aplicada únicamente en bases locales desechables. |
| ESLint | Cero errores; 32 advertencias existentes, sin aumento. |
| Build de producción | Aprobado con webpack, copia aislada sin archivos de entorno operativos ni credenciales de proveedores. |
| Secretos / aislamiento | Sin coincidencias de credenciales conocidas ni patrones de secretos; sin nuevas rutas privadas versionadas. Aislamiento entre negocios verificado en servicios, opciones, sucursales, membresías y HTTP. |

Las 499 condicionales son exactamente 294 comerciales + 33 nuevas + 60 Agenda + 27 MCP + 85 legacy. Todas se ejecutaron en sus entornos preparados. Con las 1.785 generales se verificaron **2.284 pruebas distintas**; no se suman dos veces las 37/26 compartidas ni las 31 de auditoría incluidas en el lanzador comercial anterior.

Los correos y las respuestas de proveedores en pruebas unitarias son transportes simulados; sus mensajes de consola no representan envíos reales. Se conservan evidencias locales en `scratch/audit-03/`, fuera de Git. No se ocultaron fallos iniciales: cuatro reproducciones, la expectativa legacy incompatible con la regla nueva y un ajuste del mock de traducciones del test SSR se corrigieron y reejecutaron.

## Migración y reversión

Nueva: `prisma/migrations/20261029180000_preserve_service_staff_history/migration.sql`.

- Una transacción agrega `Service.isActive=true`, `catalogVersion=0`, actividad en categorías/alternativas e índice por negocio/actividad. Todos los servicios existentes conservan su disponibilidad inicial. No elimina ni transforma filas históricas.
- Las FK existentes no se alteran. Guardas `BEFORE DELETE` impiden cascadas accidentales sobre Service/Staff mientras existe su negocio. Se conserva la política previa de eliminación del negocio completo; no se ejecutó esa operación sobre datos reales.
- Las guardas de reservas leen servicio/profesional con `FOR SHARE`; las mutaciones de estado esperan y comprueban el estado confirmado. El bloqueo de capacidad del negocio usa `FOR NO KEY UPDATE`, que serializa altas/reactivaciones y evita competir innecesariamente con las referencias FK de nuevas reservas.
- Aplicación futura: revisar backup/volumen/ventana DDL; aplicar primero la migración, regenerar Prisma y desplegar esta versión coordinadamente. Aquí solo se ensayó contra PostgreSQL local. No se ejecutaron comandos de migración sobre destinos remotos.
- Reversión operativa recomendada: conservar columnas, estado y guardas y aplicar una corrección compatible hacia delante. Un rollback ciego a RC1 volvería a listar archivados e intentaría borrados físicos, aunque las guardas impedirían pérdida. No quitar guardas mientras exista código destructivo.
- Una reversión estructural completa requiere comprobar previamente que no quedan servicios ni opciones retirados y que ningún cliente usa esos campos; después se podrían retirar triggers/funciones/índice/columnas en una migración revisada. No es una reversión segura si descartaría estados de archivado. No se preparó ni ejecutó un borrado de esos estados.

No se pueden recuperar datos destruidos antes de esta auditoría sin un respaldo previo. No se ejecutó una reparación masiva ni se inventaron reglas de devolución/sustitución de beneficios vendidos.

## Reproducción de validaciones

Usar exclusivamente una URL PostgreSQL de loopback con nombre permitido `puragenda_commercial_test...` en `COMMERCIAL_V2_TEST_DATABASE_URL`. Los lanzadores de esta auditoría/RC1 saneados eliminan credenciales externas; la prueba comercial se ejecutó también bajo esa envoltura local.

```powershell
node scripts/test-audit-03-postgres.mjs
node scripts/test-commercial-postgres.mjs
node scripts/test-rc1-booking-postgres.mjs
node scripts/test-rc1-booking-postgres.mjs --mcp
node scripts/test-rc1-legacy-postgres.mjs
# En una copia aislada y saneada:
node scripts/prepare-next-staging.mjs --prepare-local
node scripts/run-next-staging.mjs
# En otra consola del worktree:
node scripts/bootstrap-next-staging-http.mjs
node scripts/test-next-staging-agenda.mjs
node scripts/test-next-staging-services-staff.mjs
node scripts/test-next-staging.mjs
```

Los recorridos HTTP usan datos sintéticos y una base nueva por preparación. Para repetir desde cero, preparar otra copia/base; no reutilizar un negocio de pruebas que ya agotó sus cupos. No cargar `.env` operativos ni ejecutar estas pruebas contra bases reales.

## Entrega Git

Seis commits locales organizados sobre RC1:

1. `45b6bdb`: protecciones de Vercel/Actions.
2. `08f6384`: archivado y actualización diferencial del catálogo.
3. `f5c65dc`: profesionales, acceso, capacidad y sucursales.
4. `110cbde`: consumidores de catálogo, contrato histórico y editor.
5. `e13dfbb`: PostgreSQL/HTTP y pruebas de integridad.
6. Commit de este informe.

Estado de entrega: rama local sin upstream, árbol limpio tras el commit del informe. RC1 y `main` no se movieron. El SHA final se entrega en la respuesta y se obtiene con `git rev-parse HEAD`. Servidores locales iniciados para esta auditoría detenidos; datos y evidencias de QA conservados e ignorados. No se hizo push ni se solicita desplegar.

## Inventario de archivos

58 archivos frente a RC1, incluido este único informe:

```text
.github/workflows/security.yml
docs/puragenda-next/31-auditoria-03-servicios-profesionales-2026-10-29.md
prisma/migrations/20261029180000_preserve_service_staff_history/migration.sql
prisma/schema.prisma
scripts/test-audit-03-postgres.mjs
scripts/test-booking-api-local.mjs
scripts/test-commercial-postgres.mjs
scripts/test-next-staging-services-staff.mjs
scripts/vercel-build.mjs
src/app/api/business/[slug]/gift-cards/checkout/route.ts
src/app/api/business/[slug]/production-orders/route.ts
src/app/api/business/[slug]/production-weeks/route.ts
src/app/api/business/[slug]/validate-reward/route.ts
src/app/api/dashboard/appointments/[id]/route.ts
src/app/api/dashboard/gift-cards/templates/route.ts
src/app/api/dashboard/services/[id]/route.ts
src/app/api/dashboard/services/route.ts
src/app/api/widget/[slug]/book-recurring/route.ts
src/app/dashboard/agenda/page.tsx
src/app/dashboard/appointment-detail-dialog.tsx
src/app/dashboard/appointment-editor.tsx
src/app/dashboard/gift-cards/page.tsx
src/app/dashboard/loyalty/page.tsx
src/app/dashboard/services/services-client.tsx
src/app/dashboard/staff/page.tsx
src/app/dashboard/staff/staff-list.tsx
src/app/widget/[slug]/gift-cards/page.tsx
src/app/widget/[slug]/page.tsx
src/server/actions/appointment.actions.ts
src/server/actions/dashboard.actions.ts
src/server/actions/recurring.actions.ts
src/server/booking/create-http.ts
src/server/booking/read.service.ts
src/server/contact-flow/campaigns.ts
src/server/contact-flow/worker.ts
src/server/services/appointment-management.service.ts
src/server/services/appointment.service.ts
src/server/services/availability-story.service.ts
src/server/services/business.service.ts
src/server/services/dashboard-availability.service.ts
src/server/services/gift-card.service.ts
src/server/services/google-calendar-access.service.ts
src/server/services/google-calendar.service.ts
src/server/services/marketplace-admin.service.ts
src/server/services/marketplace.service.ts
src/server/services/permissions.service.ts
src/server/services/service.service.ts
src/server/services/staff-capacity.service.ts
src/server/services/staff.service.ts
src/server/services/today-dashboard.service.ts
src/server/validations/booking.ts
tests/appointment-editor-history.test.ts
tests/integration/services-staff-postgres.integration.test.ts
tests/server/appointment-reschedule.actions.test.ts
tests/server/commercial-subscription.integration.test.ts
tests/server/permissions.service.test.ts
tests/server/rc1-deployment-safety.test.ts
vercel.json
```
