# Puragenda Next — RC1 integrada y preparación de staging

29-10-2026. Rama `release/puragenda-next-rc1`. Este es el cierre de esta ejecución; los informes anteriores conservan su valor histórico. La [evidencia agregada](evidence/rc1-validation-2026-10-29.json) registra resultados y hashes de los logs privados.

**Candidata integrada, versionada y validada localmente para preparar un staging independiente. La habilitación comercial productiva continúa pendiente.** La autorización vigente permite publicar exclusivamente esta rama para auditoría; no permite desplegar, crear recursos remotos ni modificar producción.

## Consolidación y conservación

El inventario real al comenzar tenía 148 archivos, incluidos los 117 originales del informe 28 y sus evidencias posteriores. Se verificaron ambos respaldos por SHA-256 y se conservan en `scratch/next-rc-20261028` y `scratch/rc1-20261029`, fuera de Git. Se revisaron los diffs completos y se incorporaron rutas explícitas por grupo, sin `git add .`.

| Commit | Responsabilidad |
| --- | --- |
| `3fd7978` | Los 19 backports de Calendar, historias y órdenes de main |
| `1ebb9a0` | Parches de seguridad de dependencias |
| `dc54e76` | Contratos, registro y experiencia comercial V2 |
| `8456d72` | Medición, presupuestos y cuotas de Puri |
| `e282f58` | Mercado Pago V2, ciclo de vida y recuperación protegida |
| `31015ed` | Contact Flow Free, capacidad, eventos y controles de habilitación |
| `e427054` | Worker, scheduler, staging y bloqueo del Preview de RC1 |
| `3231856` | Evidencia histórica pública saneada y exclusión de recibos privados |
| `46d237f` | Integración de `origin/main` exclusivamente en RC1 |
| `85fb9ed` | Ejecución reproducible de suites condicionales y E2E aislados |
| `0eb193d` | Preparación de migraciones para una base independiente vacía |
| Commit de este documento | Cierre único y evidencia agregada; identificable con `git log --oneline -- docs/puragenda-next/29-rc1-integracion-y-staging-2026-10-29.md` |

El `.env` original y `src/server/email/resend.ts` conservan sus hashes iniciales. Los 12 recibos/capturas privados siguen en disco e ignorados. Los documentos públicos sustituyen destinatarios técnicos personales e identificadores operacionales por referencias saneadas; los originales permanecen respaldados. No se incorporan bases, certificados, claves, entornos privados ni logs de operación. Se escanearon el árbol completo y los blobs nuevos del historial frente a patrones de credenciales y valores privados de los entornos locales. Los 12 scripts de `scratch` que ya pertenecían a main se conservan sin alteración; no son respaldos nuevos introducidos por RC1.

## Integración de main

Se actualizó la referencia remota después de consolidar feature y se creó RC1 desde `3231856`. Se integró `origin/main` en `e74c92237e47db43425a7d47209520967e51bfb0`. El merge tiene dos padres y no hubo conflictos pendientes ni elecciones globales de una rama sobre otra. El árbol resultante del merge es idéntico al de la feature consolidada: `80fcbe5d9e271029f2cd0c2e0f9b077b7f5c5d53`.

Git reconoció los backports y fusionó automáticamente los tres solapamientos revisados: `src/app/api/business/[slug]/production-orders/route.ts`, `src/app/widget/[slug]/production-order-flow.tsx` y `src/server/validations/booking.ts`. Se mantiene la retirada de campos de mascotas de main y el consentimiento de Next. El conflicto textual del widget descrito el día 28 ya estaba resuelto en el backport; no fue un conflicto nuevo de este merge.

Main local permanece en `a3d90a652268e7770dd0c53cac2786d6e5bf63e7`; main remoto permanece en `e74c92237e47db43425a7d47209520967e51bfb0`. La feature local queda consolidada en `3231856f424696a463c0bb915c2e341cbd45758b`, sin integrar main allí; la feature remota no se publica. RC1 contiene todos los commits de main: cero commits detrás. Tras el cierre son 45 commits por delante, incluidos los 33 previos de Next y los 12 de esta ejecución. La comparación y el SHA final se verifican al publicar la rama.

## Validación integrada

| Comprobación | Resultado |
| --- | --- |
| Suite general | 1.673 correctas; 413 condicionadas al entorno; 242 archivos correctos y 16 omitidos |
| Diez suites PostgreSQL comerciales | 282 correctas, cero omisiones |
| Cuatro suites PostgreSQL legacy | 85 correctas, cero omisiones |
| Booking API aislada | 50 correctas: 19 PostgreSQL condicionadas y 31 regresiones ya incluidas en la general |
| MCP aislado | 53 correctas: 27 PostgreSQL condicionadas y 26 regresiones ya incluidas en la general |
| Activación, seguridad del build y scheduler | 24 correctas, incluidas en los recuentos anteriores |
| E2E HTTP desde snapshot vacío | Bootstrap 6 comprobaciones; Contact Flow 19 aserciones; sitios 12; scheduler: apagado, HTTPS, bearer, rechazo y reintento |
| Typegen / TypeScript | Correctos |
| ESLint completo | Cero errores, 32 avisos; los archivos finales añadidos también pasan ESLint |
| Build Webpack de producción aislado | Correcto; sin credenciales ni base productivas |
| Prisma | Schema válido; bootstrap y upgrade correctos, datos/historia preservados y segundo deploy sin cambios |
| Paquete de migración de staging | 14 migraciones desde una base local vacía; schema final coincidente; rechazo sin confirmación y con huella incorrecta |
| Dependencias productivas | Cero vulnerabilidades en `npm audit --omit=dev` |
| Dependencias de desarrollo | Cinco avisos: dos moderados y tres bajos; sin actualizaciones mayores forzadas |

Las 413 omisiones generales se ejecutaron en sus entornos preparados: 282 + 85 + 19 + 27. Se contabilizan **2.086 casos únicos** de suites, sin sumar dos veces las 57 regresiones repetidas por los launchers de booking/MCP. Las pruebas HTTP se informan aparte. Los guardas estrictos de los simuladores legacy se conservaron: un primer intento con URLs distintas fue rechazado; el runner final prepara sus bases/puertos originales y las 85 pruebas pasan sin relajar código legacy.

El snapshot nuevo `0aa5295a2356` utiliza PostgreSQL local, cuentas sintéticas y HTTP/TLS de loopback. No se enviaron nuevos correos reales ni se llamaron proveedores de IA, pagos o dominios durante esta ejecución. Los eventos de entrega HTTP son simulados; las entregas auténticas del día 28 siguen siendo evidencia histórica. No se repitió la certificación visual de navegador. La prueba de scheduler valida la función y el transporte TLS local, no el runtime ni la CPU de Cloudflare.

Los servidores y clústeres iniciados para QA quedaron detenidos después de comprobar su propiedad y ausencia de otros clientes. Se conservan sus datos y respaldos. Los logs iniciales fallidos también se conservan para trazabilidad.

## Activación coherente y Preview protegido

`contactFlowProductionRequested()` es dinámico: requiere simultáneamente `CONTACT_FLOW_PRODUCTION_ENABLED=1` y `CONTACT_FLOW_EXTERNAL_RELEASE=true`. Se probaron ambos valores correctos, cada cierre por separado y valores con formato incorrecto. No queda una constante antigua que bloquee una aprobación válida. Las credenciales por sí solas no habilitan envíos; permanecen aprobación v2, enrutamiento verificado, hashes de política/credenciales, entorno, consentimiento, cuotas, entitlement y kill switches.

El estado preparado sigue en `CONTACT_FLOW_PRODUCTION_ENABLED=0`, `CONTACT_FLOW_EXTERNAL_RELEASE=false`, sin manifiesto productivo aprobado. No se instalaron secretos o variables productivos.

Antes del push se confirmó la integración Vercel existente. `vercel.json` establece `git.deploymentEnabled["release/puragenda-next-rc1"]=false`; Vercel documenta el bloqueo de despliegues automáticos por rama mediante esa propiedad. No cambia el comportamiento de las otras ramas. [Referencia oficial](https://vercel.com/docs/project-configuration/git-configuration).

Como segunda barrera, el build de RC1 aborta antes de Prisma salvo que sea un Preview con `PURAGENDA_RC1_STAGING_BUILD=1`. Un build productivo de RC1 se rechaza incluso con ese opt-in. Los seis tests de subprocess verifican esas combinaciones sin SQL ni red. El build Preview sigue omitiendo migraciones. Se conservan los cinco crons legacy; no se agregó el tick comercial a ellos. El workflow GitHub existente solo responde a pushes de main, PR, schedule o ejecución manual; no se abrió PR ni se solicitó CI remoto en este push de auditoría.

## Reproducción local

Usar Node/dependencias del lockfile y PostgreSQL 17. Iniciar exclusivamente el clúster QA ya conservado, en `127.0.0.1:55443`, o preparar otro clúster local y ajustar la URL validada. El comando de arranque del clúster conservado está en el apartado 4 del informe 28. No cargar `.env` productivo ni copiar secretos al proceso de pruebas.

```powershell
$env:COMMERCIAL_V2_TEST_DATABASE_URL='postgresql://commercial_test@127.0.0.1:55443/puragenda_commercial_test'
node scripts/test-commercial-postgres.mjs
node scripts/test-commercial-migrations.mjs
node scripts/test-rc1-legacy-postgres.mjs
node scripts/test-rc1-booking-postgres.mjs
node scripts/test-rc1-booking-postgres.mjs --mcp
node scripts/prepare-next-staging.mjs --prepare-local
node scripts/run-next-staging.mjs
```

Con el último runner activo, ejecutar secuencialmente en otra terminal:

```powershell
node scripts/bootstrap-next-staging-http.mjs
node scripts/test-next-staging.mjs
node scripts/test-next-staging-websites.mjs
node scripts/test-next-staging-scheduler.mjs
```

El bootstrap nuevo elimina la dependencia de pasos UI manuales del informe anterior. El runner legacy necesita el puerto 55439 libre, crea su propio clúster y lo detiene al terminar. `PG_BIN_DIR` permite elegir los binarios; por defecto usa PostgreSQL 17 de Windows. Todos los datos y certificados permanecen privados. Ejecutar también `npm test`, `npm run typecheck`, `npm run lint`, `npx prisma validate`, `npm audit --omit=dev` y el build aislado. No convertir el build aislado en un despliegue ni heredar URLs productivas al reproducirlo.

## Preparación de staging independiente

No se crearon recursos remotos. El siguiente despliegue requiere una autorización específica y estos pasos:

1. Crear el proyecto **`puragenda-next-staging`** separado del proyecto actual, con hosting compatible, dominio HTTPS propuesto `next-staging.puragenda.cl`, base/rol independientes, usuarios sintéticos y secretos nuevos. No importar variables del proyecto productivo. Auditar origen de cada variable y conexión antes de escribir datos. Para ensayos externos, permitir solo las integraciones y destinatarios autorizados.
2. Preparar el paquete desde el checkout RC1 con `node scripts/prepare-rc1-staging-release.mjs`. Devuelve el path de un `prisma.config.ts` privado y un manifiesto con hashes. Incluye bootstrap legacy y migraciones desde el cutover; la historia original no se reescribe. No reproducir las migraciones incrementales antiguas sobre una base vacía sin este bootstrap.
3. Instalar en un entorno privado únicamente `RC1_STAGING_DATABASE_URL` del nuevo destino y `RC1_STAGING_CONFIRM=puragenda-next-staging`. Tras verificar de forma independiente proyecto/host/rol, calcular `RC1_STAGING_DATABASE_SHA256` como SHA-256 de `new URL(url).href`, sin imprimir la URL. La huella fija el destino; por sí sola no demuestra que sea una base distinta de producción. Con `VERCEL_ENV` distinto de `production`, ejecutar `npx prisma migrate deploy --config <path-devuelto>` y `npx prisma migrate diff --config <path-devuelto> --from-config-datasource --to-schema prisma/schema.prisma --exit-code`. El ensayo local de este procedimiento terminó sin diferencias.
4. Configurar solo en el proyecto independiente un Preview explícito con `PURAGENDA_RC1_STAGING_BUILD=1`; el bloqueo Git automático de RC1 permanece. Preparar ahí `DATABASE_URL`/`DIRECT_URL`, autenticación/orígenes y claves de tokens propias. Mantener los dos flags productivos de Contact Flow cerrados, delivery simulado, MP productivo y recovery apagados, IA proactiva apagada y proveedores productivos sin claves. El worker local puede ejercerse con su secreto de staging; no usar `CRON_SECRET` legacy.
5. Desplegar manualmente solo después de autorización y repetir HTTP, autenticación, reservas, entitlements, expiración, aislamiento y eventos/bajas. Preview usa `NODE_ENV=production`: el mock local de imágenes no sustituye un almacenamiento remoto independiente. Preparar assets sintéticos o almacenamiento de staging antes de certificar cargas. OAuth Calendar, DNS/TLS y dominios personalizados requieren su propio ensayo autorizado.

La migración de staging es un paso manual con destino confirmado; el build Preview no migra. Mantener fuera de Git la URL, huella derivada de credenciales, manifiestos de aprobación y secretos. Guardar el SHA de aplicación, hashes de migraciones, backup y variables del despliegue para reproducirlo.

## Scheduler: prueba antes de activación

`ops/commercial-scheduler/wrangler.toml` incluye `env.staging` con nombre `puragenda-next-staging-scheduler`, destino exacto de staging, `SCHEDULER_ENABLED=0` y `crons=[]`. Ambos entornos mantienen `workers_dev=false` y `preview_urls=false`. El secreto `COMMERCIAL_WORKER_SECRET` debe ser nuevo y exclusivo del entorno. Los archivos `.dev.vars*` y `.wrangler/` están ignorados.

Primero reproducir el E2E local anterior; luego, antes de instalar recursos remotos, comprobar el handler apagado en Wrangler:

```powershell
npx wrangler dev --local --test-scheduled --env staging --config ops/commercial-scheduler/wrangler.toml --ip 127.0.0.1
# Otra terminal: debe registrar disabled y no emitir tráfico de aplicación.
curl.exe 'http://127.0.0.1:8787/cdn-cgi/local/scheduled?format=json'
```

Este ensayo Wrangler queda pendiente; no se instaló ni ejecutó un Worker remoto. La ruta de simulación y `--test-scheduled` corresponden a la [documentación actual de Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/workers/).

Después de autorizar el staging remoto: instalar el secreto por el gestor de Cloudflare, conservar triggers vacíos, desplegar solo `--env staging` y hacer una invocación controlada. Verificar destino/certificado, bearer inválido 401, bearer correcto, 503/reintento sin duplicación, último éxito y locks. Medir CPU real frente al límite del plan antes de aprobar el cron. Solo entonces activar un único `* * * * *` en staging y observar cadencia, colas y alertas. Presupuestos preparados: aplicación 20 s, cancelación de fetch 25 s, un reintento y lease 120 s. No queda certificada la viabilidad del plan Free hasta medirlo en el runtime.

## Condiciones comerciales y rollback

Estas condiciones no impiden preparar un staging cerrado, pero sí habilitar clientes reales:

- **Contact Flow / Resend Free:** conservar `contacto@contacto.puragenda.cl` y `CONTACT_FLOW_PRODUCTION_REPLY_TO=contacto@purocode.com`. Dominio/DNS y entregas auténticas previas permanecen certificados; el equipo declara atención en Zoho. Faltan verificar ACL y correlación segura por negocio/campaña en el buzón compartido. El asunto ayuda al triage, pero no es un router entrante autenticado. No marcar `replyRoutingVerified` antes de resolverlo; no cambiar MX ni contratar correo adicional.
- **Webhook permanente:** instalar en el entorno final el signing secret y la ruta HTTPS `/api/contact-flow/webhooks/resend`, con los siete tipos preparados: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`, `email.suppressed`. Certificar firma, replay, precedencia, bajas públicas HTTPS y supresión antes de generar aprobación. No se reemplaza el webhook temporal histórico durante esta tarea.
- **Capacidad Free:** cuota/reputación compartidas con el equipo; los dominios/keys separan permisos, no capacidad. Propuesta inactiva: trial 5/día, 30 totales; pagado 10/día, 150/mes, tres campañas de hasta 50; global comercial 10/día y 200/mes. La reserva transaccional propuesta 40/día y 1.000/mes no es una reserva atómica de Resend. Verificar headroom real, antigüedad de lecturas y alerta del primer Plus pagado. Sin compra ni upgrade automático.
- **Puri:** aprobar/fusionar expresamente política de cuotas y presupuestos, snapshot de precios vigente y credenciales aisladas. La propuesta Contact Flow Free no habilita IA ni sustituye la política Puri.
- **Mercado Pago V2:** el webhook automático auténtico de suscripciones sigue sin observarse. Certificarlo o aprobar expresamente el fallback canónico supervisado, con renovación vencida/UNKNOWN y reconciliación. `PURAGENDA_MP_V2_PRODUCTION_RECOVERY_ENABLED=0` permanece. No re-POSTear creaciones inciertas ni conceder acceso por autorización sin pago confirmado.
- **Lanzamiento:** resolver hosting comercial compatible, supervisión y alertas; aprobar manifiesto de producción solo después de certificar rutas, credenciales, enrutamiento, política y rollback. No hay autorización comercial implícita en el push de RC1.

Rollback: cerrar ambos flags de Contact Flow, aplicar kill switch y pausar el scheduler; conservar DB, colas, bajas, supresiones, eventos tardíos y secretos de tokens. Desactivar recovery V2 y conciliar recursos canónicos sin alterar billing legacy. Restaurar una aplicación compatible y sus variables verificadas; no borrar operaciones inciertas, reiniciar cuotas ni ejecutar down migrations destructivas. Una restauración de DB no debe sobrescribir pagos posteriores. Mantener disponibles bajas y webhooks aun con campañas apagadas.

Para auditoría, la rama prevista es [release/puragenda-next-rc1](https://github.com/DiegoSalsa/Puragenda/tree/release/puragenda-next-rc1), con [comparación contra main](https://github.com/DiegoSalsa/Puragenda/compare/main...release/puragenda-next-rc1). El SHA y los estados remotos se comprueban después del push y se entregan en el cierre de la ejecución. No se afirma CI remoto aprobado cuando no se ha ejecutado.
