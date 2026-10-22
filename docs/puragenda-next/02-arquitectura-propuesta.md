# 02 — Arquitectura propuesta

## Principios

1. El catálogo comercial se versiona y se consulta desde un único servicio puro.
2. El proveedor de billing es un adaptador; nunca decide directamente el entitlement interno.
3. Una capacidad se habilita solo desde un snapshot local cuyo evento de pago fue validado e idempotentado.
4. La fila Business es el ámbito de lock para cambios comerciales que puedan afectar a varias filas.
5. Los clientes actuales conservan un plan legacy o un acuerdo grandfathered hasta una migración explícita.
6. Puri propone y explica; los procesos deterministas consultan datos y ejecutan reglas aprobadas.
7. Contact Flow es un motor separado de Puri y del panel de campañas.
8. Webs, Puri+ y analítica comercial son entitlements; el contenido y la historia de facturación se conservan aunque el entitlement expire.
9. Los cambios de esquema son expansivos: agregar, backfill, dual-read, cutover, y solo después retirar lógica antigua.
10. Todos los flags de lanzamiento permanecen cerrados hasta la única activación comercial.

## Capas objetivo

~~~mermaid
flowchart TB
  UI[Pricing / onboarding / dashboard] --> E[Entitlement service]
  UI --> C[Checkout orchestration]
  C --> CAT[Versioned catalog]
  C --> MP[Mercado Pago adapter]
  C --> PA[Paddle adapter]
  MP --> WH[Provider webhook inbox]
  PA --> WH
  WH --> REC[Reconciliation + idempotent ledger]
  REC --> SUB[Commercial subscription snapshot]
  SUB --> E
  E --> OPS[Agenda / staff / widget]
  E --> PURI[Puri capability policy]
  E --> FLOW[Contact Flow engine]
  E --> WEB[Website runtime]
  PURI --> SQL[Deterministic read projections]
  PURI --> RECQ[Recommendation + approval records]
  RECQ --> FLOW
  FLOW --> OUT[Outbox / queue / worker]
  OUT --> RESEND[Resend adapter]
  RESEND --> EVENTS[Delivery webhooks]
  EVENTS --> FLOW
  FLOW --> ATTR[Reservation attribution]
~~~

### 1. Catálogo

Crear posteriormente src/server/commercial/catalog.ts o un módulo equivalente con:

- catalogVersion, fecha de vigencia y moneda;
- planes nuevos PURAGENDA y PURAGENDA_PLUS;
- precios base, tiers de profesionales y features;
- ciclos y política de prorrateo;
- reglas de trial y promociones;
- compatibilidad con INDIVIDUAL, EQUIPO, TEST y acuerdos manuales.

La función pura recibe plan, professionalTotal, cycle y catalogVersion y devuelve base, extra, total, currency e includedFeatures. UI, checkout, dunning, Puri y tests deben importar la misma función.

### 2. Snapshot comercial y entitlements

La suscripción operativa actual no debe ser el único origen de verdad. Propuesta de tablas aditivas:

- CommercialSubscription: plan comercial, versión de catálogo, proveedor, IDs externos, estado normalizado, periodo, trial, grace y timestamps.
- CommercialSubscriptionItem: base, cupos y add-ons con cantidad, precio unitario, effectiveFrom/effectiveTo y snapshot de moneda/impuestos.
- CommercialEntitlement: negocio, feature, source, status, validFrom/validTo y reason.
- CommercialEvent: eventId externo, proveedor, occurredAt, payload hash, processedAt, outcome.

Durante la migración se puede mantener Subscription como read model compatible. Los nuevos servicios escriben primero en las tablas nuevas y proyectan los campos antiguos hasta completar el cutover.

### 3. Cupos

El número de profesionales activos sigue en Staff; el límite comercial se calcula desde CommercialSubscriptionItem y cambios efectivos. Un SeatChangeRequest propuesto debe contener requestedTotal, effectiveAt, periodId, quotedAmount, prorationMode, estado DRAFT/PENDING_PAYMENT/APPLIED/CANCELLED/REJECTED, idempotency key y provider evidence.

Aumentar cupos requiere lock de Business, relectura de estado de pago y confirmación del proveedor. Disminuirlos no borra Staff históricos: programa la capacidad futura y bloquea nuevos profesionales si el negocio queda por encima del límite, dejando un flujo explícito para resolverlo.

### 4. Puri y Puri+

Mantener un único orquestador y añadir una política previa a las tools:

- PURI_STANDARD: lectura operativa y límites actuales.
- PURI_PLUS: análisis de negocio, recomendaciones, simulación de Contact Flow y lectura de métricas comerciales.
- PURI_PLUS_APPROVAL: crear propuesta versionada, nunca ejecutar envío o descuento directamente.
- PURI_ADMIN: solo soporte interno y nunca heredado del plan comercial.

Cada herramienta declara read, recommend, prepare o execute; la autorización combina plan, permiso, sucursal, finalidad y presupuesto. Las herramientas de recomendación deben usar proyecciones SQL/aggregates antes de invocar el modelo. La propuesta guarda consulta, ventana, datos resumidos, supuestos y expiración, sin guardar prompts crudos ni PII innecesaria.

### 5. Contact Flow

El motor debe ser determinista y ejecutable sin Puri:

- Trigger: days_since_last_booking, no_show, post_visit, manual_approval.
- Condiciones: consentimiento, supresión, cuota, zona horaria, próxima reserva, estado del negocio.
- Acción: render de template y creación de SendAttempt en outbox.
- Worker: toma mensajes con lease, aplica rate limit global/negocio, llama a Resend y registra ID externo.
- Eventos: delivered, bounced, complained, suppressed, clicked y booked.
- Attribution: token firmado y ventana configurable; la reserva puede atribuirse a automationId sin compartir identificadores de clientes con Puri.

### 6. Web

BusinessWebsite y sus assets se conservan. La política cambia de WebsiteAddon obligatorio a una evaluación de entitlement:

- Plus nuevo: website.editor, website.publish, website.hosting incluidos.
- Legacy con add-on: conserva su precio y beneficio hasta migración explícita.
- Puragenda estándar: mantiene widget/link, pero editor/publicación devuelve 403 con CTA de upgrade.
- Cancelación/degradación: no borra contenido; puede suspender publicación después del periodo pagado y ofrece exportación/upgrade.
- Founder: WebsiteOfferEligibility permanece como evidencia histórica; nunca se recalcula con una regla nueva.

### 7. Aislamiento

Toda lectura y escritura debe resolver primero businessId desde sesión/conexión, no desde el body. Para procesos de cola, el businessId queda en la fila y se verifica contra el job firmado. La ruta pública solo usa un projection de catálogo/booking. Las tablas nuevas deben habilitar RLS, revocar roles de Data API y mantener el acceso exclusivamente en servicios server-only.

## Estados globales

~~~mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> PendingPayment: checkout iniciado
  PendingPayment --> Active: webhook aprobado + conciliado
  PendingPayment --> Unknown: timeout/resultado ambiguo
  Unknown --> PendingPayment: conciliación provider
  Active --> PastDue: invoice fallida
  PastDue --> Active: pago recuperado
  PastDue --> GraceExpired: vence gracia
  Active --> ScheduledChange: cambio próximo ciclo
  ScheduledChange --> Active: aplicar al renovar
  Active --> Cancelled: cancelación efectiva
  GraceExpired --> Cancelled: política de acceso
~~~

El estado externo del proveedor nunca debe escribirse directamente como entitlement sin validar monto, moneda, ID de operación, timestamp y negocio.

## Compatibilidad con Next.js

- Route Handlers siguen siendo la frontera para webhooks y APIs externas; se debe leer el body crudo antes de verificar firmas.
- Server Actions de editor, checkout y aprobación deben repetir autenticación, autorización, ownership y validación de argumentos internamente.
- Los secretos quedan en módulos de acceso de servidor; solo tokens y flags públicos explícitos usan NEXT_PUBLIC_.
- Las páginas de pricing públicas pueden renderizar un snapshot cacheable, pero precios/estado de contrato se leen en runtime.
- Los jobs y workers deben ser idempotentes porque cada instancia de Vercel puede recibir reintentos.

## Observabilidad objetivo

Emitir métricas por negocio y proveedor, sin PII:

- commercial.checkout.created/unknown/activated;
- commercial.webhook.accepted/rejected/stale;
- commercial.entitlement.mismatch;
- seats.change.requested/applied/rejected;
- puri.recommendation.created/approved/rejected;
- contactflow.enrollment/suppressed/sent/bounced/attributed;
- website.entitlement.denied/suspended.

Cada métrica debe tener correlation ID, business hash, event ID externo y retención aprobada.

## Decisiones pendientes

- si se mantiene un solo proveedor por país o se permite migración dual;
- granularidad del precio de cupo como item recurrente o precio fijo derivado;
- tratamiento de IVA y redondeo de CLP;
- persistencia del historial de precios manuales;
- si Resend Broadcasts se usarán como backend o solo Resend Email API con outbox propio;
- ventana y modelo de atribución;
- retención de propuestas Puri+ y datos derivados;
- contrato legal con Resend, OpenAI, Paddle, Mercado Pago, Cloudinary y hosting.

## Iteración 3 — estado implementado, 22-10-2026

Se implementaron los cinco modelos propuestos, servicios transaccionales y una proyección reconstruible de entitlements. Legacy sigue siendo autoridad para clientes actuales; V2 solo admite escrituras en base local desechable. El ledger concilia evidencia normalizada mediante una interfaz de verificación todavía sin transporte de proveedor. No hay dual-write productivo ni cutover.

Detalles y limitaciones: [infraestructura](./11-infraestructura-comercial-iteracion-3.md) y [validación](./12-iteracion-3-validacion.md).
