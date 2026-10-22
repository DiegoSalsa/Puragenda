# 16 — Validación final de la iteración 5

Fecha: 22-10-2026, America/Santiago. Diseño y procedimientos: [15 — Web Plus y migración comercial](./15-web-plus-y-migracion-comercial.md).

## A. Resumen ejecutivo

Implementados un resolver web central en sombra, una política de contratación web independiente, propuestas inmutables persistidas, aprobación explícita por propietario y una transición recuperable de add-on a web incluida. La aplicación requiere pago, referencia, período, estado canónico del add-on y origen sin cambios.

La infraestructura funciona con servicios reales y PostgreSQL local. Las consultas de proveedor de las pruebas usan transportes contractuales y criptografía real de los SDK. No se activaron permisos V2 públicos, UX comercial, nuevos planes públicos ni operaciones externas de cobro/cancelación.

No están resueltos los ciclos V2 reales de sandbox, las decisiones monetarias, la migración económica de beneficios especiales, el ejecutor externo ni el cutover de gates productivos. Preparar esas fronteras no equivale a haberlas desplegado.

## B. Git y alcance

Inicio limpio en `feature/puragenda-next`, HEAD `7f271bf9659d5a90e4172e2a0022f7347a117632`. Se conservaron los diez commits de la iteración 4, incluidos los adaptadores, baseline y validación documental. El único worktree modificado fue `C:\Users\diego\.codex\worktrees\puragenda-next-audit\agenda`.

Commits locales de implementación:

- `653d186` — modelos privados, propuestas inmutables, transición y evidencia.
- `bf2f09a` — resolver web Plus/legacy en sombra y política de contratación.
- `edc5d27` — preview, aprobación, conciliación y coordinación con cupos/billing.
- `42e3022` — persistencia, continuidad, fallos, concurrencia y runners aislados.
- Cierre documental: `docs(puragenda-next): record iteration 5 migration and web validation`; su SHA se proporciona en la entrega final y `git log`.

No hubo merge, rebase, reset, push o despliegue. No se modificaron otros worktrees ni commits previos. La entrega se cierra con el worktree limpio.

## C. Entitlements web

`resolveWebsiteCommercialAccess` combina fuentes válidas de servidor. Plus efectivo y pagado incluye editor, preview, publicación, hosting, dominios y medios sin WebsiteAddon adicional. Puragenda estándar mantiene link/widget, sin esas capacidades. Se respetan vigencias, pago pendiente, gracia, cancelación y trial founder existente.

La política de compra independiente rechaza otra suscripción web cuando Plus ya la incluye y exige upgrade en el nuevo Puragenda estándar. El seam de gate conserva el resultado legacy por defecto y rechaza el cutover en production aun con flag.

El resolver de sesión combina entitlement con `website.manage`, pertenencia y sucursal autorizada. Tener Plus no amplía el rol. El host sombra consulta hostname exacto/verificado y devuelve suspensión sin configuración privada cuando no hay acceso.

Los gates actuales del panel, editor, publicación, checkout, dominios, media y host público permanecen en su implementación legacy. La integración de todos ellos con el resolver es un paso de cutover futuro, no una capacidad pública terminada en esta fase.

## D. Clientes legacy y conservación

Se conserva el derecho de WebsiteAddon vigente y las ofertas founder selladas, sin recalcular precio/eligibilidad. La migración sombra no actualiza Subscription, WebsiteAddon, WebsiteOfferEligibility ni proveedores reales.

Los tests comparan antes/después la suscripción legacy, oferta founder, BusinessWebsite, borrador, publicación, templateConfigs, subdominio, dominios y medios. El downgrade mantiene los datos y suspende solo la resolución comercial sombra. No hay llamadas a Cloudinary para borrar recursos ni a DNS para desconectar dominios.

Condiciones manuales, descuentos, promociones, meses gratuitos, referidos, transferencia, anualidad, Test, trial, cancelación y past_due generan revisión/bloqueo explícito. Sus términos quedan preservados; esta entrega no afirma haber implementado su equivalencia económica en V2.

## E. Propuestas y migración voluntaria

Preparar relee contrato, capacidad, condiciones, web y checkout; consulta el proveedor fuera del lock y vuelve a comprobar el fingerprint al persistir. El quote proviene del catálogo V2. Datos desconocidos permanecen null; la tarifa nominal y el cobro real son conceptos distintos.

La propuesta congela fecha, cantidad, fuente, payload, hash y expiración. Un trigger SQL impide modificar el payload o la identidad de una aprobación existente. El propietario confirma el hash exacto; la aprobación reconsulta contrato/preview y revalida el estado bajo lock de Business.

Los cambios locales o del proveedor invalidan el preview anterior. Un índice parcial y los mismos locks de cupos/billing evitan migraciones aprobadas contradictorias. Preparar/aceptar repetidamente no duplica contratos.

Por defecto la propuesta está BLOCKED por decisiones tributarias/renovación/validación real pendientes. Solo los ensayos contractuales aislados utilizan revisión fixture explícita. La fachada de cliente no admite ese parámetro.

## F. Facturación y doble cobro

La transición del add-on no se confunde con el estado del plan. Una cancelación programada sigue pendiente; un timeout queda UNKNOWN y se recupera mediante GET. Solo una cancelación terminal canónica permite continuar con el cambio base. Se conserva el período ya pagado.

La conciliación verifica firma, reconsulta canónica, referencia de propuesta/contrato, proveedor, importe, moneda, pago y período. Un pago aprobado con add-on aún activo no aplica la migración. Un pago anterior, ajeno o insuficiente tampoco la aplica.

La aplicación comercial es atómica e idempotente: evidencia, ítems, snapshot y entitlements se confirman juntos. Reembolso/contracargo/cancelación no permiten restauración mediante una aprobación antigua. El fin del add-on legacy no recorta la vigencia de hosting Plus.

No se implementó un ejecutor que cree cargos o cancele contratos externos. Por tanto, la coordinación real entre proveedores y su corte de renovación siguen pendientes. No hubo ninguna llamada de escritura a MP/Paddle ni una nueva lectura de cuenta comercial; la consulta MCP de esta iteración fue solo documentación. La lectura real del catálogo Paddle descrita en el documento 14 corresponde a la iteración anterior.

## G. Pruebas y validaciones ejecutadas

| Comprobación | Resultado final |
| --- | --- |
| Suite completa con PostgreSQL habilitado | **220 archivos aprobados, 6 omitidos; 1.543 tests aprobados, 131 omitidos, 0 fallos.** |
| PostgreSQL comercial | **79/79**: 44 anteriores + 35 nuevos. |
| Nuevas unitarias de resolver y autorización | **31/31**, también incluidas en la suite completa. |
| TypeScript y route types | `npm run typecheck`, exit 0. |
| ESLint completo | `npm run lint`, exit 0; 0 errores y las mismas 32 advertencias legacy. |
| Prisma | validate y generate aprobados con Prisma 7.10.0. |
| Bootstrap vacío y actualización legacy | Ambos aprobados, diff Prisma vacío, datos/historial preservados y segunda ejecución estable. |
| Producción aislada | `npm run build:commercial:isolated`, exit 0: compilación optimizada, TypeScript, datos de páginas y prerender completados. |
| Diff, secretos, permisos y flags | Revisados; sin cambios en pricing/checkout/webhooks/gates productivos. |

Respecto de 1.477/131 de la iteración 4 se añadieron **66 tests ejecutados**, sin aumentar las omisiones. Las 131 omitidas son otras suites opt-in, no validaciones aprobadas.

Casos nuevos comprobados:

- Individual/Equipo → Puragenda/Plus; capacidades y profesionales adicionales.
- Founder, trial existente, períodos, gracia, expiración, pendiente y cancelación.
- Términos especiales bloqueados y conservados, sin precio definitivo inventado.
- Doble aprobación, propuestas distintas concurrentes, pago concurrente y repetición idempotente.
- Modificación de hash/fecha/payload rechazada; source/provider/importe obsoletos invalidan.
- Checkout UNKNOWN, add-on aún facturando, cancelación programada Paddle y cancelación confirmada tras timeout.
- Pago insuficiente, firma inválida, contrato anterior, provider/tenant incorrecto y reembolso.
- Rollback de evidencia/contrato cuando falla la persistencia final; recuperación sin mutaciones externas.
- Preservación de web/dominio/media y suspensión segura del host sombra tras downgrade.
- Roles, pertenencia, dos sucursales, manipulación de businessId/precio y prueba negativa de FK entre negocios.
- RLS, grants privados, índice de migración abierta, trigger inmutable y constraints nuevos.

Durante el desarrollo se corrigieron fixtures incompletos (nombre obligatorio, restricciones de precio manual/publicación y relojes del evento), el orden determinista del inventario y el límite de vigencia heredado del add-on. No se relajaron constraints ni se omitieron pruebas para ocultar fallos.

Los avisos de Vite CommonJS y de consultas concurrentes de pg@8 no son errores de la suite. El build mantiene el aviso de email legacy sin RESEND_API_KEY; no se configuraron credenciales ni se enviaron correos reales.

Evidencia local ignorada por Git, en `scratch/`:

- `iteration-5-unit-final.log`
- `iteration-5-postgres-final.log`
- `iteration-5-full-suite.log`
- `iteration-5-typecheck-final.log`
- `iteration-5-eslint-full.log`
- `iteration-5-prisma-final.log`
- `iteration-5-migrations-final.log`
- `iteration-5-production-build-final.log`

Bootstrap y legacy finales: `puragenda_commercial_bootstrap_test_4e48efcd2138` y `puragenda_commercial_legacy_test_4e48efcd2138`. La suite completa utilizó `puragenda_commercial_test_93cfc49a6296`. Son bases locales de datos ficticios, conservadas para inspección; el clúster de ensayo se detuvo al finalizar.

La regresión legacy se comprobó con las suites automatizadas y comparación de archivos. No se inspeccionaron sitios, DNS o contratos de clientes reales ni se afirma una prueba E2E productiva. No hubo una UI nueva para probar con navegador.

## H. Seguridad

Escritores limitados a PostgreSQL loopback desechable, flags privados y proceso no productivo. Los flags fixture no son decisiones comerciales reales. La fachada deriva tenant/actor de sesión y exige propietario; Zod strict rechaza precios, evidencias, estados, fechas adicionales y políticas recibidas del navegador.

Las tres tablas tienen RLS y revocación de PUBLIC/anon/authenticated, FKs compuestas e índices de tenant/estado. Los nuevos logs no contienen credenciales, payloads, notas ni contenido web. Se mantuvieron los archivos de migración históricos y el runner canónico de baseline.

## I. Pendientes

1. Credenciales SDK y ciclos V2 reales de MP/Paddle sandbox, con webhooks y trazas verificables.
2. Precios internacionales aprobados; IVA neto/bruto y fiscalidad.
3. Política final de prorrateo, corte de renovación, anualidad y trials V2.
4. Migración económica de descuentos, meses gratuitos, acuerdos manuales, premios y referidos.
5. Ejecutor coordinado de cambios/cancelaciones con recuperación; la lectura terminal no prueba aún su funcionamiento real.
6. Cutover conjunto de panel, editor, publicación, billing, hosting, dominios y medios, más UX Mi Plan.
7. Ensayo autorizado con inventario legacy anonimizado y un único lanzamiento público. Nada de lo anterior se habilitó en clientes reales.

## J. Próxima fase: Puri+ y preparación para Contact Flow

1. Resolver `puri.plus` y permisos/sucursal con el mismo contexto comercial; conservar el orquestador Puri existente.
2. Crear señales SQL deterministas versionadas sobre ocupación, retorno y actividad, con ventanas y hashes reproducibles.
3. Persistir recomendaciones mínimas con evidencia agregada, versión, costo conocido/desconocido y expiración. No guardar listas de emails ni prompts crudos.
4. Añadir propuestas y aprobación explícita de propietario/rol autorizado. Una recomendación no concede permiso de envío o descuento.
5. Definir el contrato de futura entrega a Contact Flow: consentimiento, supresión, cuotas, idempotencia y outbox. Mantener su ejecución deshabilitada hasta construir y validar el motor.
6. Probar aislamiento, permisos, doble aprobación, límites de coste, fallback SQL y el comportamiento sin Plus. Continuar en sombra hasta el lanzamiento integral.

## Archivos de la iteración

24 archivos respecto de `7f271bf`:

- `docs/puragenda-next/02-arquitectura-propuesta.md`
- `docs/puragenda-next/03-precios-y-suscripciones.md`
- `docs/puragenda-next/06-migracion-clientes.md`
- `docs/puragenda-next/07-ux-ui-y-pricing.md`
- `docs/puragenda-next/08-pruebas-y-seguridad.md`
- `docs/puragenda-next/10-roadmap-lanzamiento.md`
- `docs/puragenda-next/15-web-plus-y-migracion-comercial.md`
- `docs/puragenda-next/16-iteracion-5-validacion.md`
- `docs/puragenda-next/README.md`
- `prisma/migrations/20261022180000_commercial_migration_web_plus/migration.sql`
- `prisma/schema.prisma`
- `scripts/build-commercial-isolated.mjs`
- `scripts/test-commercial-postgres.mjs`
- `src/server/commercial-billing/operations.ts`
- `src/server/commercial-migration/owned.ts`
- `src/server/commercial-migration/preview.ts`
- `src/server/commercial-migration/service.ts`
- `src/server/services/commercial-capacity.service.ts`
- `src/server/services/commercial-internal.ts`
- `src/server/services/commercial-subscription-v2.service.ts`
- `src/server/websites/commercial-access.ts`
- `tests/integration/commercial-migration-postgres.integration.test.ts`
- `tests/server/commercial-migration-owned.test.ts`
- `tests/server/website-commercial-access.test.ts`
