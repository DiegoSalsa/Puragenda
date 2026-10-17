# Cinnamon Nails: Equipo con dos profesionales y transferencia

## Estado y alcance

Rama: `commercial/cinnamon-equipo`, creada desde `main` en un worktree independiente. El checkout original y sus cambios previos se conservan. No se hizo merge, push, despliegue ni escritura de datos de producción.

Auditoría de producción en modo lectura el 17 de octubre de 2026:

| Campo | Valor observado |
| --- | --- |
| Negocio | Cinnamon nails |
| Slug | `aiko` |
| Business ID | `cmstm3108000104js2e9vfl0l` |
| Subscription ID | `cmstm314n000j04jsxolzycw3` |
| Plan / estado | EQUIPO / ACTIVE |
| Ciclo / prueba | MONTHLY / false |
| Profesionales | 1 total, 1 activo |
| Cupos extra | 0 |
| currentPeriodEnd | NULL |
| Vínculo de Mercado Pago | Presente; no se modificó |
| Vínculo de Paddle | Ausente |

El operador confirmó durante el trabajo: «se lo acabamos de activar ya que nos pagó los 17990 por el equipo con 2 profesionales». Por ello se prepara el precio manual de $17.990 CLP mensuales, IVA incluido, como pago confirmado por el operador. El código y el script no contactan a la clienta, generan una factura ni ejecutan un cobro.

La lectura de la preaprobación en Mercado Pago devolvió HTTP 400, `the preapprovalId is not valid for callerId`. Esto **no demuestra que la autorización esté cancelada**. Debe verificarse en la cuenta/credencial que la creó antes de resolver el vínculo. No se imprimieron credenciales ni se realizó ninguna llamada de modificación al proveedor.

## Auditoría de la arquitectura

- `core/constants.ts` define Individual (1 profesional, $12.990), Equipo (5, $29.990) y Test (1), además de cupos extra, límites de marketing y precios anuales. No se cambian estos valores.
- Las funciones de Equipo se derivan del valor `plan`, por ejemplo horarios por profesional y cupo de marketing. No existe una lista alternativa de funciones que haya que duplicar para este acuerdo.
- La suscripción tiene relación uno a uno con el negocio mediante `businessId @unique`. Los profesionales, reservas, clientes, servicios y horarios pertenecen al negocio, no al plan.
- Antes del cambio, la pantalla y el alta usaban `getStaffLimitInfo`, que contaba también a los inactivos. El alta contaba fuera de su transacción; la reactivación no comprobaba cupos. El servicio de creación inferior tampoco los comprobaba. `canAddStaff` tenía otra fórmula independiente.
- No había un límite personalizado persistente ni una modalidad de transferencia explícita para la suscripción de la plataforma. Los campos de pago manual de reservas/Gift Cards son otro producto y no resuelven este caso.
- `nextBillingOverrideAmount` es un ajuste para **un solo cobro** y se consume al autorizar un pago. No es apropiado para almacenar un precio mensual comercial permanente.
- Los cobros de Chile usan Mercado Pago; las renovaciones automáticas procesan facturas/preaprobaciones y el cron realiza conciliación y vencimientos. Las promociones sin tarjeta se identificaban por `promoName` y `currentPeriodEnd`; no se reutiliza una promoción gratuita para representar una transferencia pagada.

## Implementación

Se agregan tres campos a `Subscription`:

```text
plan                  = EQUIPO
staffLimitOverride    = 2
paymentMethod         = BANK_TRANSFER
customMonthlyPriceClp = 17990
```

`staffLimitOverride` es el máximo **absoluto de profesionales activos**, incluso si quedan cupos extra históricos. NULL mantiene el plan estándar. Un inactivo no ocupa cupo; desactivarlo no borra sus reservas ni relaciones. Equipo conserva sus funciones porque el plan sigue siendo EQUIPO.

La pantalla, la acción de alta, el servicio de alta y la reactivación comparten la resolución del límite. Altas y reactivaciones adquieren un bloqueo de fila del negocio antes de contar, dentro de la misma transacción que escribe. Esto impide exceder el cupo con solicitudes simultáneas o manipulando el frontend. El alta inicial de un negocio nuevo continúa creando un único profesional dentro de su transacción de registro.

La modalidad BANK_TRANSFER bloquea el checkout automático, la recuperación con tarjeta, los descuentos enviados al proveedor y la sincronización del importe. Las notificaciones antiguas de Mercado Pago no alteran una cuenta manual. Se excluyen estas cuentas de la conciliación y los avisos de reintento con tarjeta. El precio manual se muestra con IVA incluido y no modifica el catálogo general.

## Períodos y renovación

La configuración modifica únicamente los cuatro campos mostrados arriba y el `updatedAt` administrado por Prisma. Conserva `status`, `isTrial`, fechas, IDs de proveedor, beneficios y notas. Nunca asigna una renovación a partir de «ahora».

Si existe una fecha de período pagado, el cron la respeta y solo pasa a INACTIVE al vencer. Conserva la fecha y las condiciones comerciales. No genera un cobro ni una factura de renovación. Si la fecha es NULL, la deja NULL y no inventa un vencimiento; esto refleja el registro real actual de Cinnamon Nails.

Al confirmar una transferencia futura, la operación de renovación debe actualizar únicamente `status=ACTIVE` y `currentPeriodEnd` a la fecha pagada verificada. El plan, el límite, la modalidad manual y el precio se conservan. No se usa `advanceBillingBenefitAfterAuthorized` para una transferencia. La aceptación de cambios comerciales futuros se gestiona fuera de este script; una propuesta no debe aplicarse como precio acordado.

## Migración y configuración, pendientes de aprobación

Migración aditiva: `20261017163250_subscription_commercial_terms`, en Prisma y copia idéntica en Supabase. No cambia datos de negocios existentes; sus campos nuevos quedan NULL / AUTOMATIC / NULL. Agrega restricciones para límites y precios positivos, y restringe el precio especial a transferencia mensual. No crea tablas, roles ni políticas públicas nuevas. Aplicar **una sola copia**, mediante el mecanismo de migración habitual, después de aprobarlo.

Una vez migrado y desplegado el cambio aprobado, usar el script sin `--apply` para obtener la revisión:

```powershell
npx tsx scripts/configure-manual-team.ts --business-id cmstm3108000104js2e9vfl0l --staff-limit 2 --monthly-price-clp 17990
```

El script toma la conexión exclusivamente de variables de entorno. Sin `--apply` no escribe. Comprueba país, ciclo, estado pagado, profesionales activos y vínculos con proveedores. Se niega a desactivar profesionales o a borrar/desvincular una suscripción del proveedor.

**Bloqueo actual esperado:** Cinnamon Nails todavía conserva `mpSubscriptionId`. Verificar su estado en Mercado Pago con la cuenta correcta. Si fuera una autorización activa, su cancelación requiere una aprobación específica; marcar una cuenta como manual en Puragenda no detiene por sí solo cobros que un proveedor ya haya programado. Una vez resuelto y auditado ese vínculo, volver a obtener la revisión.

Solo con aprobación para actualizar producción, ejecutar el mismo comando agregando `--apply`. La configuración se escribe en la suscripción existente, nunca crea otra suscripción, y puede repetirse conservando los mismos términos.

Confirmar por separado la fecha hasta la que cubre el pago recibido. El script no la cambia; completar ese dato requerirá autorización para la actualización correspondiente.

## Archivos

- Persistencia: `prisma/schema.prisma`; `prisma/migrations/20261017163250_subscription_commercial_terms/migration.sql`; `supabase/migrations/20261017163250_subscription_commercial_terms.sql`.
- Capacidad: `src/core/subscription-plan.ts`; `src/server/services/staff-capacity.service.ts`; `src/server/services/subscription.service.ts`; `src/server/services/staff.service.ts`; `src/server/actions/dashboard.actions.ts`; `src/app/dashboard/staff/page.tsx`; `src/app/dashboard/staff/staff-list.tsx`.
- Facturación: `src/server/services/subscription-billing.service.ts`; `src/server/services/subscription-dunning.service.ts`; `src/server/services/discount.service.ts`; `src/app/api/billing/subscribe/route.ts`; `src/app/api/billing/verify/route.ts`; `src/app/api/billing/recovery/route.ts`; `src/app/api/webhooks/mercadopago/route.ts`; `src/app/api/cron/trial-expiry/route.ts`.
- Presentación: `src/app/dashboard/settings/page.tsx`; `src/components/dashboard/subscription-banner.tsx`.
- Operación: `src/server/services/commercial-subscription.service.ts`; `scripts/configure-manual-team.ts`; este documento.
- Pruebas: `tests/core/subscription-plan.test.ts`; `tests/server/manual-transfer-billing.test.ts`; `tests/server/commercial-subscription.integration.test.ts`; `tests/server/trial-expiry-international.test.ts`.

## Validación

La integración usa PostgreSQL 17 en `127.0.0.1:55441`, base desechable `cinnamon_qa`, con el esquema anterior y la migración aplicados localmente. Las pruebas rechazan conexiones de integración fuera de localhost o con otro nombre de base. Se simulan autenticación, correos y proveedores; no se envían invitaciones reales.

Para incluir las pruebas de integración en un entorno local ya preparado:

```powershell
$env:COMMERCIAL_SUBSCRIPTION_TEST_DATABASE_URL='postgresql://cinnamon_qa@127.0.0.1:55441/cinnamon_qa'
npm test
```

Las once pruebas de integración cubren aplicación y revisión sin escrituras; conservación exacta de las reservas, clientes, profesionales, servicios y horarios; períodos sin fecha; funciones de Equipo; alta y bloqueo del tercer profesional desde el servidor; reactivación; concurrencia entre altas y reactivaciones; planes normales; nueva conexión de Prisma; vencimiento y renovación manual; bloqueo ante proveedor existente o exceso de profesionales; y compatibilidad de la migración con datos previos.

Resultado de la suite completa: **198 archivos aprobados, 1.293 pruebas aprobadas; 4 archivos / 84 pruebas omitidos por las condiciones existentes de la suite**. Las once pruebas locales de esta entrega sí se ejecutaron.

`npm run typecheck` y `npx prisma validate`: aprobados. `npm run lint`: código de salida 0, sin errores y con 32 advertencias. `npm run build`: aprobado con Next.js 16.3.8, compilación y chequeo de TypeScript correctos y 147 páginas estáticas generadas. `git diff --check`: sin problemas. Las copias Prisma/Supabase de la migración tienen el mismo SHA-256.

Se probó además el script CLI completo contra una cuenta local desechable: revisión sin escritura y aplicación explícita. Se reinició PostgreSQL y se verificó desde un proceso nuevo de Node, mediante aserciones, que persistían EQUIPO, límite 2, BANK_TRANSFER, $17.990, estado ACTIVE, período NULL y el profesional original. La cuenta local desechable se eliminó al terminar. No se ejecutó `--apply` contra producción.
