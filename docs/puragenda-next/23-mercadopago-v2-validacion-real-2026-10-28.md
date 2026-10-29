# Mercado Pago V2 — validación real del 28-10-2026

**Resultado: pagos mensuales y anuales de prueba confirmados y conciliados; autorización de 30 días confirmada sin pago comercial. La entrega automática de webhooks sigue bloqueada externamente. Producción no habilitada.**

Se trabajó en `feature/puragenda-next`, en el worktree `puragenda-next-audit/agenda`. Los 34 archivos locales iniciales (los 24 de implementación y 10 documentos/evidencias) se respaldaron y verificaron con SHA-256 en `C:\Users\diego\.codex\backups\mp-v2-validation-20261028-010820`. No hubo reset, merge, rebase, commit, push ni deploy. No se cambió código de facturación legacy.

## Evidencia del proveedor

Los negocios y contratos se crearon exclusivamente en una base nueva del PostgreSQL local de QA, mediante `createRegistrationContract`, `prepareMpV2Operation` y `executeMpV2Operation`. La autorización se completó en el checkout alojado de Mercado Pago, con el comprador de prueba existente y su Mastercard oficial de prueba oficial de pruebas. Esto no constituye una prueba de registro completo en el navegador de Puragenda.

| Escenario | Suscripción creada por MP | Resultado antes de limpieza | Contrato local |
| --- | --- | --- | --- |
| Puragenda mensual, 1 profesional | `ID_RESERVADO` | `authorized`; factura `ID_RESERVADO`; pago `ID_RESERVADO` `approved` por **12.990 CLP**; frecuencia 1 mes | `ACTIVE`, pago `CONFIRMED`, operación `APPLIED`; periodo hasta 28-11-2026 |
| Puragenda+ anual, 1 profesional | `ID_RESERVADO` | `authorized`; pago `approved` por **279.900 CLP**: 10 × 27.990; frecuencia **12 meses**; próximo cobro 28-10-2027 | `ACTIVE`, pago `CONFIRMED`, operación `APPLIED`; periodo hasta 28-10-2027 |
| Puragenda+ con 30 días gratuitos | `ID_RESERVADO` | `authorized`; checkout muestra prueba gratis y primer cobro **27.990 CLP el 27-11-2026** | `TRIALING`; `lastPaymentAt` y `lastPaymentStatus` nulos; autorización no convertida en pago |

Los importes son enteros CLP generados por el catálogo vigente. Se consultaron suscripciones, facturas y pagos canónicos con la API oficial, después de las pantallas de confirmación. El JSON conserva fechas precisas, identificadores y estados anteriores a la cancelación de limpieza: evidencia estructurada (evidencia privada conservada localmente).

Capturas: mensual (evidencia privada conservada localmente), anual (evidencia privada conservada localmente), prueba autorizada (evidencia privada conservada localmente).

## Credenciales, entorno y notificaciones

El Access Token se obtuvo del panel **Credenciales de prueba** y `/users/me` confirmó cuenta MLC con etiqueta `test_user` e ID esperado. La aplicación de pruebas tiene un ID distinto de la aplicación principal. El secreto existente se obtuvo del **modo de prueba** del panel principal, sin rotación. Ambos están solamente en `.env.mercadopago-v2.local`, ignorado por Git y con ACL limitada al usuario local. El archivo se carga explícitamente por el ensayo; no se copiaron variables productivas ni datos productivos.

Se usó un receptor temporal HTTPS que expuso únicamente el handler Next de `/api/webhooks/mercadopago-v2`, una comprobación de salud y una página de retorno. El listener y PostgreSQL estuvieron ligados a loopback; el túnel no expuso PostgreSQL ni rutas administrativas. No se desplegó Puragenda.

**No se recibieron webhooks automáticos del proveedor.** Durante el ensayo se configuró la URL de modo de prueba de la aplicación principal; no se tocó su URL productiva. Las operaciones de suscripción con estas credenciales de usuario de prueba devolvieron pagos `live_mode=true`. La aplicación propia del vendedor de pruebas no permitió acceder a su configuración: tras un reintento mostró **“Seguimos resolviendo el problema”**, código `DXT2-CY0ULXY91J7M`. Captura del bloqueo (evidencia privada conservada localmente).

La documentación [Webhooks de Suscripciones](https://www.mercadopago.cl/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks) enumera los tópicos de suscripciones, pero también advierte que la configuración por panel no está disponible para Suscripciones. La pantalla del panel sí ofrece esos eventos. El [ejemplo específico de suscripción pendiente](https://www.mercadopago.cl/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments) y los tipos del SDK instalado no incluyen `notification_url` en `PreApprovalRequest`. Por esa discrepancia no se añadió un parámetro sin soporte demostrado. **El canal automático y la correspondencia de su secreto con el emisor real siguen sin validación.**

El receptor sí se comprobó con **inyecciones controladas, no eventos emitidos por MP**, firmadas localmente y apuntadas a recursos reales:

- `subscription_preapproval`, `subscription_authorized_payment` y `payment`: HTTP 200, con consulta posterior a la API oficial.
- Notificación duplicada: HTTP 200; las evidencias de pagos permanecieron en 2, sin duplicación.
- Firma inválida y firma vencida: HTTP 401.
- Autorización de la prueba: no se creó evidencia de pago ni un periodo comercial cobrado.

**Restauración pendiente de acreditar:** el intento de restituir la URL de prueba anterior redirigió al inicio de sesión. La sesión propietaria necesita recuperarse para comprobar y, si corresponde, restituir `https://www.puragenda.cl/` en **Modo de prueba**. No se debe cambiar Modo productivo. Los accesos de prueba se cerraron; el acceso existente por Google no completó el inicio de sesión desde el navegador integrado. No se da por restaurada la configuración.

## Fallos reales corregidos

1. La búsqueda de facturas devolvía HTTP 400 `Invalid value for limit`. La API rechazó tanto 100 como 20; al omitir el parámetro devolvió HTTP 200 con tamaño de página 12. Ahora el proveedor deja elegir el tamaño al endpoint y avanza usando las filas recibidas. Se añadió una regresión de varias páginas. [Referencia oficial de facturas](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/authorized-payment-search/get).
2. Los pagos oficiales del usuario de prueba devolvieron `live_mode=true`, provocando `V2_PAYMENT_ACCOUNT_MISMATCH`. Se añadió `PURAGENDA_MP_V2_SANDBOX_ACCOUNT_LIVE_MODE`, desactivado por defecto. Ese modo exige verificación canónica de la cuenta MLC, su ID y la etiqueta `test_user`; conserva las comprobaciones de importe, moneda, identidad de recurso, referencia, firma y aislamiento de base. Una cuenta real o un collector ajeno siguen rechazados. No cambia el entorno comercial `V2_SANDBOX` ni habilita producción.

Archivos corregidos en esta ejecución: `.env.example`, `src/server/commercial-billing/mercadopago-v2-provider.ts`, `tests/server/mercadopago-v2-policy.test.ts` y el nuevo `tests/server/mercadopago-v2-provider.test.ts`. Los otros archivos de implementación conservan el contenido previo.

## Errores, omisiones y alcance automatizado

Una llamada real con correo sintético que no correspondía a un comprador MP de prueba devolvió HTTP 400; quedó `UNKNOWN`, sin suscripción remota ni acceso pagado. Una cuarta suscripción aislada permitió ensayar una autorización directa con tarjeta de prueba `OTHE`: MP rechazó la operación porque únicamente el pagador puede autorizarla. Esto prueba un rechazo de autorización, **no un cobro de tarjeta rechazado**; el contrato siguió `INACTIVE`, sin pago ni acceso.

Los pagos recurrentes rechazados o pendientes, los fallos de comunicación, reintentos, recuperación sin repetir POST, renovación mensual/anual, cancelación y duplicados concurrentes se verificaron con fixtures y PostgreSQL real. Las renovaciones futuras y el reintento automático de MP **siguen simulados**. No se esperaron 30 días ni se adelantaron relojes productivos. La mensual sin prueba permitió confirmar el primer cobro inmediato real de pruebas; el periodo anual y el cobro diferido se contrastaron con las fechas canónicas del proveedor.

| Ejecución | Resultado |
| --- | --- |
| Suite general final | 1.587 pasan; 0 fallan; 369 omisiones por entornos no configurados en ese runner |
| Nueve suites comerciales con base aislada | 238 pasan, incluidas 17 MP V2; las 17 V2 se repitieron tras las correcciones y pasan |
| Omisiones restantes ejecutadas en sus entornos | 19 booking + 27 MCP/OAuth + 63 website + 20 suscripción comercial + 2 concurrencia de abonos = **131 pasan** |
| Total único, evitando duplicar unidades repetidas por runners | **1.956 pasan; 0 fallan; ninguna omisión pendiente dentro de esas 1.956** |
| TypeScript y ESLint de archivos corregidos | Ambos pasan |

La cifra histórica de 129 no coincide con el checkout actual: quedan 131 al separar las 238 comerciales. Se identificaron por archivo y se ejecutaron las 131. Las omisiones proceden de `describe.skipIf`/selección condicional según variables de bases de prueba; no se encontraron `it.skip`, `test.skip` ni `todo` incondicionales en la búsqueda. Ninguna prueba crítica MP V2 quedó deshabilitada en su ejecución preparada. Los runners booking/MCP repiten 57 unidades ya incluidas en la suite general; no se suman dos veces.

## Limpieza y condiciones de producción

Las cuatro suscripciones creadas en este ensayo se cancelaron mediante el adaptador V2, verificando después `cancelled` en Mercado Pago y `CANCELLED_VERIFIED`/`APPLIED` en el registro local. La evidencia anterior a limpieza se conservó. Los contratos pagados conservan correctamente su periodo ya confirmado aunque la renovación esté cancelada; la prueba conserva su derecho gratuito sin inventar un pago. Las bases locales sintéticas se conservan para revisión, con sus servidores detenidos al cerrar el ensayo. El túnel y el receptor temporal se detuvieron.

Para producción faltan: resolver y demostrar eventos automáticos firmados de suscripción y pago, confirmar el secreto del emisor real y su canal documentado, probar rechazos/reintentos reales del proveedor, completar aceptación operativa de renovaciones y scheduler, y configurar HTTPS permanente, credenciales productivas y flags de release en un entorno aprobado. No se instalaron secretos V2 productivos ni se abrieron sus interruptores. La URL temporal de modo de prueba también requiere la comprobación/restauración indicada arriba.
