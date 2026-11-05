# 05 — Contact Flow

**Actualización de iteración 7:** Contact Flow está implementado en laboratorio PostgreSQL: consentimiento firmado, supresiones, campañas/versiones, autorización separada, outbox con leases/fencing, cuotas, simulador durable, webhooks y atribución transaccional de reservas. El sello de ejecución externa permanece cerrado por código. `approvedGrowthHandoff` conserva `executable=false`: aprobar la propuesta no autoriza una campaña. El contrato vigente está en [19 — ejecución](./19-contact-flow-ejecucion.md) y [20 — validación](./20-iteracion-7-validacion.md). El resto de este documento conserva la auditoría y propuesta histórica; sus nombres de entidades no son el esquema implementado.

## Estado actual

Marketing permite una campaña manual al mes. La audiencia win-back filtra acceptsMarketing = true. La ruta genera un lote y llama a Resend de forma síncrona. MarketingCampaign solo guarda asunto, cuerpo, audiencia y fecha.

Existe rate limit de API y una cuota mensual, pero no hay cola, worker, outbox, reserva atómica de cuota, reintentos por destinatario, idempotencia, supresión local, webhook de entrega, consentimiento versionado ni atribución. No se debe añadir otro botón de envío masivo.

## Modelo propuesto

- ContactAutomation: estado, trigger, zona horaria, versión y aprobación.
- ContactRule: DSL cerrado y validado.
- ContactEnrollment: cliente, siguiente paso, elegibilidad, cooldown y motivo de detención.
- ContactSendAttempt: intento, provider ID, idempotency key, lease, estado y error.
- ContactQuotaLedger: reservas y envíos por negocio y ventana.
- ContactSuppression: dirección normalizada o hash, origen y razón.
- ContactConsentEvent: finalidad, decisión, fuente, versión y timestamp.
- ContactAttribution: automatización, intento, reserva y ventana.
- ContactFlowEvent: webhook provider, ID externo, hash y resultado.

Las filas deben incluir businessId. No guardar prompts Puri ni listas completas de clientes en propuestas.

## DSL

Condiciones iniciales:

- días desde última reserva mayor o igual a N;
- sin reserva futura;
- consentimiento comercial activo;
- sin supresión;
- cooldown vencido;
- cuota diaria y mensual disponible;
- negocio activo;
- ubicación permitida.

Acciones:

- enviar template aprobado;
- esperar;
- detener al reservar;
- detener al darse de baja;
- detener al alcanzar máximo de pasos;
- pausar por proveedor o presupuesto.

No se permiten cambios de precio, descuentos automáticos, SMS ni acciones fuera de la secuencia aprobada.

## Motor

El scheduler reclama enrollments elegibles, reserva cuota y crea un intento único antes de llamar a Resend. El worker revalida plan, consentimiento, supresión, reserva futura y cuota; genera contenido versionado; llama al proveedor; guarda ID y resultado; y registra auditoría.

Un retry conserva la misma clave. Un resultado desconocido queda UNKNOWN y se concilia por clave. Una reserva o baja detiene pasos futuros. Dos workers no pueden enviar el mismo enrollment.

## Cuotas a evaluar

La solicitud propone 100 correos promocionales mensuales por negocio Plus y 10 diarios. Son hipótesis, no decisiones aprobadas. El diseño debe permitir cuota por negocio/día/mes, presupuesto global, concurrencia, dominio, kill switch y pausa por rebotes/quejas. Transaccional y comercial usan contadores separados.

## Resend verificado

El 21-10-2026 se consultaron fuentes oficiales:

- Free: 3.000 emails/mes y 100/día.
- Pro: USD 20/mes y 50.000 emails/mes, sin límite diario.
- Scale: USD 90/mes y 100.000 emails/mes.
- Sobrecuota publicada: USD 0,90 por cada 1.000 emails en planes pagados.
- Batch API: hasta 100 mensajes por llamada.
- Rate limit publicado: 10 requests/segundo por defecto.
- Broadcasts ofrece programación, cola/throttle y placeholder de baja.
- Suppressions expone estado suppressed y webhooks.
- Acceptable Use exige opt-in explícito, identificación, motivo y baja.

Los valores de cuenta, impuestos, plan contratado y pay-as-you-go deben confirmarse antes del presupuesto. La supresión local debe existir aunque Resend también suprima.

## Transaccional y comercial

Transaccional incluye reservas, acceso y pagos y no consume Contact Flow. Comercial exige consentimiento, motivo, remitente identificable y baja. El template debe incluir política, razón del contacto y enlace de opt-out. No enviar marketing a un contacto que solo aceptó comunicaciones operativas.

## Chile y legal

SERNAC documenta No Molestar y el artículo 28 B para suspender publicidad no deseada. La Ley 21.719 entra en vigor el 1 de diciembre de 2026 y regula tratamiento, derechos, transferencias, datos sensibles y la Agencia de Protección de Datos.

La activación requiere revisión legal de base jurídica, responsable/encargados, contrato con Resend/OpenAI, transferencias internacionales, derechos de oposición y eliminación, retención de eventos, datos sensibles, textos y procedimiento No Molestar. Esta auditoría no certifica conformidad.

## Métricas y atribución

Registrar elegible, excluido, reservado, enviado, entregado, rebotado, quejado y suprimido; timestamps local/UTC; provider ID; automation/version/template; clicks; y reservas atribuidas. El token de atribución debe estar firmado y no exponer el email. La reserva valida firma, businessId y ventana.

## Criterios

- No existe envío masivo inmediato.
- Activar exige aprobación y versión inmutable.
- Dos workers no duplican.
- Reserva o baja detienen.
- Límites diarios, mensuales y globales funcionan.
- Webhooks duplicados no cambian contadores dos veces.
- Rebote/queja/suppressed bloquea nuevos envíos.
- Cada negocio queda aislado.
- Atribución reproducible y auditable.
- El motor funciona con Puri apagado.
- Kill switch bloquea envíos nuevos y permite reconciliar.
## Nota de proveedores para la siguiente fase

La consulta de documentación de Mercado Pago permite estudiar cambios del monto de una preapproval, pero no prueba que el prorrateo del proveedor cubra el incremento de un profesional a mitad de ciclo. Deben separarse el ajuste de fecha/monto del cobro incremental de cupos, y validarse ambos en sandbox antes de integrar el catálogo.

Resend se divide en superficies distintas:

- Email API y Batch API para envíos transaccionales o controlados por la aplicación.
- Broadcasts para campañas, audiencias, programación y baja gestionada por el producto.
- Cuotas de emails y cuotas de contactos son conceptos diferentes.
- Las automatizaciones de Resend, cuando se contraten, tienen una métrica y coste propios.
- La cuenta, plan, overage, contactos, dominios e impuestos reales deben confirmar antes de fijar presupuestos.

Esta iteración no implementa Contact Flow ni conecta ninguna de esas superficies.
