# Mercado Pago V2 — webhooks y recuperación, 28-10-2026

**Restauración remota verificada. Recuperación implementada y probada en sandbox. Entrega automática auténtica pendiente de resolver con Mercado Pago. Producción permanece deshabilitada.**

Este informe actualiza el estado operativo del [ensayo anterior](23-mercadopago-v2-validacion-real-2026-10-28.md), cuya evidencia histórica se conserva intacta. Trabajo local en `feature/puragenda-next`, worktree `puragenda-next-audit/agenda`; sin commit, push, merge ni deploy. Los 41 archivos locales iniciales se respaldaron con SHA-256 en `C:\Users\diego\.codex\backups\mp-v2-webhooks-close-20261028-021030`.

## 1. Configuración restaurada

En **PuragendaSubs**, aplicación principal `ID_RESERVADO`, se restituyó exclusivamente la URL de **Modo de prueba** a `https://www.puragenda.cl/`. La dirección original constaba en la observación anterior al ensayo. Después de recargar y de que el propietario completara la verificación de cuenta, se volvió a abrir la configuración: pestaña de prueba seleccionada y URL original presente. Verificación: **28-10-2026, 02:11:14 America/Santiago** (`05:11:14Z`).

No se cambiaron la URL, el secreto ni los eventos productivos; se conservaron las selecciones de eventos del modo de prueba. Captura de verificación (evidencia privada conservada localmente) y registro estructurado (evidencia privada conservada localmente). La URL temporal del ensayo ya no es la configuración guardada de pruebas.

## 2. Emisor y bloqueo concreto

| Elemento | Comprobación |
| --- | --- |
| Aplicación principal | `ID_RESERVADO`, PuragendaSubs, sesión propietaria PUROCODE SPA |
| Credenciales usadas | Proceden de **Credenciales de prueba** de esa aplicación; no se usaron credenciales productivas |
| Vendedor canónico | `/users/me`: ID `ID_RESERVADO`, sitio `MLC`, etiqueta `test_user` |
| Aplicación de las operaciones | PreApproval canónico: `application_id=ID_RESERVADO`, `collector_id=ID_RESERVADO` |
| Comprador | Usuario oficial de pruebas distinto del vendedor |
| `live_mode` | Los pagos de ese vendedor de pruebas devolvieron `true`; no basta el prefijo APP_USR ni ese campo para clasificar una cuenta como productiva |
| Secreto disponible | Secreto del modo de prueba del panel principal; **su correspondencia con el emisor de la aplicación hija no está demostrada** |
| Panel de la aplicación hija | Con el vendedor de prueba mostró “Seguimos resolviendo el problema”, `DXT2-CY0ULXY91J7M`; con la sesión propietaria actual redirige al listado de integraciones, que solo muestra las aplicaciones principales |

La [documentación oficial de Webhooks de Suscripciones](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks) enumera `subscription_preapproval`, `subscription_authorized_payment` y `payment`, y describe validación HMAC con `x-signature`, `x-request-id` y el ID del recurso. También indica que la configuración por panel no está disponible para Suscripciones y remite a configuración durante el pago. El panel principal sí ofrece eventos de suscripción.

Se expandieron todos los parámetros de la [referencia POST /preapproval](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/create-preapproval/post) y se contrastó `PreApprovalRequest` del SDK instalado: no exponen `notification_url`. Esto no demuestra que el proveedor jamás admita otro mecanismo; impide afirmar cuál es el mecanismo soportado para estas credenciales. No se agregó un campo no documentado, no se reutilizó la configuración productiva y no se relajó la firma.

**No se recibió un webhook automático auténtico.** Los eventos firmados localmente del ensayo anterior siguen identificados como inyecciones controladas. La simulación del panel tampoco acreditaría una emisión derivada de una suscripción real. No se repitieron los checkouts mensual, anual ni de prueba gratuita.

## 3. Procedimiento oficial y borrador para soporte

Abrir el [Centro de soporte de Developers Chile](https://www.mercadopago.cl/developers/es/support/center), iniciar sesión como propietario y elegir **“Recibe soporte técnico para tus integraciones”**. El [destino oficial de solicitudes](https://www.mercadopago.cl/developers/es/support/center/tickets) abre el asistente de soporte y ofrece **“Sigue tus consultas”**. Solicitar atención técnica para Suscripciones/PreApproval y un número de caso. No se envió un mensaje ni se creó un ticket en esta ejecución.

Borrador listo para copiar:

> Asunto: Chile / PreApproval — destino y secreto de webhooks del vendedor oficial de pruebas.
>
> Aplicación principal PuragendaSubs: ID_RESERVADO. Sus credenciales de prueba autentican al vendedor MLC ID_RESERVADO, tag test_user. Las suscripciones creadas tienen application_id ID_RESERVADO y los pagos de tarjetas oficiales de prueba responden live_mode=true. Ejemplo de suscripción de prueba, ya cancelada: ID_RESERVADO; pago de prueba ID_RESERVADO.
>
> No observamos entregas automáticas de subscription_preapproval, subscription_authorized_payment ni payment en el receptor HTTPS aislado del ensayo del 28-10-2026. El panel de Webhooks de la aplicación de prueba mostró el error DXT2-CY0ULXY91J7M; desde el propietario redirige al listado de aplicaciones principales. La guía de Webhooks excluye Suscripciones de la configuración por panel y remite al pago, pero la referencia POST /preapproval y PreApprovalRequest no documentan notification_url.
>
> Por favor confirmen: (1) aplicación emisora y ambiente de notificaciones para esta pareja de IDs; (2) mecanismo y campo oficialmente soportados para fijar el destino de los tres tópicos; (3) dónde se administra el secreto del emisor y si el secreto de prueba de la aplicación principal le corresponde; (4) explicación del live_mode=true del test_user; (5) trazas de emisión, intentos y respuesta para el recurso indicado, y solución del acceso al panel hijo. Faciliten un procedimiento reproducible sin cambiar configuración productiva.

Adjuntar únicamente evidencias revisadas y sin secretos si soporte las solicita. No incluir Access Tokens, secretos HMAC, contraseñas, códigos de verificación ni URLs de reautenticación. La URL de prueba principal se restauró; cualquier nueva prueba de entrega debe acordar un destino aislado y restaurarlo después.

## 4. Recuperación automática de respaldo

Se reemplazó la selección limitada a operaciones aplicadas ya vencidas por `mercadopago-v2-recovery.ts`. Reutiliza `CommercialBillingOperation`, `CommercialWorkerState`, `CommercialEvent` y la conciliación canónica existente, sin reescribir checkout. `runCommercialTick` incorpora una etapa V2; las llamadas cron existentes al adaptador también delegan al mismo motor y comparten su lease.

- **Aislamiento:** flag nuevo `PURAGENDA_MP_V2_RECOVERY_ENABLED=0` por defecto. Exige `V2_SANDBOX`, los guardas de base comercial aislada y escrituras internas habilitadas. Rechaza hosting productivo y configuración MP productiva. Solo selecciona contratos `registration_v2` CL/CLP Puragenda/Puragenda+, sin referencia legacy, Paddle, MP legacy ni transferencia manual.
- **Estados:** consulta pagos confirmados, pendientes, rechazados, reintegros/contracargos, renovación mensual/anual y estado canónico de cancelación/pausa. Una autorización no concede acceso pagado. Para `UNKNOWN` busca la operación original; prohíbe crear otra suscripción o preferencia desde recuperación.
- **Cobertura temporal:** operaciones abiertas y ejecuciones abandonadas; raíces pagadas/canceladas creadas recientemente o cuyo periodo/prueba termine dentro de la ventana de 90 días. Las suscripciones activas se revisan antes de su vencimiento para detectar cancelaciones y cambios de pagos.
- **Paginación:** consulta una página por raíz y guarda un offset durable tras cada factura. Reanuda tras agotar presupuesto; al alcanzar el final vuelve a cero para detectar cambios en pagos anteriores. Respeta el tamaño de página del endpoint, sin el `limit` rechazado por la API. La antigüedad local de actualización rota los lotes.
- **Presupuestos:** 5 operaciones por tick por defecto, máximo 10; 32 llamadas por defecto, máximo 64; presupuesto de solicitudes de hasta 18 segundos con timeout SDK de 1,5 segundos y sin reintentos automáticos. Transacciones de progreso/lease acotadas a 3 segundos. El tick comercial reserva una ventana total de 50 segundos y no deja tareas en segundo plano.
- **Concurrencia:** lease de 60 segundos, propietario aleatorio, fence creciente y advisory lock corto. Solo el propietario vigente puede persistir progreso/liberar su lease. Los locks de negocio y claves de evidencia existentes mantienen la idempotencia ante webhooks simultáneos.
- **Métricas:** operaciones completadas/fallidas, solicitudes, páginas/facturas, estados confirmado/pendiente/rechazado, antigüedad, discrepancias monetarias, alertas y presupuesto agotado; resumen persistido en `CommercialWorkerState`.
- **Alertas internas:** operaciones sin resolver durante 24 horas; renovación vencida durante 6 horas sin cancelación; fallos consecutivos desde el tercero; discrepancia de importe/moneda o identidad inmediata. Eventos deduplicados por operación/código/día y visibles en los diagnósticos comerciales existentes como revisión requerida. Los errores guardan códigos sanitizados. Las alertas se resuelven tras conciliación satisfactoria; no se enviaron correos ni mensajes externos.

La migración `20261028120000_commercial_mp_v2_recovery_index` agrega un índice por proveedor, entorno, fecha de actualización e ID. Solo se aplicó a bases locales sintéticas. No se instaló ni habilitó un scheduler remoto.

Para aceptación operativa en un **preview aislado**: aplicar migraciones mediante el procedimiento del proyecto, configurar los guardas y secretos existentes del worker, habilitar explícitamente recuperación y llamar periódicamente `/api/cron/puragenda-next` con su Bearer de servidor. Comenzar cada cinco minutos, revisar duración/backlog/alertas y ajustar capacidad al volumen. Probar reinicio, solapamiento, caída del proveedor y una renovación real antes de fijar el SLA. El worker sigue bloqueando producción; habilitar V2 productivo requiere una revisión y cambio deliberado de ese sello.

## 5. Seguridad y pruebas

La excepción `PURAGENDA_MP_V2_SANDBOX_ACCOUNT_LIVE_MODE` se restringió en configuración y constructor a **cuenta ID_RESERVADO + aplicación ID_RESERVADO + entorno V2_SANDBOX**. Además exige `/users/me` con `MLC/test_user` y `application_id` canónico presente y coincidente. Se conservan identidad del pago, collector, importe, CLP, referencias, HMAC y frescura. Otro vendedor/aplicación o el entorno productivo no pueden usar la excepción.

Los resultados exactos, la consulta canónica posterior y el control de secretos se registran en la evidencia estructurada (evidencia privada conservada localmente). Las pruebas de recuperación incluyen pérdida de notificaciones, duplicados, renovación mensual/anual, pendiente/rechazado, cancelación/reembolso, UNKNOWN sin segundo POST, reanudación de página, alertas y sanitización, concurrencia/fence, exclusión legacy y rechazo de producción. Las renovaciones futuras siguen simuladas con PostgreSQL real; no se presentan como cobros futuros observados.

| Verificación ejecutada | Resultado |
| --- | --- |
| Nueve suites con PostgreSQL aislado y migraciones | **248 pasan**, incluidas **27 MP V2**; sin omisiones en ese runner |
| Suite general, excluyendo archivos PostgreSQL | **1.589 pasan**, 102 omisiones condicionales de otros entornos; 0 fallos |
| Tres suites unitarias MP V2, repetición final | **19 pasan**; ya forman parte de la suite general, no se suman otra vez |
| TypeScript y ESLint de los seis archivos TypeScript afectados | Ambos pasan |
| Nuevo worker contra los cuatro recursos existentes de MP | **4 operaciones completadas, 0 fallos, 24 solicitudes**; todas las suscripciones siguen `cancelled`; solo consultas remotas |

La última consulta canónica (12:16:35 America/Santiago) reconfirmó los pagos mensual y anual y mantuvo exactamente dos evidencias de pago; la prueba gratuita y la autorización fallida mantienen cero. No se crearon ni autorizaron nuevos recursos, no hubo escrituras remotas y no se presenta esta consulta como prueba de webhook automático.

Se compararon los valores reales del token y secreto del ensayo contra los archivos locales modificados/no versionados: cero apariciones. `.env.mercadopago-v2.local` y los harness permanecen ignorados; el archivo sensible conserva ACL exclusiva del usuario local, sin herencia. El índice de Git está vacío. Los 41 archivos iniciales siguen presentes; las modificaciones intencionales y los hashes de evidencia quedan registrados. Las 102 omisiones generales no afectan las suites críticas MP V2, ejecutadas completas; no se afirma una ejecución actual de los otros entornos omitidos.

## 6. Antes de producción

1. Resolver con MP el destino, aplicación emisora y secreto aplicable; observar al menos una entrega automática auténtica por el canal documentado, con firma, consulta canónica, contrato e idempotencia verificados.
2. Completar aceptación operativa del scheduler en preview aislado: recurrencia instalada, capacidad/backlog, supervisión de errores, alertas atendidas y recuperación tras interrupción. El código local probado no acredita por sí solo un scheduler alojado funcionando.
3. Validar en el proveedor rechazos/reintentos y una renovación real; los escenarios automatizados actuales no sustituyen esa evidencia temporal.
4. Aprobar deliberadamente la apertura productiva del motor y del worker, credenciales/secretos propios, HTTPS permanente, observabilidad y plan de reversión. Ningún flag ni secreto productivo se abrió aquí.

La restauración ya dejó de ser un bloqueo. El sistema conserva el sello de **no listo para lanzamiento** por la entrega auténtica y la aceptación operativa pendientes.
