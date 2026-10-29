# Contact Flow: preparación del lanzamiento con Resend Free

> Estado histórico de esta iteración. La configuración definitiva de Reply-To, los bloqueos y los resultados de consolidación se encuentran en [el cierre único 28](28-consolidacion-candidata-lanzamiento-2026-10-28.md).

Fecha: 28 de octubre de 2026. Rama: `feature/puragenda-next`.

Contact Flow queda preparado para operar con el equipo Resend actual, con activación reversible y capacidad compartida protegida. La decisión anterior de exigir un equipo independiente queda reemplazada. **Esta tarea no activa producción:** no se modificaron recursos remotos, no se contrataron planes, no hubo nuevos correos reales y no se hizo commit, push, merge ni deploy.

Se conservan la certificación anterior de seis mensajes reales, las campañas, consentimientos, bajas, ledger y cambios locales de Mercado Pago y Puri. Este ajuste no requiere nuevas tablas ni migraciones.

## 1. Implementación

- Se reemplaza el sello constante `CONTACT_FLOW_EXTERNAL_RELEASE=false` por `CONTACT_FLOW_PRODUCTION_ENABLED`, apagado por defecto, más una aprobación de configuración verificable de versión 2.
- El release exige runtime productivo, modo `production`, dominio comercial, credenciales separadas, Reply-To verificado, origen oficial, política de cuotas, webhook permanente, worker configurado y aprobación vinculada mediante hashes. Cambiar esas condiciones invalida la aprobación.
- La aprobación cubre negocios Plus elegibles; no exige una lista manual de negocios piloto ni un equipo comercial separado. Las comprobaciones de suscripción, vigencia de prueba, permisos, consentimiento y autorización expresa de cada campaña siguen vigentes.
- Producción nunca cambia silenciosamente al proveedor simulado. Una configuración incompleta detiene el envío comercial.
- Los webhooks firmados y las bajas conservan funcionamiento tras cerrar el envío y el flag principal de Next. La baja solo depende de conservar su secreto de tokens y los datos, incluso si se retiran las credenciales de Resend.
- Se registran los siete eventos solicitados. `email.delivery_delayed` conserva el mensaje como aceptado y registra `RESEND_DELIVERY_DELAYED` en `CfAudit`; no genera un nuevo envío. Rebotes, quejas y supresiones prevalecen sobre estados positivos posteriores.
- El superadmin muestra el estado de capacidad y la alerta del primer pago Plus conciliado. Un fallo al reconciliar entregas de Resend queda registrado y permite continuar las etapas de conciliación de pagos del worker.

Archivos principales: `src/server/contact-flow/resend-release.ts`, `resend-capacity.ts`, `worker.ts`, `events.ts`, `first-paid-plus.ts`, `operations.ts`; tarjeta administrativa `src/app/para/x7k9m2v4q8/(panel)/contact-flow-operations-card.tsx`.

## 2. Activación productiva

La configuración de ejemplo queda apagada. Las credenciales de laboratorio no se copian a producción.

Variables del servidor para el release autorizado:

| Variable | Valor o función |
| --- | --- |
| `NODE_ENV`, `VERCEL_ENV` | `production` |
| `APP_URL`, `CONTACT_FLOW_PUBLIC_ORIGIN` | `https://www.puragenda.cl` |
| `PURAGENDA_NEXT_ENABLED` | `1`, en el release coordinado de Next |
| `CONTACT_FLOW_DELIVERY_MODE` | `production` |
| `CONTACT_FLOW_RESEND_TEST_ENABLED` | `0` |
| `CONTACT_FLOW_PROVIDER_CAPACITY_MODE` | `shared_free` |
| `CONTACT_FLOW_PRODUCTION_RESEND_API_KEY` | Clave nueva de producción, **Sending access**, restringida a `contacto.puragenda.cl` |
| `CONTACT_FLOW_PRODUCTION_RESEND_READ_API_KEY` | Credencial separada para consultar consumo, dominio, webhook y entregas; solo servidor |
| `CONTACT_FLOW_PRODUCTION_DOMAIN_ID` | Dominio comercial existente: `ID_RESERVADO` |
| `CONTACT_FLOW_PRODUCTION_FROM` | `contacto@contacto.puragenda.cl` |
| `CONTACT_FLOW_PRODUCTION_REPLY_TO` | Buzón atendido y probado, pendiente de elegir o crear |
| `CONTACT_FLOW_PRODUCTION_WEBHOOK_ID` | Webhook comercial del equipo actual, tras asignarle el endpoint permanente |
| `CONTACT_FLOW_PRODUCTION_RESEND_WEBHOOK_SECRET` | Secreto del webhook permanente |
| `CONTACT_FLOW_TOKEN_SECRET` | Secreto persistente de al menos 32 caracteres; conservarlo al cambiar de plan/equipo |
| `COMMERCIAL_USAGE_POLICY_JSON` | Política fusionada con las cuotas aprobadas |
| `COMMERCIAL_WORKER_ENABLED`, `COMMERCIAL_WORKER_KILLED` | `1`, `0` |
| `COMMERCIAL_WORKER_SECRET` | Secreto persistente de al menos 32 caracteres |
| `CONTACT_FLOW_PRODUCTION_APPROVAL_JSON` | Manifiesto v2 emitido por el preflight después de verificar los endpoints |
| `CONTACT_FLOW_PRODUCTION_ENABLED` | `0` durante preparación; `1` únicamente en la activación autorizada |

Resend ofrece permisos `sending_access` y `full_access`; la credencial usada para lectura necesita el acceso que permite consultar esos recursos y también tiene capacidad administrativa en Resend. El código la utiliza exclusivamente para consultas. Guardarla en el gestor de secretos del hosting, nunca en variables públicas, Git o comandos impresos. [Permisos oficiales](https://resend.com/docs/api-reference/api-keys/create-api-key).

`node node_modules/tsx/dist/cli.mjs scripts/prepare-contact-flow-policy.ts` emite la política para revisar y copiar al gestor de secretos. Fusiona Contact Flow conservando los presupuestos Puri y las asignaciones de Básico ya existentes. Si no existe ninguna asignación Puri, añade únicamente análisis SQL con coste externo cero y unidades finitas (100 por prueba, 500 por mes pagado, 100.000 globales); no autoriza categorías de IA ni gasto en modelos. Si los presupuestos Puri existentes están agotados, siguen bloqueando la preparación de nuevas recomendaciones.

Con el código desplegado de forma autorizada, variables cargadas y el envío aún apagado:

```powershell
node node_modules/tsx/dist/cli.mjs scripts/prepare-contact-flow-production.ts --approved-by=RESPONSABLE --reference=REFERENCIA_DEL_RELEASE --reply-to-verified
```

Este comando no envía, compra, cambia recursos, escribe variables ni despliega. Comprueba dominio verificado, webhook habilitado con URL y siete eventos, secreto coincidente, MX del Reply-To, rechazo de petición sin firma y página de baja pública. Verifica que la clave de envío no pueda leer metadatos; la restricción exacta al dominio debe configurarse al crearla. La existencia del buzón y su atención requieren comprobación humana; un MX por sí solo no prueba que el buzón exista. El flag `--reply-to-verified` deja constancia de esa comprobación. La salida contiene configuración pública y hashes, nunca las credenciales.

Guardar el manifiesto resultante, habilitar el flag y aplicar el cambio mediante el procedimiento del hosting. En Vercel los cambios de entorno deben formar parte de un deployment autorizado. Para pausar solo nuevos envíos comerciales, poner `CONTACT_FLOW_PRODUCTION_ENABLED=0`; mantener tokens, DB y secretos de webhook para las bajas y los eventos tardíos.

## 3. Protección transaccional

Valores iniciales configurables:

```dotenv
CONTACT_FLOW_TRANSACTIONAL_DAILY_RESERVE=40
CONTACT_FLOW_TRANSACTIONAL_MONTHLY_RESERVE=1000
CONTACT_FLOW_RESEND_POLL_SECONDS=30
CONTACT_FLOW_RESEND_MAX_AGE_SECONDS=60
```

El worker consulta el consumo real, dominio y webhook antes de admitir envíos. La lectura compartida se refresca como máximo cada 30 segundos y deja de ser válida a los 60. Fallos, límites desconocidos, reset vencido, timestamps futuros, dominio no verificado o webhook alterado suspenden exclusivamente Contact Flow.

Se reutiliza `CommercialWorkerState.summary` para la lectura y su lease; las reservas de envío usan el ledger existente bajo el mismo lock transaccional de Contact Flow. Un refresh no mantiene locks durante la red. Las reservas concurrentes se descuentan antes de admitir otro mensaje. No se consumen intentos por pausas de capacidad; los mensajes siguen pendientes y vuelven a validar consentimiento, autorización y vigencia al reanudarse.

La admisión exige que `uso observado + compromisos comerciales + reserva transaccional` no supere cada límite del proveedor. Se descuentan conservadoramente compromisos de hoy y ayer, y del mes actual y dos anteriores, para cubrir ventanas móviles y retrasos de medición. Puede contabilizarse nuevamente un envío ya reflejado por Resend; esto favorece una pausa temprana. Los límites y `resets_at` provienen de la [API oficial de consumo](https://resend.com/docs/api-reference/usage/retrieve-usage), sin asumir que el plan sigue teniendo la misma capacidad.

**Límite práctico de Free compartido:** ningún código comercial puede garantizar capacidad para un volumen transaccional futuro ilimitado en una cuenta finita, sin controlar también esos envíos. La protección implementada limita Contact Flow a 10/200, preserva como mínimo el margen configurado frente al consumo conocido y cierra ante incertidumbre. El módulo transaccional permanece intacto. El responsable debe ajustar la reserva al tráfico esencial observado; si crece, mantener Contact Flow pausado hasta disponer de margen o ampliar manualmente el plan. Las cuotas comerciales nunca prometen entrega.

## 4. Cuotas aprobadas

| Alcance | Diario | Mensual / prueba | Campañas | Contactos por campaña | Frecuencia por destinatario |
| --- | ---: | ---: | ---: | ---: | --- |
| Plataforma Contact Flow | 10 UTC | 200 por mes UTC | Sujeta a capacidad | — | — |
| Plus pagado | 10, zona del negocio | 150 por mes del negocio | 3 por mes | 50 | 30 días |
| Plus en prueba vigente de 30 días | 5, zona del negocio | 30 **totales de la prueba**, además del límite mensual | 1 en toda la prueba | 30 | 30 días |
| Básico | Sin acceso | Sin acceso | Sin acceso | Sin acceso | — |

Las cuotas se materializan en `CfPolicy`, `CfQuotaBucket` y `CfQuotaReservation` existentes. Los estados inciertos conservan su compromiso para no liberar capacidad que pudo haberse consumido. Las cuotas globales cambian por configuración y nueva aprobación vinculada, sin modificar código ni recrear campañas.

## 5. Primer cliente pagado y revisión de Pro

`ensureFirstPaidPlusAlert` consulta evidencia de un cobro real confirmado de Mercado Pago V2 **producción**, CLP y monto positivo, con operación Plus aplicada y evento de conciliación aplicado al mismo negocio y suscripción. No basta una autorización. Pendientes, rechazados, Básico y sandbox quedan excluidos.

Se crea un único `CommercialEvent` con `source=contact_flow_capacity_alert` y `eventId=FIRST_PAID_PLUS_PRODUCTION`, mediante inserción atómica que descarta conflictos. El worker y la carga autenticada del superadmin pueden detectarlo, sin duplicar la alerta. El mensaje solicita revisar la contratación manual de Resend Pro. No hay envío de notificaciones externas, compra, cargo ni modificación automática de cuotas.

## 6. Configuración permanente pendiente

| Uso | URL permanente |
| --- | --- |
| Webhook firmado | `https://www.puragenda.cl/api/contact-flow/webhooks/resend` |
| Confirmación de baja GET | `https://www.puragenda.cl/contact-flow/unsubscribe?token=TOKEN_OPACO` |
| Baja de un clic POST | La misma URL; encabezado `List-Unsubscribe-Post: List-Unsubscribe=One-Click` |
| Redirección a reservas | `https://www.puragenda.cl/contact-flow/r?token=TOKEN_OPACO` |
| Worker autenticado | `GET https://www.puragenda.cl/api/cron/puragenda-next` |

Los enlaces contienen tokens opacos firmados, no correos, nombres ni IDs sensibles en claro. La baja se limita a comunicaciones comerciales del negocio; no cambia el correo transaccional legítimo. No registrar ni compartir URLs completas de baja con su token.

Reutilizar el dominio ya certificado `contacto.puragenda.cl`, sus DNS y TLS Enforced. El webhook de laboratorio `ID_RESERVADO` quedó deshabilitado en la certificación anterior y no se modificó aquí. En el release autorizado se puede reutilizar ese recurso cambiando su URL al endpoint permanente, configurando los siete eventos y habilitándolo; guardar el secreto que corresponda. No tocar el webhook ni las claves transaccionales.

La decisión definitiva reutiliza `contacto@purocode.com`, atendido por el equipo en Zoho. El cierre 28 registra la entrega técnica y la limitación de enrutamiento entre negocios. No crear otro servicio de correo ni modificar los MX de `puragenda.cl`.

El worker aún no figura en `vercel.json`. Configurar un scheduler HTTPS autenticado cada minuto, con `Authorization: Bearer COMMERCIAL_WORKER_SECRET`, utilizando infraestructura disponible; no se contrató ningún scheduler ni plan. El endpoint procesa hasta tres contactos por tick y sus leases evitan carreras. No basta habilitar una variable sin programar su ejecución. Las bajas y webhooks son rutas independientes del scheduler.

## 7. Acciones concretas del responsable

1. Conservar el Reply-To definitivo en Zoho; completar la verificación de enrutamiento y acceso del buzón compartido descrita en el cierre 28, y definir la reserva transaccional según el uso real.
2. Autorizar el release coordinado de Next. Cargar las credenciales productivas separadas, política fusionada y demás variables en el gestor de secretos; mantener el envío apagado durante las comprobaciones.
3. Tras el deployment autorizado, apuntar y habilitar el webhook comercial permanente con los siete eventos, programar el worker autenticado y ejecutar el preflight. Guardar el manifiesto y activar `CONTACT_FLOW_PRODUCTION_ENABLED=1` mediante el release autorizado. Cada dueño de negocio sigue autorizando sus campañas y destinatarios con consentimiento.
4. Cuando aparezca la alerta del primer cliente Plus pagado, contratar **manualmente** Pro. Hasta entonces se conservan las protecciones Free.

### Transición mínima a Pro

- **Mismo equipo:** ampliar el plan manualmente. El dominio, remitente, DNS, claves, webhook, DB, contratos, campañas, cola, consentimientos y bajas pueden conservarse. Cambiar `capacityMode` a `shared_pro`, revisar reservas y cuotas, regenerar el manifiesto y reactivar. Un límite diario nulo del proveedor se acepta en modo Pro; el límite mensual y las cuotas propias siguen siendo obligatorios. El código nunca habilita excedentes por encima de ese límite mensual.
- **Equipo independiente:** pausar salida, conciliar los intentos ambiguos con la cuenta anterior y transferir/verificar solo el dominio comercial. Resend usa claves, uso y facturación por equipo; configurar nuevas claves y un nuevo webhook y aplicar los registros DNS que muestre el dominio transferido. Puede requerir soporte si hubo actividad reciente. Mantener el token secret y las rutas, conservar la DB y no recrear campañas. [Equipos](https://www.resend.com/blog/multiple-teams), [Domain Claim y nueva verificación DNS](https://resend.com/changelog/domain-claim).
- Para eventos tardíos durante una rotación explícita puede mantenerse **un** secreto anterior en `CONTACT_FLOW_PRODUCTION_PREVIOUS_WEBHOOK_SECRET`, únicamente durante el drenaje. Conservar la verificación del webhook anterior hasta terminar la conciliación; retirar después ese secreto. No revocar prematuramente las credenciales necesarias para resolver mensajes inciertos.
- Los reintentos ambiguos están vinculados al hash de la clave y a los datos materiales del envío. Cambiar credenciales, remitente, origen, dominio, Reply-To o token secret los deja pendientes con `RESEND_CREDENTIAL_CHANGED`; no se reenvían automáticamente en otra cuenta. Los pendientes sin intento pueden continuar con la nueva configuración aprobada. No se presume que la [idempotencia de Resend](https://resend.com/docs/dashboard/emails/idempotency-keys) se transfiera entre cuentas.

## 8. Validación

Los resultados definitivos se registran en `evidence/contact-flow-free-launch-2026-10-28.json`. Todas las integraciones usan PostgreSQL desechable local y proveedores simulados; la red de envío está interceptada. No se repite la certificación real anterior.

Cobertura: Básico, Plus pagado, prueba vigente/vencida, cuotas de negocio y globales, reserva diaria y mensual del proveedor, pérdida y antigüedad de consumo, webhook/dominio alterados, workers concurrentes, pausa/reanudación, reintentos ambiguos tras cambio de credenciales, baja idempotente, firma y replay, retraso/rebote/queja/supresión y prioridad negativa, eventos tras apagar el envío y aislamiento entre negocios, conciliación nativa V2 con puerto simulado y alerta única concurrente.

| Verificación | Resultado |
| --- | --- |
| `next typegen` y `tsc --noEmit` | Correctos |
| ESLint sobre todos los archivos TypeScript/TSX/MJS modificados o nuevos | Correcto |
| Suite general, excluyendo las suites PostgreSQL | **1.610 correctas**, 102 omitidas por condiciones de entorno; 236 archivos correctos y 4 omitidos |
| Diez suites PostgreSQL, incluidas Mercado Pago, Puri y Contact Flow | **280 correctas**, ninguna omitida |
| Controles productivos Free/Pro nuevos, incluidos en las anteriores | **25 correctos**, sin omisiones |
| Build Next.js con Webpack, copia aislada | Correcto, sin credenciales de proveedores ni DB productiva |
| Preparación de política | Emite JSON válido sin escribir configuración |
| Preflight sin referencia y verificación de buzón | Rechazo esperado antes de operar externamente |
| `git diff --check` | Correcto |

Las 102 omisiones pertenecen a pruebas generales condicionadas por su entorno; las pruebas nuevas de producción se ejecutaron íntegramente con DB local desechable. Los warnings existentes sobre configuración futura de Vite y deprecación de consultas concurrentes de `pg` no produjeron fallos. Se ajustó la prueba histórica de preservación SEO para admitir exactamente el import y la inserción de la tarjeta operacional; sigue verificando todos los bytes anteriores del dashboard.

La evidencia incluye hashes de logs, comparación de los 97 archivos que ya tenían cambios al comenzar, backup verificado y comprobación de que Mercado Pago, Puri, el módulo transaccional y el `.env` original permanecen intactos respecto del inicio. Los archivos públicos candidatos se contrastan con los secretos reales de los archivos locales ignorados, sin imprimirlos.
