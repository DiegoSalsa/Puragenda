# Fidelización V2

## Regla de timbres

Una cita entrega exactamente un timbre cuando su estado es `COMPLETED`. `CHECKED_IN` no entrega timbres. `LoyaltyStampEvent.appointmentId` es único en PostgreSQL, por lo que reintentos y solicitudes concurrentes no pueden registrar dos movimientos para la misma cita. `Client.currentStamps` sigue siendo el contador rápido; el ledger registra solo movimientos posteriores a esta migración y no inventa eventos históricos.

## Premios

- `PERCENTAGE`: descuenta el porcentaje sobre el subtotal canónico calculado en servidor.
- `FIXED`: descuenta un monto fijo, limitado al subtotal.
- `FREE_SERVICE`: exige una relación real con un `Service` del mismo negocio. Cubre únicamente el precio base canónico de ese servicio; opciones y adicionales siguen siendo pagados.
- `CUSTOM`: genera un premio auditable, pero no cambia automáticamente el precio. El beneficio se coordina con el negocio.

Los premios pueden no vencer o vencer a los 30, 60 o 90 días. La fecha se fija al crear el código. Los códigos previos se conservan; los usados previamente mantienen `isUsed`, pero `usedAt` queda vacío porque no existe una fecha histórica confiable.

## Reserva y concurrencia

El servidor vuelve a cargar el código, comprueba negocio, email, uso, expiración y servicio aplicable, y calcula el total desde servicios y opciones canónicos. Promociones, códigos de reserva y fidelización no se combinan. La creación de una cita simple y el consumo condicional del premio comparten transacción; las reservas divididas por profesional crean todas sus citas y consumen el premio en una única transacción. Si Mercado Pago no puede crear la preferencia, las citas se cancelan y el código se libera solo si estaba vinculado a esa cita.

Si el total final es cero, el abono se limita a cero y no se solicita una preferencia de pago.
