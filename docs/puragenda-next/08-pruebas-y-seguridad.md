# 08 — Pruebas y seguridad

## Riesgos

| Riesgo | Impacto | Control |
| --- | --- | --- |
| Cobro duplicado por retry/timeout | Alto | idempotency key, inbox, UNKNOWN y conciliación |
| Cupos sin pago | Alto | lock Business, quote, webhook y entitlement |
| Downgrade que borra datos | Alto | snapshots, cambios programados y soft suspension |
| Webhook fuera de orden | Alto | timestamps, ledger y guardas |
| Fuga entre negocios | Crítico | scope de servidor, RLS y pruebas negativas |
| Marketing sin consentimiento | Alto | ledger, supresión y revisión legal |
| IA ejecuta acción | Alto | recomendación, aprobación y motor separado |
| Coste sin límites | Alto | presupuesto, cuotas y kill switch |
| Secretos expuestos | Crítico | server-only y revisión de bundle |
| Retención excesiva | Alto | minimización, plazos y solicitudes |

## Unitarias

- fórmula de catálogo y propiedad Plus menos Puragenda;
- cantidades 1, 2, 7, 8 y 100;
- ciclos, fechas y promociones;
- estados y entitlements;
- DSL, supresión y consentimiento;
- tokens de atribución;
- costes conocidos/desconocidos;
- Puri projections y límites.

## Integración

- intención de checkout repetida;
- adapters Mercado Pago/Paddle;
- webhook firmado, duplicado, tardío y con monto/moneda incorrectos;
- past_due y recuperación;
- aumentos/reducciones concurrentes;
- snapshot y dual-read;
- web incluida sin doble cobro;
- reserva/liberación de cuota;
- retry Resend;
- webhooks delivered/bounced/complained/suppressed;
- propuesta y aprobación Puri+;
- aislamiento de sucursal.

## Contractuales

Validar campos y semántica de Paddle, Mercado Pago, Resend, OpenAI y Cloudinary en sandbox/fixtures. Para webhooks, leer body crudo y verificar firma antes de parsear o actuar.

## E2E

Cubrir nuevo Puragenda/Plus, 1 y 8 profesionales, trial, cambios de ciclo, pagos pendientes, legacy con web, Puri estándar/Plus, Contact Flow completo, baja/No Molestar, dos negocios, móvil, flags y recuperación.

## Concurrencia

Usar PostgreSQL desechable y workers concurrentes para dos upgrades, webhooks fuera de orden, dos enrollments, webhook duplicado, migración/checkout y cancelación/pago. El criterio es un resultado comercial y ninguna duplicación.

## Seguridad de rutas

Cada Route Handler valida body, origin cuando corresponda, sesión, ownership, permiso, tamaño y frecuencia. No confía en businessId del body ni devuelve filas Prisma completas.

Cada Server Action repite auth/authz aunque la página lo compruebe. Secretos y clientes provider permanecen en módulos de servidor. NEXT_PUBLIC solo contiene valores destinados al navegador.

## Aislamiento y privacidad

Toda query incluye businessId y scope de location. Jobs revalidan negocio. RLS se mantiene como defensa adicional. Logs excluyen emails completos, tokens, payloads, prompts y datos clínicos.

Contact Flow conserva consentimiento por finalidad, baja inmediata y supresión persistente. Puri+ guarda agregados y hashes. La Ley 21.719 y No Molestar requieren revisión legal antes de activar.

## Criterios de no lanzamiento

No aprobar si hay cálculos divergentes, UNKNOWN sin conciliar, duplicados, web inaccesible, cambio silencioso de precio, fuga de tenant, envío sin consentimiento, acción sensible de IA sin aprobación, costes sin métricas, falta de kill switch o provider sandbox sin validar.

## Iteración 3 — estado implementado, 22-10-2026

Las pruebas nuevas ejercitan Prisma y PostgreSQL 17.2 real para locks, solicitudes/Staff simultáneos, aplicación duplicada, timeout/reintento, orden de eventos, tenant, sucursales, RLS y grants. Las pruebas de autorización separan plan, rol y scope de sucursal. Los resultados exactos y las suites opt-in omitidas están en el documento 12. La cadena histórica de migraciones tiene un fallo de baseline documentado; la migración nueva se comprobó sobre el esquema legacy reconstruido.

Detalles y limitaciones: [infraestructura](./11-infraestructura-comercial-iteracion-3.md) y [validación](./12-iteracion-3-validacion.md).

## Iteración 4 — actualización de estado, 22-10-2026

La suite completa con PostgreSQL aprobó 1.477 tests, con 131 omitidos y cero fallos. Hay 44 pruebas PostgreSQL comerciales y 22 contractuales/HTTP nuevas con firmas criptográficas de los SDK. TypeScript, ESLint y build aislado aprobados. No confundir estos fixtures con pruebas reales de transporte de proveedores.

Ver [billing y proveedores](./13-billing-v2-y-proveedores.md) y [validación final](./14-iteracion-4-validacion.md).

## Iteración 5 — actualización de estado, 22-10-2026

1.543 tests aprobados, 131 omitidos, cero fallos; 79 PostgreSQL comerciales y 31 unitarios nuevos. Se comprobaron propuestas inmutables, aprobación, obsolescencia, continuidad founder/web/dominios/media, doble cobro, UNKNOWN y concurrencia con cupos. TypeScript, Prisma, ESLint, migraciones y build aislado aprobados. Las firmas de SDK verifican fixtures explícitos; no certifican transporte real ni cutover productivo.

Ver [web y migración comercial](./15-web-plus-y-migracion-comercial.md) y [validación](./16-iteracion-5-validacion.md).

## Iteración 6 — cobertura y frontera de seguridad

Pruebas Puri+ de reglas, ventanas/DST, disponibilidad, privacidad, Responses, salida inválida, prompt injection y API cerrada; integración PostgreSQL real para autorización, dinero observado/estimado/desconocido, cohortes, leases, supresión, retención, FKs/RLS y concurrencia de presupuestos/análisis/aprobación. La fixture de solapamiento histórico usa únicamente una transacción local de importación; no se modifica el guard operativo de reservas.

El E2E de Chrome recorre análisis → propuesta → revisión → checkbox explícito → aprobación auditada, comprueba el rechazo de estándar y dos tamaños de pantalla. No usa proveedores externos con costo. La suite completa conserva pruebas/omisiones legacy. Los resultados y logs exactos están en [18 — validación A–N](./18-iteracion-6-validacion.md); los límites de inferencia y activación figuran en [17 — arquitectura](./17-puri-plus-inteligencia-comercial.md).
