# 03 — Precios y suscripciones

## Reglas decididas

Puragenda cuesta 12.990 CLP mensuales y Puragenda+ 22.990 CLP. Ambos incluyen un profesional. La diferencia Plus es siempre 10.000 CLP. Los recargos acumulativos por profesionales totales son:

| Total | Escalón | Acumulado | Puragenda | Puragenda+ |
| ---: | ---: | ---: | ---: | ---: |
| 1 | incluido | 0 | 12.990 | 22.990 |
| 2 | 5.000 | 5.000 | 17.990 | 27.990 |
| 3 | 4.500 | 9.500 | 22.490 | 32.490 |
| 4 | 4.000 | 13.500 | 26.490 | 36.490 |
| 5 | 3.500 | 17.000 | 29.990 | 39.990 |
| 6 | 3.000 | 20.000 | 32.990 | 42.990 |
| 7 | 3.000 | 23.000 | 35.990 | 45.990 |
| 8 | 3.000 | 26.000 | 38.990 | 48.990 |

Para n >= 6, cada profesional posterior al quinto suma 3.000. El precio depende de cupos, no de la identidad de cada trabajador. Bajar cupos no borra Staff ni historial.

IVA, precio neto/bruto y documento tributario siguen pendientes. El repositorio solo representa enteros CLP y no tiene un campo tributario explícito.

## Brecha actual

El código todavía usa INDIVIDUAL, EQUIPO y TEST. Equipo cuesta 29.990, incluye cinco profesionales y aplica un extra plano de 3.000. Los flujos públicos limitan extras a 20. Hay dos calculadores de precio, uno operativo y otro de billing, y la anualidad aplica multiplicador 10. No se deben cambiar estas reglas durante la auditoría.

## Fuente única propuesta

Crear una función pura quoteCatalog que reciba plan, cantidad total, ciclo y versión. Debe devolver base, recargo acumulado, total, moneda, líneas de proveedor, features y beneficios. Pricing, onboarding, checkout, dunning, webhooks, Puri y pruebas deben llamar a esta misma función.

Probar cantidades 1, 2, 7, 8 y 100; monotonicidad; igualdad Plus menos Puragenda; ciclos; promociones; y valores de cantidad inválida.

## Cupos y concurrencia

Un cambio posterior debe crear una intención idempotente, bloquear Business, volver a leer el estado de pago y calcular el quote contra el snapshot vigente. El aumento solo habilita capacidad después de la confirmación del proveedor. La reducción se programa para una fecha efectiva y conserva profesionales históricos.

El estado de una operación puede ser DRAFT, CHECKOUT_PENDING, ACTIVE, TRIALING, PAST_DUE_GRACE, PAST_DUE_BLOCKED, SCHEDULED_CHANGE, CANCELLED o UNKNOWN. Un estado UNKNOWN bloquea reintentos que puedan crear otro acuerdo y exige conciliación por referencia.

## Mercado Pago

El código actual actualiza el monto de una preapproval. Eso no demuestra que la API entregue prorrateo, crédito o fecha efectiva adecuados para el nuevo contrato. La implementación debe validar en sandbox:

- aumento inmediato y próximo ciclo;
- reducción próxima renovación;
- pago pendiente;
- descuento o mes gratis;
- timeout después de crear;
- webhook duplicado y fuera de orden.

La aplicación debe comprobar provider ID, monto, moneda, referencia, timestamp y estado antes de cambiar el entitlement.

## Paddle

La documentación consultada mediante el MCP Paddle el 21-10-2026 confirma:

- subscriptions.update exige la lista completa de items;
- omitir un item lo elimina;
- cambios de billing requieren proration_billing_mode;
- existen modos de prorrateo inmediato, próximo ciclo, precio completo y no cobrar;
- on_payment_failure puede impedir o aplicar el cambio;
- una suscripción past_due no admite cambios salvo quitar un cambio programado;
- preview permite revisar cálculos;
- cancelación, pausa y reanudación usan cambios programados.

Esto permite base más cupos como items recurrentes, pero se debe persistir la respuesta del proveedor y tratarlo como adaptador, no como fuente de permisos.

## Beneficios existentes

La fila actual contiene trial, meses gratis, descuentos, overrides, notas, referidos, premios y promociones. Se propone congelar cada beneficio en un snapshot con origen, valor, prioridad y vigencia. No se recalcula elegibilidad histórica. El orden de precedencia debe ser explícito y probado.

## Decisiones pendientes

1. Prorrateo de Mercado Pago y Paddle.
2. Fecha efectiva de aumento y reducción.
3. Mantener o retirar anualidad.
4. Proveedor de nuevos clientes chilenos.
5. IVA y precio final.
6. Conversión de add-on web a beneficio Plus.
7. Trials y promociones para el catálogo nuevo.
## Implementación de Iteración 2

Se agregó src/core/commercial-catalog.ts como motor puro, sin Prisma, providers, Next.js ni React. La versión actual es puragenda-next-v1. Define Puragenda y Puragenda+, la escala acumulativa, desglose de escalones, moneda CLP, metadatos de capacidades y errores de validación.

El módulo valida enteros positivos seguros, ciclos mensuales, planes y versiones; rechaza decimales, negativos, infinitos, valores no numéricos y totales monetarios inseguros. La anualidad de los planes nuevos queda rechazada explícitamente como pendiente. quoteLegacyPlan solo sirve para el simulador y no sustituye las funciones que usa billing real.

La función no se importa desde pricing, checkout, webhooks, entitlements ni suscripciones reales. No existe activación comercial de Puragenda+.

## Iteración 3 — estado implementado, 22-10-2026

El catálogo alimenta snapshots, cotizaciones de solicitudes e ítems con tramos marginales completos. Se rechaza anualidad V2; IVA sigue pendiente. Los borradores Paddle/MP siempre son no ejecutables. No se cambió ningún calculador de billing legacy ni monto externo. Evidencia local de aplicación usa importe completo; los cargos prorrateados requieren una fase posterior.

Detalles y limitaciones: [infraestructura](./11-infraestructura-comercial-iteracion-3.md) y [validación](./12-iteracion-3-validacion.md).

## Iteración 4 — actualización de estado, 22-10-2026

El importe recurrente y el cargo esperado del preview se persisten por separado. Los adaptadores SDK no convierten CLP a precios internacionales ni habilitan anualidad V2. El modo inmediato MP y los límites de renovación permanecen bloqueados por falta de prueba real. IVA y política comercial siguen pendientes.

Ver [billing y proveedores](./13-billing-v2-y-proveedores.md) y [validación final](./14-iteracion-4-validacion.md).

## Iteración 5 — actualización de estado, 22-10-2026

Las propuestas voluntarias usan el quote V2 único y distinguen tarifa nominal legacy, precio desconocido y cargo esperado del proveedor. Plus incluye web en el resolver sombra y rechaza otra compra web independiente; Puragenda estándar exige upgrade. IVA, anualidad, trials y beneficios especiales siguen bloqueados hasta revisión, sin alterar precios actuales.

Ver [web y migración comercial](./15-web-plus-y-migracion-comercial.md) y [validación](./16-iteracion-5-validacion.md).
