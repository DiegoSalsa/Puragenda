# Iteración 3 — validación y entrega

Fecha: 22-10-2026 (America/Santiago). Complementa [la arquitectura implementada](./11-infraestructura-comercial-iteracion-3.md).

## Resumen ejecutivo

Se implementó infraestructura comercial funcional y persistente, con migración expansiva, cotizaciones V2, cupos contratados, solicitudes idempotentes, ledger conciliable, entitlements en sombra y backfill local reanudable. El comportamiento productivo sigue usando el modelo legacy. Ningún proveedor recibe operaciones nuevas y ningún cliente recibe derechos V2.

No se declara completo billing V2. El contrato de verificación de evidencia tiene una implementación de fixtures para pruebas; faltan los adaptadores oficiales y su validación real en sandbox. No hubo conexiones a bases productivas, despliegue, correos, merge ni push.

## Estado Git inicial y final

- Worktree: `C:\Users\diego\.codex\worktrees\puragenda-next-audit\agenda`.
- Rama: `feature/puragenda-next`.
- Inicio: `e471373`, sobre `888530e` y `c44a5f2`; referencia local `origin/main=34187de`.
- Se conservaron los cambios sin commit que ya estaban en la iteración, incluidos los reformateos previos de Prisma. Los servicios incompletos se corrigieron y ampliaron.
- El checkout original y los otros worktrees se dejaron intactos. Las ramas recientes se revisaron de solo lectura.
- Commit de implementación local: `8a7d44e` — `feat(commercial): add isolated subscription, seat and entitlement infrastructure`.
- Commit documental local de cierre: `docs(puragenda-next): document iteration 3 validation and provider limits` (su SHA se informa en la entrega final y en `git log`).
- Estado final esperado tras ese commit: worktree limpio. La base y los tres commits anteriores permanecen como ancestros; no se actualiza ninguna referencia remota.

## Modelos, migración y servicios

Los cinco modelos y sus responsabilidades, estados, constraints, RLS y contratos se describen en el documento 11. El SQL es exclusivamente aditivo; el entorno de ensayo fue un clúster PostgreSQL **17.2**, creado en `scratch/commercial-pg`, escuchando solo en `127.0.0.1:55443`. La única base afectada fue `puragenda_commercial_test`.

`prisma migrate deploy` reveló un problema histórico anterior a esta iteración: `20260505_add_marketing_campaigns` referencia `Client` antes de existir, con `P3018 / 42P01`. Para verificar el upgrade nuevo se reconstruyó el schema de `e471373` y se aplicó encima esta migración. El script es reproducible y rechaza destinos remotos.

Se comprobó además la equivalencia entre el resultado de la migración y el modelo Prisma con `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`: resultado **empty migration**. RLS, checks e índices parciales se validan mediante SQL/pruebas porque no se expresan íntegramente en Prisma.

## Motor de cupos y entitlements

Un negocio tiene una capacidad contratada independiente del número de Staff activos. Un profesional asociado a varias sucursales se cuenta una vez. Las solicitudes congelan la cotización del catálogo, con todos sus escalones. Un pago pendiente no suma cupos. Los cambios comparten un lock de Business, releen datos tras bloquear y aplican contrato/ítems/entitlements/ledger de forma atómica.

Las reducciones se programan para la renovación, registran conflicto si sobran profesionales y necesitan resolución y evidencia del contrato antes de aplicarse. La historia no se elimina. Los reintentos de solicitud siguen siendo idempotentes incluso si ya pasó su fecha efectiva; las aplicaciones duplicadas devuelven alreadyApplied.

El servicio sombra evalúa fechas de contrato, trial y gracia; no sustituye acceso legacy. La autorización del usuario combina la licencia con los permisos actuales y la asociación activa a una sucursal del negocio. Los empleados no heredan derechos financieros por Plus. No hay una ruta que permita escribir estados, importes o evidencia desde el navegador.

## Compatibilidad legacy y simulación

La captura preserva INDIVIDUAL/EQUIPO/TEST, trial, overrides, descuento, meses gratis, promociones, referidos/premios, pago manual y add-on web. El límite manual no cambia el cálculo de extras ya pactados. No se recalcula una oferta founder ni se cancela un complemento. Las notas libres se representan por hash y los IDs de pago históricos no se consideran evidencia V2 conciliada.

Resultado del [simulador reproducible](./iteration-3-backfill-fixtures.json):

| Fixture | Cupos | Importe de referencia CLP | Acceso legacy / sombra | Resultado relevante |
| --- | ---: | ---: | --- | --- |
| equipo | 7 | 35.990 | sí / sí | Tarifa local aún sin evidencia de proveedor. |
| individual | 1 | 12.990 | sí / sí | Detecta activos por encima del cupo en el fixture. |
| test | 1 | 1.000 | sí / sí | Conserva TEST y señala exceso de activos. |
| discount | 7 | desconocido | sí / sí | Conserva descuento, no inventa importe efectivo. |
| website | 7 | 35.990 base | sí / sí | Add-on preservado con importe desconocido separado. |
| trial-free-months | 7 | desconocido | sí / sí | Conserva trial y saldo gratuito. |
| past-due | 7 | 35.990 referencia | no / no | Exige reconciliación; sin gracia inventada. |
| manual-price | 3 | 9.990 | sí / sí | Conserva acuerdo manual y límite absoluto. |
| incomplete | 7 | 35.990 referencia | sí / sí | Warning por período faltante; no cambia acceso legacy. |
| international-unresolved | 7 | desconocido | sí / sí | No convierte USD a CLP ni inventa precio. |

Todos los fixtures contienen historia de Staff inactivo, que se detecta y conserva. No se procesaron suscripciones reales. En PostgreSQL, ejecutar dos veces el backfill produce un snapshot y un ledger por origen; cambios posteriores generan revisión por deriva. El batch avanza con cursor y limita el tamaño a 100.

## Pruebas y resultados exactos

| Verificación | Resultado |
| --- | --- |
| Suite inicial heredada | 209 archivos aprobados, 6 omitidos; 1.383 pruebas aprobadas, 131 omitidas y 1 fallo en un test de la nueva migración que ya estaba sin commit. Se corrigió la expectativa del nombre del enum. |
| Suite completa final con PostgreSQL V2 habilitado | **214 archivos aprobados, 6 omitidos; 1.438 pruebas aprobadas, 131 omitidas; 0 fallos.** |
| Runner independiente de PostgreSQL V2 | **27/27 pruebas aprobadas**, usando servicios y transacciones reales. |
| `npm run typecheck` | Aprobado: `next typegen` y TypeScript sin errores. |
| `npm run lint` | Aprobado: **0 errores, 32 warnings** en archivos existentes ajenos a esta implementación. |
| ESLint de archivos comerciales/scripts/tests modificados | Aprobado: **0 errores y 0 warnings**. |
| `prisma validate` / `prisma generate` | Aprobados. |
| Nueva migración sobre baseline legacy local | Aplicada correctamente y ejercitada por las pruebas. |
| Comparación schema real → Prisma | **Empty migration**, sin diferencias estructurales. |
| Simulador de backfill | 10 fixtures anónimos procesados; JSON guardado y reproducible. |
| `git diff --check` | Aprobado. |

Las 131 pruebas omitidas corresponden a otras suites opt-in sin su configuración específica. No se presentan como aprobadas. No se hizo build productivo ni se probaron firmas/previews contra cuentas de proveedor; los contratos y el rechazo de un verificador fallido sí tienen pruebas locales.

Las 27 pruebas PostgreSQL cubren:

- persistencia y desglose de precios para 1, 2, 5, 6, 8 y 100 profesionales;
- compra pendiente sin capacidad adicional;
- dos aumentos simultáneos y constraint de una solicitud abierta;
- idempotencia de solicitud, doble aplicación concurrente y reintento tras resultado perdido;
- dos creaciones concurrentes de Staff, reactivación bloqueada e historia inactiva;
- un Staff en dos sucursales y rechazo de ubicación de otro negocio;
- reducción programada con conflicto, resolución explícita y conservación de historial;
- evento duplicado, desorden temporal y empate ambiguo sin conceder nuevos derechos;
- rechazo de importe/referencia/tenant/evidencia inválidos, incluyendo FK compuesta;
- revocación de entitlements al cancelar, cotización alterada y rechazo persistido de solicitud obsoleta;
- backfill repetible de los tres planes, beneficios, web, precio manual y trial/past_due;
- resolución posterior de UNKNOWN y cancelación idempotente de solicitud impaga;
- detección de deriva legacy y cursor de batch;
- transiciones past_due → pago recuperado → cancelación;
- RLS y revocación de grants client-side aun cuando existían grants por defecto.

Las pruebas unitarias adicionales verifican separación de rol y entitlement, negocio resuelto desde sesión, allowlist contra mass assignment, ausencia de snapshot, aislamiento de errores, vigencia temporal, rechazo de anualidad V2, modos de prorrateo solo como borrador y bloqueo de escrituras remotas/productivas.

## Riesgos, restricciones y decisiones pendientes

1. **Baseline histórico:** la migración nueva funciona; toda la cadena desde una base vacía todavía no. Resolverlo sin reescribir migraciones ya aplicadas en producción.
2. **Proveedores:** no hay un adaptador V2 ejecutable. La evidencia de los tests no debe reutilizarse en clientes reales. Antes de conectar Paddle, usar `webhooks.unmarshal`, preview, SDK oficial y reconsulta canónica. Antes de conectar MP, demostrar el momento del cambio y la conciliación factura/pago.
3. **Dinero:** IVA, neto/bruto, anualidad V2 y política de prorrateo no están decididos. El motor persiste enteros dentro del rango PostgreSQL Int; los precios base siguen 12.990/22.990. No se infiere un precio internacional.
4. **Mercado Pago:** actualizar `transaction_amount` no prueba prorrateo de upgrades. Su prorrateo de alta con día fijo es una función diferente. La alternativa documentada es una intención local para renovar y, si no hay garantías, una nueva aceptación coordinada del contrato; ninguna está ejecutándose.
5. **Paddle:** el borrador exige todos los ítems y rechaza past_due. Posponer el cobro no implica posponer el cambio de plan. Retención de add-ons, moneda e impuestos deben contrastarse con preview, y la doble facturación de web requiere una migración explícita.
6. **Legacy:** las referencias de beneficios, precios manuales y webs necesitan inventario autorizado. Un warning no modifica un acuerdo. La captura no se actualiza automáticamente y la deriva se señala; todavía no existe dual-write ni migración voluntaria en producción.
7. **Lanzamiento:** no hay flags efectivos abiertos, Puri+, Contact Flow, pricing nuevo ni correos comerciales. Las tablas están cerradas a roles de navegador. La autorización administrativa sigue independiente de la licencia.

Las fuentes oficiales y las limitaciones de acceso a documentación están enlazadas en el documento 11. El MCP `paddle-docs` no estaba disponible: se utilizó la búsqueda de referencia del MCP Paddle y documentación oficial actual, sin operaciones de cuenta.

## Archivos modificados

Configuración/modelos:

- `package.json`
- `prisma/schema.prisma`
- `prisma/migrations/20261021120000_commercial_infrastructure_v2/migration.sql`

Motor y servicios:

- `src/core/commercial-entitlements.ts`
- `src/server/services/commercial-internal.ts`
- `src/server/services/commercial-subscription-v2.service.ts`
- `src/server/services/commercial-capacity.service.ts`
- `src/server/services/commercial-reconciliation.service.ts`
- `src/server/services/commercial-entitlements.service.ts`
- `src/server/services/commercial-access-shadow.service.ts`
- `src/server/services/commercial-backfill.service.ts`
- `src/server/services/commercial-billing-adapter.ts`
- `src/server/services/commercial-observability.service.ts`

Scripts/pruebas:

- `scripts/test-commercial-postgres.mjs`
- `scripts/simulate-commercial-backfill.ts`
- `tests/core/commercial-entitlements.test.ts`
- `tests/integration/commercial-v2-postgres.integration.test.ts`
- `tests/server/commercial-access-shadow.test.ts`
- `tests/server/commercial-backfill.service.test.ts`
- `tests/server/commercial-billing-adapter.test.ts`
- `tests/server/commercial-entitlements-shadow.test.ts`
- `tests/server/commercial-infrastructure.migration.test.ts`

Documentación:

- `docs/puragenda-next/README.md`
- `docs/puragenda-next/02-arquitectura-propuesta.md`
- `docs/puragenda-next/03-precios-y-suscripciones.md`
- `docs/puragenda-next/06-migracion-clientes.md`
- `docs/puragenda-next/08-pruebas-y-seguridad.md`
- `docs/puragenda-next/10-roadmap-lanzamiento.md`
- `docs/puragenda-next/11-infraestructura-comercial-iteracion-3.md`
- `docs/puragenda-next/12-iteracion-3-validacion.md`
- `docs/puragenda-next/iteration-3-backfill-fixtures.json`

Los logs, el clúster local y el respaldo del trabajo inicial están en `scratch/`, ignorado por Git. No contienen datos productivos. Los secretos no se escribieron en archivos versionados.

## Próxima fase

Conservar la rama cerrada al público. Aprobar las decisiones monetarias y de vigencia, implementar los adaptadores de facturación/verificación en sandbox con firmas y preview, y comprobar el corte de renovación con datos de prueba. Después, preparar inventario anonimizado y una migración comercial voluntaria y auditada. No activar billing V2 ni permisos de clientes antes de completar esas validaciones y la estrategia de despliegue de migraciones.
