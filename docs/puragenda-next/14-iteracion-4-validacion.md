# 14 — Validación final de la iteración 4

Fecha: 22-10-2026, America/Santiago. Implementación técnica: [13 — Billing V2 y proveedores](./13-billing-v2-y-proveedores.md).

## A. Git y alcance

Inicio limpio en `feature/puragenda-next`, HEAD `d5597d1`, conservando `8a7d44e`, `e471373`, `c44a5f2` y `888530e`. Trabajo limitado a `C:\Users\diego\.codex\worktrees\puragenda-next-audit\agenda`. No se modificaron otros worktrees, commits ajenos ni referencias remotas. No hubo merge, rebase, reset, push o despliegue.

Los cambios se separaron en commits de baseline, Mercado Pago, Paddle, operación/reconciliación, validación de build y documentación. La lista exacta se incluye al final. La entrega termina con el worktree limpio.

La comparación con la base confirma que `subscription.service.ts`, `subscription-billing.service.ts`, `lib/paddle.ts`, `paddle-webhook.service.ts`, los webhooks productivos y el pricing público siguen sin cambios. Las nuevas rutas y escritores están cerrados por defecto y se rechazan en production.

## B. Migraciones

La causa histórica no es solo el orden de marketing: la creación de Client no está registrada en la cadena que luego intenta alterarla. También existe SQL de AppointmentReview sin representación en el schema del commit base. No se reescribieron esos archivos ni se inventó su aplicación sobre bases vacías.

Se agregó un baseline congelado, con esquema y objetos no-Prisma auditables, y un runner que monta baseline + las migraciones forward originales. La instalación nueva usa Prisma migrate deploy. La adopción legacy verifica estructura, checks, RLS, índices y trigger antes de registrar un baseline cuyos efectos ya existen; conserva todas las filas históricas anteriores. Un schema diferente, un historial fallido o una política RLS pública no versionada detienen el proceso. El ensayo negativo de política manual comprobó que el rechazo ocurre antes de registrar el baseline y conserva el historial anterior.

Verificado con PostgreSQL 17.2 real:

| Caso | Resultado |
| --- | --- |
| Instalación vacía | Baseline + infraestructura comercial + billing sandbox aplicados por Prisma. |
| Actualización legacy representativa | Datos de negocio, contrato especial y add-on web idénticos antes/después. |
| Historial existente | Registro previo conservado íntegro; no se borró `_prisma_migrations`. |
| Segunda ejecución de ambos procedimientos | Datos e historial sin cambios inesperados. |
| Consistencia final con Prisma | `migrate diff` vacío en ambos procedimientos y en cada nueva base de la suite. |
| Objetos no-Prisma | Verificados 56 checks, 76 tablas con RLS documentado, tres índices parciales y trigger de capacidad de reservas. |
| Tablas nuevas de billing | RLS, grants revocados, constraints monetarios/entorno y unicidad de intención verificados en PostgreSQL. |

Las pruebas crean bases efímeras nuevas; ya no borran el schema de una base existente. Los comandos rechazan destinos remotos y se limitan a nombres locales de prueba. No se ejecutó el procedimiento sobre una copia productiva ni se comprobó equivalencia con objetos manuales externos al repositorio. El replay directo del historial antiguo sigue siendo una ruta inválida para una instalación vacía; se sustituye por el bootstrap documentado.

## C. Mercado Pago

Implementado: SDK oficial, comprobación de cuenta de prueba chilena, alta por monto V2 exacto, lectura, búsqueda de resultado desconocido, actualización controlada, vínculo factura/pago/contrato, verificación HMAC y normalización de estados.

Comprobado con fixtures contractuales y PostgreSQL: autorización pendiente sin derechos, pago aprobado suficiente, importe incorrecto, pago pendiente, factura/referencia ajenas, duplicados concurrentes, timeout tras aceptación remota, fallo de persistencia, reembolso, contracargo y cancelación canónica. La cancelación revoca acceso en sombra y una aprobación antigua no lo restaura. Se usó la verificación criptográfica real del SDK.

**No comprobado contra MP sandbox real:** no hay credencial V2 ni cuenta de prueba configurada en el proceso. No se hizo una mutación externa. El upgrade inmediato sigue bloqueado porque un PUT de monto no demuestra prorrateo. El corte exacto de renovación requiere validación real; el alta tampoco equivale a una prueba de cobro.

## D. Paddle

Implementado: SDK oficial, consulta y validación de precios, preview de alta/actualización, lista completa de ítems, conservación de add-ons/metadata, prevent_change, consulta de transacciones/ajustes, firmas con unmarshal y normalización para conciliación.

Comprobado contractualmente: upgrade/downgrade, cupos, add-on retenido, prorrateo inmediato y siguiente período como conceptos diferentes, preview cambiado, pago fallido/past_due, timeout, moneda no aprobada, bindings incorrectos, reembolso completo/parcial y chargeback. Las firmas se verifican con el SDK real, sin mockear unmarshal.

**Sandbox real:** solo una consulta autenticada al catálogo mediante MCP Paddle sandbox. Se encontraron tres precios legacy USD y ningún precio V2 aprobado. No se reutilizaron esos precios ni se crearon recursos de cobro.

**No comprobado:** preview, alta, actualización, liquidación y calendario V2 reales desde nuestras clases SDK. Faltan clave privada/secreto V2 en el proceso y una definición aprobada de precios internacionales. No se inventó ningún Price ID ni una equivalencia CLP/USD.

## E. Seguridad, dinero y compatibilidad

- Quote, preview, operación externa, pago y activación quedan separados y persistidos.
- El claim se confirma antes de la red. El SDK MP tiene retries desactivados y sus fallos HTTP/red se prueban con un solo intento de escritura. EXECUTING/UNKNOWN impiden una segunda mutación automática, incluso después de perder un resultado o fallar la persistencia.
- Se validan tenant, referencia, proveedor, cuenta, moneda, importe, contrato e intervalo efectivo; las entradas de navegador no fijan estado comercial.
- Una operación aceptada o una autorización no habilitan cupos. Un prorrateo se valida contra el cargo esperado del preview y no contra el precio mensual completo.
- Webhooks duplicados no duplican aplicación. La observación canónica y sus fechas evitan que un pago antiguo restaure derechos después de revertirlo.
- La reducción con exceso de Staff conserva estado pagado y conflicto; no elimina profesionales ni reservas.
- El downgrade conserva BusinessWebsite y términos congelados. La transición de web legacy a Plus exige una migración explícita para evitar doble cobro; los ítems Paddle retenidos que aún no están identificados también bloquean ejecutar Plus hasta revisión.
- No se mezclan credenciales V2 y legacy. Paddle está fijado a sandbox; MP exige señales adicionales de cuenta y pago de prueba. No hay fallback a producción.
- Todos los flags efectivos de lanzamiento siguen falsos. La base y los contratos deben ser fixtures locales. Las tablas nuevas no se exponen a roles públicos.
- El build elimina credenciales del entorno del subproceso y rechaza archivos `.env` ambientales. La revisión de patrones no encontró credenciales reales en los cambios; no se imprimieron valores.

Los contratos Individual, Equipo, Test, transferencia, descuentos, meses gratuitos, promociones, referidos, trials, anualidad y founder siguen en sus flujos existentes. No se migraron negocios reales ni se reemplazaron identificadores de proveedor.

## F. Pruebas y build

| Comprobación final | Resultado exacto |
| --- | --- |
| Suite completa con PostgreSQL habilitado (`test-commercial-postgres.mjs --all`) | **217 archivos aprobados, 6 omitidos; 1.477 tests aprobados, 131 omitidos, 0 fallos.** |
| PostgreSQL comercial independiente | **44/44 aprobados**: 27 heredados + 17 nuevos. |
| Adaptadores y frontera HTTP nuevos | **22/22 aprobados**: 18 contractuales/SDK + 4 HTTP. |
| Migraciones | Dos bases nuevas: bootstrap y legacy; schema, datos e historial comprobados, incluida repetición. |
| `npm run typecheck` | Exit 0; route types y TypeScript sin errores. |
| `npm run lint` | Exit 0; 0 errores y las mismas 32 advertencias existentes. |
| ESLint de archivos de esta iteración | Exit 0; 0 errores, 0 advertencias. |
| Prisma validate / generate | Aprobados. |
| `npm run build:commercial:isolated` | **Exit 0**: compilación optimizada Next.js 16.3.8, TypeScript, datos de páginas y prerender completados. |
| Diff, secretos y aislamiento | Verificados; no hay cambios en checkout, pricing, permisos o webhooks productivos. |

La base de comparación era 1.438 aprobadas y 131 omitidas. Se añadieron 39 pruebas ejecutadas sin aumentar las omitidas. Las 131 omisiones corresponden a otras suites opt-in; no se presentan como aprobadas.

Durante el desarrollo se corrigieron fallos de fixtures (IDs repetidos, forma de payloads de ajustes, ruta HTTP del SDK y reloj del ensayo de cancelación) y una inferencia excesivamente estrecha del tipo UUID en un helper. El último TypeScript y build ya incluyen la corrección. El fallo histórico de replay de migraciones permanece identificado y se resuelve operativamente mediante la ruta de baseline, sin ocultarlo como un replay exitoso.

El build mostró avisos esperables del email legacy al no tener RESEND_API_KEY; el entorno no tiene credenciales de envío y no se enviaron correos. No se hizo despliegue ni arranque público de la aplicación.

Los logs están en `scratch/`, fuera de Git; las bases desechables se conservaron en el clúster PostgreSQL local usado para el ensayo, sin datos productivos. La evidencia financiera de pruebas lleva origen `CONTRACT_FIXTURE`; **no se considera un cobro real de sandbox**.

Evidencia local: `commercial-migration-validation-final.log`, `commercial-billing-integration-final.log`, `commercial-provider-tests-final.log`, `commercial-iteration4-full-suite.log`, `commercial-iteration4-typecheck-final.log`, `commercial-iteration4-eslint-full.log`, `commercial-iteration4-lint-final.log` y `commercial-production-build-final.log`, todos bajo `scratch/`. Las bases bootstrap y legacy están identificadas en el log de migraciones. Se detuvo el clúster local al finalizar.

## G. Bloqueos y decisiones

1. Credenciales V2 de MP/Paddle y secretos de notificación no disponibles para los SDK. El MCP Paddle permite lectura, pero no entrega una credencial para las clases de la aplicación.
2. Precios V2 internacionales inexistentes/no aprobados en el catálogo consultado; no se crearon precios por suposición.
3. IVA neto/bruto, fiscalidad internacional, política final de prorrateo, anualidad V2 y nuevos trials pendientes.
4. Corte de renovación y carreras con facturación automática pendientes de prueba real. Los flags de validación no constituyen esa evidencia.
5. Un alta Paddle cuyo resultado se pierde antes de guardar el ID no tiene aquí un lookup seguro garantizado: se conserva UNKNOWN para revisión, sin duplicarla.
6. Las bases legacy con objetos fuera del perfil de baseline (por ejemplo AppointmentReview), deriva o políticas manuales necesitan inspección autorizada. Esta entrega no demuestra adopción productiva universal.
7. No hay todavía UX nueva, worker productivo de renovación/abandono ni migración integral de webs. Los escritores y webhooks sandbox no se conectan a clientes reales.

## H. Siguiente fase

Primero, completar precios/credenciales y ensayar ciclos V2 reales en sandbox con trazas de preview, contrato, transacción, pago y período. Cerrar IVA y estrategias de cambio antes de ofrecerlas. Después, inventariar contratos anonimizados autorizados y preparar migración voluntaria con conservación de beneficios, inclusión de web en Plus sin doble cobro y la experiencia comercial con autorización por propietario. Mantener entitlements en sombra y el único lanzamiento público como puerta final.

## Commits locales

- `0832b8b` — baseline y procedimientos reproducibles.
- `3370763` — adaptador Mercado Pago sandbox.
- `416e4f2` — adaptador Paddle, contratos y firmas.
- `9dad943` — persistencia, conciliación y aplicación de pagos.
- `9b711ed` — compilación production aislada y validación de fixtures.
- `bdf5021` — rechazo de políticas RLS manuales antes de adoptar el baseline.
- `cec7b5d` — revisión obligatoria de add-ons retenidos y cambios en el total recurrente del preview.
- `6d54ee4` — desactivación de retries implícitos del SDK MP y ensayos HTTP/red de un solo intento.
- `6a67175` — cancelación canónica en PostgreSQL y rechazo de aprobaciones antiguas.
- Cierre documental: `docs(puragenda-next): record iteration 4 billing and validation` (SHA en la entrega final y `git log`).

## Archivos modificados

La lista siguiente contiene todos los cambios de esta iteración respecto de `d5597d1`.

- `docs/puragenda-next/03-precios-y-suscripciones.md`
- `docs/puragenda-next/06-migracion-clientes.md`
- `docs/puragenda-next/08-pruebas-y-seguridad.md`
- `docs/puragenda-next/10-roadmap-lanzamiento.md`
- `docs/puragenda-next/11-infraestructura-comercial-iteracion-3.md`
- `docs/puragenda-next/12-iteracion-3-validacion.md`
- `docs/puragenda-next/13-billing-v2-y-proveedores.md`
- `docs/puragenda-next/14-iteracion-4-validacion.md`
- `docs/puragenda-next/README.md`
- `package.json`
- `prisma/bootstrap/00000000000000_legacy/migration.sql`
- `prisma/bootstrap/legacy.prisma`
- `prisma/bootstrap/manifest.json`
- `prisma/bootstrap/security.sql`
- `prisma/migrations/20261022120000_commercial_billing_sandbox/migration.sql`
- `prisma/schema.prisma`
- `scripts/build-commercial-isolated.mjs`
- `scripts/commercial-migrations.mjs`
- `scripts/test-commercial-migrations.mjs`
- `scripts/test-commercial-postgres.mjs`
- `src/app/api/internal/commercial-sandbox/webhooks/[provider]/route.ts`
- `src/server/commercial-billing/contracts.ts`
- `src/server/commercial-billing/mercadopago-sandbox.ts`
- `src/server/commercial-billing/operations.ts`
- `src/server/commercial-billing/paddle-sandbox.ts`
- `src/server/services/commercial-internal.ts`
- `tests/fixtures/commercial-provider-fixtures.ts`
- `tests/integration/commercial-billing-postgres.integration.test.ts`
- `tests/integration/commercial-v2-postgres.integration.test.ts`
- `tests/server/commercial-provider-adapters.test.ts`
- `tests/server/commercial-sandbox-webhook.route.test.ts`
