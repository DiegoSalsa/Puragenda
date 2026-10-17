# Cinnamon Nails: revisión operativa y secuencia de producción

Fecha de revisión: 17 de octubre de 2026, America/Santiago. Rama `commercial/cinnamon-equipo`.

**Liberación autorizada:** el operador aprobó expresamente reconciliar los archivos históricos, hacer merge/deploy, aplicar la migración y configurar el acuerdo y el período pagado en producción («sí, haz todo eso»). La conexión de abonos y ambas referencias de Mercado Pago se conservan. Este documento recoge la auditoría previa y el procedimiento; el resultado de ejecución se registra en la entrega y en el PR de liberación.

Durante la auditoría previa todo acceso a producción fue de lectura: PostgreSQL con `BEGIN READ ONLY` y llamadas GET a las API de Mercado Pago/Vercel. No se renovaron tokens OAuth del negocio, no se modificaron secretos de producción, no se canceló ninguna autorización y no se borró ningún vínculo.

## 1. Mercado Pago: dos relaciones independientes

| Elemento | Uso en el código | Resultado verificado |
| --- | --- | --- |
| `Business.mpUserId=1156754359`, `mpAccessToken`, `mpRefreshToken`, `mpTokenExpiresAt` | El negocio recibe abonos por reservas. El callback OAuth escribe estos campos; `deposit-preference` obtiene su token y crea una `Preference` de reserva. | GET de identidad: HTTP 200, cuenta 1156754359, sitio MLC. Token y refresh presentes; caducidad registrada 2027-02-11T00:10:16.223Z. No se modificó la conexión. |
| `Subscription.mpSubscriptionId=7bdf9b9051ef460a8a3904b41e52efc8` | Cobro recurrente del plan de Puragenda. El checkout guarda aquí el ID de una `PreApproval`, usando el token de plataforma. | Estado **no verificable con las credenciales disponibles**. No se trata del ID de vendedor de la conexión de abonos. |
| `Subscription.mpCustomerId=1574278654` | Identidad del pagador que el checkout guardó para la preaprobación | Se conserva; no identifica la conexión de vendedor de Cinnamon. |
| Token local de plataforma | Cuenta cobradora utilizada por la configuración local | GET de identidad HTTP 200, cuenta 786219474, sitio MLC. GET de la preaprobación HTTP 400: `the preapprovalId is not valid for callerId`. |
| Token almacenado del negocio | Solo lectura, sin utilizar el helper que puede refrescar OAuth | GET de esa misma preaprobación también devuelve HTTP 400. No se reutiliza para cobros del plan. |
| Credencial de producción de Vercel | Variable `MERCADOPAGO_ACCESS_TOKEN` del proyecto Puragenda | La sesión local estaba expirada y `vercel whoami --non-interactive` la renovó. Se pudo leer la metadata del entorno. La variable es `sensitive`; los GET documentados no entregaron el valor en claro (`decrypted=false`). No se obtuvo otra credencial del cobrador. |

Los resultados de la tabla corresponden a la investigación inicial; no se usan para clasificar ni eliminar la referencia.

**Aclaración posterior del operador:** Cinnamon nunca ha pagado el plan por Mercado Pago y utiliza transferencia. Se retira la investigación del proveedor como bloqueo del acuerdo comercial. No se necesitan otras credenciales para este trabajo y no se realizarán más consultas, cancelaciones o desvinculaciones. El configurador puede establecer BANK_TRANSFER conservando el `mpSubscriptionId` y el `mpCustomerId` existentes. El modo manual bloquea checkout, sincronización de importes, recuperación con tarjeta, conciliación y cambios por notificaciones del proveedor dentro de Puragenda.

La conexión de abonos de `Business` **se conserva**: no se cambian sus cuatro campos OAuth, ni `depositRequired`, ni `depositPaymentMode`, ni pagos/reservas existentes. Tampoco se modifica o cancela la referencia de suscripción almacenada.

Referencias oficiales consultadas: [GET de suscripción de Mercado Pago](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/get-preapproval/get), [API de suscripciones](https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/overview), [lectura de variables de Vercel](https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name).

## 2. Período pagado confirmado: 30 días desde el 17 de octubre

El operador confirmó la recepción de $17.990 por transferencia y la activación de Equipo con dos profesionales. Después precisó: «pago hoy 17/10, la sub es de 30 dias como todas, 1 mes». La fecha de pago y el período de 30 días quedan confirmados para este caso.

El registro se prepara por días completos de Santiago, con inicio del día local como convención de representación; esa hora no se atribuye al comprobante bancario:

| Campo | Valor preparado |
| --- | --- |
| Pago confirmado | $17.990 CLP, transferencia, 17/10/2026 |
| Inicio incluido | 17/10/2026 00:00 America/Santiago |
| Último día incluido | 15/11/2026 |
| Término exclusivo / próxima renovación | 16/11/2026 00:00 America/Santiago |
| `paidFrom` | `2026-10-17T00:00:00-03:00` = `2026-10-17T03:00:00.000Z` |
| `paidThrough` / `currentPeriodEnd` previsto | `2026-11-16T00:00:00-03:00` = `2026-11-16T03:00:00.000Z` |
| Duración verificada | 30 días |

Se utiliza la duración explícita de 30 días indicada por el operador. El checkout automático existente usa meses calendario (`frequency_type: months` y `addMonths`); no se modifica esa regla global ni se interpreta como evidencia distinta para esta transferencia manual.

Evidencia persistida revisada:

- `currentPeriodEnd=NULL` y `billingNotes=NULL`.
- `lastInvoiceStatus`, `lastPaymentStatus` y `lastPaymentAttemptAt` sin datos.
- Sin `SubscriptionPaymentNotification` para esta suscripción.
- Los registros de auditoría encontrados se refieren a reservas/directorio; ninguno documenta el período de esta transferencia.
- `Subscription.updatedAt=2026-10-17T16:26:24.646Z` registra una actualización, no una fecha de cobertura contractual. `trialEndsAt` corresponde a la prueba antigua y no debe reutilizarse.

La confirmación del operador resuelve el pendiente de fechas; no se derivan de `updatedAt`, del trial ni de la fecha en que finalmente se ejecute el despliegue. La base aún no se actualizó. El comando conserva el término exclusivo: el 15 de noviembre queda cubierto completo y el siguiente período comienza el 16 de noviembre.

## 3. Operación mensual sin cambios de código

Se agregó `scripts/record-manual-subscription-payment.ts`, un comando de operador que reutiliza `Subscription` y `AuditLog`; no crea un panel ni un sistema paralelo de facturación.

Para cada transferencia ya recibida se entregan negocio, referencia bancaria estable, monto, inicio y fin exclusivos acordados, y el `currentPeriodEnd` esperado. Sin `--apply` solo muestra la revisión. Con `--apply`, y si todas las validaciones pasan, actualiza **únicamente** `Subscription.status`, `currentPeriodEnd`, `updatedAt`, y agrega un registro de auditoría. No importa módulos de proveedores de cobro, no emite facturas y no ejecuta cobros. Conserva Equipo, límite 2, precio especial y los datos de abonos de `Business`.

La misma referencia de pago se registra una sola vez. Los reintentos simultáneos se serializan y devuelven `alreadyRecorded`; reutilizar una referencia con datos distintos se rechaza. Se rechazan revisiones desactualizadas, períodos solapados, fechas sin zona o inválidas, montos distintos del configurado y estados que requieren revisión; se conserva la restricción del flujo internacional. Una referencia existente de Mercado Pago no bloquea la renovación manual ni se borra. Puede reactivar una suscripción manual INACTIVE con un período confirmado vigente. No reactiva usando un período que ya terminó.

El vencimiento conserva la fecha y el acuerdo comercial: el cron existente, programado diariamente a las 13:00 UTC, pasa ACTIVE a INACTIVE cuando procesa un período vencido. No es un cierre de acceso programado al segundo del vencimiento. Una nueva transferencia puede renovar el período con el mismo comando y una nueva referencia, sin cambiar código.

## 4. Preflight de migraciones

La base de producción no tiene todavía las tres columnas comerciales. No hay migraciones fallidas. La única migración nueva pendiente de esta rama es `20261017163250_subscription_commercial_terms`.

También se detectaron dos archivos de historia ya aplicada ausentes de esta rama:

| Migración ya aplicada | Fuente recuperable | Verificación |
| --- | --- | --- |
| `20260913120000_add_verified_appointment_reviews` | Git, commit `7a52a213`, archivo de la misma ruta bajo `prisma/migrations/` | Su SQL coincide con el checksum de producción, contemplando LF/CRLF. |
| `20261016005730_secure_deposit_payment_delivery_rls` | `C:/Users/diego/Desktop/agenda/prisma/migrations/20261016005730_secure_deposit_payment_delivery_rls/migration.sql`, cambio previo sin confirmar del checkout original | Su SQL coincide con el checksum de producción, contemplando LF/CRLF. |

Es una discrepancia previa al cambio comercial. Tras la aprobación del operador se recuperaron ambos archivos en el checkout limpio y se verificó nuevamente que sus checksums coinciden con producción, contemplando LF/CRLF. También se recuperó la copia Supabase existente de la migración de RLS. Estos archivos documentan operaciones ya terminadas: no se vuelven a aplicar.

La comparación completa detectó cuatro diferencias de checksum previas en `20260504_pivot_plans_equipo`, `20260430_rename_roles`, `20260723223050_production_order_services` y `20260726223029_widget_promo_real_discounts`. Los cuatro archivos de esta rama son idénticos a `origin/main`; este cambio no los modifica ni altera sus registros en producción. `prisma migrate status` confirma 81 migraciones aplicadas, ninguna fallida y únicamente la migración comercial pendiente. La recuperación de la historia antigua completa queda fuera de esta operación. No utilizar `db push`, `migrate reset`, un baseline nuevo ni reescribir checksums para ocultar estas diferencias.

La fotografía inmediatamente anterior a la liberación ya encuentra **2 profesionales activos**, 94 reservas, 57 clientes y 24 servicios. Se guardan huellas por fila de los datos del negocio y sus relaciones, incluidos horarios y abonos, y una huella completa de su configuración sin imprimir credenciales. La configuración del límite no creará ni modificará profesionales.

La migración comercial es aditiva. Se conserva una copia idéntica en Prisma y Supabase; el flujo de producción utiliza Prisma y debe aplicar solo esa vía. `vercel.json` ejecuta `scripts/vercel-build.mjs`, que corre `prisma migrate deploy` **solo cuando `VERCEL_ENV=production`**, antes de `npm run build`. Las previews no migran producción.

## 5. Secuencia exacta de la liberación autorizada

1. **Usar las condiciones ya confirmadas.** Transferencia de $17.990 y 30 días desde el 17/10/2026. El operador confirmó que no paga el plan por Mercado Pago. No verificar, cancelar ni desvincular la referencia existente como parte de este cambio.
2. **Preparar el checkout limpio de liberación.** Mantener los cambios previos del checkout original intactos. Incluir la rama comercial y reconciliar los dos archivos históricos indicados arriba, verificando sus checksums con `_prisma_migrations`. Confirmar que la única migración nueva sigue siendo la comercial.
3. **Cerrar la revisión del código de liberación.** Ejecutar `npm ci`, `npx prisma generate`, tests, typecheck, lint y build en el entorno de revisión/local. Revisar el diff final. La aprobación conceptual inicial se mantuvo separada del permiso de producción, posteriormente concedido de forma explícita por el operador para esta secuencia.
4. **Guardar una fotografía previa mínima.** Registrar la fila de `Subscription`, los recuentos de datos operativos y una huella de la configuración del negocio, sin imprimir credenciales. Verificar de nuevo que Cinnamon sigue siendo `cmstm3108000104js2e9vfl0l` / suscripción `cmstm314n000j04jsxolzycw3`.
5. **Desplegar mediante el flujo de producción aprobado.** El hook existente aplica `20261017163250_subscription_commercial_terms` por Prisma y después compila la aplicación. Verificar que la migración terminó y que el nuevo código está sirviendo tráfico. Si el hook falla, no continuar con la configuración del negocio. Todavía no se ha cambiado el acuerdo de ninguna cuenta.
6. **Conservar los vínculos de Mercado Pago.** No limpiar `Subscription.mpSubscriptionId` ni `mpCustomerId`, y no modificar los campos OAuth de `Business`. El configurador aplica las condiciones manuales sin necesitar esa limpieza y sin llamar a Mercado Pago.
7. **Revisar y aplicar el acuerdo comercial.** Con variables server-only del entorno aprobado y desde el checkout de liberación, ejecutar primero:

   ```powershell
   npx tsx scripts/configure-manual-team.ts --business-id cmstm3108000104js2e9vfl0l --staff-limit 2 --monthly-price-clp 17990
   ```

   Comprobar `blockers=[]`, la identidad y los cambios propuestos. Después, con la aprobación de datos ya concedida, ejecutar el mismo comando agregando `--apply`. Deben quedar EQUIPO, BANK_TRANSFER, límite 2 y $17.990. El período todavía se conserva tal como estaba.
8. **Registrar el período confirmado de la transferencia recibida.** Los siguientes valores preparan los 30 días confirmados. La referencia es una clave interna estable de esta confirmación del operador, no un supuesto folio bancario; conservarla en todos los reintentos de este mismo registro:

   ```powershell
   $cinnamonPaymentReference = 'confirmacion-operador-cinnamon-20261017-17990'
   $cinnamonPaidFrom = '2026-10-17T00:00:00-03:00'
   $cinnamonPaidThrough = '2026-11-16T00:00:00-03:00'
   $cinnamonExpectedPeriodEnd = 'none' # solo si la lectura inmediata sigue mostrando NULL

   npx tsx scripts/record-manual-subscription-payment.ts --business-id cmstm3108000104js2e9vfl0l --reference $cinnamonPaymentReference --amount-clp 17990 --paid-from $cinnamonPaidFrom --paid-through $cinnamonPaidThrough --expected-period-end $cinnamonExpectedPeriodEnd
   ```

   Si la revisión coincide con el comprobante/acuerdo y no tiene bloqueos, ejecutar el mismo comando agregando `--apply`. Conservar la referencia y el resultado de auditoría. Si el período esperado cambió, volver a revisar; no forzar el comando.
9. **Verificación posterior de lectura.** Confirmar los cuatro términos comerciales, ACTIVE y el fin de período confirmado; comparar datos operativos y conexión de abonos con la fotografía previa. Verificar que el dashboard muestra el cupo de dos y transferencia. Para probar el bloqueo del tercero, usar el entorno local/preview, sin crear profesionales artificiales en producción. Comprobar el 409 del checkout de suscripción manual sin seguir a ningún proveedor. No generar una reserva o preferencia real solo para esta verificación.
10. **Renovar cada mes.** Tras recibir la siguiente transferencia, usar el mismo comando del paso 8 con una nueva referencia, rango confirmado y el fin de período actual esperado. La configuración comercial no se vuelve a crear. Un reintento de la misma referencia no renueva dos veces.

Si se revierte la aplicación antes de configurar la cuenta, las columnas aditivas pueden permanecer. Tras configurar una cuenta con excepciones comerciales, no volver a servir código antiguo que ignore el límite o la modalidad manual sin revisar expresamente esa recuperación.

## 6. Verificaciones de esta revisión

- La suite cubre OAuth, abonos, checkout, dunning, cron, capacidad y operación comercial, incluida la conservación de referencias previas de Mercado Pago al configurar y renovar el acuerdo manual.
- Suite completa tras retirar el bloqueo de esa referencia: **199 archivos aprobados / 1.303 pruebas aprobadas**; 4 archivos y 84 pruebas omitidos por condiciones existentes. Las 20 pruebas de integración PostgreSQL de esta entrega sí se ejecutaron.
- Typecheck aprobado; lint sin errores, 32 advertencias; build aprobado; sin nueva migración para el comando de renovación.
- El caso de renovación verifica múltiples meses, reactivación, auditoría, concurrencia e idempotencia; compara toda la fila de suscripción salvo los campos de período/estado esperados y toda la configuración del negocio, incluyendo credenciales ficticias de abonos.
- Una prueba separada verifica que una suscripción BANK_TRANSFER no bloquea el abono de una reserva ni sustituye la credencial del vendedor. El SDK se simula; no se crea ninguna preferencia real.
- Se ejecutó además el CLI real contra una cuenta local desechable, desde procesos separados: revisión sin escritura, primer período, reintento idempotente y segundo mes. Se verificaron por SQL con conversión UTC explícita el período resultante, los dos registros de auditoría y la conservación del precio, límite y credencial ficticia del vendedor. La cuenta de prueba se eliminó al terminar.
- La lectura de control de producción conserva `Subscription.updatedAt=2026-10-17T16:26:24.646Z`, `Business.updatedAt=2026-10-03T14:05:26.762Z`, el mismo `mpSubscriptionId`, el mismo vendedor de abonos y `currentPeriodEnd=NULL`. Los instantes se verificaron con `AT TIME ZONE 'UTC'`: el lector SQL genérico había interpretado inicialmente los campos `timestamp without time zone` en la zona local del proceso. Se corrigió la lectura de auditoría; no se modificaron esos datos ni se derivó de ellos un período de pago.

**Sin pendientes de credenciales, fechas o aprobación:** el operador confirmó pago manual, ausencia de pagos del plan por Mercado Pago, 30 días de cobertura y autorizó la liberación y configuración. La referencia de suscripción y la conexión de abonos se conservan. Los archivos históricos faltantes se recuperaron con checksums verificados. El estado final de ejecución se informa en la entrega y el PR.
