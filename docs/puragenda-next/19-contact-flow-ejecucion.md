# 19 — Contact Flow: ejecución comercial verificable

Fecha: 22-10-2026. Implementación local sobre el contrato de iteración 6, en `feature/puragenda-next`. Ningún entorno productivo fue consultado, desplegado o activado. Los datos, consentimientos, entregas y reservas de validación son sintéticos.

## Contrato y continuidad

`approvedGrowthHandoff` conserva su significado: entrega una propuesta aprobada, nunca permiso de envío. Contact Flow consume ese contrato y añade una autorización expresa del propietario para una versión/hash concretos. Puri estándar conserva su orquestación y herramientas.

Recorrido funcional: SQL de Puri+ → señal → propuesta revisada/aprobada → campaña y cohorte congeladas → vista previa/exclusiones/límites → autorización de ejecución → outbox PostgreSQL → simulador persistente → eventos autenticados → reserva real asociada → resultados.

Se reutilizan `GrowthScope`, sus permisos/entitlement, los presupuestos y tarifas de Puri+, el hash comercial, el scheduler de análisis y la creación transaccional existente de reservas. `growth/inactive-cohort.ts` es la única definición SQL de cadencia, usada tanto por la evidencia agregada como por la selección interna de destinatarios. No se envían contactos al modelo.

## Auditoría inicial

El marketing legacy (`/api/marketing/send`, `marketing.service.ts`) selecciona `acceptsMarketing=true` y ejecuta `resend.batch.send`. Su registro no prueba consentimiento y no sirve como outbox. Contact Flow no utiliza ese camino. Los recordatorios y correos operativos existentes conservan su comportamiento.

`Client` no tenía prueba de consentimiento comercial. `Appointment` sí conserva precio histórico opcional, estado, cierre y pagos; `PosPayment` conserva importes, moneda y devoluciones. El precio actual de `Service` no prueba un cobro histórico. Los enlaces de StoryCampaign no se reutilizan como evidencia de Contact Flow.

## Persistencia y aislamiento

Migración aditiva: `20261023010000_contact_flow`. No se editaron migraciones históricas. Se agregan claves únicas tenant a Client, Service, Staff, BusinessLocation y Appointment.

| Tabla | Responsabilidad |
| --- | --- |
| CfPolicy | Cuotas configuradas en servidor, canal y kill switch global/negocio |
| CfCampaign / CfVersion | Fuente Puri+, alcance/sucursal/profesional, estados y snapshots inmutables |
| CfAuthorization | Operador, fecha, hash exacto, vencimiento y revocación |
| CfConsent | Contacto, dirección pseudonimizada, finalidad/canal, texto aceptado, fuente, evidencia, firma y revocación |
| CfSuppression | Ledger inmutable de bajas, retiro, dirección inválida, rebote, spam y bloqueo |
| CfEnrollment | Cohorte congelada, consentimiento vinculado, elegibilidad y exclusión |
| CfMessage / CfOutbox / CfAttempt | Mensaje idempotente, trabajo durable, lease/fence e intentos |
| CfSimulatedReceipt / CfProviderEvent | Aceptación persistente del simulador y eventos autenticados deduplicados |
| CfQuotaBucket / CfQuotaReservation / CfQuotaAllocation | Reservas y consumo atómicos, con relaciones tenant verificadas |
| CfToken / CfAttribution | Referencias opacas firmadas y asociación transaccional a una reserva |
| CfAudit | Acciones y operadores sin conversaciones ni direcciones de clientes |

Las 18 tablas tienen RLS, sin políticas ni grants para PUBLIC, anon o authenticated. El acceso ocurre exclusivamente desde el backend autorizado. FKs compuestas conservan negocio en recomendaciones, sucursales, profesionales, servicios, clientes, consentimientos, versiones, mensajes y reservas. Los triggers privados protegen identidad, inmutabilidad, transiciones, fencing y autorización del propietario. El runner canónico verifica esquema, RLS y ausencia de grants después del deploy local.

## Consentimiento y baja

No existe backfill de `acceptsMarketing`. El recolector local acepta únicamente contactos `@example.invalid`, `SYNTHETIC_FORM`, elección explícita, texto `cf-commercial-email-v1`, referencia de origen, hash de evidencia y fecha reciente; rechaza importaciones históricas inventadas. Guarda el texto completo y un recibo HMAC verificable que vincula negocio, contacto, dirección, operador, fuente y tiempo. Es una prueba del formulario sintético del laboratorio; no certifica consentimiento de personas reales. `verifyConsentReceipt` se comprueba nuevamente durante elegibilidad.

La dirección usa HMAC por negocio. Un cambio de correo no hereda consentimiento. La supresión tiene prioridad aunque exista otra autorización o campaña anterior. Los consentimientos revocados no pueden reactivarse mediante UPDATE; una nueva aceptación tampoco borra una supresión.

`/contact-flow/unsubscribe` usa nonce aleatorio de 256 bits y firma, sin IDs de cliente ni sesión. GET muestra confirmación y no da de baja por prefetch. POST confirma o soporta one-click RFC 8058, de forma idempotente. No revela identidad ni consulta preferencias privadas. La baja comercial no cambia recordatorios de reservas. Las rutas públicas tienen límites persistentes y respuestas sin caché; los enlaces no se registran en los logs de desarrollo de Next.

## DSL y revisión

Objetivos permitidos: RECOVERY, FILL_AVAILABLE_TIME, REVIEW_DEMAND. Correo es el único canal. Las plantillas deterministas no incorporan descuentos, instrucciones libres, SQL ni promesas de horarios. El servicio debe existir y ofrecerse en la sucursal seleccionada. Una promoción por caída de demanda exige comprobar también la caída del servicio elegido.

La versión congela evidencia/hash de Puri+, cohorte y exclusiones, reglas, servicio/precio, identidad/dirección/remitente del negocio, zona horaria, contenido, fechas y límites. Cambiar un borrador genera otra versión y requiere revisar su nuevo hash. Una campaña autorizada es inmutable; puede pausarse, reanudarse o cancelarse. Sólo el propietario puede autorizar ejecución y controlar campañas. La IA carece de herramientas de aprobación o envío.

La política conservadora de frescura mantiene el contrato de iteración 6: un cambio de evidencia, incluido el cambio de ventana de análisis al día siguiente, exige nueva revisión/propuesta. Una ventana larga no permite reutilizar evidencia que ya cambió. Las bajas y direcciones se verifican independientemente en cada intento.

## Ejecutor y recuperación

`claimContactJob` usa `FOR UPDATE SKIP LOCKED`, lease de 30 s y fence creciente. STARTED se confirma antes de invocar al proveedor. El acuse sólo puede publicarlo el worker que mantiene el fence. Se revalidan propietario/permisos, negocio/sucursal, suscripción pagada/entitlement, propuesta, versión/autorización, catálogo, consentimiento firmado, supresión, reserva futura, vigencia, canal, cuotas y kill switches. La última comprobación y la aceptación simulada comparten una transacción corta con el lock de Contact Flow; una baja ya confirmada gana.

Máximo cinco intentos, backoff exponencial con jitter determinista, Retry-After para 429 y tratamiento de 5xx. Los errores permanentes liberan reserva sin reintento. La cuota se consume en aceptación o incertidumbre final. Las cancelaciones conservan una aceptación previa aunque se haya perdido su respuesta. Si no puede probarse si un intento anterior fue aceptado, una cancelación, baja o pérdida de permisos conserva UNKNOWN y consume la cuota; no transforma esa incertidumbre en una exclusión ni habilita otro envío.

El proveedor simulado conserva recibos por idempotency key, incluso entre procesos. Cubre éxito, rechazo, rebote, 429, 503, timeout aceptado, timeout desconocido y proveedor sin idempotencia. Un timeout no demuestra rechazo. Sin idempotencia, el resultado queda UNKNOWN sin reenvío automático. Con idempotencia, los reintentos se limitan a 23 h desde el primer intento; se deja margen respecto de las 24 h documentadas por Resend. La reconciliación usa recibos/eventos, no una suposición de éxito.

Los eventos HMAC del simulador y Svix/SDK de Resend se verifican sobre el cuerpo original antes de actuar. Se guarda sólo correlación, tipo, fechas y hash; no payload con PII. Dedupe por ID de evento, detección de conflictos y precedencia de rebote/spam frente a una entrega tardía. Un evento aún no correlacionable se rechaza para su reintento; no se aplica a un contacto arbitrario.

## Sellos de ejecución externa

`CONTACT_FLOW_EXTERNAL_RELEASE=false` es una constante de código. El adaptador Resend preparado rechaza antes de leer credenciales o crear transporte. Ni flags, claves reales, kill switches ni autorización del propietario abren ese sello. Además, SQL sólo admite mensajes SIMULATED, los guardas exigen base loopback desechable y runtime no productivo, y el envío sólo admite direcciones sintéticas. El constructor usa origen HTTP loopback. Ningún MCP público incorpora capacidades comerciales.

`providers.ts` conserva la integración con el SDK instalado: idempotencyKey, encabezados de baja, clasificación HTTP y deadline ambiguo. Su código no se ejecutó contra Resend. La futura liberación exige una revisión de código y de políticas; no hay un interruptor de entorno para activarla.

## Cuotas

Configuración explícita en servidor, sin inferir asignaciones del futuro plan Plus. Se reserva antes del intento en una transacción común: plataforma día/mes UTC; negocio día/mes según zona congelada; campaña total/día; destinatario por día y frecuencia mínima móvil. Reservado + consumido no supera el límite SQL. Las asignaciones no pueden usar cuotas de otro negocio. Un reintento conserva su reserva; al cambiar de día se reasigna de forma atómica. Una reducción del límite se vuelve a comprobar.

Los valores de fixtures son ficticios. Los topes de DSL y de prueba no son una oferta comercial. Antes del lanzamiento se deben aprobar cuota de plataforma, negocio/plan, cadencia, ventanas y supervisión de spam.

## Atribución y dinero

`/contact-flow/r` valida un token opaco y redirige al widget real, con negocio/servicio/sucursal comprobados. El widget transporta `cf_ref`; el backend lo transforma en `contactFlowToken`. `createAppointment` verifica y consume esa referencia dentro de la misma transacción de reserva. Exige contacto, dirección, negocio, servicio y sucursal coincidentes y aceptación previa; un enlace reenviado no atribuye la reserva de otra persona. La referencia es de un solo uso y no permite adjuntar arbitrariamente reservas existentes. Las reservas ordinarias sin token conservan su flujo.

Resultados: elegibles/excluidos/motivos, intentos, aceptados, entregas/rebotes/denuncias confirmadas, bajas, reservas/completadas/canceladas/devueltas e importes conocidos/desconocidos. Clics permanecen `null` porque la medición está deshabilitada; una petición de redirect no se presenta como clic humano. Incrementalidad siempre `null`: asociación técnica no demuestra causalidad.

Los cobros utilizan precio histórico conservado y pagos/cierre registrados. Un pago o cierre sin total histórico mantiene ingreso total `null`, con parte conocida separada. Nunca se usa el precio actual del servicio como cobro histórico. Las devoluciones POS registradas se descuentan de un cierre histórico; las reservas canceladas no se cuentan como ingreso/completadas. Esto no certifica liquidación bancaria ni contabilidad tributaria.

## Puri e interfaz

Herramientas internas: get_contact_campaigns, get_contact_quotas, get_contact_results y prepare_contact_campaign. Preparar usa una propuesta ya aprobada y defaults deterministas; si hay varios servicios exige selección explícita en la UI. Se conservan presupuestos/tarifas/fallback y reducción del texto a vocabulario cerrado. No existen herramientas AI para autorizar, enviar, modificar precios o suscripciones. Los formularios y el ejecutor funcionan sin OpenAI.

`/internal/puri-plus` mantiene el diseño de Puragenda: oportunidades, constructor y nuevas versiones de borrador, conteos/exclusiones, correo con identificación/baja, checkbox para autorización específica, seguimiento, pausa/reanudación/cancelación, kill switch y resultados. Se distingue aceptación simulada de entrega simulada. No se muestran datos individuales de destinatarios porque no son necesarios para revisar esta campaña.

## Retención y privacidad

`purgeContactFlow` exige configuración explícita y legalHold=true. Lotes por categoría entre 1 y 100; elimina eventos/intentos/outbox terminales vencidos y campañas cuyo período completo ya venció, sin atribución. Cada campaña admite hasta 20 versiones y cada cohorte hasta 1000 candidatos, acotando también sus cascadas. No purga trabajos vivos, entregas UNKNOWN, consentimientos, supresiones o evidencia contable bajo hold. La retención de Puri+ excluye recomendaciones referenciadas por campañas. Las operaciones son transaccionales e idempotentes.

Mínimos técnicos configurables de laboratorio: campañas/evidencia/entregas 90 días; outbox/eventos 30; auditoría 365; consentimiento y atribución 3650 bajo hold. No constituyen plazos legales aprobados. El borrado de una campaña espera el mayor plazo asociado y las referencias contables. El texto del correo se guarda una vez por versión; no se duplican correos, nombres privados, conversaciones ni payloads de proveedor por destinatario. Los únicos secretos viven en variables de servidor. La rotación de la clave HMAC requiere conservar claves/versiones y migrar verificablemente los hashes; sustituirla sin ese procedimiento cierra elegibilidad.

## Operación local reproducible

Usar PostgreSQL 17 loopback en una base `puragenda_commercial_test_*`. Los runners crean bases nuevas, aplican baseline/migraciones canónicas y nunca leen negocios productivos.

```powershell
# COMMERCIAL_V2_TEST_DATABASE_URL apunta al PostgreSQL local del laboratorio.
npm run test:contact-flow:postgres
node scripts/test-commercial-postgres.mjs --all
npm run test:puri-plus:browser
npm run test:commercial:migrations
npm run build:commercial:isolated
```

El runner de navegador genera secretos efímeros, excluye credenciales de proveedor, fija `CONTACT_FLOW_LAB_ENABLED=1` y elimina sólo sus negocios sintéticos al finalizar. Para ejecutar una base sintética preparada manualmente, conservar la misma clave de servidor entre procesos, configurar políticas explícitas y usar `npm run contact-flow:worker:local`; procesa como máximo 20 trabajos por invocación. No se instala cron ni se arranca un worker productivo.

## Revisión legal/proveedor previa a cualquier liberación

La revisión se hizo contra fuentes primarias el 22-10-2026. El artículo 28 B exige identificar asunto/remitente y un correo válido para solicitar suspensión; tras solicitarla quedan prohibidos nuevos envíos. La baja implementada es inmediata y el correo incluye identificación, motivo, dirección y mecanismo de baja. El remitente sintético de esta prueba no es un buzón comercial habilitado. [SERNAC, artículo 28 B](https://www.sernac.cl/portal/609/w3-propertyvalue-58918.html).

La Ley 21.719 reforma protección de datos y entra en vigencia el 01-12-2026. Finalidades, prueba de consentimiento, ejercicio de derechos, encargados, transferencias y plazos deberán revisarse para los países y actividades efectivamente habilitados. Este laboratorio no constituye una autorización legal de marketing. [Texto oficial BCN](https://www.bcn.cl/leychile/navegar?i=1209272), [Senado, vigencia](https://tramitacion.senado.cl/appsenado/index.php?ac=getDocto&iddocto=18723&mo=tramitacion&tipodoc=mensaje_mocion).

Resend exige opt-in expreso, identificación/dirección y baja sencilla; prohíbe listas compradas y contacto no solicitado. Sus umbrales operativos requieren supervisión antes del lanzamiento. Se debe aprobar dominio/remitente/buzón real, tratamiento de denuncias y rebotes, retención y acceso, esquema de claves, cobertura de supresiones externas/No Molestar y autorización comercial. [Acceptable Use Policy](https://resend.com/legal/acceptable-use), [idempotencia 24 h](https://resend.com/docs/dashboard/emails/idempotency-keys), [verificación de webhooks](https://resend.com/docs/webhooks/verify-webhooks-requests).
