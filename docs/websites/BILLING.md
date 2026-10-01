# Add-on Sitio Web Puragenda

Estado de esta rama: billing sigue preparado para sandbox/mock. Esta auditoría no llama Paddle LIVE ni modifica productos, precios o suscripciones.

Precio comercial objetivo: **$9.990 CLP/mes**, adicional al plan base. No se crearon productos ni precios Paddle LIVE, ni se llamó una API autenticada de Paddle durante la implementación. La UI muestra el precio real del catálogo sandbox cuando esté configurado, y un aviso de catálogo pendiente mientras no lo esté.

## Integración preparada

Se usa el SDK oficial `@paddle/paddle-node-sdk` existente en el proyecto. El checkout crea una suscripción recurrente separada del plan base y guarda `checkoutTransactionId` después de autenticar al propietario. Reintentos reutilizan el checkout abierto; una suscripción vigente o un pago pendiente no generan otro add-on. PAST_DUE abre recuperación de pago de la suscripción existente.

El binding del primer webhook exige la transacción autorizada por el servidor. `custom_data` por sí solo no concede acceso al negocio indicado. Los eventos de transacción del add-on se separan del handler del plan base; solo los eventos de suscripción actualizan entitlement. Si llega activación antes de creación, se verifica el subscriptionId de la transacción guardada. [Paddle: subscription.created](https://developer.paddle.com/webhooks/subscriptions/subscription-created/), [Paddle: get transaction](https://developer.paddle.com/api-reference/transactions/get-transaction/).

El webhook existente verifica firma mediante `paddle.webhooks.unmarshal()` antes de delegar. WebsiteBillingEvent deduplica por event ID; lock del negocio y `lastEventAt` impiden aplicar entregas viejas sobre una más reciente. Se fija el ID de la suscripción y se exige el price ID esperado. Estados sin acceso suspenden el sitio sin borrar su contenido.

Cancelar requiere confirmación explícita en UI y usa `next_billing_period`. Reactivar elimina una cancelación programada; una suscripción ya terminada necesita nuevo checkout. El webhook confirmado determina acceso, no el éxito optimista de la acción. El plan base permanece independiente.

## Restricción de esta fase

Las operaciones del add-on rechazan entorno live y claves sin marcador sandbox. No hay endpoint para otorgar acceso mock a un usuario: el entitlement mock existe únicamente en los fixtures de la base local aislada.

Variables existentes: `NEXT_PUBLIC_PADDLE_ENV=sandbox`, `PADDLE_API_KEY` o `PADDLE_SANDBOX_API_KEY`, `PADDLE_NOTIFICATION_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (test…), `NEXT_PUBLIC_APP_URL`. Nueva variable: `PADDLE_WEBSITE_PRICE_ID`. Las claves y secretos permanecen en servidor y fuera del repositorio. `WEBSITE_ROOT_DOMAIN` controla runtime por host.

La documentación oficial y los tipos del SDK se revisaron durante la implementación original. Esta auditoría final no modifica integración Paddle ni consulta/realiza operaciones autenticadas de cuenta.

## Validación y pasos manuales

Los tests mock reejecutados cubren checkout, reintentos, ownership/binding, aislamiento respecto del plan base, duplicados/eventos desordenados, cancelación/reactivación y recuperación de pago. Las políticas de vigencia/expiración/suspensión se volvieron a probar; HTTP verifica que un sitio suspendido deja de servirse. No se afirma que se haya efectuado un pago sandbox de extremo a extremo.

Para validar con Paddle después: configurar credenciales sandbox y precio mensual aprobado, suscribir eventos al webhook firmado, ejecutar checkout de prueba, verificar renovación, cancelación programada, reactivación, fallo/recuperación de pago y replay. Para cualquier modificación destructiva de cuenta, confirmar entorno y recursos antes de llamar al proveedor. La moneda/precio final dependen del catálogo y de la disponibilidad comercial de Paddle; no se inventa un price ID ni una conversión CLP.
