# Iteración 7 — validación de Contact Flow

Fecha: 22-10-2026. Worktree exclusivo `C:\Users\diego\.codex\worktrees\puragenda-next-audit\agenda`, rama `feature/puragenda-next`. Base de iteración 6: `5c89ab4dc808eefbfff608f59b7be9886cb41403`.

## Resultados comprobados

| Comprobación | Resultado |
| --- | --- |
| Suite completa con PostgreSQL real | **1727 aprobadas, 131 omitidas, 0 fallidas** |
| Archivos de pruebas | 227 aprobados, 6 omitidos; 233 total |
| Pruebas PostgreSQL comerciales/Puri+/Contact Flow | **188**: 127 previas + 61 nuevas |
| Pruebas nuevas de iteración 7 | **87**: 61 PostgreSQL + 26 contratos/endpoints |
| TypeScript / Next typegen | Correctos |
| ESLint completo | 0 errores; 32 advertencias preexistentes |
| Prisma 7.10 | Cliente generado; esquema/migración coherentes |
| Bootstrap y actualización legacy | Ambos aprobados; datos e historial conservados |
| Deploy repetido | Sin cambios de datos, historial ni esquema |
| Build aislado Next.js 16.3.8 | Correcto; credenciales ausentes y writers cerrados |
| Chrome real | Escritorio 1440×1050 y móvil 390×844; sin overflow ni errores de página |
| Proveedores externos / producción | 0 envíos reales; ningún deploy, activación, push o merge |

Las pruebas omitidas son las mismas 131 de la base. No se presentan como comprobadas. Los tests contractuales de billing existentes usan sus mocks; esta iteración no modificó Paddle ni realizó operaciones de cuenta.

## Trazabilidad de requisitos

| Área | Implementación y prueba |
| --- | --- |
| A–C. Continuidad/persistencia | Handoff original, única consulta de cadencia, 18 tablas privadas, FKs tenant, triggers y migración canónica |
| D. Consentimiento | Texto y recibo firmado, elección expresa, no backfill legacy, fuente/operador, dirección vinculada, revocación prioritaria y baja anónima idempotente |
| E. DSL | Rechazo de SQL, destinatarios/canales arbitrarios, descuentos, instrucciones libres, servicio/tenant incorrectos y precios cambiados |
| F. Revisión/autorización | Propuesta aprobada sin mensajes; autorización explícita hash/versión; aprobación concurrente idempotente; versiones y cambios de borrador |
| G. Outbox | SKIP LOCKED, reclamos concurrentes, fencing, recuperación de STARTED, backoff, pausas/cancelación, vigencia y revalidación de acceso |
| H. Proveedor | Simulador durable con aceptación/rechazo/429/503/rebote/timeouts; respuesta perdida; UNKNOWN sin idempotencia; HMAC/dedupe/reconciliación; sello externo probado sin red |
| I. Cuotas | Negocio día/mes, campaña, frecuencia y reservas; dos workers no superan la cuota diaria y dos negocios no superan la cuota global |
| J. Atribución | Reserva transaccional real, enlace reenviado rechazado con rollback, precio histórico/importe desconocido, cancelación y devolución registrada |
| K. Mismo Puri | Herramienta interna prepara borrador sin envío; no existen herramientas para autorizar/ejecutar/cambiar suscripción; resúmenes sin PII |
| L. UI | Constructor, preview, exclusiones, checkbox específico, pausa/reanudación/kill switch, ejecución y reconciliación simuladas, resultados y responsive |
| M. Seguridad/retención | Auth, CSRF, rate limits, IDOR, validación estricta, RLS/grants, SQL inmutable, firmas, no PII en resúmenes y purga con hold |

Casos adicionales: cambio de correo no transfiere consentimiento; cambio de remitente invalida ejecución; cancelar tras perder respuesta conserva la aceptación; entrega tardía no elimina una denuncia; consentimiento histórico inventado rechazado; firmas de recibo alteradas fallan.

## Recorrido de navegador

La prueba usa una base nueva y contactos `@example.invalid`. Genera evidencia mediante SQL, prepara/revisa/aprueba la propuesta, muestra **4 elegibles y 1 sin consentimiento**, autoriza la campaña por separado, verifica la outbox y prueba pausa/reanudación y bloqueo del negocio. Ejecuta **4 aceptaciones simuladas**, reconcilia **4 entregas simuladas** y crea **1 reserva mediante el endpoint HTTP real** usando el token de campaña. Completa esa reserva con evidencia sintética almacenada y consulta los resultados. Finalmente registra una baja anónima sin mostrar identidad.

Se comprueba que una cuenta Puri estándar recibe 403 sin generar runs. Hay 17 controles de navegador, incluyendo nombres accesibles, noindex, fallback determinista y ausencia de overflow. La medición no afirma incrementalidad ni llamadas reales al proveedor.

Evidencia preservada:

- [Resultado consolidado de validación](./evidence/iteration-7-validation.json)
- [Resultado de navegador](./evidence/iteration-7-browser-result.json)
- [Contact Flow escritorio](./evidence/iteration-7-contact-flow-desktop.png)
- [Contact Flow móvil](./evidence/iteration-7-contact-flow-mobile.png)
- [Página completa escritorio](./evidence/iteration-7-desktop.png)
- [Página completa móvil](./evidence/iteration-7-mobile.png)

## Ejecución y alcance de la evidencia

Se utilizaron `node scripts/test-commercial-postgres.mjs --all`, `npm run test:contact-flow:postgres`, `npm run typecheck`, `npm run lint`, `npm run test:commercial:migrations`, `npm run build:commercial:isolated` y `npm run test:puri-plus:browser`.

PostgreSQL 17 local, puerto 55443, bases desechables con nombres comprobados. Los runners limpian sólo sus negocios sintéticos; conservan las bases para inspección. El clúster local se detiene al finalizar. No se consultaron proyectos Supabase productivos. Las herramientas Supabase y la web se usaron únicamente para documentación.

La documentación del proveedor y la revisión legal están enlazadas en [19 — implementación](./19-contact-flow-ejecucion.md). No se certificó entrega en un buzón real ni idoneidad legal de campañas reales: la ejecución externa está deliberadamente sellada por código y por SQL. Cuotas comerciales definitivas, claves/dominios/buzón, política legal por país y liberación externa requieren aprobación previa al lanzamiento. El laboratorio funcional queda completo.

El runner completo ejecuta las cinco suites PostgreSQL secuencialmente y después el resto en paralelo. Así, los fixtures que cambian temporalmente el presupuesto global no interfieren entre archivos; las carreras entre workers dentro de cada prueba siguen siendo concurrentes. Se cubren también cancelación/baja tras un resultado ambiguo y cambio de día local sin cambio del día UTC.
