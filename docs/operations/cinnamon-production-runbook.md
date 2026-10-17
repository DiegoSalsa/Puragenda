# Cinnamon Nails: revisión operativa y secuencia de producción

Fecha de revisión: 17 de octubre de 2026, America/Santiago. Rama `commercial/cinnamon-equipo`. Todo acceso a producción fue de lectura: PostgreSQL con `BEGIN READ ONLY` y llamadas GET a las API de Mercado Pago/Vercel. No se renovaron tokens OAuth del negocio, no se modificaron secretos de producción, no se canceló ninguna autorización y no se borró ningún vínculo. No hubo merge, push ni deploy.

## 1. Mercado Pago: dos relaciones independientes

| Elemento | Uso en el código | Resultado verificado |
| --- | --- | --- |
| `Business.mpUserId=1156754359`, `mpAccessToken`, `mpRefreshToken`, `mpTokenExpiresAt` | El negocio recibe abonos por reservas. El callback OAuth escribe estos campos; `deposit-preference` obtiene su token y crea una `Preference` de reserva. | GET de identidad: HTTP 200, cuenta 1156754359, sitio MLC. Token y refresh presentes; caducidad registrada 2027-02-11T00:10:16.223Z. No se modificó la conexión. |
| `Subscription.mpSubscriptionId=7bdf9b9051ef460a8a3904b41e52efc8` | Cobro recurrente del plan de Puragenda. El checkout guarda aquí el ID de una `PreApproval`, usando el token de plataforma. | Estado **no verificable con las credenciales disponibles**. No se trata del ID de vendedor de la conexión de abonos. |
| `Subscription.mpCustomerId=1574278654` | Identidad del pagador que el checkout guardó para la preaprobación | Se conserva; no identifica la conexión de vendedor de Cinnamon. |
| Token local de plataforma | Cuenta cobradora utilizada por la configuración local | GET de identidad HTTP 200, cuenta 786219474, sitio MLC. GET de la preaprobación HTTP 400: `the preapprovalId is not valid for callerId`. |
| Token almacenado del negocio | Solo lectura, sin utilizar el helper que puede refrescar OAuth | GET de esa misma preaprobación también devuelve HTTP 400. No se reutiliza para cobros del plan. |
| Credencial de producción de Vercel | Variable `MERCADOPAGO_ACCESS_TOKEN` del proyecto Puragenda | La sesión local estaba expirada y `vercel whoami --non-interactive` la renovó. Se pudo leer la metadata del entorno. La variable es `sensitive`; los GET documentados no entregaron el valor en claro (`decrypted=false`). No se obtuvo otra credencial del cobrador. |

Un error de pertenencia de la API no permite concluir que la autorización esté activa, cancelada o abandonada. No se debe borrar, cancelar ni reemplazar el vínculo a partir de ese error.

**Dato necesario:** acceso de lectura a la cuenta cobradora que creó esa preaprobación, o una verificación del recurso desde su panel. No enviar tokens por el chat; se pueden cargar de forma segura en el entorno. Con la credencial correcta, consultar `GET https://api.mercadopago.com/preapproval/7bdf9b9051ef460a8a3904b41e52efc8` y conservar evidencia de estado, `collector_id`, fechas y próxima ejecución. Si está activa, pendiente o pausada, detener el cambio de modalidad y pedir aprobación específica antes de cancelar. Solo tras verificar un estado terminal se puede solicitar aprobación para desvincular la referencia local.

La conexión de abonos de `Business` **no participa en esa desvinculación**: no se cambian sus cuatro campos OAuth, ni `depositRequired`, ni `depositPaymentMode`, ni pagos/reservas existentes.

Referencias oficiales consultadas: [GET de suscripción de Mercado Pago](https://www.mercadopago.cl/developers/es/reference/online-payments/subscriptions/get-preapproval/get), [API de suscripciones](https://www.mercadopago.cl/developers/en/reference/online-payments/subscriptions/overview), [lectura de variables de Vercel](https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name).

## 2. Período pagado: falta confirmación de fechas

El operador confirmó la recepción de $17.990 por transferencia y la activación de Equipo con dos profesionales. Eso prueba el pago informado, pero no establece por sí solo la fecha de inicio ni la fecha de vencimiento convenida.

Evidencia persistida revisada:

- `currentPeriodEnd=NULL` y `billingNotes=NULL`.
- `lastInvoiceStatus`, `lastPaymentStatus` y `lastPaymentAttemptAt` sin datos.
- Sin `SubscriptionPaymentNotification` para esta suscripción.
- Los registros de auditoría encontrados se refieren a reservas/directorio; ninguno documenta el período de esta transferencia.
- `Subscription.updatedAt=2026-10-17T16:26:24.646Z` registra una actualización, no una fecha de cobertura contractual. `trialEndsAt` corresponde a la prueba antigua y no debe reutilizarse.

Se pidió al operador confirmar **inicio y término del período** y si el día final está incluido. No se ha asignado una fecha por defecto. El script exige un término **exclusivo**, como el resto de las comparaciones por instante: si el acuerdo cubre un día completo, el término es el comienzo del día siguiente, con su zona correcta, una vez confirmado ese acuerdo. No agregar un mes a la fecha de activación ni a la fecha actual como sustituto de esa confirmación.

## 3. Operación mensual sin cambios de código

Se agregó `scripts/record-manual-subscription-payment.ts`, un comando de operador que reutiliza `Subscription` y `AuditLog`; no crea un panel ni un sistema paralelo de facturación.

Para cada transferencia ya recibida se entregan negocio, referencia bancaria estable, monto, inicio y fin exclusivos acordados, y el `currentPeriodEnd` esperado. Sin `--apply` solo muestra la revisión. Con `--apply`, y si todas las validaciones pasan, actualiza **únicamente** `Subscription.status`, `currentPeriodEnd`, `updatedAt`, y agrega un registro de auditoría. No importa módulos de proveedores de cobro, no emite facturas y no ejecuta cobros. Conserva Equipo, límite 2, precio especial y los datos de abonos de `Business`.

La misma referencia de pago se registra una sola vez. Los reintentos simultáneos se serializan y devuelven `alreadyRecorded`; reutilizar una referencia con datos distintos se rechaza. Se rechazan revisiones desactualizadas, períodos solapados, fechas sin zona o inválidas, montos distintos del configurado, estados que requieren revisión y vínculos de proveedor aún sin resolver. Puede reactivar una suscripción manual INACTIVE con un período confirmado vigente. No reactiva usando un período que ya terminó.

El vencimiento conserva la fecha y el acuerdo comercial: el cron existente, programado diariamente a las 13:00 UTC, pasa ACTIVE a INACTIVE cuando procesa un período vencido. No es un cierre de acceso programado al segundo del vencimiento. Una nueva transferencia puede renovar el período con el mismo comando y una nueva referencia, sin cambiar código.

## 4. Preflight de migraciones

La base de producción no tiene todavía las tres columnas comerciales. No hay migraciones fallidas. La única migración nueva pendiente de esta rama es `20261017163250_subscription_commercial_terms`.

También se detectaron dos archivos de historia ya aplicada ausentes de esta rama:

| Migración ya aplicada | Fuente recuperable | Verificación |
| --- | --- | --- |
| `20260913120000_add_verified_appointment_reviews` | Git, commit `7a52a213`, archivo de la misma ruta bajo `prisma/migrations/` | Su SQL coincide con el checksum de producción, contemplando LF/CRLF. |
| `20261016005730_secure_deposit_payment_delivery_rls` | `C:/Users/diego/Desktop/agenda/prisma/migrations/20261016005730_secure_deposit_payment_delivery_rls/migration.sql`, cambio previo sin confirmar del checkout original | Su SQL coincide con el checksum de producción, contemplando LF/CRLF. |

Es una discrepancia previa al cambio comercial. No se copiaron ni incorporaron silenciosamente esos cambios a esta rama. Antes de aprobar la liberación, reconciliar estos archivos en el checkout limpio de la liberación con las fuentes verificadas y revisar el diff. No reescribir SQL histórico, volver a aplicar esas migraciones ya terminadas, ni usar `db push`, `migrate reset` o un baseline nuevo sobre producción.

La migración comercial es aditiva. Se conserva una copia idéntica en Prisma y Supabase; el flujo de producción utiliza Prisma y debe aplicar solo esa vía. `vercel.json` ejecuta `scripts/vercel-build.mjs`, que corre `prisma migrate deploy` **solo cuando `VERCEL_ENV=production`**, antes de `npm run build`. Las previews no migran producción.

## 5. Secuencia exacta, para ejecutar solo tras aprobación

1. **Cerrar las dos confirmaciones operativas.** Obtener el estado verificable de la preaprobación en su cuenta cobradora y el período exacto del pago de $17.990. Mientras falte cualquiera, detener la configuración definitiva. Una autorización activa requiere una aprobación separada para su cancelación y una consulta posterior que confirme el resultado.
2. **Preparar el checkout limpio de liberación.** Mantener los cambios previos del checkout original intactos. Incluir la rama comercial y reconciliar los dos archivos históricos indicados arriba, verificando sus checksums con `_prisma_migrations`. Confirmar que la única migración nueva sigue siendo la comercial.
3. **Cerrar la revisión del código de liberación.** Ejecutar `npm ci`, `npx prisma generate`, tests, typecheck, lint y build en el entorno de revisión/local. Revisar el diff final y obtener aprobación explícita para merge/deploy, migración y actualización de la suscripción. La aprobación conceptual anterior no se trató como permiso de producción.
4. **Guardar una fotografía previa mínima.** Registrar la fila de `Subscription`, los recuentos de datos operativos y una huella de la configuración del negocio, sin imprimir credenciales. Verificar de nuevo que Cinnamon sigue siendo `cmstm3108000104js2e9vfl0l` / suscripción `cmstm314n000j04jsxolzycw3`.
5. **Desplegar mediante el flujo de producción aprobado.** El hook existente aplica `20261017163250_subscription_commercial_terms` por Prisma y después compila la aplicación. Verificar que la migración terminó y que el nuevo código está sirviendo tráfico. Si el hook falla, no continuar con la configuración del negocio. Todavía no se ha cambiado el acuerdo de ninguna cuenta.
6. **Resolver únicamente el vínculo de suscripción aprobado.** Si la preaprobación ya está verificada en estado terminal y hay autorización para desvincularla, guardar la evidencia y el ID anterior en auditoría y poner en NULL únicamente `Subscription.mpSubscriptionId`, de forma condicional al ID verificado. Preservar `mpCustomerId` como historia y todos los campos de `Business`. Esta operación no está implementada como borrado automático en los scripts; requiere la revisión del estado real antes de preparar su actualización concreta. Si un webhook de cancelación cambió entretanto el estado local a CANCELLED, detenerse y revisar su reactivación respaldada por el pago recibido antes de ejecutar el configurador; no forzar el checkout para corregirlo.
7. **Revisar y aplicar el acuerdo comercial.** Con variables server-only del entorno aprobado y desde el checkout de liberación, ejecutar primero:

   ```powershell
   npx tsx scripts/configure-manual-team.ts --business-id cmstm3108000104js2e9vfl0l --staff-limit 2 --monthly-price-clp 17990
   ```

   Comprobar `blockers=[]`, la identidad y los cambios propuestos. Después, con la aprobación de datos ya concedida, ejecutar el mismo comando agregando `--apply`. Deben quedar EQUIPO, BANK_TRANSFER, límite 2 y $17.990. El período todavía se conserva tal como estaba.
8. **Registrar el período confirmado de la transferencia recibida.** Sustituir las variables siguientes **solo con datos confirmados**; no son fechas sugeridas:

   ```powershell
   $cinnamonPaymentReference = '<REFERENCIA_BANCARIA_CONFIRMADA>'
   $cinnamonPaidFrom = '<INICIO_ISO_CON_ZONA_CONFIRMADO>'
   $cinnamonPaidThrough = '<TERMINO_EXCLUSIVO_ISO_CON_ZONA_CONFIRMADO>'
   $cinnamonExpectedPeriodEnd = 'none' # solo si la lectura inmediata sigue mostrando NULL

   npx tsx scripts/record-manual-subscription-payment.ts --business-id cmstm3108000104js2e9vfl0l --reference $cinnamonPaymentReference --amount-clp 17990 --paid-from $cinnamonPaidFrom --paid-through $cinnamonPaidThrough --expected-period-end $cinnamonExpectedPeriodEnd
   ```

   Si la revisión coincide con el comprobante/acuerdo y no tiene bloqueos, ejecutar el mismo comando agregando `--apply`. Conservar la referencia y el resultado de auditoría. Si el período esperado cambió, volver a revisar; no forzar el comando.
9. **Verificación posterior de lectura.** Confirmar los cuatro términos comerciales, ACTIVE y el fin de período confirmado; comparar datos operativos y conexión de abonos con la fotografía previa. Verificar que el dashboard muestra el cupo de dos y transferencia. Para probar el bloqueo del tercero, usar el entorno local/preview, sin crear profesionales artificiales en producción. Comprobar el 409 del checkout de suscripción manual sin seguir a ningún proveedor. No generar una reserva o preferencia real solo para esta verificación.
10. **Renovar cada mes.** Tras recibir la siguiente transferencia, usar el mismo comando del paso 8 con una nueva referencia, rango confirmado y el fin de período actual esperado. La configuración comercial no se vuelve a crear. Un reintento de la misma referencia no renueva dos veces.

Si se revierte la aplicación antes de configurar la cuenta, las columnas aditivas pueden permanecer. Tras configurar una cuenta con excepciones comerciales, no volver a servir código antiguo que ignore el límite o la modalidad manual sin revisar expresamente esa recuperación.

## 6. Verificaciones de esta revisión

- Nueve archivos dirigidos: **84 pruebas aprobadas**, incluidos OAuth, abonos, checkout, dunning, cron, capacidad y operación comercial.
- Suite completa: **199 archivos aprobados / 1.302 pruebas aprobadas**; 4 archivos y 84 pruebas omitidos por condiciones existentes. Las 19 pruebas de integración PostgreSQL de esta entrega sí se ejecutaron.
- Typecheck aprobado; lint sin errores, 32 advertencias; build aprobado; sin nueva migración para el comando de renovación.
- El caso de renovación verifica múltiples meses, reactivación, auditoría, concurrencia e idempotencia; compara toda la fila de suscripción salvo los campos de período/estado esperados y toda la configuración del negocio, incluyendo credenciales ficticias de abonos.
- Una prueba separada verifica que una suscripción BANK_TRANSFER no bloquea el abono de una reserva ni sustituye la credencial del vendedor. El SDK se simula; no se crea ninguna preferencia real.
- Se ejecutó además el CLI real contra una cuenta local desechable, desde procesos separados: revisión sin escritura, primer período, reintento idempotente y segundo mes. Se verificaron por SQL con conversión UTC explícita el período resultante, los dos registros de auditoría y la conservación del precio, límite y credencial ficticia del vendedor. La cuenta de prueba se eliminó al terminar.
- La lectura de control de producción conserva `Subscription.updatedAt=2026-10-17T16:26:24.646Z`, `Business.updatedAt=2026-10-03T14:05:26.762Z`, el mismo `mpSubscriptionId`, el mismo vendedor de abonos y `currentPeriodEnd=NULL`. Los instantes se verificaron con `AT TIME ZONE 'UTC'`: el lector SQL genérico había interpretado inicialmente los campos `timestamp without time zone` en la zona local del proceso. Se corrigió la lectura de auditoría; no se modificaron esos datos ni se derivó de ellos un período de pago.

**Pendientes externos:** credencial/verificación de la cuenta cobradora y confirmación del período. **Pendientes de liberación:** reconciliación revisada de la historia de migraciones y aprobación explícita de las operaciones de producción. Ninguna de esas operaciones se ejecutó.
