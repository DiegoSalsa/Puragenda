# 10 — Roadmap, trazabilidad y lanzamiento

## Fases técnicas

### Fase 0 — Aprobaciones y datos

Objetivo: cerrar IVA, prorrateo, proveedor Chile, límites Contact Flow, legal, catálogo y datos faltantes.

Archivos: documentación, scripts de export anonimizado y fixtures. No migraciones productivas.

Riesgo: decisión comercial o legal tardía.

Pruebas: revisión de reglas, fixture de clientes legacy y matriz de decisiones.

Terminada cuando todas las decisiones bloqueantes tienen dueño y fecha.

### Fase 1 — Catálogo y entitlements

Objetivo: implementar función pura de quote, alias legacy, snapshot de suscripción y servicio común de acceso.

Archivos: nuevo módulo commercial, adapters de access, tests unitarios.

Migración: tablas aditivas, RLS, sin cutover.

Pruebas: tabla de precios, propiedades, permisos, mismatch dual-read.

Terminada cuando UI y billing de prueba usan el mismo quote.

### Fase 2 — Billing y cupos

Objetivo: intención idempotente, ledger de cupos, provider adapters, preview, estados UNKNOWN y conciliación.

Archivos: servicios subscription, rutas billing, webhooks, cron reconciliation.

Migración: items, eventos provider, seat changes.

Pruebas: concurrencia, MP/Paddle fixtures, past_due, trial, promociones, prorrateo aprobado.

Terminada cuando no hay duplicados en simulador y el acceso solo cambia tras evidencia.

### Fase 3 — Migración de clientes y web Plus

Objetivo: backfill, dual-read, inclusión de web, grandfathering y UI de migración.

Archivos: website policy/billing, subscription gates, dashboard web, Superadmin.

Migración: snapshots y compatibilidad, sin borrar contenido.

Pruebas: web publicada, add-on activo, founder, cancelación, downgrade, doble cobro.

Terminada cuando el reporte de cobertura no tiene warnings críticos.

### Fase 4 — Puri+

Objetivo: señales SQL, recomendaciones, propuestas y aprobación.

Archivos: src/server/puri, nuevos modelos y rutas de recommendation.

Migración: recomendaciones y auditoría mínima, RLS.

Pruebas: coste, límites, permisos, datos sensibles, fallback SQL y doble aprobación.

Terminada cuando Puri nunca ejecuta una acción comercial directamente.

### Fase 5 — Contact Flow

Objetivo: DSL, enrollments, outbox, worker, cuotas, Resend adapter, webhooks y atribución.

Archivos: servicios marketing nuevos, cron/worker, rutas webhook, templates.

Migración: consent, suppression, automation, attempt, quota, attribution.

Pruebas: concurrencia, reintentos, bajas, No Molestar, provider errors, aislamiento.

Terminada cuando Puri puede proponer y el motor funciona sin Puri.

### Fase 6 — UX y contratación

Objetivo: nuevos nombres, selector ilimitado, quote común, estados pending/legacy y Plus destacado.

Archivos: pricing page/cards, onboarding, mi-plan, website gates y traducciones.

Pruebas: 1/2/7/8/100 profesionales, móvil, accesibilidad y errores.

Terminada cuando la cifra visible coincide con el motor y no quedan nombres nuevos incorrectos.

### Fase 7 — Validación integrada

Objetivo: probar todo con providers sandbox, dataset anonimizado, flags cerrados y observabilidad.

Pruebas: unitarias, integración, contractuales, E2E, carga, concurrencia y seguridad.

Terminada cuando se cumplen los criterios de 08 y no hay mismatches críticos.

### Fase 8 — Lanzamiento único

Objetivo: activar catálogo, entitlements, web Plus, Puri+, Contact Flow y UI en una sola ventana.

Antes: backup verificado, migración expansiva aplicada, flags públicos cerrados, runbook, soporte, alertas y comunicación aprobada.

Durante: habilitar backend invisible, validar smoke checks, activar una sola bandera comercial global y monitorizar.

Después: reconciliar pagos, entitlements, cuota, emails, webs, Puri y reservas; congelar cambios si hay alerta.

## Camino crítico

1. Decisiones de prorrateo y provider.
2. Catálogo único y snapshot.
3. Ledger de cupos y webhooks.
4. Inventario y migración legacy.
5. Entitlement Web/Plus.
6. Puri+ con aprobación.
7. Contact Flow y legal.
8. UX final.
9. E2E integrado y lanzamiento.

Contact Flow y Puri+ pueden desarrollarse en paralelo después de definir entitlements, pero el lanzamiento depende de ambos.

## Feature flags

Flags técnicos sugeridos:

- COMMERCIAL_CATALOG_V2;
- COMMERCIAL_ENTITLEMENTS_V2;
- SEAT_CHANGES_ENABLED;
- PURI_PLUS_ENABLED;
- CONTACT_FLOW_ENABLED;
- CONTACT_FLOW_SEND_ENABLED;
- WEBSITE_INCLUDED_IN_PLUS;
- PRICING_NEW_NAMES;
- SINGLE_LAUNCH_ENABLED.

Todos deben ser server-side, auditados y con kill switch. Un flag de UI no puede habilitar billing o envío.

## Checklist de lanzamiento único

- catálogo y precios aprobados;
- IVA/copy/legal aprobados;
- provider sandbox verificado;
- migración expandida aplicada;
- backup y restore ensayados;
- snapshots de legacy completos;
- dual-read sin discrepancias críticas;
- provider webhooks firmados e idempotentes;
- cupos concurrentes sin sobreventa;
- webs existentes visibles y sin doble cobro;
- Puri+ con límites y aprobación;
- Contact Flow con consentimiento, baja, suppression y cuotas;
- Resend presupuesto y webhooks;
- móvil/accesibilidad;
- métricas y alertas;
- soporte y runbook;
- flags públicos cerrados hasta la ventana;
- smoke test de pricing, checkout, acceso, web, Puri y envío;
- plan de recuperación y responsables.

## Recuperación

- apagar flags de activación;
- bloquear nuevos checkouts/cupos/envíos;
- conservar operaciones UNKNOWN para reconciliar;
- volver a read model legacy si el entitlement nuevo no es confiable;
- no borrar datos ni restaurar backup sin evaluación;
- conciliar provider IDs antes de reintentar;
- comunicar estado a soporte y negocios afectados;
- reanudar solo con criterio de aceptación documentado.

## Matriz de trazabilidad

| Requisito | Evidencia actual | Diseño propuesto | Fase | Pruebas |
| --- | --- | --- | --- | --- |
| Nuevos planes Puragenda/Plus | INDIVIDUAL/EQUIPO/TEST en constants y schema | Catálogo versionado + aliases legacy | 1, 6 | pricing, migration |
| Precio base y diferencia 10.000 | PRICING actual solo Individual/Equipo | quote único y Plus fijo | 1 | unit/property |
| Cupos ilimitados acumulativos | extraStaffCount y tope 20 | items/ledger de seats y fórmula | 1, 2 | 1/2/7/8/100, race |
| Aumento/reducción sin perder historia | Staff + contador, sin ledger | SeatChangeRequest y snapshots | 2 | concurrent changes |
| Provider y prorrateo | MP update y Paddle checkout | adapters, preview, fecha efectiva | 2 | contract/provider |
| Trial, descuentos, referidos | campos Subscription y PlatformDiscount | BenefitSnapshot y precedencia | 1, 2, 6 | benefits |
| Puri estándar/Plus | Puri read-only y permisos | capability policy y recommendation workflow | 4 | permissions/cost |
| SQL antes que IA | tools deterministas y telemetry | signals/projections/cache | 4 | fallback/cost |
| Puri no ejecuta acciones | prompt V1 solo lectura | prepare/approve/execute separado | 4, 5 | double approval |
| Contact Flow configurable | campaña manual Resend | DSL, enrollment, outbox y worker | 5 | concurrency/retry |
| Cuotas y protección Resend | 50/100 mensual, batch síncrono | diario/mensual/global + kill switch | 5 | quota/isolation |
| Consentimiento y bajas | acceptsMarketing booleano | consent ledger, suppression, No Molestar | 5 | opt-out/webhook |
| Atribución de reservas | no existe | signed token y attribution | 5 | E2E booking |
| Web incluida en Plus | Resolver sombra y bloqueo de compra independiente, iteración 5 | cutover conjunto de todos los gates aún pendiente | 3 | website-commercial-access, PostgreSQL migration |
| Webs existentes preservadas | Datos web/founder/dominios/media comparados antes/después | suspensión comercial sombra sin borrar contenido | 3 | commercial-migration-postgres |
| Dominios/media/hosting | módulos actuales intactos y host sombra por tenant verificado | integrar la política al lanzamiento único | 3 | domain/media legacy + host sombra |
| Propuesta voluntaria y aceptación | Payload inmutable, hash, propietario y expiración | UX Mi Plan y decisión de beneficios especiales pendientes | 3 | owned boundary, stale/approval races |
| Fin de doble facturación web | Transición y lectura terminal canónica; no ejecutor externo | comprobar coordinación/corte real sandbox antes de ejecutar | 3 | activo, programado, UNKNOWN, pago/cancelación |
| UX nuevos nombres | pricing actual Individual/Equipo | cards, selector y estados | 6 | mobile/a11y |
| Rentabilidad | telemetry parcial; tarifas externas faltantes | budgets, cost dashboard, scenarios | 0, 4, 5, 7 | cost alerts |
| Chile diciembre 2026 | privacidad y SERNAC existentes | legal gate y consent/versioning | 0, 5 | legal checklist |
| Git aislado y no producción | checkout original dirty; worktree limpio | feature/puragenda-next y flags | 0, 7, 8 | git/preflight |
| Lanzamiento único | flags web actuales | flag global y checklist | 7, 8 | smoke/rollback |
| Migración sin destrucción | migraciones web aditivas | snapshots, dual-read, no deletes | 3 | migration fixture |
| Webhooks duplicados/desordenados | guards MP/Paddle parciales | inbox/event ledger unificado | 2, 5 | contract/integration |
| Separación entre negocios | getBusinessForUser/RLS | tenant scope en cada job/tool | todas | negative isolation |
| Plan de pruebas completo | suites actuales provider/Puri/web | matriz unit/integration/contract/E2E | 7 | acceptance gate |
| Documentación permanente | docs existentes por módulos | este directorio de 10 docs | 0 | link/inventory check |

## Tareas siguientes de Codex

1. Convertir las decisiones pendientes en una lista de aprobación y conservar el catálogo aislado como contrato.
2. Diseñar la integración compatible con modelos comerciales, cupos contratados y snapshots de suscripción.
3. Extender el simulador hacia snapshots anonimizados antes de tocar proveedores o migraciones.
4. Validar en sandbox el prorrateo y los cambios de cupos de Mercado Pago/Paddle.
5. Esperar aprobación explícita antes de crear migraciones de producción o tocar checkout.
## Estado de Iteración 2

Implementado:

- src/core/commercial-catalog.ts: catálogo versionado, quotes mensuales, recargo acumulativo, desglose y metadatos descriptivos.
- tests/core/commercial-catalog.test.ts: 16 pruebas unitarias con tabla, monotonicidad, límites, overflow, planes/versiones/ciclos inválidos, legacy y repetibilidad.
- scripts/compare-commercial-catalog.ts: simulador local sin providers ni DB.
- package.json: comando compare:commercial-catalog.

La suite no se conecta a Mercado Pago, Paddle, Resend, OpenAI ni base de datos. Los cálculos legacy en subscription.service.ts y websites/commercial.ts no fueron reemplazados. La validación completa quedó documentada en el reporte de la iteración.

La base de Git seleccionada es origin/main 34187de4. El único código nuevo de producto es el motor aislado; no hay migraciones, checkout, UI pública ni activación de capacidades.

### Diferencias registradas por el simulador

- En cantidades representables por Equipo, el cálculo legacy de servicio coincide con Puragenda hasta 25 profesionales.
- La función pública commercialQuote limita extras a 20, por lo que su máximo equivalente es 25 profesionales.
- Para 100 profesionales, Puragenda calcula 314.990 CLP; el motor público legacy queda en 89.990 CLP y diverge en 225.000 CLP.
- Para 2, 3 y 4 profesionales, el catálogo nuevo tiene precio válido, pero el modelo legacy no tiene una representación equivalente porque Individual solo admite un profesional y Equipo parte en cinco.

La integración de billing y la sustitución de los calculadores legacy quedan para la siguiente fase.

## Iteración 3 — estado implementado, 22-10-2026

La infraestructura interna de la fase comercial está comprobada en PostgreSQL aislado. Billing V2 no está terminado: faltan adaptadores reales, prueba de firma/preview/conciliación con proveedores sandbox, política tributaria/prorrateo y migración voluntaria. Todos los flags efectivos permanecen cerrados. No se despliega ni se propone todavía activar permisos de clientes.

Detalles y limitaciones: [infraestructura](./11-infraestructura-comercial-iteracion-3.md) y [validación](./12-iteracion-3-validacion.md).

## Iteración 4 — actualización de estado, 22-10-2026

La capa de billing ahora tiene adaptadores SDK y operaciones persistentes verificables. La siguiente puerta es credenciales/precios V2, ciclo sandbox real, política tributaria/prorrateo y validación del corte de renovación. Después: migración voluntaria de clientes, inclusión de web y UX comercial, conservando el lanzamiento único.

Ver [billing y proveedores](./13-billing-v2-y-proveedores.md) y [validación final](./14-iteracion-4-validacion.md).

## Iteración 5 — actualización de estado, 22-10-2026

La infraestructura de migración voluntaria y web Plus está implementada y comprobada en sombra. No habilita aún los gates productivos ni cambios externos. La siguiente fase desarrolla Puri+ sobre entitlements, permisos y señales deterministas, conservando propuestas/aprobación separadas de Contact Flow. Continúan los bloqueos de proveedores y decisiones monetarias de iteración 4.

Ver [web y migración comercial](./15-web-plus-y-migracion-comercial.md) y [validación A–J](./16-iteracion-5-validacion.md).
