# 06 — Migración de clientes existentes

## Objetivo

Cambiar el catálogo sin alterar precios, beneficios, webs ni acceso de clientes que no hayan elegido una migración. La migración debe ser explícita, reversible en lógica y auditable. No se deben borrar enums, columnas, tablas, snapshots ni eventos históricos.

## Inventario requerido

Antes de una migración real se necesita un export anonimizado y de solo lectura con Business, sucursales, Staff activos, Subscription, provider IDs, periodos, trials, pagos, dunning, grace, descuentos, free months, premios, referidos, WebsiteAddon, WebsiteBillingEvent, WebsiteCheckoutOperation, WebsiteOfferEligibility y BusinessWebsite.

También se requieren webs publicadas, dominios, media, excepciones manuales y los últimos eventos de proveedor. El repositorio no contiene datos reales en el worktree. No se debe conectar una base remota ni ejecutar migraciones productivas durante esta fase.

## Situaciones

| Situación | Tratamiento |
| --- | --- |
| Individual/Equipo activo | Mantener legacy hasta elección explícita. |
| Trial activo | Mantener fecha y beneficios; migrar al terminar o por elección. |
| Past due/grace | No ofrecer Plus ni cupos; resolver provider primero. |
| Inactivo/cancelado | Mantener historia; nueva contratación usa catálogo nuevo. |
| Precio manual | Snapshot grandfathered con importe, moneda, fechas y autoridad. |
| Promoción/free month | Beneficio con prioridad y saldo; no recalcular. |
| Referido/prize | Conservar Affiliate, Prize y redenciones históricas. |
| Pago manual | Método explícito; nunca provider ID ficticio. |
| Add-on web activo | Mantener precio y provider; impedir doble cobro. |
| Founder web | Conservar oferta, trial y snapshot de precio. |
| Web publicada sin entitlement claro | No borrar; abrir caso de soporte. |
| Checkout UNKNOWN | Conciliar antes de otro checkout. |
| Staff sobre capacidad nueva | No borrar; bloquear altas y resolver capacidad. |
| Sucursal secundaria | Capacidad por Business, no por location, salvo decisión distinta. |

## Expand-contract

### Preparación

Agregar tablas y columnas nuevas sin leerlas públicamente. Crear alias legacy y un snapshot inicial por negocio con hash y timestamp.

### Backfill

Procesar por lotes. Bloquear Business, releer datos, calcular snapshot sin tocar provider, guardar warnings y liberar. Warnings incluyen IDs ausentes, montos no verificables, ofertas incompatibles, Staff sobre límite y web publicada sin entitlement.

### Dual-read

Comparar el servicio nuevo con el antiguo y registrar discrepancias. Los webhooks actualizan ambos read models después de validar el evento.

### Migración explícita

Mostrar plan, precio, profesionales, beneficios, web, fecha efectiva, próximo cobro y provider. Requiere confirmación idempotente y no cambia provider antes de tener checkout o actualización aceptada.

### Cutover

Con discrepancias en cero durante el periodo acordado, el entitlement nuevo se vuelve fuente de acceso. Legacy sin elección permanece intacto.

### Limpieza

Solo tras varios ciclos reconciliados se elimina código muerto. No se eliminan tablas ni IDs externos.

## Webs y doble cobro

Detectar add-on activo, precio y periodo. Si se contrata Plus, crear transición que marque web incluida, programar el fin del add-on y activar la inclusión en el periodo acordado. Conservar historia y precio founder como snapshot. Si hay fallo, mantener el último periodo pagado y no crear otra línea.

## Reversión

Revertir flags y volver al read model antiguo. No se propone migración destructiva. Si provider cambió, conciliar por ID y no crear otro checkout. Mantener snapshots y eventos para reconstruir entitlements. Congelar altas si la discrepancia supera el umbral. No prometer reversión de dinero cobrado externamente.

## Soporte

Superadmin debe ver snapshot, provider ID, último evento y excepción. El cliente debe ver plan actual, precio, beneficios, fecha y próxima acción. No editar directamente la fila de producción sin una operación auditada.

## Aceptación

- Cada Subscription y WebsiteAddon tiene snapshot o warning.
- Ningún cliente paga dos líneas por la misma web.
- Webhook duplicado no duplica snapshot ni entitlement.
- Legacy no cambia de monto sin confirmación.
- Web publicada conserva contenido y URL.
- Past due no recibe Plus ni cupos.
- Flags permiten apagar el cutover sin borrar datos.
- El reporte se reproduce con el mismo dataset anonimizado.

## Iteración 3 — estado implementado, 22-10-2026

Hay simulador de diez fixtures, backfill local idempotente y lotes reanudables con cursor. Se conservan condiciones y referencias históricas; importes desconocidos son null. La deriva posterior de Subscription/WebsiteAddon exige revisión y no reemplaza acuerdos. No existe migración automática, conversión de add-on a Plus ni cobro nuevo.

Detalles y limitaciones: [infraestructura](./11-infraestructura-comercial-iteracion-3.md) y [validación](./12-iteracion-3-validacion.md).

## Iteración 4 — actualización de estado, 22-10-2026

Hay procedimiento automático de bootstrap y adopción de un baseline exacto, restringido a PostgreSQL local. Se verificaron datos e historial legacy sin cambios tras upgrade y repetición. No se migran clientes; los contratos comerciales legacy se rechazan en los writers V2. Las bases con tablas/políticas no representadas necesitan revisión explícita.

Ver [billing y proveedores](./13-billing-v2-y-proveedores.md) y [validación final](./14-iteracion-4-validacion.md).

## Iteración 5 — actualización de estado, 22-10-2026

Existen propuestas persistentes con fingerprint, precio/desglose, beneficios y fecha congelados, aprobación explícita y transición recuperable del add-on. Cambios obsoletos se invalidan; los especiales necesitan revisión. Solo evidencia canónica y período válido permiten aplicar el contrato sombra. No se migró ningún cliente real ni se ejecutaron cancelaciones/cobros externos.

Ver [web y migración comercial](./15-web-plus-y-migracion-comercial.md) y [validación](./16-iteracion-5-validacion.md).
