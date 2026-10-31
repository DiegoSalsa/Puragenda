# Auditoría 05 — Cobros, suscripciones y Mercado Pago

Fecha de referencia: 2026-10-30. Repositorio: DiegoSalsa/Puragenda.
Cierre correctivo 05-A/05-B: 2026-10-31, sobre el SHA revisado `7aad2e2c20b45b012269a3495c177e746d269e99`.

Base inmutable: `f19553368d8317f66ac9b11fd2306bbc1839fba1`.
Rama local: `fix/puragenda-next-audit-05-billing-subscriptions`.

## Resumen ejecutivo

Entrega correctiva para revisión independiente, sin autorización de lanzamiento. Se conservaron el catálogo, los contratos históricos y las migraciones aprobadas. No se reconstruyó la facturación ni se crearon servicios externos.

Los defectos de conciliación, autorización y concurrencia reproducidos se corrigieron. Hay dos funcionalidades deliberadamente bloqueadas: la ejecución de beneficios V2 y la transición mensual/anual. Las reservas y cotizaciones de beneficios existen, pero no equivalen a un cobro aplicado. No se presentan las simulaciones como certificación de Mercado Pago real.

| Hallazgo | Resultado local |
| --- | --- |
| 05-01 | Corregido: una reversión de ampliación no revoca una renovación posterior pagada; revisión comercial persistente para efectos inciertos. |
| 05-02 | Corregidos la pérdida silenciosa del beneficio, el conteo duplicado, las reservas concurrentes y el consumo anticipado. Ejecución V2 bloqueada hasta validar un mecanismo de aplicación única. |
| 05-03 | Bloqueo conservado y explicado en interfaz/API. No se implementa una transición recurrente sin garantías del proveedor. |
| 05-04 | Corregido: recuperación explícita de hasta 48 horas, exclusivamente después de un periodo pagado, sin reiniciar el plazo por reintentos. |
| 05-05 | Corregido: una autorización sin factura ya no crea ni extiende acceso pagado legacy. |
| 05-A | Corregida la reconstrucción de varias ampliaciones del mismo periodo: preservación de componentes pagados y revisión de dependencias ambiguas. |
| 05-B | Corregida la gracia antes del primer worker: evaluación local común y proyecciones con frontera fija, sin I/O remoto por lectura. |

## Método y evidencia

Se creó un worktree separado desde el SHA indicado. PostgreSQL 17 propio, en loopback, puertos 55448 y 55449; bases y usuarios exclusivamente sintéticos. Los proveedores de pagos de integración se sustituyeron por adaptadores controlados. El harness limpia el entorno heredado, rechaza archivos `.env` ambientales y bloquea comunicaciones de la aplicación hacia proveedores externos.

Las reproducciones fallaron antes de sus correcciones. Los logs locales están en `scratch/audit05/` y no se versionan: `reproduction.log`, `reproduction-legacy.log`, `reproduction-legacy-benefit.log`, `reproduction-partial.log`, `reproduction-partial-stale.log`, `reproduction-legacy-reservation.log`, `reproduction-legacy-unknown.log` y `reproduction-application.log`. Contienen evidencia sintética, no credenciales productivas.

## 05-01 — Reversión de ampliaciones

**Reproducción.** Contrato base aprobado; ampliación aprobada; renovación mensual o anual aprobada; reembolso/contracargo tardío de la ampliación. El código inicial establecía `INACTIVE` y sustituía `lastPaymentStatus`, aunque el periodo vigente tenía otra evidencia. El reembolso inmediato también retiraba todo el acceso base ya pagado.

**Causa.** Se trataba el pago suplementario como propietario de todo el contrato. Además, la lectura y actualización remota previas a la transacción permitían intercalados entre conciliadores.

**Corrección.** La conciliación de ampliación serializa la lectura canónica y su aplicación mediante el bloqueo existente por negocio. Operación, negocio, contrato, moneda, importe y periodo se verifican. Una reversión del mismo periodo reconstruye los componentes respaldados por la factura recurrente y por las demás ampliaciones válidas (véase 05-A); una renovación posterior mantiene sus derechos. No se borran evidencias ni se cambian importes remotos al recibir el reembolso. La operación conserva `failureCode` de revisión y un `CommercialEvent`; nuevas modificaciones se bloquean hasta resolverla. El estado histórico `APPLIED` describe que la ampliación llegó a aplicarse, no que el reembolso esté resuelto.

La evidencia de una factura ya vinculada no se reasigna a otra operación cuando cambia el estado de revisión. Los reembolsos de la suscripción base conservan una semántica distinta: pueden retirar su propio periodo vigente, pero no otro posterior confirmado.

**Pruebas.** Pagos base y de ampliación, reembolso/contracargo inmediato y tardío, ambos ciclos, dos periodos, duplicados, notificaciones antiguas, aprobación posterior de la misma evidencia revertida y conciliadores concurrentes. Se comprueban contrato, operación, pagos, eventos y acceso efectivo. Los controles existentes de referencia, otro negocio, importes, moneda e identidad se vuelven a ejecutar.

**Límite.** Una reversión incierta requiere revisar el importe recurrente futuro y la capacidad contratada. No se elige ni elimina arbitrariamente a profesionales ni se ejecuta un cambio remoto automático.

## 05-02 — Referidos y recompensas

**Reproducción.** El referido persistía 25 % en `Subscription`, pero V2 preparaba el precio completo. Dos llamadas al contador sumaban dos referidos. En legacy, dos activaciones podían dejar dos premios activos y tres meses gratuitos se reducían a dos antes de cobrar. Una factura duplicada o de importe incompatible podía consumir más beneficio.

**Corrección.** La asignación del referido y su descuento es transaccional, idempotente y anterior a una contratación abierta. Se rechaza el referido propio, incluido otro negocio del mismo propietario. El primer referido pagado se reclama una sola vez, se vincula a evidencia V2 confirmada o a una factura legacy aprobada y se registra con su referencia de pago. Los rechazos y la mera autorización no generan fichas. Un reembolso conserva el historial y no crea un balance negativo ni vuelve a contabilizar el referido; no se inventó una política retroactiva de recuperación de fichas ya gastadas.

V2 reserva un solo premio bajo bloqueo por negocio, conserva completos uno o tres meses y no modifica Mercado Pago. Se bloquea preparar o ejecutar un checkout que omita un beneficio pendiente, también si el beneficio apareció después de preparar la operación. No hay un interruptor productivo para saltarse este bloqueo.

Legacy también serializa la activación. La reserva y su evidencia se confirman **antes** del PUT al proveedor. Una segunda transacción protege el envío y su resultado; un fallo o cierre del proceso conserva la intención durable. La factura aprobada debe corresponder al beneficio, importe e intervalo posterior a la reserva para consumirlo. Consumo, premio y recibo se guardan juntos; una repetición del mismo recibo no vuelve a descontar meses. Un resultado incierto o importe incompatible queda en revisión sin perder el premio. Se mantiene el tratamiento nominal histórico de Mercado Pago en legacy; no se extrapola a V2 como si $10 CLP constituyeran un mes gratuito.

**Regla comercial aclarada por el propietario durante esta auditoría.** Un porcentaje afecta **una mensualidad del precio final**, incluidos los profesionales, incluso si la factura es anual. Si el periodo está pagado, se reserva para la próxima facturación; no se devuelve dinero retroactivamente. El precio anual base sigue siendo diez mensualidades por doce meses de servicio. Se redondea a CLP el precio mensual descontado y luego se resta ese crédito del ciclo.

Ejemplo V2: $129.900 − ($12.990 − redondeo($12.990 × 75 %)) = **$126.653 CLP**. La interfaz distingue propuesta, reserva y cobro confirmado. No se cambian silenciosamente ofertas legacy ya reconocidas.

**Pruebas.** Registro real HTTP con referido y sin él; referido propio; primer pago, rechazo y duplicado; porcentajes 10/15/20/25/30/50; uno y tres meses; ambos ciclos; reserva durante prueba; activaciones concurrentes V2 y legacy; factura duplicada; timeout después del PUT; factura incompatible; reembolso del pago originario; historial y balances. Las pruebas de migración comercial existentes verifican que beneficios históricos no se descarten para forzar una migración.

**Bloqueo externo.** Cambiar temporalmente el precio de una preapproval no demuestra una aplicación única, ni el restablecimiento del importe antes de la factura siguiente. No se activa ese recorrido en V2. Los contratos recurrentes existentes conservan su importe autorizado; una reserva pendiente no representa una rebaja ya aplicada. Debe resolverse esta dependencia antes de ofrecer la ejecución automática del beneficio.

## 05-03 — Cambio mensual/anual

**Investigación y reproducción.** `changeTiming()` rechaza ambos sentidos. El adaptador actual actualiza importes y verifica la frecuencia original; no contiene un protocolo verificado de cambio de frecuencia efectivo en el siguiente vencimiento, con recuperación después de timeout y exclusión de dos contratos simultáneos.

**Decisión.** Se conserva `BILLING_CYCLE_CHANGE_REQUIRES_RENEWAL`. La API informa que la transición está deshabilitada y el panel lo explica. Las solicitudes concurrentes se rechazan antes de crear otra operación o enviar un PUT. No se inventa consentimiento, fecha confirmada, cancelación pendiente ni un contrato de reemplazo. El prorrateo de ampliaciones no cambia.

**Pruebas y omisiones.** Rechazo en PostgreSQL de ambos sentidos y concurrencia; fechas 29/30/31, febrero y año bisiesto en la política de periodos. No se simulan como completados el rechazo/confirmación del proveedor, webhooks de una transición ejecutada o cancelación de ese cambio: no existe una ejecución habilitada. Esos escenarios siguen pendientes de validación externa controlada.

## 05-04 — Mora y recuperación V2

**Reproducción.** Tras un periodo pagado, una renovación pendiente o rechazada perdía acceso al vencimiento, aun sin existir una reversión del pago anterior.

**Corrección.** Gracia máxima de 48 horas desde `periodEnd`, únicamente para contratos automáticos `registration_v2` con evidencia previa confirmada. No se concede por primera autorización, primer rechazo, prueba expirada, contracargo o cancelación. Se registra la transición y se materializa la proyección. Los rechazos repetidos, una API temporalmente caída y dos workers no reinician el plazo. Al vencer pasa a bloqueo; un pago canónico posterior restaura el servicio y limpia la gracia.

El worker evalúa la política local incluso si falla la comunicación o no hay facturas. El periodo pagado no se acorta. La cancelación durante gracia retira la cortesía de recuperación, manteniendo los datos y la frontera pagada.

La evaluación efectiva central permite a Agenda, capacidad de profesionales, sitio web, Contact Flow y Puri consultar la misma regla. La proyección compatible usa `PAST_DUE` y la misma fecha de gracia. La antigua prueba de Puri que exigía bloquear siempre al terminar el periodo se actualizó para exigir acceso durante la gracia pagada y denegación al vencer; permanecen las comprobaciones de permisos y de prueba/pago válido.

**Pruebas.** Primera autorización sin cobro, primer pendiente/rechazo, periodo aún pagado, gracia y vencimiento, API caída, concurrencia de workers, reintentos, cancelación y recuperación después de suspensión. El worker necesita estar programado y supervisado en el futuro entorno de lanzamiento; aquí no se habilitó ningún worker productivo.

## 05-A — Ampliaciones sucesivas dentro del mismo periodo

**Reproducción PostgreSQL.** Puragenda/1 pagado → Plus/1 pagado → Plus/5 pagado. Reembolsar solo la segunda ampliación eliminaba Plus aunque la primera siguiera confirmada. La prueba falló contra el SHA revisado; también se reprodujo 05-B antes de corregirlos (`scratch/audit05/corrective/before.log`, dos fallos y 61 regresiones aprobadas).

**Reconstrucción.** La factura confirmada del periodo vigente es el ancla, no el único derecho. Se recorren las ampliaciones aplicadas por su `previousContractHash`, validando selección anterior, cotización, importe suplementario, moneda, contrato y periodo. Se conserva la cadena histórica aunque una evidencia haya sido revertida; solo los componentes de evidencias todavía confirmadas pueden conceder acceso. El catálogo aditivo permite separar el incremento de plan del incremento de profesionales. Una dependencia de profesionales requiere que su capacidad anterior esté pagada. Las cotizaciones y los hashes originales permanecen intactos.

Resultados: devolver Plus/1→Plus/5 conserva **Plus/1**; devolver Puragenda/1→Plus/1 después de pagar los cinco conserva **Puragenda/5**, porque ese suplemento de profesionales tiene el mismo precio independiente del plan. Si la primera ampliación era Plus/2 y la segunda pagó únicamente 2→5, devolver la primera conserva **Puragenda/1** y registra la dependencia ausente; no se inventa el pago del segundo profesional. Un reembolso parcial bajo revisión tampoco se cuenta como evidencia completa inequívoca. Si falta la evidencia ancla, el contrato queda `UNKNOWN` bajo revisión y se retiran las proyecciones de acceso; el snapshot no sustituye la evidencia ausente. Las dependencias no resolubles se incluyen en `reconstruction.ambiguousDependencies`; permanece el bloqueo de revisión comercial.

Los reembolsos no envían PUT ni cambian importes remotos. La renovación posterior con pago completo es una evidencia independiente y conserva/restaura su selección. Se mantienen eventos, evidencias e ítems históricos. Las reversiones concurrentes descubrieron además relojes capturados antes del lock que podían cerrar un ítem antes de su inicio: las fronteras de proyección ahora avanzan estrictamente respecto del último ítem dentro del bloqueo.

**Cobertura nueva: 38 casos PostgreSQL.** Mensual/anual, reembolso/contracargo de cada ampliación, orden de llegada inverso, ambos reembolsos, duplicados concurrentes, webhooks firmados duplicados/tardíos, aprobación obsoleta, dependencias ausentes y renovación antes/después de la reversión. Se verifican capacidades, profesionales, historial, snapshots, eventos únicos y ausencia de mutación remota por reversión.

## 05-B — Gracia sin primera ejecución del worker

**Reproducción PostgreSQL.** Con pago confirmado, consultar `getCommercialPlanAccess()` un minuto después de `periodEnd`, sin webhook ni worker, denegaba acceso. El estado seguía `ACTIVE` y la evaluación anterior necesitaba `PAST_DUE_GRACE` persistido.

**Política compartida.** `mpV2RenewalGraceDeadline()` deriva una única frontera `periodEnd + 48 h`, respetando cualquier frontera persistida más corta. Exige contrato automático nativo `registration_v2`, sin vínculo legacy, identidad de suscripción de Mercado Pago, periodo válido y pago anterior confirmado con fecha/evento. Excluye primeras contrataciones impagadas, periodos futuros, estados no aptos, cancelación solicitada/incierta/verificada y pagos revertidos. A las 48 horas exactas se deniega acceso. No usa la hora del reintento como origen.

Las consultas calculan el estado efectivo sin escribir ni llamar al proveedor. Worker, acceso comercial, sitio web, Puri, Contact Flow, panel de cobros y diagnósticos consumen la misma política. Los selectores restringidos de Puri/Contact Flow incluyen la procedencia y cancelación necesarias. Al materializar un pago válido se reserva la misma frontera fija en la proyección compatible de Agenda/widget y en los entitlements; así tampoco necesitan esperar el primer worker. La proyección de estado pasa a `PAST_DUE` al materializarse durante gracia. Las fechas autorizadas son coherentes antes de esa escritura. Solicitar cancelación retira la cortesía proyectada en la misma transacción local, incluso si la confirmación remota acaba en `UNKNOWN`; el periodo ya pagado se conserva.

El worker persiste las transiciones idempotentes y eventos únicos por contrato, periodo y estado. Repetir lecturas, webhooks o workers no extiende la frontera. Una factura aprobada posterior recupera el acceso y limpia la gracia persistida, también después del bloqueo. Se actualizaron dos expectativas históricas que suponían denegación inmediata o un fixture de gracia sin procedencia de contrato automático.

**Cobertura nueva: 39 casos PostgreSQL.** Ambos ciclos; antes del vencimiento, frontera exacta, +1 minuto, +24 h, 48 h−1 ms, 48 h y +49 h; con/sin workers concurrentes. Se contrastan acceso, profesionales, Agenda, web, Puri, Contact Flow y diagnósticos/proyecciones; exclusiones, cancelación incierta real contra adaptador simulado y recuperación con factura duplicada. Las lecturas no crean eventos ni invocan el adaptador remoto. HTTP adicional verifica panel, Puri y Contact Flow con fixtures pagados locales antes/después del vencimiento, durante gracia y después de 48 h.

### Programación y supervisión requeridas antes de lanzamiento

**No está activada aquí.** `vercel.json` no programa `/api/cron/puragenda-next`. La gracia local no depende del scheduler, pero conciliación, estados persistidos y alertas sí requieren operación supervisada.

Preparar en el futuro entorno autorizado un scheduler confiable que invoque **una vez por minuto** `GET /api/cron/puragenda-next` con `Authorization: Bearer <COMMERCIAL_WORKER_SECRET>` (secreto de al menos 32 caracteres), o un proceso finito `npx tsx scripts/run-commercial-worker.ts`. La ruta exige los flags del runtime comercial y `COMMERCIAL_WORKER_ENABLED=1`; recuperación V2 exige `PURAGENDA_MP_V2_RECOVERY_ENABLED=1` y las barreras productivas explícitas del proveedor. No se cambió ningún flag, cron ni recurso remoto en este trabajo. No habilitar envíos o IA productivos para probar este mecanismo.

El tick usa un presupuesto máximo de 20 s, lease de 120 s y fencing en `CommercialWorkerState` (`PURAGENDA_NEXT`); la recuperación V2 tiene lease/cursor propios `MP_V2_RECOVERY:<cuenta>:<aplicación>` y un lote acotado. Las invocaciones solapadas deben registrar `busy` y finalizar; los errores no autorizan cobros ni crean contratos nuevos. Ajustar capacidad y comprobar que todos los contratos pendientes se recorren en el SLA, incluyendo la recuperación explícita de contratos fuera de la ventana histórica acotada.

Supervisar `lastStartedAt`, `lastSuccessAt`, `lastError`, `summary.stageErrors/skippedStages`, métricas V2 y eventos `mp_v2_recovery_alert`. Con cadencia de un minuto, alertar si no hay éxito durante cinco minutos, hay fallos repetidos, operaciones estancadas, renovación vencida o discrepancia monetaria/de identidad. Revisar backlog y latencia, no solo HTTP 200. Preparar y comprobar las proyecciones de cualquier contrato V2 preexistente antes de publicar código productivo; validar entonces el scheduler y las migraciones, sin ejecutar aquí esa preparación remota.

## 05-05 — Autorización legacy sin factura

**Reproducción.** `/api/billing/verify` podía activar una cuenta inactiva, convertir una prueba y extender una cuenta activa hasta `next_payment_date` o una fecha inventada. El webhook tenía la misma activación de onboarding. Las pruebas aislaron autorización y ausencia de factura.

**Corrección.** La autorización no escribe acceso ni fechas. Se conservan exactamente la prueba, promoción/cortesía o periodo pagado reconocidos. Solo la conciliación de factura aprobada puede crear tiempo pagado. Un `authorized` antiguo no limpia una mora más reciente. Se mantienen las rutas de transferencia bancaria, los contratos manuales y los otros productos.

**Pruebas.** HTTP de ruta y webhook firmado con PostgreSQL para `INACTIVE`, `TRIALING`, `PAST_DUE` y `ACTIVE`; regresión existente de facturas aprobadas/rechazadas, cancelación y transferencias. No se fuerza una reconciliación masiva de cuentas históricas.

## Controles transversales

- **Webhooks:** firma, antigüedad, identificador de consulta/payload y lectura canónica; cuenta, entorno, aplicación, CLP e importe. Una aplicación ausente o distinta ya no acredita el contrato. Un reembolso parcial previo al primer reconocimiento queda pendiente de revisión, no concede el contrato completo; una respuesta posterior que omita el reembolso no borra el hecho registrado. Un reembolso completo se distingue por el importe canónico. Las evidencias anteriores y los eventos se conservan.
- **Idempotencia:** operaciones durables, claves únicas, bloqueo por negocio, recibo de beneficios y contador reclamado una sola vez. Se mantienen la recuperación de creación/PUT inciertos y las barreras para evitar otra suscripción. No se generan POST nuevos para recuperar un resultado desconocido.
- **Precios:** catálogo central intacto, IVA incluido, anualidad pagando diez y prorrateo vigente. Para cinco profesionales: Puragenda $29.990/mes y $299.900/año; Puragenda+ $44.990/mes y $449.900/año. Las cotizaciones persistidas se verifican; una incompatibilidad de versión/hash falla expresamente en lugar de sustituir silenciosamente el precio aceptado. Una futura versión del catálogo deberá conservar un lector compatible de contratos anteriores.
- **Limitación de cobros:** el limitador en memoria no comparte presupuesto entre instancias. Eso no probaba por sí solo duplicación financiera, porque existen locks e idempotencia. Se sustituyó específicamente `billingLimiter` por el contador PostgreSQL ya disponible, con IP de proxy confiable, sin servicios pagos nuevos. Todas sus rutas esperan la comprobación asíncrona. Dos instancias comparten el mismo límite y se rechazan siete de doce solicitudes con presupuesto cinco.
- **Compatibilidad:** regresiones de auditorías 01–04, abonos de reservas, transferencia/manual, Paddle legacy, POS, Gift Cards, pagos web, retenciones, Contact Flow, Puri y MCP. No se mezcló la evidencia SaaS con pagos recibidos por negocios. No se modificaron integración/configuración de Paddle ni las cuentas reales de Mercado Pago.

## Validación ejecutada

<!-- VALIDATION_RESULTS -->
| Comprobación | Resultado | Conteo sin duplicados |
| --- | --- | --- |
| Vitest general | 1.878 aprobadas; 709 condicionales omitidas por guardas | Las 709 se ejecutaron luego en PostgreSQL; cero fallos finales. |
| PostgreSQL comercial, auditorías 01–05 y módulos asociados | 537 aprobadas | Incluye 138 casos de 05: 61 originales y 77 correctivos; reejecución final de esos 138. |
| Agenda/reservas PostgreSQL | 97 aprobadas | 60 adicionales; 37 ya incluidas en general. |
| MCP PostgreSQL | 53 aprobadas | 27 adicionales; 26 ya incluidas en general. |
| Legacy, abonos y pagos web PostgreSQL | 85 aprobadas | 85 adicionales. |
| Total Vitest distinto | **2.587 aprobadas** | 1.878 + 537 + 60 + 27 + 85; cero fallos finales. |
| Protecciones de publicación | 26 aprobadas | Incluidas en general; no se suman otra vez. |
| Migración con roles/grants de Supabase | 38 comprobaciones aprobadas | RLS, permisos, datos y drift. |
| Migración sin roles al aplicar 04 | 29 comprobaciones aprobadas | Cluster separado; roles ausentes comprobados. |
| HTTP/E2E integrado, aplicación local real | **132 comprobaciones** | 6 bootstrap + 20 general + 14 agenda + 13 servicios + 49 clientes/portal + 30 cobros/gracia. |
| Vercel en navegador integrado propio | Producción y configuración de build/Git consultadas | La revisión visual de Recompensas fue de la entrega inicial; aquí se reejecutó su HTTP. |
| Prisma generate y validate | Aprobados | Sin cambios de esquema. |
| TypeScript/typegen y build Webpack aislado | Aprobados | Sin variables ni llamadas a proveedores productivos. |
| ESLint | Cero errores; 32 advertencias preexistentes | No se corrigieron asuntos ajenos. |
| Secretos, temporales e integridad | Sin hallazgos en el alcance revisado | Inventario y commits intermedios; migraciones intactas. |

**Omisiones deliberadas:** pagos, renovaciones, cancelaciones y devoluciones externas reales; ejecución de beneficios V2 y de transiciones de ciclo todavía bloqueadas; pruebas manuales productivas. No se certifica una integración externa por aprobar mocks. Las 709 omisiones condicionales de la suite general sí quedaron cubiertas por las suites PostgreSQL, no permanecen pendientes.
<!-- /VALIDATION_RESULTS -->

Los fallos esperados de reproducción y los ajustes del harness no se suman como pruebas aprobadas adicionales. Se corrigieron el loader TS de un script HTTP, un directorio de recibos de migración, una expectativa que contaba como uno dos pagos válidos y un fixture con hash sintético que no cumplía el contrato HTTP; este último fue reemplazado por registro real de prueba. Los logs de desarrollo conservan esos fallos. La entrega exige cero fallos finales. En el cierre correctivo se corrigió la interoperabilidad ESM/CJS del script HTTP; una recogida de tests coincidió con `prisma generate`, por lo que se repitió la suite general después de finalizar la generación. El resultado final es cero fallos; la generación y los consumidores deben secuenciarse.

Comandos reproducibles, con `COMMERCIAL_V2_TEST_DATABASE_URL` apuntando exclusivamente al PostgreSQL local permitido:

```text
node scripts/test-audit-05.mjs verify
node scripts/test-audit-05.mjs general
node scripts/test-audit-05.mjs commercial
node scripts/test-audit-05.mjs booking
node scripts/test-audit-05.mjs mcp
node scripts/test-audit-05.mjs legacy
node scripts/test-audit-05.mjs migrations
node scripts/test-audit-05.mjs migrations --without-supabase-roles
node scripts/test-audit-05.mjs build
```

El escenario sin roles requiere su propio cluster. La historia congelada anterior a 04 usa roles de Supabase: el fixture los crea solo para reconstruir esa historia y los elimina antes de aplicar 04. No se afirma que toda la historia antigua arranque sin ellos. Se verifican ausencia de drift y preservación histórica.

HTTP/E2E local: `prepare`, `staging`, `http-bootstrap`, `http-general`, `http-agenda`, `http-services`, `http-clients`, `http-billing` del mismo runner. Los adaptadores de pago permanecen deshabilitados en ese servidor. La entrega inicial comprobó visualmente Recompensas con una cuenta sintética en el navegador integrado propio; no se recorrió un checkout externo ni se realizaron operaciones financieras reales.

## Migraciones y operación

No se agregaron migraciones. Permanecen intactas:

- `20261029180000_preserve_service_staff_history`, blob `63cebb2732fd518ee7cb87c01f2c4a46c6ddc523`.
- `20261030120000_client_portal_privacy`, blob `c0e996f45cd040f64b98053428357d870a97fabf`.

Los nuevos recibos utilizan `CommercialEvent`; la limitación utiliza `ApiRateLimitBucket`. No se alteró el esquema ni se ejecutó una migración remota. Antes del lanzamiento deben coordinarse las migraciones ya pendientes de RC1 con el cambio de runtime. Para rollback operacional se deben pausar escritores/reconciliadores y revisar reservas o PUT inciertos antes de volver a un consumidor antiguo de beneficios; no se borran evidencias ni se revierten las migraciones aprobadas.

## Riesgos residuales y validación externa pendiente

1. Demostrar en sandbox controlado cómo aplicar una sola mensualidad descontada, uno o tres meses gratuitos y el retorno al importe normal, tanto mensual como anual, con autorización anticipada, factura ya emitida, duplicados y timeout. Verificar importe/frecuencia/fecha canónicos y consentimiento. Hasta entonces, V2 no ejecuta beneficios; las reservas no deben anunciarse como descuentos aplicados.
2. Demostrar una transición de ciclo al vencimiento, incluyendo rechazo, timeout y ausencia de contratos recurrentes simultáneos. El cambio continúa bloqueado; no se infiere esa garantía de un mock de PUT.
3. Verificar que los recursos canónicos de la aplicación autorizada incluyen la identidad exigida. Un payload sin esa prueba falla cerrado; no se relaja el control por conveniencia de una respuesta incompleta.
4. Definir por separado una eventual devolución de fichas por contracargo de un referido ya gastado. Se preserva el reconocimiento histórico, sin saldos negativos ni compensaciones inventadas.
5. Establecer la atención operativa de reembolsos/contracargos y alertas, resolver importes/capacidad bajo revisión y habilitar recuperación supervisada. Un proveedor indisponible no concede acceso indefinido. Los contratos muy antiguos fuera del lote acotado del worker pueden necesitar conciliación explícita si también se pierde el webhook.
6. Mantener compatibilidad de lectura de cotizaciones anteriores cuando se versione el catálogo. No se cambiaron hoy los precios publicados ni se recalcularon contratos con un catálogo nuevo.

No se certificaron cobros, renovaciones, cancelaciones ni devoluciones externas reales. No se enviaron correos reales, no se usaron clientes reales, no se revocaron sesiones reales y no se modificaron configuraciones productivas.

Referencias primarias consultadas: [gestión de suscripciones](https://www.mercadopago.cl/developers/es/docs/subscriptions/subscription-management), [actualizar preapproval](https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/update-preapproval/put), [crear preapproval](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/create-preapproval/post), [pagos autorizados](https://www.mercadopago.cl/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments) y contratos del SDK local. Algunas aperturas directas respondieron 403; se contrastaron los extractos oficiales indexados y el adaptador instalado. Esto no sustituye la aceptación externa controlada.

## Entrega e inventario

<!-- INVENTORY -->
44 archivos modificados respecto de RC1 (incluido este informe):

- `.github/workflows/security.yml`
- `docs/puragenda-next/33-auditoria-05-cobros-suscripciones-2026-10-30.md`
- `scripts/test-audit-05.mjs`
- `scripts/test-commercial-postgres.mjs`
- `scripts/test-next-staging-billing.mjs`
- `scripts/vercel-build.mjs`
- `src/app/api/billing/recovery/route.ts`
- `src/app/api/billing/subscribe/route.ts`
- `src/app/api/billing/verify/route.ts`
- `src/app/api/dashboard/subscription/billing/route.ts`
- `src/app/api/webhooks/mercadopago/route.ts`
- `src/app/dashboard/rewards/page.tsx`
- `src/app/dashboard/rewards/rewards-client.tsx`
- `src/components/dashboard/commercial-subscription-panel.tsx`
- `src/core/commercial-benefits.ts`
- `src/core/subscription-access.ts`
- `src/server/commercial-billing/mercadopago-v2-dunning.ts`
- `src/server/commercial-billing/mercadopago-v2-grace.ts`
- `src/server/commercial-billing/mercadopago-v2-http.ts`
- `src/server/commercial-billing/mercadopago-v2-provider.ts`
- `src/server/commercial-billing/mercadopago-v2-recovery.ts`
- `src/server/commercial-billing/mercadopago-v2.ts`
- `src/server/contact-flow/worker.ts`
- `src/server/lib/rate-limit.ts`
- `src/server/puri/growth/access.ts`
- `src/server/services/affiliate.service.ts`
- `src/server/services/commercial-benefit-hold.ts`
- `src/server/services/commercial-entitlements.service.ts`
- `src/server/services/commercial-plan-access.ts`
- `src/server/services/commercial-subscription-v2.service.ts`
- `src/server/services/discount.service.ts`
- `src/server/services/subscription-billing.service.ts`
- `src/server/services/subscription-dunning.service.ts`
- `tests/core/audit05-benefits.test.ts`
- `tests/fixtures/audit05-billing.ts`
- `tests/integration/audit05-billing-postgres.integration.test.ts`
- `tests/integration/audit05-expansions-postgres.integration.test.ts`
- `tests/integration/audit05-grace-postgres.integration.test.ts`
- `tests/integration/audit05-legacy-postgres.integration.test.ts`
- `tests/integration/audit05-rate-limit-postgres.integration.test.ts`
- `tests/integration/commercial-launch-postgres.integration.test.ts`
- `tests/integration/registration-v2-postgres.integration.test.ts`
- `tests/server/rc1-deployment-safety.test.ts`
- `vercel.json`
<!-- /INVENTORY -->

El SHA inicial `7aad2e2` ya estaba publicado. Este cierre añade tres commits: `b7bca38` (05-A), `df426c3` (05-B) y el commit de este informe/validación. Son 19 archivos correctivos y 77 pruebas PostgreSQL nuevas; el total de la rama es 11 commits lineales y 44 archivos frente a RC1. La publicación se limita a esta rama; no se integra ni despliega. `main`, RC1 y el workspace original conservan sus cambios previos.

Archivos del cierre correctivo:

- `docs/puragenda-next/33-auditoria-05-cobros-suscripciones-2026-10-30.md`
- `scripts/test-audit-05.mjs`
- `scripts/test-commercial-postgres.mjs`
- `scripts/test-next-staging-billing.mjs`
- `src/core/subscription-access.ts`
- `src/server/commercial-billing/mercadopago-v2-dunning.ts`
- `src/server/commercial-billing/mercadopago-v2-grace.ts`
- `src/server/commercial-billing/mercadopago-v2-http.ts`
- `src/server/commercial-billing/mercadopago-v2.ts`
- `src/server/contact-flow/worker.ts`
- `src/server/puri/growth/access.ts`
- `src/server/services/commercial-entitlements.service.ts`
- `src/server/services/commercial-plan-access.ts`
- `src/server/services/commercial-subscription-v2.service.ts`
- `tests/fixtures/audit05-billing.ts`
- `tests/integration/audit05-expansions-postgres.integration.test.ts`
- `tests/integration/audit05-grace-postgres.integration.test.ts`
- `tests/integration/commercial-launch-postgres.integration.test.ts`
- `tests/integration/registration-v2-postgres.integration.test.ts`

Las exclusiones de Vercel y de ambos jobs de Actions incluyen expresamente esta rama, tanto por `ref` como por `head_ref` según el trigger. El wrapper rechaza su build antes de ejecutar CLI o migraciones. La revisión de secretos se hace también sobre los commits intermedios; los recibos, certificados, credenciales sintéticas y capturas permanecen fuera de Git.

<!-- REMOTE_CLOSE -->
Preflight remoto del cierre correctivo: RC1 local/remota permanece en `f19553368d8317f66ac9b11fd2306bbc1839fba1`; `main` remota en `e74c92237e47db43425a7d47209520967e51bfb0` y local conserva `a3d90a652268e7770dd0c53cac2786d6e5bf63e7`. La rama remota partía exactamente de `7aad2e2c20b45b012269a3495c177e746d269e99`. GitHub: un solo workflow, cero ejecuciones para esta rama y cero webhooks del repositorio. Vercel: producción `e74c922`, despliegue `C29ToGLShM1ba5KedPkPchToUYLg` del 26 de octubre; Root Directory vacío, override de build desactivado, Ignored Build Automatic y ningún Deploy Hook. Las exclusiones explícitas de push/PR/build se conservaron y la suite de 26 protecciones pasó. No se modificó configuración remota.

El SHA definitivo y la comprobación posterior al push se entregan con la referencia remota al cerrar el trabajo; no se crea otro commit para autorreferenciar su propio hash. Después de publicar, la rama queda congelada para revisión independiente, sin integración.
<!-- /REMOTE_CLOSE -->
