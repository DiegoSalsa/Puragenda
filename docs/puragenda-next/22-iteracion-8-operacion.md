# Iteración 8 — operación reproducible y límites de activación

Estado: instrucciones preparadas; no se ejecutó ninguna operación productiva. Esta entrega no cierra checkout, renovaciones ni cancelación comercial V2. Ver [informe y bloqueos](./21-iteracion-8-cierre-y-bloqueos.md).

## Entorno local autorizado

Worktree exclusivo: `C:\Users\diego\.codex\worktrees\puragenda-next-audit\agenda`. No copiar el `.env` del escritorio: contiene conexiones y claves operativas. Los runners de build/navegador rechazan archivos de entorno ambientales. Inyectar sólo las variables necesarias en el proceso de prueba.

PostgreSQL 17, loopback, rol local `commercial_test`, clúster ignorado `scratch/commercial-pg`, puerto 55443. Comprobar `pg_ctl status` antes de iniciarlo; no detener clústeres de otros trabajos. Cada runner comercial crea una base con sufijo aleatorio y valida nombre/host antes de escribir. Las bases quedan para inspección.

```powershell
$env:COMMERCIAL_V2_TEST_DATABASE_URL='postgresql://commercial_test@127.0.0.1:55443/puragenda_commercial_test'
$env:DIRECT_URL=$env:COMMERCIAL_V2_TEST_DATABASE_URL
npx prisma validate
npx prisma generate
node scripts/test-commercial-postgres.mjs --all
npm run test:commercial:migrations
npm run typecheck
npm run lint
npm run build:commercial:isolated
node scripts/verify-commercial-production-seal.mjs
```

Para Chrome, instalar/usar Playwright como dependencia de QA fuera del producto y seleccionar su directorio:

```powershell
$env:PURI_QA_NODE_MODULES='C:\ruta\de\qa\node_modules'
$env:PURI_QA_CHROME='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:puri-plus:browser
```

La evidencia de esta sesión usó el paquete Playwright ya disponible en la caché npm y Chrome real. El runner crea sesiones y negocios sintéticos, deniega recursos externos y no pasa claves de proveedor al servidor. Una cuenta de portal marcada como verificada en el fixture es evidencia local de software, no una verificación real de un buzón externo.

## Ejecutar las 131 pruebas heredadas

No mezclar estas guardas en una misma base general. Los nombres/puertos son parte del contrato de seguridad existente.

```powershell
$env:PURAGENDA_BOOKING_TEST_DATABASE_URL='postgresql://commercial_test@127.0.0.1:55443/puragenda_booking_api_test'
npm run test:booking:local
npm run test:mcp:local
```

Los runners generan y limpian su propio schema `booking_api_test_<timestamp>`; prueban 19 casos de reserva y 27 MCP además de unidades ya contadas en el total principal.

Para legacy/carreras, aprovisionar una base vacía local cuyo nombre contenga `cinnamon_qa`. En esta sesión fue `puragenda_cinnamon_qa_iteration8`. Usar `prisma db push` exclusivamente allí, luego:

```powershell
$env:DATABASE_URL='postgresql://commercial_test@127.0.0.1:55443/puragenda_cinnamon_qa_iteration8'
$env:DIRECT_URL=$env:DATABASE_URL
npx prisma db push
$env:COMMERCIAL_SUBSCRIPTION_TEST_DATABASE_URL=$env:DATABASE_URL
$env:TEST_DATABASE_URL=$env:DATABASE_URL
node node_modules/vitest/vitest.mjs run tests/server/commercial-subscription.integration.test.ts tests/integration/deposit-payment-postgres.integration.test.ts --no-file-parallelism
```

Las dos suites web requieren su clúster local separado exacto: `postgresql://websiteqa@127.0.0.1:55439/websiteqa`. Se aprovisionó con `initdb -U websiteqa -A trust`, sin conexiones remotas, en `scratch/iteration-8-website-pg`. Después de `prisma db push` sólo en esa base:

```powershell
$env:WEBSITE_BILLING_TEST_DATABASE_URL='postgresql://websiteqa@127.0.0.1:55439/websiteqa'
$env:WEBSITE_PUBLIC_TEST_DATABASE_URL=$env:WEBSITE_BILLING_TEST_DATABASE_URL
node node_modules/vitest/vitest.mjs run tests/server/website-mercadopago.integration.test.ts tests/server/website-purchase-intent.integration.test.ts --no-file-parallelism
```

No usar `vitest list --json <archivo-de-test>`: su argumento opcional se interpreta como archivo de salida. Para inventario, colocar los filtros antes y usar `--json=true` o un destino explícito bajo `scratch/`.

## Configuración de pruebas comerciales

Referencias completas de variables: `.env.example`. Nunca usar prefijo NEXT_PUBLIC para secretos. Configurar desde el gestor de secretos del entorno, no en archivos versionados ni en el chat.

| Variable | Uso y cierre por defecto |
| --- | --- |
| `COMMERCIAL_V2_INTERNAL_WRITES` | Writers aislados; 0/ausente fuera del test. |
| `PURI_PLUS_INTERNAL_ENABLED` / `CONTACT_FLOW_LAB_ENABLED` | Workspace/motor; 0 por defecto. |
| `PURI_PLUS_AI_ENABLED` | IA externa; 0 por defecto. |
| `PURI_PLUS_VERIFIED_PRICING_ENABLED` | Selecciona tarifa exacta Standard verificada; 0 por defecto; refrescar antes de 22-11-2026. |
| `PURI_PLUS_MAX_OPERATION_MICROS` | Tope IA por operación; 20000 micro-USD por defecto. |
| `PURI_PLUS_PROACTIVE_ENABLED` | SQL periódico; 0 por defecto, requiere políticas y presupuesto. |
| `CONTACT_FLOW_PUBLIC_CONSENT_ENABLED` | Elección pública y portal; 0 por defecto. |
| `CONTACT_FLOW_TOKEN_SECRET` | Firma/HMAC, mínimo 32 caracteres; secreto estable por entorno, no rotar sin preservar recibos/tokens. |
| `CONTACT_FLOW_PUBLIC_ORIGIN` | Origen exacto; loopback para simulador, HTTPS para Resend controlado. |
| `COMMERCIAL_WORKER_ENABLED` / `COMMERCIAL_WORKER_KILLED` | Tick habilitado / pausa global; sample 0 y 1 respectivamente. |
| `COMMERCIAL_WORKER_SECRET` | Bearer propio, mínimo 32 caracteres; no compartir con cron transaccionales. |
| `COMMERCIAL_V2_PREVIEW_ENABLED` / `COMMERCIAL_V2_PREVIEW_DATABASE_SHA256` | Sólo preview y conexión exacta autorizada; 0/vacío por defecto. |
| `CONTACT_FLOW_RESEND_TEST_ENABLED` | Adaptador controlado; 0 por defecto. |
| `CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT` | Atestación operativa de cuenta comercial separada, no validación automática; 0 por defecto. |
| `CONTACT_FLOW_RESEND_API_KEY` / `CONTACT_FLOW_RESEND_WEBHOOK_SECRET` | Credenciales comerciales separadas; no recurre a RESEND_API_KEY. |
| `CONTACT_FLOW_RESEND_FROM` / `CONTACT_FLOW_RESEND_DOMAIN_ID` | Remitente y dominio verificado antes de cada solicitud. |
| `CONTACT_FLOW_RESEND_TEST_BUSINESS_ID` / `CONTACT_FLOW_RESEND_TEST_RECIPIENTS` | Un negocio sintético y JSON de 1–5 buzones autorizados. |

Los nombres de credenciales billing V2 y sus restricciones siguen documentados en [13 — billing](./13-billing-v2-y-proveedores.md). Su transporte SDK conserva la restricción existente de runtime no production, también en un build de preview; no se presenta como resuelto el callback de billing hospedado.

`configure-commercial-sandbox.ts <businessId>` prepara solamente asignaciones locales de prueba, conserva el canal apagado y el kill switch activo. Rechaza contratos legacy. Requiere las guardas de negocio sintético y entorno; no crea un pago ni concede entitlement.

## Tick y scheduler

Para un negocio sintético ya autorizado y con políticas/presupuesto explícitos:

```powershell
# Inyectar las variables de test anteriores en este proceso.
node --import tsx scripts/configure-commercial-sandbox.ts <businessId-sintetico>
# Mantener el envío desactivado mientras se inspecciona la configuración.
node --import tsx scripts/run-commercial-worker.ts
```

Para ensayar procesamiento, un operador debe quitar la pausa del worker y las políticas de prueba correspondientes de forma explícita; cambiar el presupuesto no habilita el canal. El endpoint requiere `Authorization: Bearer` desde el almacén de secretos y aguarda el tick antes de responder. Nunca devolver/copiar el secreto en logs o en el navegador.

El scheduler de pruebas puede invocar el endpoint de preview o el CLI local. No se creó una tarea periódica, workflow activo ni servicio pagado. Elegir una frecuencia compatible con el plan efectivamente contratado. Los límites de envío actuales son acotados por tick; el backlog y los heartbeats deben vigilarse antes de prometer un SLA. No usar un intervalo de minuto en Vercel Hobby.

Supervisar CommercialWorkerState (lastSuccessAt, lastError, summary), outbox UNKNOWN/leases, cuotas reservadas, auditorías de denegación, supresiones y reservas IA UNKNOWN. No liberar manualmente contadores ni reemitir un envío fuera del horizonte idempotente. Para consumo IA ambiguo, `reconcileGrowthUsage` exige ID de operador Superadmin, importe real y hash de evidencia; no tiene endpoint público ni tool de IA.

## Preparar preview autorizado

1. Proveer una base de staging vacía o copia anonimizada autorizada, distinta de producción. No hay una suministrada actualmente.
2. Aplicar el baseline sólo si corresponde a una base nueva. Para legacy, verificar esquema, constraints, políticas/historial y deriva antes de marcar un baseline; no hacerlo para esconder diferencias.
3. Aplicar las migraciones aditivas y verificar RLS/grants con un rol sin BYPASSRLS. Ensayar el upgrade preservando las condiciones legacy y la repetición idempotente.
4. Configurar `VERCEL_ENV=preview` y las variables anteriores sólo en ese target. Calcular SHA-256 de `new URL(DATABASE_URL).href` dentro del proceso de configuración seguro; guardar sólo el hash, nunca imprimir la URL. No copiar valores de production.
5. Abrir únicamente un negocio sintético con entitlement verificable y presupuestos/políticas explícitos. Envíos permanecen apagados hasta tener remitente y buzones técnicos autorizados.
6. Probar la integración externa pendiente. El fingerprint y los tests locales no sustituyen pago, renovación, cancelación, entrega, baja ni callback reales.

## Integración y despliegue inerte — sólo tras autorización expresa

Antes de merge o deploy de esta versión:

1. `git fetch origin`; verificar `git merge-base --is-ancestor origin/main feature/puragenda-next` o resolver y repetir la validación si cambia main. Revisar los commits y este informe de pendientes; no aprobar venta por una suite verde.
2. Obtener backup confirmado y probar restore en destino aislado autorizado. Usar conexión de servicio protegida, por ejemplo `pg_dump --dbname=service=puragenda_backup --format=custom --file=<backup-protegido>` y `pg_restore --dbname=service=puragenda_restore_aislado --no-owner --no-acl <backup-protegido>`. Verificar fechas, integridad, filas/historial, constraints y RLS. No se ejecutó con datos productivos.
3. Ensayar las migraciones de esta rama en staging representativo. En producción con historial existente verificado, el mecanismo es `prisma migrate deploy`; no `db push`, reset ni el baseline local a ciegas. Revisar diff y checksums previamente.
4. Mantener las variables comerciales en 0, worker killed=1, secretos comerciales sin instalar y todos los COMMERCIAL_RELEASE_FLAGS en false. El código actual bloquea production incluso al abrir flags de test; esto fue probado con `next start`.
5. Sólo con autorización explícita de esta versión, integrar la rama revisada y desplegar el artefacto inerte por el mecanismo actual. No se ejecutaron esos pasos en esta sesión.
6. Verificar login, reserva normal/con abono, limpieza de holds, Google Calendar múltiple, web/planes legacy y los rechazos de rutas comerciales. Vigilar errores y revertir código si hay regresión.

**Activación comercial:** no hay un procedimiento terminado que pueda ejecutarse hoy. Falta cerrar facturación/renovación/cancelación y las verificaciones externas enumeradas en el informe; el sello de production permanece intencionalmente cerrado. No editar guardas para simular ese cierre ni anunciar el lanzamiento.

## Rollback

- En preview: activar kill switch global, pausar políticas y scheduler; cerrar flags. Conservar outbox, intentos, recibos, consentimiento y operaciones UNKNOWN para conciliación. Un resultado desconocido no autoriza repetir cobro/envío.
- En un despliegue inerte autorizado: volver al artefacto/deployment estable anterior. Las migraciones son aditivas; conservar sus tablas e historial. No ejecutar DROP de ledgers ni restaurar un backup encima de reservas nuevas.
- Si un problema requiere rollback de datos: detener writers afectados y usar el respaldo/restauración ya probado, con aprobación operativa y conciliación de cambios posteriores. Nunca inferir que un restore general es inocuo.
- No cancelar suscripciones ni archivar/modificar precios externos como rollback sin confirmación explícita del entorno y recurso. No hubo operaciones externas que revertir en esta sesión.
