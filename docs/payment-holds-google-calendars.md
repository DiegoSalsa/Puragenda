# Reservas pagadas y calendarios múltiples

## Retención de Mercado Pago

Las reservas públicas que usan el flujo integrado de Mercado Pago se crean con `status=AWAITING_PAYMENT`, `paymentStatus=PENDING` y `paymentHoldExpiresAt` calculado por el servidor como `createdAt + 10 minutos` en UTC. Los enlaces manuales, reservas sin abono, Gift Cards y reservas recurrentes no reciben ese campo.

La preferencia de Checkout Pro se crea con `expires=true`, `expiration_date_from` y `expiration_date_to` iguales al intervalo de la retención. El navegador muestra el vencimiento como ayuda, pero el servidor decide siempre.

La disponibilidad pública y la creación transaccional liberan antes los holds vencidos. La liberación actualiza únicamente filas `AWAITING_PAYMENT/PENDING` con `paymentHoldExpiresAt <= now`, `depositPaymentUrl IS NULL` y sin recurrencia. La operación usa el advisory lock de capacidad del negocio y es idempotente. Un pago rechazado deja de bloquear inmediatamente porque `REJECTED` no participa en las colisiones.

La confirmación y la expiración usan el mismo lock. Si el webhook aprobado gana la carrera antes de vencer, la cita pasa a `CONFIRMED`. Si vence primero, la cita queda cancelada y el pago se conserva como `APPROVED` auditado (`DEPOSIT_APPROVED_AFTER_CANCEL`); no se confirma la cita ocupada por otra reserva ni se ejecuta una devolución automática. Los webhooks repetidos y los reintentos de entrega siguen siendo idempotentes.

`GET /api/cron/payment-holds` permite una limpieza externa frecuente. Requiere `Authorization: Bearer $CRON_SECRET`. No es obligatorio para la exactitud: un proveedor externo debe invocarlo aproximadamente cada minuto para reducir basura histórica; Vercel Hobby no debe considerarse un scheduler por minuto.

## Google Calendar

`GoogleCalendarConnection.calendarId` sigue siendo el único calendario de escritura. `GoogleCalendarReadSelection` guarda, por conexión y negocio, los calendarios cuyos intervalos FreeBusy bloquean disponibilidad. La migración inicializa la selección con el destino actual, por lo que las conexiones existentes conservan su comportamiento.

El endpoint de calendarios devuelve calendarios con permisos `freeBusyReader`, `reader`, `writer` u `owner`. El selector de destino acepta únicamente `writer` u `owner`; las casillas de bloqueo pueden incluir calendarios de solo lectura. FreeBusy se consulta en una sola llamada, se fusionan intervalos superpuestos y se respetan los límites UTC enviados por el servidor. No se leen ni almacenan títulos, descripciones o participantes de eventos.

Si Google falla para una conexión activa, la disponibilidad se cierra para ese profesional durante el rango consultado y se registra `lastSyncError`; no se muestran silenciosamente todos los horarios como libres. El calendario de Puragenda se excluye durante una reprogramación cuando su intervalo coincide exactamente, mientras que un solapamiento externo sigue bloqueando.

Cambiar el destino elimina el evento mapeado del destino anterior y lo crea/actualiza una sola vez en el nuevo destino. Los calendarios usados para lectura nunca reciben copias de eventos de Puragenda.

## Despliegue

1. Ejecutar `npx prisma migrate deploy` en sandbox o staging y verificar que `GoogleCalendarReadSelection` se haya inicializado.
2. Configurar `CRON_SECRET` y programar un GET autenticado a `/api/cron/payment-holds` cada minuto o dos minutos en un scheduler externo.
3. Mantener las credenciales OAuth de Google y Mercado Pago únicamente en variables de servidor.
4. Probar FreeBusy con una conexión que tenga un calendario de destino escribible y al menos un calendario `freeBusyReader`.

No ejecutar esta migración contra la base productiva desde esta rama.
