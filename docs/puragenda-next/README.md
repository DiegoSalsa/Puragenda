# Puragenda Next — auditoría y plan maestro

**Fecha de corte:** 22 de octubre de 2026 (America/Santiago)<br>
**Estado:** catálogo, billing sandbox, baseline reproducible, web Plus, migración comercial y Puri+ interno implementados en sombra; Contact Flow sintético implementado; cutover y lanzamiento pendientes<br>
**Baseline auditado:** 731582e6098fd82d2538ab66500dfbc7147ea1c5 (reel/puragenda-publicitario-20261015)<br>
**Rama de trabajo:** feature/puragenda-next<br>
**Worktree:** C:\Users\diego\.codex\worktrees\puragenda-next-audit\agenda

Este directorio es la fuente de referencia para las siguientes iteraciones. Describe el comportamiento comprobado en el código de la rama auditada, las decisiones comerciales recibidas, una arquitectura propuesta y las decisiones que aún requieren validación. Los documentos distinguen propuestas históricas, infraestructura ya comprobada y capacidades todavía pendientes; el estado de la iteración 3 se detalla en los documentos 11 y 12.

## Estado ejecutivo

El sistema actual es una aplicación Next.js App Router 16.3.8 con TypeScript, Prisma 7/PostgreSQL y un modelo multi-tenant por Business. La operación ya cubre agenda, clientes, servicios, profesionales, reservas públicas, fidelización, Gift Cards, POS, calendarios, webs editables y un Puri operativo de solo lectura.

La suscripción actual aún usa INDIVIDUAL, EQUIPO y TEST. El precio fuente es $12.990 para Individual, $29.990 para Equipo y $1.000 para Test; Equipo incluye cinco profesionales y cada extra cuesta $3.000, con un tope de 20 extras en los flujos públicos. La facturación chilena usa Mercado Pago; el flujo internacional usa Paddle. Hay estados de trial, pago pendiente, gracia, descuentos, premios, referidos, anualidad y overrides administrativos. Esto permite reutilizar bastante infraestructura, pero impide cambiar el catálogo sin una capa de compatibilidad.

Puri es un único asistente con OpenAI Responses API, herramientas SQL deterministas, permisos por usuario/sucursal, historial limitado a la petición, rate limit compartido y telemetría de tokens, latencia, herramientas, errores y coste estimado. La iteración 6 añade una extensión interna de Puri+: señales SQL persistentes, scheduler preparado, recomendaciones, propuestas/aprobaciones y presupuestos. El Puri operativo productivo mantiene su comportamiento. La aprobación interna no ejecuta marketing ni Contact Flow.

Marketing actual es una campaña manual por mes: obtiene una audiencia win-back, genera un lote síncrono y lo envía con resend.batch.send. Ese flujo legacy carece de outbox y consentimiento verificable. La iteración 7 incorpora esos contratos en un motor separado de ejecución, integrado con el mismo Puri+, únicamente en laboratorio. El acceso del cliente usa acceptsMarketing, cuyo valor por defecto en el esquema es true; esto debe revisarse antes de activar Contact Flow.

El módulo Web ya tiene editor, borrador/publicación, plantillas, medios, subdominio, dominios propios, reservas integradas y dos proveedores de billing. BusinessWebsite y WebsiteAddon están separados de Subscription; además existen ofertas founder, trial, operaciones de checkout, conciliación y flags de lanzamiento. Es reutilizable, pero la nueva inclusión de web dentro de Plus exige una política de entitlement y una migración comercial que preserve add-ons y webs existentes.

El mayor riesgo es facturar o habilitar cupos/beneficios con una lectura vieja del estado del proveedor. El diseño recomendado usa un catálogo versionado, snapshot comercial por suscripción, ledger de cambios de cupos, eventos idempotentes, lock por negocio, conciliación y activación de entitlements únicamente después de la evidencia de pago.

## Clasificación usada

- **Actual comprobado:** se observó en archivos, migraciones o pruebas de la rama auditada.
- **Decisión comercial:** proviene de la solicitud Puragenda Next.
- **Propuesta:** diseño recomendado todavía no implementado.
- **Supuesto:** necesita confirmación de negocio, proveedor o legal.
- **Pendiente:** no se puede cerrar sin datos, credenciales, contrato o decisión.

## Documentos

1. [01 — Auditoría actual](./01-auditoria-actual.md)
2. [02 — Arquitectura propuesta](./02-arquitectura-propuesta.md)
3. [03 — Precios y suscripciones](./03-precios-y-suscripciones.md)
4. [04 — Puri+](./04-puri-plus.md)
5. [05 — Contact Flow](./05-contact-flow.md)
6. [06 — Migración de clientes](./06-migracion-clientes.md)
7. [07 — UX/UI y pricing](./07-ux-ui-y-pricing.md)
8. [08 — Pruebas y seguridad](./08-pruebas-y-seguridad.md)
9. [09 — Costos y rentabilidad](./09-costos-y-rentabilidad.md)
10. [10 — Roadmap y lanzamiento](./10-roadmap-lanzamiento.md)
11. [11 — Infraestructura comercial de iteración 3](./11-infraestructura-comercial-iteracion-3.md)
12. [12 — Validación y entrega de iteración 3](./12-iteracion-3-validacion.md)
13. [13 — Billing V2 y proveedores](./13-billing-v2-y-proveedores.md)
14. [14 — Validación y entrega de iteración 4](./14-iteracion-4-validacion.md)
15. [15 — Web Plus y migración comercial](./15-web-plus-y-migracion-comercial.md)
16. [16 — Validación de iteración 5](./16-iteracion-5-validacion.md)
17. [17 — Puri+ e inteligencia comercial](./17-puri-plus-inteligencia-comercial.md)
18. [18 — Validación de iteración 6, informe A–N](./18-iteracion-6-validacion.md)

## Decisiones que bloquean la implementación

1. Confirmar si la nueva suscripción seguirá usando Mercado Pago para Chile y qué rol tendrá Paddle en nuevos clientes chilenos.
2. Confirmar tratamiento tributario de los importes publicados: el repositorio representa CLP como enteros, pero no tiene un campo de IVA ni una política única de precio neto/bruto.
3. Definir si los cambios de cupos se prorratean inmediatamente, en el próximo ciclo o mediante crédito/debito separado.
4. Obtener inventario real de suscripciones, add-ons, webs publicadas, precios manuales, referidos y promociones activas.
5. Aprobar límites de Contact Flow, base jurídica, texto de consentimiento y procedimiento frente a No Molestar.
6. Confirmar catálogo y credenciales sandbox de Paddle antes de escribir cualquier integración nueva.
7. Aprobar los presupuestos de IA, correo, almacenamiento y soporte que protegen el margen de Plus.

## Verificaciones externas realizadas

- Resend: la página pública consultada el 21-10-2026 muestra Free 3.000 emails/mes y 100/día, Pro USD 20/mes por 50.000, Scale USD 90/mes por 100.000 y sobrecuota publicada de USD 0,90 por cada 1.000 en planes pagados. Batch API documenta hasta 100 mensajes por llamada. La política de uso exige opt-in explícito, identificación, motivo y baja.
- Chile: SERNAC documenta No Molestar y el artículo 28 B como mecanismo para suspender publicidad no deseada. La Biblioteca del Congreso indica que la Ley 21.719 entra en vigor el 01-12-2026 y agrega derechos, obligaciones de tratamiento y la Agencia de Protección de Datos.
- Paddle: el buscador de documentación del MCP Paddle consultado el 21-10-2026 confirma que subscriptions.update exige enviar la lista completa de items, requiere proration_billing_mode al cambiar facturación, no permite actualizar una suscripción past_due salvo retirar un cambio programado y ofrece do_not_bill, prorrateo inmediato/próximo ciclo y on_payment_failure. No se ejecutaron operaciones de cuenta.

## Estado Git

El checkout original tenía cambios no relacionados sin commit. Se dejó intacto. La auditoría se realizó en el worktree gestionado indicado arriba, desde el commit base, y se creó la rama feature/puragenda-next. El worktree contiene commits locales separados para el catálogo y la documentación; no se hizo merge a main ni push.

## Siguiente fase de Codex

Debe integrar el catálogo aislado con los modelos comerciales, los cupos contratados y la facturación mediante contratos compatibles. Las migraciones expansivas, la conciliación sobre snapshots y la validación de prorrateo deben preceder cualquier activación pública. Las activaciones públicas, cambios de precio, cambios de suscripción y envío de correos permanecen deshabilitados hasta que se cumplan los criterios de 10 — Roadmap y lanzamiento.
## Iteración 2 — base reconciliada e implementación aislada

La rama de implementación se alineó de forma segura con un reset controlado del puntero local al HEAD de origin/main 34187de43a860b88b7328b5e11743da21b48db7c, porque la auditoría inicial y origin/main habían divergido. La auditoría inicial estaba en 731582e6098fd82d2538ab66500dfbc7147ea1c5; la comparación era 2 commits propios frente a 34 commits de origin/main. Se conservaron los once documentos no rastreados y no se tocó el checkout original.

La base actual incluye el merge de payment holds/múltiples calendarios y el trabajo MCP ya integrado en origin/main. También conserva cambios de acuerdos manuales, límites persistentes de profesionales y reconciliación de billing. No se fusionaron ramas grandes adicionales. feature/puragenda-chatgpt-mcp, feature/payment-holds-multi-google-calendar y feat/manual-bank-transfer-billing se usaron como evidencia de divergencias, no como merges indiscriminados.

En esta iteración se implementó únicamente el catálogo puro y sus pruebas. El billing, checkout, web pública, onboarding, providers, Puri operativo y permisos efectivos permanecen sin cambios.

## Estado de Iteración 3

Modelos expansivos, motor de cupos, ledger/reconciliación, entitlements sombra, backfill idempotente y contratos de billing están implementados y comprobados en PostgreSQL local. No hay conexión V2 a proveedores ni cambios de acceso en producción. La siguiente fase es aprobar políticas y verificar adaptadores en sandbox, junto con la estrategia de baseline de migraciones. Ver documentos 11 y 12.

## Estado de Iteración 4

Adaptadores concretos de SDK, operación externa durable y evidencia de pago separada están implementados y probados contractualmente con firmas reales y PostgreSQL. Bootstrap/actualización legacy usan baseline versionado y Prisma migrate deploy, sin reescribir archivos antiguos ni eliminar historial. La consulta real de catálogo Paddle mostró solo precios legacy USD; faltan credenciales SDK y precios V2 para validar un ciclo sandbox real. Ningún cliente ni flujo productivo se migró o activó.

## Estado de Iteración 5

Resolver web Plus/legacy, propuestas inmutables, aprobación de propietario y transiciones de add-ons funcionan en servicios aislados. La suite completa aprobó 1.543 tests y mantuvo 131 omitidos; 79 pruebas comerciales usan PostgreSQL real. Los datos web, dominios, founder y contratos legacy se conservan. No hay ejecutor externo ni cutover de gates: los permisos públicos y el checkout siguen usando legacy. Los documentos 15 y 16 distinguen implementación, evidencia contractual y dependencias pendientes.

## Estado de Iteración 6

El motor comercial detecta inactividad, capacidad disponible, caída de demanda y cambios de servicios mediante SQL y código puro. El mismo Puri puede explicar agregados y preparar propuestas; el propietario puede revisarlas y aprobarlas con hash/versión y evidencia actual. Las propuestas permanecen no ejecutables. Hay leases, supresión, retención local, presupuestos atómicos y observabilidad sin conversaciones ni listas de destinatarios.

El laboratorio `/internal/puri-plus` fue comprobado con Chrome en escritorio/móvil y PostgreSQL sintético. Todos los flags nuevos están cerrados por defecto y todos los servicios rechazan producción. No se activaron cron, proveedores, campañas, checkout ni cambios del dashboard productivo. La fase siguiente es Contact Flow con consentimiento/supresión, outbox, cuotas, entregas y atribución, precedida de las decisiones comerciales y legales pendientes. Ver documentos 17 y 18 para límites y resultados exactos.

## Estado de Iteración 7

Contact Flow cierra el ciclo de propuesta aprobada, campaña versionada, consentimiento firmado y supresiones, autorización específica, outbox PostgreSQL, simulación durable, reconciliación autenticada y atribución transaccional de reservas. La prueba de navegador recorre también el endpoint real de reservas con datos sintéticos. El sello de envío externo es una constante de código y SQL sólo permite proveedor simulado. No hay activación productiva ni herramientas públicas MCP de campañas.

Ver [19 — implementación y operación](./19-contact-flow-ejecucion.md) y [20 — validación completa](./20-iteracion-7-validacion.md). Los documentos anteriores describen el estado de sus respectivas iteraciones; no representan pendientes técnicos del laboratorio ya implementado.
