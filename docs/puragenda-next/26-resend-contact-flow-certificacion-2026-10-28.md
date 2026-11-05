# Contact Flow: Resend configurado y certificado en laboratorio — 28-10-2026

**Tres correos entregados a los buzones autorizados del propietario, baja HTTPS persistida y callbacks auténticos de envío, entrega, rebote, queja y supresión procesados. Producción permanece cerrada.**

Se trabajó en `feature/puragenda-next`, worktree `puragenda-next-audit/agenda`, preservando los cambios anteriores. No hubo commit, push, merge ni deploy. No se contrataron planes ni se enviaron campañas a clientes reales.

## Cuenta existente y separación efectiva

La auditoría por API y navegador encontró el equipo `contactopurocode`, el dominio `puragenda.cl` verificado, las claves `puragenda` y `testpuragenda` y ningún webhook. Capacidad inicial observada: **875/3.000 correos mensuales y 47/100 diarios**, un dominio usado de tres disponibles. Esta capacidad coincide con la oferta Free; no se consultó una factura.

Resend [separa claves, facturación y uso por equipo](https://resend.com/docs/dashboard/settings/team). La sesión actual muestra **Create team como Paid feature**. No se creó otro equipo ni se aceptó una contratación. Un subdominio y una clave distintos permiten separar remitente y permisos, pero **no crean una capacidad independiente dentro del equipo actual**.

Por eso la configuración productiva conserva su requisito de cuenta/equipo aislado. La certificación usó una excepción exclusiva de laboratorio, con dos fases de tres mensajes identificados y autorizados, en bases sintéticas distintas. No se declaró falsamente `CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT=1`.

## Recursos configurados

| Recurso | Configuración y estado |
| --- | --- |
| Dominio | `contacto.puragenda.cl`, región São Paulo, verificado |
| Remitente ensayado | `pruebas@contacto.puragenda.cl` |
| DKIM | TXT `resend._domainkey.contacto.puragenda.cl`, valor generado por Resend |
| SPF | TXT `send.contacto.puragenda.cl`: `v=spf1 include:amazonses.com ~all` |
| Retorno de rebotes | MX `send.contacto.puragenda.cl`: `feedback-smtp.sa-east-1.amazonses.com`, prioridad 10 |
| Infraestructura de envío | CNAME `rsend.contacto.puragenda.cl`: `send.forge.rmta.net` |
| Transporte | TLS **Enforced**, comprobado en el dashboard del nuevo dominio |
| Seguimiento | Aperturas y clics desactivados |
| Recepción de correo | Desactivada; no se alteraron los MX del dominio raíz |
| Clave nueva | `Contact Flow certificacion 2026-10-28`, **Sending access**, restringida a `contacto.puragenda.cl` |
| Webhook | `/api/contact-flow/webhooks/resend` en HTTPS temporal, con secreto Svix propio |
| Eventos suscritos | `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.suppressed` |

Los cuatro registros se añadieron directamente en Vercel por instrucción del propietario. Las consultas DNS públicas coincidieron con los valores solicitados y Resend confirmó la verificación. No quedó ninguna acción DNS pendiente para este remitente.

Resend ofrece permisos [full_access y sending_access](https://resend.com/docs/api-reference/api-keys/create-api-key). La clave restringida no puede leer el dominio: se comprobó su rechazo 401. El adaptador ahora admite una credencial de lectura separada, usada exclusivamente para consultar dominio, capacidad y recibos; la llamada de envío usa siempre la clave restringida. Para este laboratorio se utilizó una credencial administrativa existente como lector, sin editarla ni rotarla. La operación productiva necesitará sus propias credenciales del equipo comercial.

Los secretos quedaron en `.env.contact-flow-certification.local` y el perfil conservado `.env.contact-flow-certification-delivery.local`, ambos ignorados por Git y con permisos de archivo limitados al usuario actual y SYSTEM. No se imprimieron valores de claves, secretos de webhook ni tokens de baja. No se copió el entorno transaccional completo al servidor de pruebas.

## Protecciones de la certificación

`CONTACT_FLOW_EXTERNAL_RELEASE=false` no cambió. La excepción de laboratorio exige base aislada, origen HTTPS exacto, negocio concreto, remitente comercial, destinatarios permitidos, hashes de credencial/base/política, referencia de autorización, hasta tres IDs de mensajes y vencimiento máximo de dos horas. No admite runtime productivo.

Cada fase usó el ledger existente con topes de tres correos diarios/mensuales/totales de prueba, una campaña, tres contactos y 30 días entre contactos. No se instalaron las cifras propuestas como cuotas comerciales. Las llamadas de IA estuvieron desactivadas. Antes de cada envío se comprobó que la capacidad observada dejara al menos 20 posiciones diarias y 100 mensuales disponibles después del intento. Es una comprobación conservadora de capacidad compartida, no una reserva atómica frente a otros emisores del equipo.

El endpoint temporal expuso únicamente salud, webhook y baja. El dashboard devolvió 404. El webhook valida primero la firma; durante estas pruebas descarta eventos de otros remitentes sin consultar ni guardar sus datos. El servidor utilizó las rutas y el worker reales del repositorio, sin crear otro motor de campañas o cuotas.

## Resultados reales

| Destinatario autorizado | Resultado de Resend | Resultado de la aplicación |
| --- | --- | --- |
| `tecnico-corporativo@example.invalid` | Delivered | DELIVERED; baja posterior registrada |
| `tecnico-1@example.invalid` | Delivered | DELIVERED |
| `tecnico-2@example.invalid` | Delivered | DELIVERED |
| `bounced@resend.dev` | Bounced | BOUNCED, supresión HARD_BOUNCE |
| `complained@resend.dev` | Complained | COMPLAINED, supresión SPAM |
| `suppressed@resend.dev` | Suppressed | FAILED, supresión ADMIN_BLOCK |

Los tres últimos destinos se autorizaron expresamente después y son los [buzones de prueba oficiales de Resend](https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing). Los eventos negativos los generó el proveedor para certificación; no son quejas humanas ni rebotes provocados a clientes. Hubo **seis solicitudes de envío y tres entregas a buzones personales**, todas mediante el worker y la clave comercial restringida. El recibo del proveedor confirma entrega; no se presume lectura en bandeja de entrada.

Los consentimientos y cuentas de portal verificado fueron fixtures de las bases locales, correspondientes a los destinatarios técnicos autorizados. Esto prueba la ejecución con elegibilidad verificada; no certifica un nuevo flujo real de verificación de portal ni concede consentimiento productivo.

Se persistieron **12 eventos únicos autenticados por Svix**: cinco ACCEPTED, cuatro DELIVERED, un BOUNCED, un COMPLAINED y un FAILED por `email.suppressed`. La entrega posterior a la queja conservó COMPLAINED y la supresión. Los tres destinos negativos terminaron con elegibilidad SUPPRESSED.

La baja de `tecnico-corporativo@example.invalid` se ejercitó por HTTPS: GET presentó confirmación sin revocar; POST RFC 8058 registró la baja; repetir POST conservó una sola supresión y un solo evento de auditoría. La siguiente comprobación de elegibilidad devolvió SUPPRESSED. No se alteró su capacidad de recibir notificaciones transaccionales.

Se repitió desde Resend un callback auténtico de entrega después de apagar el envío. El segundo intento respondió **200 y `duplicate:true`**, manteniendo seis eventos únicos en la primera base. Una firma inválida al endpoint público recibió 400.

La capacidad final observada fue **880/3.000 mensual y 52/100 diaria**: cinco unidades adicionales registradas por el proveedor; la solicitud suprimida no aumentó esos contadores. No se contrataron extras ni sobreconsumo.

## Validación y conservación

- Cuatro archivos de pruebas unitarias/rutas: **36 pruebas aprobadas**.
- Contact Flow sobre PostgreSQL real aislado: **67 pruebas aprobadas**, sin omisiones.
- Typegen, TypeScript, ESLint y build aislado con **webpack**: aprobados. La compilación no recibió claves de proveedores.
- Dominio raíz, registros anteriores de Resend, IDs/nombres de las dos claves existentes, archivo de entorno original y módulo transaccional: comprobados sin cambios.
- Los archivos anteriores se respaldaron en `scratch/resend-certification-20261028/backup`; se conserva manifiesto SHA-256. Mercado Pago y la propuesta comercial anterior quedaron intactos.

Ver evidencia consolidada (evidencia privada conservada localmente), resultados de los seis ensayos (evidencia privada conservada localmente), dominio verificado (evidencia privada conservada localmente) y webhook al cerrar (evidencia privada conservada localmente).

## Estado final y requisitos productivos

El webhook temporal quedó **desactivado** antes de cerrar el túnel. El envío de pruebas quedó en 0; servidor, túnel y PostgreSQL locales se detuvieron, conservando las bases y evidencias. La clave restringida y el dominio verificado permanecen preparados. Las URLs de los correos de laboratorio eran temporales y no constituyen un servicio productivo de bajas.

Para habilitar producción faltan: resolver el aislamiento real de capacidad mediante cuenta/equipo comercial separado; asignar un origen HTTPS permanente para bajas, enlaces y webhook; disponer de un buzón comercial atendido; instalar credenciales y aprobación vinculada al piloto en el entorno definitivo; aprobar cuotas comerciales; configurar y supervisar el scheduler; y obtener la aprobación explícita del propietario antes de revisar el sello de código. No se abre producción con esta certificación ni con una variable de entorno.
