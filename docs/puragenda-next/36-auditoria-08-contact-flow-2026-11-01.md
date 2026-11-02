# Auditoría 08 — Contact Flow, comunicaciones comerciales y entrega

Informe solicitado para el 01-11-2026; comprobaciones ejecutadas el 01 y 02-11-2026, zona America/Santiago. Rama local exclusiva: `fix/puragenda-next-audit-08-contact-flow`. Base exacta: `476e523ae35d8799f7c0e8c9573142c145495dd3`.

## Resumen y alcance de la aprobación

Se conserva el módulo existente. Se corrigen autorización después de una espera, bajas con interruptores cerrados, resultados de entrega inciertos, privacidad HTTP y un fallo de hidratación. La vía directa legacy queda pausada por seguridad: no dispone de prueba de consentimiento, supresiones ni outbox duradero. Se mantienen sus datos, contratos, plantillas e historial; no se convierte ningún contrato a Plus.

Esta auditoría prepara una revisión independiente del código publicado en su rama exclusiva. No autoriza lanzamiento, envío real, scheduler, Puri+, MCP, proactividad, cobros o migraciones productivas. Los pendientes de retención y dependencias permanecen explícitos. La reapertura de campañas legacy requiere un recorrido seguro aprobado para sus contratos.

Once hallazgos, incluido el cierre correctivo 08-C1: ocho corregidos, uno contenido mediante pausa segura y dos pendientes. La corrección de experiencia de usuario no resuelve la compatibilidad contractual legacy de lanzamiento. La rama se congela nuevamente para revisión; el lanzamiento permanece sin autorizar.

## Aislamiento y referencias

- Worktree propio: `C:/Users/diego/.codex/worktrees/puragenda-next-audit08/agenda`.
- RC1 local y remoto comprobados en la base indicada; Auditoría 07 conserva el mismo SHA.
- `feature/puri-onboarding-v2` local: `803447bbe7afdb12d92fd3dbbd8512c189b772ac`, sin incorporación ni modificación.
- `main` remoto: `e74c92237e47db43425a7d47209520967e51bfb0`. `main` local conserva `a3d90a652268e7770dd0c53cac2786d6e5bf63e7`; su reflog corresponde al 14-10-2026. No se intenta sincronizar estas referencias distintas.
- PostgreSQL 17 propio, desechable, ligado a `127.0.0.1:55448`; identidad y directorio del cluster verificados. Las suites auxiliares crean sus propias bases o esquemas. El simulador legacy crea y detiene un cluster propio en el puerto libre 55439.
- Sin `.env` ambiental; instalación con `npm ci --ignore-scripts` y generación local de Prisma. Secretos de prueba aleatorios o marcadores sintéticos. El runner rechaza conexiones comerciales externas y bloquea red de proveedores.
- Navegador Chrome local con Playwright instalado exclusivamente en `scratch/audit08/qa`, sin modificar manifiestos ni lockfile del proyecto. Resend y OpenAI reales ausentes.

## Inventario revisado

Los 23 módulos de `src/server/contact-flow/`: `campaigns`, `cohort`, `consent`, `dashboard-http`, `events`, `first-paid-plus`, `http`, `interruption`, `launch-policy`, `metrics`, `operations`, `policy`, `providers`, `public-consent`, `quotas`, `release-switch`, `resend-capacity`, `resend-certification`, `resend-release`, `resend-test`, `retention`, `tokens` y `worker`.

También: `commercial-worker.ts`; cron `/api/cron/puragenda-next`; API de dashboard/interna, webhooks, baja y redirección; preferencias comerciales del portal; widget y transacción canónica de reservas; `/api/marketing/send`, `/status` y `marketing.service.ts`; `/api/contact`; correo transaccional, recordatorios, pagos y autenticación; workspace Puri+, panel Contact Flow, consumo y operaciones Superadmin; scheduler en `ops/commercial-scheduler`.

Las 18 tablas propias son `CfPolicy`, `CfCampaign`, `CfVersion`, `CfAuthorization`, `CfConsent`, `CfSuppression`, `CfEnrollment`, `CfMessage`, `CfOutbox`, `CfAttempt`, `CfSimulatedReceipt`, `CfProviderEvent`, `CfQuotaBucket`, `CfQuotaReservation`, `CfQuotaAllocation`, `CfToken`, `CfAttribution` y `CfAudit`. Se revisan también `CommercialWorkerState`, contratos, evidencia de pagos, clientes, reservas y cuentas del portal.

Referencias históricas contrastadas: documentos 19, 25, 26 y 27 y sus políticas de catálogo vigentes. La certificación controlada de tres mensajes y sus reservas 20/100 no se presenta como política productiva: el lanzamiento usa configuración y aprobación independientes.

## Hallazgos, reproducción y correcciones

| ID | Severidad | Causa y reproducción | Corrección / estado |
| --- | --- | --- | --- |
| 08-F01 | Alta | `authorizeCampaign` y `controlCampaign` validaban el scope antes de esperar el lock. En PostgreSQL se mantiene el advisory lock con otra conexión, se observa la espera en `pg_stat_activity`, se desactiva al usuario/sucursal o se baja el plan y se confirma. La autorización o reanudación podía persistir con el scope anterior. El cambio de propietario ya estaba protegido además por el trigger SQL; la prueba lo conserva. | Revalidación del scope efectivo dentro de la transacción, después del bloqueo, para preparación, autorización y control. Se comprueba nuevamente vencimiento. Las cuatro carreras de autorización y la de reanudación pasan. |
| 08-F02 | Alta | Apagar funciones comerciales impedía la baja firmada en laboratorio; desactivar altas públicas bloqueaba también la retirada de consentimiento del portal. Reproducción real con GET sin mutación y dos POST simultáneos tras cerrar interruptores; retirada del portal con cuenta verificada. | La baja depende de la capacidad de verificar firmas y del entorno autorizado, no del envío ni de nuevas altas. El portal permite consultar y revocar; aceptar sigue requiriendo el interruptor de consentimiento. La interfaz conserva la retirada y oculta nuevas altas cuando están pausadas. |
| 08-F03 | Crítica | La vía legacy elegía `acceptsMarketing=true`, llamaba a `resend.batch.send` sin outbox, no exigía evidencia firmada ni baja por destinatario y registraba después. Una respuesta del SDK con error tampoco se trataba como rechazo. La prueba con proveedor simulado reproducía éxito 200 y llamada directa sin estas garantías. | Envío directo contenido mediante 409 `LEGACY_MARKETING_REVIEW_REQUIRED`, antes de elegir audiencia o tocar Resend. No existe flag que reabra esta vía. Historial, cuotas declaradas, plantillas y contratos conservados. Reapertura segura pendiente de decisión de producto/contratos antes de ofrecer campañas legacy. |
| 08-F04 | Media | La ruta legacy carecía del control de Origin utilizado por las acciones comerciales. La frontera del servidor no rechazaba expresamente solicitudes de otro origen. Las cookies y el navegador pueden aportar mitigaciones adicionales; no se afirma una explotación productiva. | `requireSameOrigin` antes de autenticación y efectos. Regresión unitaria y HTTP real: 403 para origen ajeno, cero proveedor. |
| 08-F05 | Alta | Después de `TIMEOUT_UNKNOWN`, un rechazo permanente posterior cambiaba el mensaje a `FAILED` y liberaba la cuota, aunque el primer intento podía haberse aceptado. La prueba PostgreSQL falló mostrando ese estado. | Se conserva `UNKNOWN`, revisión y cuota consumida cuando existe un intento anterior `STARTED`/`UNKNOWN`. Se valida además la clave idempotente contra campaña, versión, destinatario y canal antes de enviar; alterarla tras incertidumbre no genera otro intento. El rollover de día/mes conserva el compromiso mediante la protección ya existente de interrupciones. |
| 08-F06 | Media | El navegador real detectó hidratación fallida en consumo: ICU de Node producía `p. m.` y Chrome `p. m.`. La fecha inicial era distinta aunque representaba el mismo instante. | Formato numérico estable por partes, zona America/Santiago y reloj de 24 horas; pruebas de cambio mensual y horario de invierno. No cambia cuotas ni fechas almacenadas. |
| 08-F07 | Alta | El handler de baja devolvía `no-referrer`, pero la respuesta HTTP real recibía `strict-origin-when-cross-origin` por la regla global de Next. Esta diferencia no aparecía llamando directamente al handler. | Reglas específicas posteriores para `/contact-flow/:path*` y widget con `cf_ref`: `no-referrer`, `no-store`, noindex. La baja recibe además CSP restrictiva. Pruebas de precedencia y HTTP real; el widget ordinario mantiene su política de embedding. |
| 08-F08 | Media operativa | La nueva rama 08 todavía no estaba en las exclusiones versionadas. | Exclusión exacta en `vercel.json`, `vercel-build.mjs` y ambos jobs de Actions para ref y head_ref. Todas las exclusiones anteriores conservadas. 35 pruebas de protección. |
| 08-F09 | Alta, pendiente de lanzamiento | No hay política de retención aprobada con responsable identificado, plazos fundamentados, procedimiento de derechos, conservación de evidencias y alcance de legal holds. Los mínimos técnicos existentes no constituyen plazos legales aprobados. | Pendiente. No se implementa purga nueva ni se activa la existente en producción. Coordinado con 07-20. Detalle por categoría más abajo. |
| 08-F10 | Moderada, mantenimiento pendiente | `npm audit`: 23 nodos afectados, 21 moderados y 2 bajos, exclusivamente en herramientas de desarrollo. | Pendiente de actualización acotada y compatible. Auditoría productiva en cero. Sin `audit fix --force` ni cambios de dependencias. |
| 08-C1 | Media funcional | El backend legacy respondía 409, pero la página mostraba formulario, capacidad histórica y acción de envío; la ayuda contextual invitaba a preparar campañas. Reproducción Chrome/HTTP/PostgreSQL anterior a la corrección. | Experiencia y contrato de lectura corregidos: pausa explícita, capacidad efectiva cero, historial conservado, sin formulario ni compra forzada; Contact Flow condicionado al acceso efectivo. Seguridad del backend contenida; prestación contractual legacy de lanzamiento pendiente. |

Las pruebas fallidas que reprodujeron defectos y los fallos de preparación del entorno se conservan como evidencia local; no cuentan como aprobaciones. No se reconstruye el módulo para sustituir garantías que ya funcionaban.

## Autorización, consentimiento y aislamiento

La entrega usa la evaluación comercial central, incluyendo gracia legítima de 48 horas. La nueva matriz ejecuta entrega para Plus pagado/trial, trial vencido, autorización sin pago confirmado, período vencido, gracia vigente/vencida, renovación cancelada con período pagado, básico, inactividad, negocio/usuario eliminado y contrato legacy. El downgrade conserva campañas y evidencia. Recuperar derechos no evita la comprobación de autorización, vigencia, consentimiento y cuota; mensajes excluidos no se reabren automáticamente.

`acceptsMarketing` histórico no produce recibos Contact Flow. La evidencia fija negocio, cliente, hash de dirección, finalidad comercial, canal, texto/version, fecha, fuente y firma. El widget anónimo registra `PENDING_VERIFICATION`; solo la cuenta del portal verificada para esa dirección concede `GRANTED`. Cambiar email no traslada la firma. Un opt-in posterior no elimina una supresión.

Se verifican tres negocios ficticios, diez workers y rechazo de campañas/destinatarios ajenos. El HTTP rechaza `businessId` inyectado y exige sesión independiente de Superadmin. FKs compuestas y guards SQL preservan tenant, versión, consentimiento, autorización y cuotas. Las 18 tablas Cf tienen RLS sin grants públicos/anon/authenticated. RLS no sustituye el scope de aplicación para la conexión del servidor.

Puri prepara y aprueba propuestas; eso no crea autorización de envío. La autorización humana está ligada al hash y versión inmutables. Cambios relevantes requieren nueva revisión. El modelo recibe resúmenes sin listados de destinatarios; la revisión individual paginada exige propietario.

## Bajas y privacidad de enlaces

GET muestra confirmación sin mutar; POST admite confirmación y RFC 8058. Firma, tipo y caducidad se verifican en servidor. La baja repetida/concurrente produce una sola supresión y un solo evento de auditoría. Token y parámetros ajenos no permiten elegir otro tenant. Supresiones y revocaciones prevalecen sobre autorizaciones anteriores.

Las rutas no reflejan direcciones ni tokens en el HTML. Las reglas HTTP evitan caché, indexación y Referer; el logging de Next ya excluye rutas `/contact-flow/` y URLs con `cf_ref`. La analítica usa el pathname y propiedades permitidas, no la URL firmada completa. Los registros de acceso de CDN/proxy/proveedor y su filtrado/retención requieren verificación de lanzamiento; esta auditoría no puede certificar configuraciones remotas.

La retirada comercial solo modifica CfConsent/CfSuppression y evidencia relacionada. No cancela preferencias de recordatorios, reservas, pagos o acceso. La identidad exacta del portal se comprueba nuevamente para cada operación; no basta con un correo enviado por el navegador.

## Outbox, concurrencia e incertidumbre

Se conservan `FOR UPDATE SKIP LOCKED`, lease, owner y fence, STARTED persistido antes del proveedor y claves estables. Un worker antiguo no finaliza un trabajo reclamado por otro. Se vuelven a comprobar contrato, propietario, estado de campaña, catálogo, consentimiento y switches antes de preparar la entrega. Las carreras demostradas durante el advisory lock no invocan proveedor tras perder acceso, revocar consentimiento o cancelar campaña.

429/5xx se clasifican para backoff acotado; ausencia de respuesta es incertidumbre. No se trata un timeout como rechazo. Los reintentos idempotentes están acotados a cinco y a 23 horas; sin idempotencia no se reintenta automáticamente una ambigüedad. La cuota incierta se conserva y se dispone de reconciliación/revisión.

Límite inherente: una baja o pausa posterior a la autorización final puede coincidir con una solicitud externa ya en vuelo. No se promete retirar un correo ya aceptado; se detienen intentos nuevos y se conserva el resultado incierto. Los tests usan proveedor simulado; la garantía final de idempotencia y los tiempos reales deben certificarse con Resend antes del lanzamiento.

## Cuotas y capacidad vigentes

Se contrasta `config/commercial/contact-flow-free.json`, la política de uso y sus bindings de aprobación:

| Alcance | Diario | Mensual / total | Campañas |
| --- | ---: | ---: | ---: |
| Plataforma Contact Flow | 10 | 200 mensuales | — |
| Plus pagado | 10 | 150 mensuales | 3 por período |
| Plus trial | 5 | 30 totales de prueba, además del techo mensual | 1 durante la prueba |

Cooldown de 30 días; máximos por campaña 50 pagado/30 trial, además de límites autorizados de cada versión. Los límites menores de la estrategia y de la campaña siguen aplicándose. Las políticas sintéticas 100/1000 de algunas pruebas no son una modificación de esta política comercial.

El ledger reserva global, negocio, campaña y contacto bajo lock; cambios de política no borran consumo. Se prueban último slot global concurrente, cuotas de negocio/trial, cruce horario local, cambios de plan y snapshots de capacidad. Capacidad ausente, vencida, inválida, sin reset verificable o con binding cambiado cierra el envío comercial.

La capacidad productiva reserva por defecto 40 correos diarios y 1.000 mensuales para operaciones, y descuenta además compromisos locales conservadoramente. Poll 30 s, máximo de antigüedad 60 s, vinculados a la aprobación. Free exige techo diario verificable; Pro puede no tenerlo, pero mantiene techo mensual conocido y reservas. Cambiar cuenta/key/dominio/webhook/política exige bindings coherentes; los intentos inciertos no saltan a otra cuenta.

Contact Flow se pausa si no hay margen. No compra Resend Pro ni modifica las cuotas transaccionales. La prioridad es conservadora, no una garantía contra consumo externo posterior al snapshot; la certificación operativa debe confirmar reservas suficientes para el tráfico real.

## Webhooks y conciliación

Se revisan y prueban firmas artificiales y rotación, replay/duplicados, payload alterado, evento sin correlación, eventos fuera de orden, proveedor ajeno, cierre de switches y reconciliación repetida. Los siete eventos contemplados son `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed` y `email.suppressed`.

El SDK verifica la firma antes de interpretar datos. Se vincula al provider ID o a tags firmados del mensaje; un evento no correlacionado no se asigna arbitrariamente. Se guardan correlación, hash y estado; no el payload completo con destinatarios. Rebote/queja/supresión persistente prevalecen sobre positivos tardíos. Retraso no genera reenvío. Recepción firmada y bajas siguen disponibles con nuevos envíos apagados. La reconciliación remota exige configuración legible válida y puede requerir intervención tras rotación incompleta; no se consulta al proveedor real en esta auditoría.

## Legacy, transaccional y atribución

La ruta legacy es una superficie comercial, no transaccional. Su pausa está fundada en los defectos reproducidos; no cambia precio, período, seats ni la suscripción histórica. No se fuerza migración comercial ni se exige comprar Plus para conservar datos. La decisión de restaurar campañas legacy con prueba de consentimiento, baja, idempotencia y capacidad debe quedar aprobada antes de prometer esa prestación.

Se conservan confirmaciones de reservas, notificaciones de pagos, comprobantes, invitaciones y recuperación de acceso. Pruebas de correo y regresiones de pagos usan mocks. `/api/contact` envía al equipo una solicitud iniciada por el interesado, con rate limit, same-origin, validación y escape; no es un disparador de campañas a clientes.

La atribución ocurre dentro de la transacción canónica de reservas y exige tenant, cliente, dirección firmada, servicio, sucursal y aceptación previa del mensaje. El token se reclama atómicamente una vez. Un enlace reenviado no acredita a otra persona. Métricas distinguen reservas, cancelaciones, completadas y devoluciones; usan importes históricos, depósitos, pagos POS y Gift Card según datos registrados, no el precio actual del servicio. No equiparan valor nominal con liquidación bancaria ni asociación técnica con incremento causal. Clics e incrementalidad son desconocidos (`null`), no interés humano probado.

## Activación y scheduler

Credenciales solas no activan envíos. Producción exige los dos switches exactos, runtime/mode productivos coherentes, Next habilitado, worker habilitado sin kill, secreto suficiente, manifiesto de aprobación vigente ligado a credenciales separadas, token secret, remitente, dominio, webhook, origen permanente, Reply-To y políticas. Cambios invalidan una aprobación obsoleta. El remitente aprobado es del subdominio comercial; el Reply-To y su routing requieren certificación humana y técnica.

El scheduler existente propuesto es Cloudflare Worker `ops/commercial-scheduler`, sin HTTP público. `SCHEDULER_ENABLED="0"`, `workers_dev=false`, `preview_urls=false`, `crons=[]` en producción y staging. Tras aprobación separada necesitaría un único trigger `* * * * *`, el destino exacto del ambiente y `COMMERCIAL_WORKER_SECRET` como secreto, nunca en Git. Envía GET con Bearer, rechaza redirects, timeout de 25 s, máximo dos intentos y pausa de 1 s. El endpoint compara el secreto en tiempo constante; el tick usa lease de 120 s/fence, presupuesto configurado 5–20 s y maxDuration de ruta 60 s. Los límites son cooperativos por etapas; latencia de base/proveedor debe comprobarse operacionalmente, no se presenta como SLA certificado.

Conciliación de pagos se atiende antes de entregas. El primer pago Plus realmente conciliado puede generar un evento administrativo deduplicado para revisión de Resend Pro; no hay compra ni aviso externo automático. El monitor exige Superadmin, muestra pendientes, UNKNOWN, errores, capacidad y falta de actividad. No se programa ni contrata ningún scheduler en esta auditoría.

## Retención y privacidad — 08-F09 / coordinación 07-20

Responsables a aprobar: cada negocio como responsable de la finalidad comercial; Puragenda como operador/encargado de la infraestructura, con un responsable interno de privacidad aún por designar formalmente. Esta asignación es una propuesta operativa para revisión, no una determinación legal ni un nombre inventado.

| Categoría / sistemas | Datos y finalidad | Conservación técnica actual / propuesta para aprobación |
| --- | --- | --- |
| CfCampaign, CfVersion, CfAuthorization, CfEnrollment | Configuración, contenido comercial, remitente, negocio, reglas/evidencia, ids/hash de destinatario, actor, aprobación | Sin TTL activo. La limpieza de campañas exige estado terminal, ausencia de atribución y entregas vivas/inciertas; el umbral efectivo contempla consentDays (mínimo técnico 3.650 días), no solo campaignDays. Revisar minimización y plazo antes del lanzamiento. |
| CfConsent y CfSuppression | Prueba firmada de aceptación y retirada, texto, fuente, fecha, hash de correo, tenant/cliente, motivo | La función actual no los elimina. Hold técnico conservador; no equivale a plazo legal aprobado. Debe preservarse la oposición durante una eliminación de datos y aprobar representación mínima y acceso. |
| CfMessage, CfOutbox, CfAttempt, CfSimulatedReceipt | Correlación/proveedor, idempotencia, estados, errores y fechas | Outbox DONE desde mínimo técnico 30 días; intentos desde 90 días; no trabajos vivos ni UNKNOWN. Mensajes/recibos se conservan hasta limpieza terminal de campaña. No hay cron de purga conectado. |
| CfProviderEvent | Identificador, hash, tipo y fechas; sin payload completo | Mínimo técnico 30 días, solo mensajes finales. Falta plazo aprobado y política del proveedor. |
| CfQuotaBucket, CfQuotaReservation, CfQuotaAllocation | Compromiso y consumo por período, negocio/campaña/contacto | Sin TTL automático; conservar compromisos inciertos. Aprobar plazo de evidencia y eventual agregación sin reabrir cuotas. |
| CfToken | Id opaco, propósito, destinatario por relación, vencimiento y uso | Booking emitido hasta 30 días después del vencimiento de versión; baja hasta 10 años después. Expiración de validez no elimina la fila. Revisar ambos plazos y reemplazo de enlaces sin perder oposición. |
| CfAttribution y Appointment/PosPayment/GiftCard relacionados | Asociación técnica y evidencia histórica de reserva/dinero | Atribuciones no purgadas; se preserva evidencia contable. No fijar plazo legal ni borrar pagos por una limpieza comercial. |
| CfAudit, CommercialEvent y CommercialWorkerState | Trazabilidad, actor, hashes/configuración, estados operativos | Mínimo técnico auditDays 365 entra en la selección de campañas; no existe TTL general aprobado de auditoría/worker. Ciertas auditorías de campaña se eliminan por cascade al limpiar su campaña, por lo que el alcance de holds debe aprobarse expresamente. |
| Client y ClientPortalAccount | Identidad/contacto canónicos, relación por tenant, verificación de correo | Reutilizan procedimientos de privacidad de Auditoría 04. No se borra ni anonimiza arbitrariamente desde Contact Flow. Retirar consentimiento no borra reservas ni evidencia. |
| Resend, logs de acceso, backups y observabilidad | Entrega, direcciones/datos enviados, trazas de infraestructura | Configuración y conservación remotas no verificadas. Exigir contrato, acceso, filtrado de tokens, backups, borrado y registro de encargados antes de certificar. |
| Puri/MCP y telemetría de 07-20 | Prompts/conversaciones, métricas, tokens OAuth y recibos MCP | No los purga `purgeContactFlow`. Deben quedar en la misma política aprobada y con procedimientos específicos; la integración de auditorías no autorizó una purga. |

`purgeContactFlow` es una función interna sin ruta, scheduler ni caller productivo versionado: únicamente las pruebas la invocan. Usa el lock común, lotes acotados e idempotencia, conserva consentimiento/supresión/atribución y UNKNOWN. El campo `legalHold: true` protege categorías previstas; no es un sistema general de holds legales por expediente/tenant. No se certifica como tal.

Antes de activar IA/MCP/Contact Flow: aprobar inventario y finalidad, responsable con nombre, plazos fundamentados por categoría, acceso y exportación, eliminación/anonimización tenant-scoped, oposición persistente, alcance de holds, preservación de evidencia, logs/backups y verificación del procedimiento. El riesgo es conservar identificadores/evidencia indefinidamente o eliminar evidencia sin fundamento. No exige una migración para integrar esta corrección; la política futura puede requerir diseño/migración aditiva revisados. Es bloqueo de lanzamiento de las funciones afectadas, no un pendiente menor.

## Dependencias — 08-F10

Nueva ejecución: `npm audit --omit=dev --audit-level=low` devuelve **0 vulnerabilidades**. Auditoría completa: **23** nodos afectados, **21 moderados y 2 bajos**, sin altos/críticos. El lockfile y package.json no cambian.

| Paquetes afectados | Severidad | Exposición e intervención recomendada |
| --- | --- | --- |
| @eslint-community/eslint-utils, @eslint/config-array, @eslint/eslintrc, @next/eslint-plugin-next, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint, eslint-config-next, eslint-plugin-import, eslint-plugin-jsx-a11y, eslint-plugin-react, typescript-eslint | Moderada (15 nodos) | Cadena de lint/parseo, principalmente propagación de minimatch. Actualizar padres compatibles en mantenimiento dedicado y repetir lint/TS. No son dependencias alcanzables de la aplicación productiva. |
| minimatch, @ts-morph/common, ts-morph, shadcn | Moderada (4 nodos) | Amplificación de globparts/DoS en herramientas de desarrollo/generación. Resolver minimatch >=11.0.1 mediante versiones compatibles de padres; revisar shadcn/ts-morph. No aceptar automáticamente los downgrades mayores sugeridos por audit. |
| @vitest/mocker, vitest | Moderada (2 nodos) | Registro de mocks no autenticado/inyección y bypass de allowlist en Windows. Actualización puntual a Vitest/mocker >=4.1.12 y regresión. Mantener QA en loopback; no exponer servidores de pruebas. |
| deepmerge, @shadcn/registry | Baja (2 nodos) | Envenenamiento de prototipo al mezclar entradas en tooling. Rango reportado deepmerge 4.2.0–4.3.1; actualizar registry/shadcn a una cadena corregida y verificar resolución. No se inventa una versión corregida que el informe no proporciona. |

Los 23 nodos incluyen dependencias transitivas y propagación de avisos; no son 23 defectos de runtime independientes. Ninguno aparece en la auditoría productiva. Las herramientas de desarrollo siguen requiriendo mantenimiento; no se elimina el riesgo porque no se desplieguen. No se ejecutaron actualizaciones masivas ni `npm audit fix --force`.

## Regresión inicial y evidencias, anteriores a 08-C1

Las siguientes ejecuciones corresponden al cierre inicial, antes de la revisión del SHA `4d043ba8515835a8aa0911f4f1587f3d9b99724b`. No se presentan como nuevas ejecuciones de 08-C1. Los JSON/logs y capturas quedan en `scratch/`, ignorados; no se publican datos de sesiones sintéticas ni informes redundantes.

| Ejecución | Resultado verificado |
| --- | --- |
| PostgreSQL comercial transversal, 21 suites | 609 aprobadas; auditorías 01–07, Contact Flow y Free incluidos |
| Nuevas PostgreSQL Auditoría 08 | 28 aprobadas: matriz comercial, locks observados, tres tenants, diez workers, incertidumbre y bajas |
| Reservas/catálogo/agenda aisladas | 97 aprobadas; 60 condicionales y 37 repetidas respecto del general |
| MCP aislado | 58 aprobadas; 32 condicionales y 26 repetidas respecto del general |
| Compatibilidad legacy y sitios/pagos simulados | 85 aprobadas, incluidas las suites con puerto/datos de QA dedicados |
| Vitest general final | 1.936 aprobadas; 814 condicionales omitidas en esta invocación y ejecutadas por separado en las suites anteriores |
| HTTP y navegador local | 31 controles de recorrido aprobados, escritorio 1440×1050 y móvil 390×844; cero errores de página, cero overflow y cero proveedor real |
| Prisma generate/validate, Next typegen, TypeScript | Aprobados en la ejecución final aislada |
| ESLint | Aprobado: cero errores, 32 advertencias preexistentes |
| Build aislado | Aprobado, webpack, 162 páginas estáticas; DB local, sin credenciales de proveedores y escritores comerciales deshabilitados |
| Protecciones GitHub/Vercel | 35 aprobadas; no se ejecutan CLIs reales de deploy/migración en estas pruebas |
| Secretos y archivos temporales | Cero coincidencias del escaneo de patrones sobre commits/líneas introducidas; sin artefactos de QA ni secretos añadidos al inventario versionado |

Consolidación: **2.750 casos Vitest aprobados**, sin contar nuevamente las pruebas repetidas entre invocaciones. Hay **2.735 identificadores únicos por archivo + fullName**: quince descripciones se reutilizan en parametrizaciones existentes (por ejemplo NaN/Infinity como `null`, tipos distintos de acuerdos manuales o errores de importe/moneda). Se ofrece también ese conteo conservador para no presentarlos como nombres distintos. La consolidación por identificador queda en `scratch/audit08/test-summary.json` y no contiene fallos ni pendientes. Los 31 controles de navegador/HTTP son adicionales y no se suman a Vitest.

Resultado final: cero pruebas fallidas. No queda una suite condicional obligatoria sin ejecución: las 814 se cubren por PostgreSQL comercial, Auditoría 08, reservas, MCP y legacy. Sí se omiten por restricción las pruebas con proveedor/cuentas reales, entregas reales, operaciones financieras, infraestructura remota y despliegues. Las certificaciones Resend históricas no cuentan como nuevas ejecuciones.

Fallos de preparación documentados: faltaba el cliente Prisma tras instalar sin scripts; el primer wrapper eliminaba flags del laboratorio; el sondeo de pg_stat_activity necesitaba limpiar el snapshot estadístico; fixtures de portal/cancelación necesitaban evidencia coherente. Se corrigió la preparación, sin relajar guards de producto. El navegador histórico requería esperar hidratación, seleccionar slots habilitados con disponibilidad recibida y actualizar expectativas de texto cambiadas en 07. Se aisló su caché por ejecución tras un error JSON de Next; no se borra una caché ajena ni se ocultan errores de navegador. Los defectos de producto reproducidos se distinguen en la tabla de hallazgos.

## Migraciones, despliegue y cierre

No hay migraciones nuevas. Todos los archivos de `prisma/migrations` y `prisma/bootstrap`, incluidas las auditorías 03 y 04, coinciden con la base. Se aplicaron exclusivamente a PostgreSQL desechable. No se añadieron grants públicos, cambios de DNS ni backfills de consentimiento.

La rama 08 está excluida mediante `git.deploymentEnabled: false`, rechazo previo a cualquier CLI de `vercel-build.mjs` y guards de Actions para push/ref, pull request/head_ref y workflow_dispatch. Los cinco cron históricos permanecen; no se añade el worker comercial. La automatización versionada no invoca un Deploy Hook ni API de despliegue al publicar esta rama.

El cierre inicial local no incluyó push, merge, rebase, cherry-pick ni deploy. La publicación posterior para revisión dejó la rama remota en `4d043ba8515835a8aa0911f4f1587f3d9b99724b`, referencia comprobada antes de 08-C1. No se llamó a Resend/OpenAI reales ni se ejecutaron pagos o migraciones remotas. No se modificaron Vercel, DNS, dominios, Cloudinary o producción. Vercel remoto no fue consultado; no se afirma ausencia de despliegues remotos ajenos a esta tarea.

Antes del lanzamiento quedan: política 07-20/08-F09 aprobada y procedimiento probado; mantenimiento 08-F10; certificación real independiente de cuenta/consumo Resend, idempotencia, webhook/rotación, sender/Reply-To/routing, reservas operativas, observabilidad/logs y scheduler; resolución contractual del envío legacy pausado. Ninguno se activa como parte de esta auditoría.

El cierre inicial constó de **9 commits lineales y 25 archivos**, respecto de la base indicada, sin divergencia de la base. El cierre correctivo agrega commits sobre esa referencia, sin reescribirla. El SHA final y la comprobación posterior al push se entregan fuera del propio commit documental para evitar una autorreferencia imposible. Los clusters/servidores propios se detienen al finalizar.

Inventario de cambios: protecciones (`vercel.json`, `scripts/vercel-build.mjs`, `.github/workflows/security.yml`, prueba `rc1-deployment-safety`); scope (`campaigns.ts`, `policy.ts`); bajas (`public-consent.ts`, `resend-test.ts`, API de preferencias, página y componente del portal); entrega (`worker.ts`); marketing legacy (ruta y prueba); consumo (`commercial-usage.ts`, panel y prueba de fecha); privacidad/QA (`next.config.ts`, `puri-plus-browser-qa.ts`, `test-puri-plus-local.mjs`, prueba de cabeceras); reproducibilidad (`test-audit-08.mjs`, `scan-audit08-secrets.mjs`, integración `audit08-contact-postgres`); este informe. No hay imágenes temporales, dumps, logs, credenciales, lockfiles modificados ni informes paralelos en el diff.

## Cierre correctivo 08-C1 — 02-11-2026

Base revisada local/remota exacta: `4d043ba8515835a8aa0911f4f1587f3d9b99724b`. RC1 permanece en `476e523ae35d8799f7c0e8c9573142c145495dd3`; main y onboarding V2 mantienen las referencias indicadas. Sólo se modifica la rama 08.

### Reproducción anterior al cambio de producto

El arnés `scripts/audit08-marketing-browser-qa.ts`, ejecutado mediante `node scripts/test-puri-plus-local.mjs --marketing --reproduce`, crea bases PostgreSQL desechables y propietarios sintéticos. El negocio EQUIPO legacy no tiene snapshot V2; conserva una campaña histórica y su contrato activo. Se crean también Puragenda y Puragenda+ V2 con pago sintético confirmado. Chrome real abre `/dashboard/marketing` y consulta el endpoint HTTP.

Las **27 comprobaciones previas** confirmaron formulario legacy en los tres planes. Legacy mostraba capacidad de una campaña/100 destinatarios, cero consumido y botón habilitado. Redactar y pulsar el botón devolvió 409 `LEGACY_MARKETING_REVIEW_REQUIRED`. Las solicitudes de Básico/Plus devolvieron 409 `CONTACT_FLOW_REQUIRED`. El estado API conservaba la capacidad histórica legacy como disponible. Cero errores de página. La ruta de envío no importa Resend; los mocks comprueban cero llamadas, selección de audiencia o emisión de tokens. Las pruebas HTTP no tienen credenciales de proveedor y bloquean tráfico externo desde Node y navegador.

### Corrección y límites

La proyección compartida `marketing-availability.service.ts` consulta el acceso comercial central y, para el enlace a Contact Flow, el contexto y scope efectivos de Puri+. Verifica derechos, vigencia, sesión, permisos y sucursal mediante los controles existentes; no activa funciones ni escribe contratos. El espacio de revisión y la habilitación productiva de entrega se describen por separado. Básico, Plus vencido/bloqueado, permisos insuficientes o módulo desactivado no ofrecen el enlace. El destino conserva sus propias comprobaciones de autorización.

La página conserva tarjetas, colores y tabla del diseño existente. Legacy conserva historial, datos y condiciones históricas, con explicación de la pausa de seguridad y sin compra forzada. No hay formulario ni botón condenado a 409 en ningún plan. No se cambian las cuotas del catálogo. El estado API mantiene nombres y tipos de `campaignsSentThisMonth`, `maxCampaignsPerMonth`, `maxAudienceSize`, `plan` y `lastCampaign`, pero los dos límites reflejan **capacidad efectiva cero** del endpoint pausado. Agrega `legacySendingPaused: true`, `sendingEnabled: false` y `availability`; usa `private, no-store`. No acepta parámetros del cliente para reactivar envíos.

Se elimina la declaración obsoleta de PageTutorial (componente de compatibilidad sin efecto). La ayuda contextual existente explica estado e historial, sin instrucciones de envío ni un sistema adicional. Fechas del historial con formato numérico y zona UTC explícita evitan discrepancias de hidratación. Los correos transaccionales y `/api/marketing/send` no se modifican.

**Seguridad del backend: contenida. Experiencia del usuario: corregida. Compatibilidad contractual legacy de cara al lanzamiento: pendiente de resolución definitiva.** La pausa continúa siendo una regresión funcional respecto de producción. Antes de lanzar debe aprobarse expresamente cómo conservar o sustituir de forma segura el beneficio histórico; requiere consentimiento verificable, supresión, baja, outbox, idempotencia, cuotas y política contractual. Ocultar el formulario no cierra ese requisito. No se implementa una sustitución ni una purga arbitraria bajo esta autorización.

### Nuevas ejecuciones de 08-C1

| Ejecución nueva | Resultado |
| --- | --- |
| Pruebas focalizadas de disponibilidad/estado y bloqueo de envío | 26 aprobadas: 21 nuevas y 5 existentes con Resend simulado |
| Vitest general | 1.957 aprobadas; 814 condicionales omitidas en esa invocación y ejecutadas en los grupos PostgreSQL siguientes |
| PostgreSQL comercial, auditorías 01–07 y Contact Flow/Free | 609 aprobadas, 21 suites |
| PostgreSQL específico Auditoría 08 | 28 aprobadas |
| Reservas/catálogo/agenda | 97 aprobadas (60 condicionales, 37 también en el general) |
| MCP con cliente HTTP oficial | 58 aprobadas (32 condicionales, 26 también en el general) |
| Compatibilidad legacy, sitios y pagos simulados | 85 aprobadas |
| Chrome/HTTP/PostgreSQL con espacio de revisión habilitado | 49 comprobaciones aprobadas |
| Chrome/HTTP/PostgreSQL con Contact Flow desactivado | 48 comprobaciones aprobadas |
| Prisma generate/validate, Next typegen y TypeScript | Aprobados en la nueva ejecución aislada |
| ESLint | Cero errores y 32 advertencias preexistentes |
| Build aislado webpack | Aprobado, 162 páginas estáticas; proveedores ausentes y escritores comerciales deshabilitados |
| Protecciones de publicación | 35 aprobadas nuevamente antes de publicar |
| Secretos, inventario y migraciones | Cero coincidencias de patrones; sin temporales versionados ni cambios en migraciones/bootstrap |

Los 97 controles de navegador/HTTP son comprobaciones de dos matrices con casos repetidos, no 97 casos únicos. Incluyen escritorio y móvil, ayuda, historial, lectores anteriores, manipulación de parámetros, Plus bloqueado/vencido, usuario sin permiso y ausencia de desbordamiento. Ambas matrices terminan sin errores de página. Los resultados de reserva, pago, suscripción y correo transaccional usan datos/proveedores sintéticos; no equivalen a entregas certificadas con un proveedor real.

Las pruebas iniciales en rojo detectaron tres expectativas de estado incorrectas y la ausencia de la nueva proyección. Fallos del arnés durante preparación: cuarto envío limitado a 429 (separados clientes sintéticos sin cambiar el rate limit), timeout de compilación, dos controles responsive de ayuda, fixture con un estado inexistente (corregido a `PAST_DUE_BLOCKED`) y anotación TypeScript faltante. No se relajan controles del producto. Los logs y capturas quedan ignorados en `scratch/audit08/marketing-c1/`.

Se mantienen 08-F09/07-20 (retención) y 08-F10 (dependencias). Nueva ejecución de `npm audit`: 23 avisos, 21 moderados y 2 bajos; los 30 nodos instalados señalados tienen `dev: true` en el lockfile y ninguno pertenece al árbol productivo auditado. `npm audit --omit=dev`: **cero**. Sin actualización de paquetes ni lockfile. La política de retención, responsables, eliminación y conservación de evidencia sigue siendo requisito de lanzamiento.

Inventario correctivo: `src/app/dashboard/marketing/page.tsx`, `src/app/dashboard/marketing/marketing-dashboard.tsx`, `src/app/api/marketing/status/route.ts`, `src/components/dashboard/contextual-help.tsx`, `src/core/entities/index.ts`, `src/server/services/marketing-availability.service.ts`, `tests/server/marketing-availability.test.ts`, `tests/server/marketing-status.test.ts`, `scripts/audit08-marketing-browser-qa.ts`, `scripts/test-puri-plus-local.mjs` y este informe. No se alteran migraciones, onboarding V2, proveedores, credenciales, cuotas, DNS ni configuración remota.

Las 814 condicionales se cubren mediante 609 comerciales + 28 de Auditoría 08 + 60 de reservas + 32 de MCP + 85 legacy; no se cuentan las repeticiones como pruebas nuevas. Las ejecuciones finales indicadas no tienen fallos. Se omiten expresamente proveedores/datos reales, operaciones financieras, migraciones remotas, despliegues y certificación operativa de producción. El build no constituye un despliegue.

Se conservan la exclusión exacta de rama en `vercel.json`, el rechazo de `vercel-build.mjs` antes de CLI y los guards push/ref, PR/head_ref y dispatch de Actions. El scheduler continúa apagado, sin cron ni previews; no hay nueva automatización de despliegue o envío. La comprobación GitHub previa conserva Production `7342257567`, SHA `e74c92237e47db43425a7d47209520967e51bfb0`, estado success del 26-10-2026. Esto no sustituye una consulta directa a Vercel: no se dispone de esa verificación y no se afirma ausencia de despliegues Vercel. La comprobación posterior al push y el SHA definitivo se entregan al finalizar la publicación exclusiva de esta rama, sin integrar RC1.

El cierre correctivo abarca **11 archivos y dos commits**, de código/pruebas y de documentación. La comparación completa contra RC1 queda en **11 commits lineales y 34 archivos**, sin divergencia. Se conserva la historia anterior y se prohíben merge y force push; la rama queda de nuevo congelada para revisión independiente tras publicar. No se autoriza integrar RC1 ni realizar operaciones productivas.
