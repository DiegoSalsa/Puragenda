# Billing actual: Website Chile / Mercado Pago

La fachada checkout.ts selecciona MP para CL. WebsiteAddon.mpSubscriptionId y Subscription.mpSubscriptionId son productos independientes. Founder businessId: 15×24h una vez al pulsar PROBAR, luego 5990 CLP/mes permanentemente. Standard: 9990, sin trial. El servidor deriva todo precio; cliente no decide tier/monto/negocio.

Vercel Production fue inspeccionado el 2026-10-02 en modo lectura: `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` aparecen configurados en Production+Preview, pero sus valores no se revelaron ni se verificó un cobro. La Preview `webs` no debe usarse para proveedor real mientras comparte credenciales MP de producción; necesita credenciales oficiales de test y una DB aislada.

WebsiteCheckoutOperation bajo lock crea UUID/ref, monto/moneda, firstChargeAt, estado y provider ID único. Triple click reutiliza una operación. CREATING/UNKNOWN exige conciliación antes de otro POST; no se presume idempotencia del proveedor. Pending reutiliza URL por GET; después de 24h exige cancelar antes de recrear.

PreApproval mensual sin plan, CLP, reason Sitio Web Puragenda, status pending, external_reference website:<UUID>. auto_recurring.start_date = trialEndsAt en conversión temprana; conserva período ya pagado tras cancelación. Capacidad documentada y probada con simulador: **débito diferido del proveedor NOT_RUN**.

Firma HMAC existente antes de GET; routing Website por ID local vinculado, sin ownership por monto/metadata. Verifica referencia/monto/moneda/periodicidad y invoice/acuerdo/payment remotos. ACTIVE solo por approved + payment ID. Evento temprano rechazado; ledger/lock/timestamp evitan duplicados y regresiones viejas. Authorized no activa ni limpia PAST_DUE.

MP cancela recurrencia inmediatamente; período pagado verificado se conserva hasta su límite local. No se documentó cancel-at-period-end de MP. Acuerdo terminado necesita nuevo checkout, pausa permite authorized sin conceder paid access. Recovery cancela solo Website fallido y recalcula precio. Cancelar PAST_DUE no restaura acceso por validUntil residual. Nunca modifica BASE.

WEBSITE_CHECKOUT_ENABLED=0 bloquea trials/checkout/recovery sin quitar runtime pagado; cancelación sigue disponible. Simulador solo NODE_ENV no production + WEBSITE_QA/WEBSITE_BILLING_SIMULATOR=1 + DB loopback 55439/websiteqa, owner/origin/operación propios; sin dinero ni APIs externas.

QA DB/HTTP y HMAC local real; provider PASS SIMULATED. Paddle internacional NOT_RUN, no bloquea CL. Ver [estado](PREPRODUCTION-STATES.md), [preparación](PRODUCTION-READINESS.md), [runbook](RELEASE-RUNBOOK.md). Fuentes: [PreApproval](https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/create-preapproval/post), [gestión](https://www.mercadopago.cl/developers/es/docs/subscriptions/subscription-management), [webhooks](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks).

## Checklist de proveedor oficial pendiente

- Crear/seleccionar vendedor y comprador oficiales de test del mismo país, con credenciales de test separadas.
- Apuntar una Preview/entorno aislado a una DB de test y a `/api/webhooks/mercadopago` con el secret de esa aplicación; nunca usar el token Production del proyecto actual.
- Crear PreApproval Website founder de 5990 CLP mensual con `external_reference=website:<UUID>` y `auto_recurring.start_date=trialEndsAt` futuro.
- Registrar la respuesta, no activar por retorno, recibir `subscription_preapproval`/`subscription_authorized_payment`/`payment`, validar firma → GET → binding → monto/moneda → add-on.
- Comprobar que no hay débito antes de `trialEndsAt`, que cancelación solo toca Website y que BASE permanece intacta. Si MP no permite reproducir el débito diferido, conservar `NOT_RUN`/`PROVIDER_LIMITATION`.

# Historia: implementación anterior Paddle sandbox

Lo siguiente conserva la auditoría previa; no describe el flujo actual Chile.

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
