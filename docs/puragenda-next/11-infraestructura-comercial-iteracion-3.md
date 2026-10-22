# Iteración 3 — infraestructura comercial, cupos y entitlements

Fecha: 22-10-2026, America/Santiago. Rama: `feature/puragenda-next`.

La infraestructura interna funciona sobre PostgreSQL aislado. El catálogo V2 alimenta contratos, cotizaciones de cupos, reconciliación y evaluaciones comerciales sombra. **Billing V2 no está conectado a proveedores y no está terminado como integración de cobro.** No se modificaron rutas, checkout, pricing público, permisos operativos, Puri, webs ni reservas.

## Git y alcance

Inicio: HEAD `e471373`, conservando `888530e` y `c44a5f2`; `origin/main` local seguía en `34187de`. Sin fetch, reset, merge, rebase, deploy ni push. Existían cambios sin commit en `prisma/schema.prisma` y nueve archivos nuevos de esta iteración; se revisaron, conservaron y completaron. Incluían reformateos de Prisma que se conservaron. Una copia inicial está en `scratch/commercial-iteration3-initial/`, ignorada por Git.

Solo se escribió en `C:\Users\diego\.codex\worktrees\puragenda-next-audit\agenda`. El checkout original estaba modificado y se dejó intacto. Se compararon de solo lectura las ramas locales de billing profesional y pricing web: la base ya contiene límites manuales, precios de transferencia y buena parte del módulo web. No se fusionó código de otras ramas.

Se reutilizan catálogo y validación monetaria V2, `getStaffLimit`, `getSubscriptionAccessState`, permisos existentes, resolución del negocio desde sesión, Prisma y el lock de `Business` ya usado por Staff legacy. No se creó un segundo sistema de identidad o roles.

## Modelo y autoridad

| Modelo | Función |
| --- | --- |
| `CommercialSubscription` | Proyección de contrato por negocio: versión, plan, moneda/ciclo, estado, proveedor/referencias, períodos, trial/gracia, condiciones, precio, último evento y último pago conciliado. |
| `CommercialSubscriptionItem` | Base, cupos, add-on legacy o beneficio. Cantidad, moneda/versión, vigencia e información de precio. Los tramos marginales se guardan completos en `pricingSnapshot`; el cupo agregado no tiene un precio unitario uniforme. |
| `CommercialEntitlement` | Proyección reconstruible del contrato. No constituye una concesión editable independiente. |
| `CommercialEvent` | Ledger por origen e identificador único; hash canónico, resultado, fecha, correlación y datos mínimos para conciliación. |
| `SeatChangeRequest` | Capacidad anterior/solicitada, cotización completa e inmutable, versión, vigencia, estado, conflicto, idempotencia y evento que autoriza aplicar. |

Para legacy, `Subscription`/`WebsiteAddon` siguen siendo la autoridad. El backfill es una captura sombra: no se escribe de vuelta sobre ellos. Cambios posteriores de `updatedAt` en la suscripción o add-on invalidan la evaluación sombra y exigen revisión; repetir el backfill informa deriva, no sobrescribe acuerdos. La oferta web founder también queda conservada como evidencia.

Para los fixtures V2, la proyección de contrato solo cambia mediante servicios transaccionales y ledger. Los ítems y entitlements se actualizan dentro de la misma transacción. `snapshotHash` identifica la creación/backfill, no es el hash del contrato mutable después de cada cambio; las versiones posteriores se reconstruyen desde ítems con vigencia y eventos. No existe escritura pública a estas tablas.

Los precios CLP desconocidos son `null`, nunca cero por inferencia. En legacy, la tarifa calculable es referencia local, **no prueba del importe aceptado por el proveedor**. Se conservan descuentos, meses gratis, promociones, referidos, premio, override de próximo cobro, límite manual y precio manual. Si beneficios impiden conocer el importe efectivo, `totalPriceClp` es nulo. Las notas libres solo se conservan como hash. Los IDs de pagos históricos se marcan como no verificados para V2.

## Migración y controles

`prisma/migrations/20261021120000_commercial_infrastructure_v2/migration.sql` agrega siete enums y cinco tablas. No borra/renombra tablas o columnas ni actualiza filas legacy. Incluye:

- una suscripción por negocio y vínculo legacy único;
- claves únicas de eventos, solicitudes y evidencia aplicada;
- índice parcial de una sola solicitud abierta por negocio;
- un ítem actual por código; historial al cerrar/crear vigencias;
- foreign keys y constraints de tenant entre suscripción y solicitudes/entitlements/eventos;
- límites positivos, importes no negativos, orden de fechas, mensualidad y moneda CLP para V2;
- RLS en las cinco tablas y revocación de permisos de `PUBLIC`, `anon` y `authenticated`, incluso cuando hay grants por defecto como en Supabase.

El backend usa el rol de conexión Prisma. No se agregan políticas para acceso directo desde el navegador. La defensa combina grants y RLS, conforme a [Supabase: asegurar la API](https://supabase.com/docs/guides/api/securing-your-api).

**Resultado sobre PostgreSQL 17.2 real:** se generó el esquema legacy del commit `e471373`, se ejecutó como baseline en una base local desechable y encima se aplicó el SQL nuevo dentro de una transacción. La migración nueva funcionó; las pruebas consultaron restricciones, permisos y filas reales.

**Limitación histórica comprobada:** `prisma migrate deploy` desde vacío falla antes de llegar a esta iteración, en `20260505_add_marketing_campaigns`, porque todavía no existe `Client` (`42P01`, Prisma `P3018`). No se alteró esa migración ni se declaró reparada toda la cadena histórica. El runner documenta el baseline usado; antes de producción se necesita reconciliar el historial de migraciones con el esquema desplegado y ensayar el upgrade en una copia autorizada.

## Servicios implementados

- `commercial-subscription-v2.service.ts`: creación idempotente de snapshot, precios V2 y reconstrucción de entitlements; rechaza crear un V2 directamente como ACTIVE. Un trial V2 nuevo tampoco se concede sin una política aprobada. Los trials legacy se representan.
- `commercial-reconciliation.service.ts`: contrato `CommercialEvidenceVerifier`, validación estricta de evidencia, idempotencia, control de fecha/importe/moneda/tenant/referencia y ledger. Una referencia o un importe incompatibles generan un evento REJECTED sin cambiar el contrato.
- `commercial-capacity.service.ts`: lectura de cupos efectivos, solicitudes, aplicación/cancelación, creación y reactivación aisladas de Staff con lock transaccional.
- `commercial-entitlements.service.ts` y motor puro `commercial-entitlements.ts`: cálculo sombra, fechas de vigencia, trial, gracia, estados desconocidos y add-on web legacy. Un error devuelve una evaluación indisponible sin lanzar ni revelar detalles privados.
- `commercial-access-shadow.service.ts`: negocio desde sesión, allowlist de entrada y solicitudes solo del propietario; combina entitlement con permisos actuales y sucursal activa. Plus no otorga derechos financieros ni administrativos.
- `commercial-backfill.service.ts`: reporte, backfill idempotente, warnings/deriva y lotes reanudables con cursor y máximo de 100 negocios. Errores por fila quedan como revisión manual, sin abortar todo el lote.
- `commercial-billing-adapter.ts`: cotización de líneas recurrentes y contratos de preview; borradores tipados contra el SDK oficial de Paddle. No hay transporte ni llamadas de actualización.
- `commercial-observability.service.ts`: consulta interna acotada de discrepancias, warnings de backfill, eventos sin resolver, referencias rechazadas, solicitudes pendientes/vencidas y conflictos. No está conectada a analítica pública ni a reservas.

Todas las escrituras nuevas requieren `COMMERCIAL_V2_INTERNAL_WRITES=1`, entorno distinto de production y `DATABASE_URL` apuntando a localhost/127.0.0.1 con nombre exacto `puragenda_commercial_test`. No hay un switch que habilite estas escrituras en una base productiva. `COMMERCIAL_RELEASE_FLAGS` mantiene billing, entitlements, cupos, Puri+ y Contact Flow en falso. Ningún flujo operativo importa los servicios nuevos. El futuro cutover exige un cambio revisado, no basta editar una variable.

## Cupos y concurrencia

El criterio es `Staff.businessId` + `Staff.isActive=true`, igual que el sistema legacy. Se cuenta cada fila de Staff una vez; tener dos asociaciones `StaffLocation` no ocupa dos cupos. Inactivos e históricos no se borran. La capacidad es del negocio y se conserva el override legacy como límite absoluto.

Toda mutación del motor aislado bloquea primero `Business FOR UPDATE`, **después** relee contrato, solicitud, evidencia y Staff. Los writers legacy ya usan el mismo ámbito de lock y no se reemplazaron. El motor nuevo permanece sin conectar a sus rutas. El índice parcial impide abrir dos cambios simultáneos incluso si un writer interno evita el servicio.

Un aumento crea PENDING_PAYMENT y congela la cotización. No altera los cupos. Para aplicar necesita un evento persistido APPLIED de PAYMENT_CONFIRMED, vinculado a la solicitud, proveedor y negocio correctos, monto/moneda correctos, período vigente y orden temporal válido. No se acepta un booleano `paid` ni un precio enviado por navegador. Una respuesta desconocida mantiene la solicitud UNKNOWN hasta conciliarla.

Una disminución se programa en la renovación o después. Si sobran profesionales, se conserva SCHEDULED con conflicto. Se comprueba de nuevo al aplicar. Hace falta evidencia de confirmación del contrato futuro; no se cambia el precio local como si el proveedor ya lo hubiera actualizado. Resolver el conflicto implica una decisión explícita sobre Staff, conservando sus filas e historial.

Al aplicar se cierra el ítem previo, se crea el nuevo con sus tramos, se actualiza el contrato, se reconstruyen entitlements, se marca APPLIED la solicitud y se registra el ledger. Todo es atómico. Reintentar después de un resultado perdido devuelve alreadyApplied; un evento de pago no puede usarse para dos solicitudes. Una cotización modificada o un contrato desactualizado impiden aplicar. El rechazo por contrato cambiado se persiste sin arrojar una excepción que revierta su registro.

La cancelación interna de una solicitud impaga es idempotente. Si ya existe evidencia aprobada o un resultado ambiguo, exige conciliación; no simula reembolsos ni cancela suscripciones externas.

## Estados y derechos

| Estado de contrato | Evaluación sombra |
| --- | --- |
| DRAFT / PENDING_PAYMENT / UNKNOWN | Sin derechos nuevos. |
| ACTIVE | Derechos del contrato dentro del período efectivo. |
| TRIALING | Requiere trial vigente; disponible para representar legacy. |
| PAST_DUE_GRACE | Solo con fecha explícita de gracia vigente, incluso si acabó el período pagado. |
| PAST_DUE_BLOCKED / INACTIVE / CANCELLED | Sin derechos del contrato. |
| SCHEDULED_CHANGE | Conserva derechos actuales hasta terminar su vigencia; la solicitud no amplía cupos. |

Las filas de entitlements son una proyección: el servicio vuelve a evaluar el contrato y sus fechas. Un entitlement antiguo no mantiene Plus al expirar o cancelar el contrato. Al reconstruir se revocan primero las capacidades anteriores, evitando restos de una concesión previa.

Puragenda incluye agenda, Puri estándar y fidelización; Plus agrega Puri+, Contact Flow, web y analítica comercial como derechos descriptivos. No se implementan esas funciones ni se activan en el producto. La evaluación del usuario usa una política de permisos interna; las capacidades sin política definida se deniegan. Las restricciones de usuario y sucursal nunca se sustituyen por el plan.

## Backfill y simulador

`npm run simulate:commercial-backfill` usa diez fixtures explícitamente anónimos; no lee `.env`, proveedores ni base de datos. El archivo [iteration-3-backfill-fixtures.json](./iteration-3-backfill-fixtures.json) es reproducible con:

```powershell
npm run simulate:commercial-backfill -- docs/puragenda-next/iteration-3-backfill-fixtures.json
```

El reporte conserva términos, compara acceso/capacidad y lista diferencias. Incluye Individual, Equipo, Test, descuento, web, trial/meses gratis, past_due, precio manual, período faltante y moneda internacional no conciliada. Los casos ambiguos emiten warnings. La reejecución del backfill persistente se prueba aparte sobre PostgreSQL; el simulador no afirma simular transacciones.

No se convierte una web legacy en web Plus ni se agrega otra línea de cobro. Se registra el beneficio y el precio desconocido con su warning; la suspensión/publicación actual sigue en el código legacy. La migración voluntaria real y la finalización del add-on para impedir doble cobro siguen pendientes de integración y consentimiento.

## Proveedores: preparación y pendientes

### Mercado Pago

Se revisó documentación oficial actual indexada el 22-10-2026. Varias aperturas directas devolvieron 403; se usaron extractos oficiales indexados, sin operaciones de cuenta.

La API documenta modificar importe/moneda mediante PUT de `preapproval`. Eso no prueba una actualización con fecha diferida o un prorrateo fiable de un aumento durante el ciclo. [Gestión de suscripciones](https://www.mercadopago.cl/developers/es/docs/subscriptions/subscription-management).

El prorrateo documentado corresponde al inicio respecto de un día de facturación mensual. **No se interpreta como crédito/débito automático por cambiar cupos a mitad de un período.** [Monto proporcional](https://www.mercadopago.cl/developers/es/docs/subscriptions/integration-customization/payment-methods/proportional-amount).

Una cuota procesada no demuestra pago aprobado: hay estados de procesamiento y reintento. Conciliar suscripción, factura y pago final; una notificación de suscripción no concede cupos. [Pagos autorizados](https://www.mercadopago.cl/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments), [referencia de facturas y pagos](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/overview). Los tópicos de suscripción y payments son complementarios; deduplicar entregas y volver a consultar el recurso canónico. [Notificaciones de suscripciones](https://www.mercadopago.cl/developers/es/docs/split-payments/additional-content/your-integrations/notifications/additional-info?scope=prod).

Alternativa propuesta, **todavía sin implementar**: mantener la intención local SCHEDULED y ejecutar un worker de cambio al renovar, verificando el corte real de facturación en sandbox. Si no se puede garantizar, usar una nueva aceptación del contrato en la renovación, coordinando el cierre del anterior para evitar solapamiento. Un aumento inmediato podría requerir un cargo separado explícito, solo tras aprobar la política comercial y demostrar el vínculo entre pago y capacidad. Un timeout queda UNKNOWN y se consulta por referencia antes de reintentar. No se envió ningún PUT ni se eligió una política de prorrateo.

### Paddle

El servidor llamado `paddle-docs` no está disponible en esta sesión. Se consultó el buscador de referencia del MCP Paddle sandbox (solo documentación, sin execute) y se corroboró con documentación oficial; no se recurrió solo a memoria. Los borradores usan tipos del SDK `@paddle/paddle-node-sdk` instalado.

La actualización reemplaza la lista completa de ítems y los cambios de billing requieren un modo de prorrateo. Past_due impide la actualización normal. El borrador conserva explícitamente los ítems adicionales y usa prevent_change. [Actualizar suscripción](https://developer.paddle.com/api-reference/subscriptions/update-subscription/).

El preview es necesario para validar cobro inmediato, renovación, impuestos y moneda con el proveedor. No se calcula localmente un importe prorrateado. [Preview](https://developer.paddle.com/api-reference/subscriptions/preview-subscription-update/). Los cinco modos se representan sin elegir uno automáticamente; diferir el cobro no demuestra diferir el cambio de capacidades. [Prorrateo](https://developer.paddle.com/concepts/subscriptions/proration/).

Los cambios programados locales no se convierten en payloads de cancel/pause/resume. El soporte exacto de diferir ítems debe demostrarse en sandbox antes de usarlo. La verificación de webhooks futura debe usar `paddle.webhooks.unmarshal()` sobre body crudo, luego lectura canónica y ledger idempotente; esta iteración no agrega un endpoint Paddle ni un verificador ficticio de firmas. El verificador de las pruebas está limitado a fixtures de la base desechable.

IVA, clasificación neto/bruto, precios internacionales, cargos prorrateados y anualidad V2 siguen pendientes. Los borradores siempre devuelven executable=false y blockers. V2 mantiene 12.990/22.990 CLP mensuales y rechaza anualidad. La anualidad legacy no se modifica.

## Verificación y resultados

Resultados exactos finales y lista de archivos: ver `12-iteracion-3-validacion.md`. Las pruebas de concurrencia usan servicios reales, Prisma y PostgreSQL 17.2, no locks simulados en memoria. No se validó todavía el transporte de ningún proveedor ni una migración de producción.

Para repetir las pruebas aisladas, iniciar PostgreSQL en loopback, crear **solo la base desechable** `puragenda_commercial_test` y ejecutar:

```powershell
$env:COMMERCIAL_V2_TEST_DATABASE_URL='postgresql://USUARIO_LOCAL@127.0.0.1:55443/puragenda_commercial_test'
npm run test:commercial:postgres
```

El runner rechaza hosts remotos y nombres distintos, ignora las URLs de producción, reconstruye el esquema público de esa base desechable y corre los tests. **El esquema público de esa base se borra deliberadamente en cada ejecución.** No usarla para otro trabajo. El runner fija las variables de escritura interna para el subproceso; ninguna queda habilitada para la aplicación habitual.

## Próxima iteración

1. Aprobar IVA, política de aumentos/reducciones, moneda, anualidad y trials nuevos.
2. Implementar verificadores/adaptadores oficiales exclusivamente en sandbox, con preview y reconsulta de recursos; separar total recurrente de importe efectivamente liquidado y del componente tributario.
3. Probar corte de renovación, pago fallido, expiración, reintento, prorrateo y UNKNOWN con ambos proveedores. Actualmente la evidencia local compara el monto completo del contrato: no admite cobrar una diferencia prorrateada sin ese trabajo.
4. Inventariar acuerdos legacy/add-ons con datos anonimizados autorizados, revisar warnings y resolver deriva. No existe migración automática al catálogo V2.
5. Preparar la sincronización/cutover con writer único, rollout cerrado y una copia de esquema productivo autorizada. Reparar la estrategia de baseline histórica antes de planear despliegue.
6. Mantener cerrados pricing, permisos, Puri+, Contact Flow y correos comerciales hasta el lanzamiento único.
