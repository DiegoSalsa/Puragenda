# Puragenda Next — cierre de consolidación y candidata de lanzamiento

28-10-2026 · `feature/puragenda-next` · worktree `puragenda-next-audit/agenda`.

**Candidata local consolidada y comprobada. Lanzamiento bloqueado por configuración y decisiones operacionales concretas.** Sin commit, stage, push, merge, rebase, deploy ni recursos remotos nuevos. No hubo escrituras en contratos productivos, cargos, campañas a clientes ni compras. Hubo una nueva prueba técnica de recepción, entregada a `contacto@purocode.com`.

Este es el cierre vigente. Los informes 23–27 conservan la historia y sus pruebas auténticas; no se vuelven a presentar como pruebas nuevas. El [inventario SHA-256](evidence/rc-inventory-2026-10-28.json) y la [evidencia agregada](evidence/rc-validation-2026-10-28.json) permiten comprobar el estado sin publicar secretos ni recibos privados.

## 1. Repositorio protegido y correcciones integradas

Estado inicial: **117 archivos con cambios**, 45 rastreados y 72 nuevos. Todos conservan copia recuperable, cotejada por SHA-256, en `scratch/next-rc-20261028/backup`, con manifiesto `baseline.json`. Ninguno falta al cerrar. El inventario adjunto enumera todos los archivos finales, hashes, tamaños y agrupaciones propuestas. Las diferencias posteriores están identificadas; los archivos compartidos se revisan por hunks antes de futuros commits.

El `.env` del repositorio original y `src/server/email/resend.ts` conservan exactamente sus hashes iniciales. No se copiaron las variables productivas al staging. Las evidencias originales de Mercado Pago/Resend permanecen en disco y respaldo; **12 recibos/capturas con información operacional pasan a exclusión de Git**, sin borrarlos. `scratch`, backups, entornos privados, claves, certificados y logs no se versionan. Las capturas nuevas solo contienen datos sintéticos. El escaneo de todos los archivos públicos candidatos contra secretos reales de los entornos privados no encontró coincidencias; véase el inventario final.

Correcciones concretas de esta consolidación:

- El banner de un registro V2 ya muestra Puragenda/Puragenda+, profesionales, ciclo y prueba; antes mostraba la clasificación legacy Equipo y una activación incorrecta. El banner legacy mantiene su comportamiento.
- El enlace al widget utiliza el origen actual. Los profesionales nuevos muestran inmediatamente sus servicios asignados; no sustituyen una asignación existente por una lista vacía al refrescar.
- El worker productivo omite el antiguo reconciliador exclusivo de laboratorio, que antes impedía alcanzar la etapa de campañas. La recuperación nativa V2 tiene prioridad, presupuestos acotados y un guard productivo adicional. Se retiró su ejecución duplicada de dos crons legacy; sus reconciliaciones legacy permanecen.
- El endpoint comercial distingue errores parciales mediante HTTP 503, conserva lease/fence y registra tiempos, etapas diferidas y último error. Un fallo parcial conserva la fecha del último éxito anterior; el superadmin no muestra una fecha engañosa como éxito nuevo.
- La aprobación de Contact Flow ahora exige `replyRoutingVerified:true`. El preflight rechaza la aprobación sin `--reply-routing-verified`, antes de acceder a proveedores. Se preserva además el cierre explícito `CONTACT_FLOW_EXTERNAL_RELEASE=false`.
- Se actualizaron parches de dependencias vulnerables, sin `--force`, cambios mayores ni downgrades de herramientas.

## 2. Divergencia e incorporación de main

`origin/main` se consultó mediante fetch: `e74c92237e47db43425a7d47209520967e51bfb0`. HEAD conserva `8d28501c55c876ffee18f7c5513aa8ecdd0c3fe8`; base común `34187de43a860b88b7328b5e11743da21b48db7c`. Main tiene **6 commits exclusivos** y feature **33**. Esta divergencia histórica permanece: no se hizo merge ni rebase.

Se respaldaron y trasladaron localmente las correcciones revisadas de **19 rutas** de main: fallback de Google Calendar ante scopes antiguos/403, horarios y exportaciones de historias, y retirada de campos de mascotas de órdenes productivas. Los 16 archivos sin solapamiento coinciden con main; 40 regresiones focalizadas pasaron y están incluidas en la suite general.

| Solapamiento | Resolución local |
| --- | --- |
| `src/app/api/business/[slug]/production-orders/route.ts` | Patch de main aplicado, conservando Next |
| `src/server/validations/booking.ts` | Patch de main aplicado, conservando consentimiento |
| `src/app/widget/[slug]/production-order-flow.tsx` | Único conflicto textual real: se retiraron campos de mascotas manualmente y se conservaron estado, payload y checkbox de consentimiento comercial |

Main no agrega cambios de Prisma, dependencias o facturación legacy en este intervalo. La inspección por rutas cubre reservas, Calendar, sitios, usuarios/permisos y billing. Los diffs y las versiones anteriores están en `scratch/next-rc-20261028/main-backup` y `reviewed-main-hotfixes.patch`. La integración Git futura deberá reconocer estos backports y resolver cualquier conflicto sin duplicar ni deshacer las correcciones.

## 3. Capacidades anunciadas frente a evidencia disponible

| Recorrido | Evidencia de esta candidata | Condición pendiente |
| --- | --- | --- |
| Puragenda, mensual | Registro HTTP real en Next: 1 profesional, 12.990 CLP, prueba exacta de 30 días; contrato en PostgreSQL aislado | Despliegue aprobado |
| Puragenda+, anual | Navegador: precios → 3 profesionales → registro → dashboard. 374.900 CLP anual = 10 × 37.490; contrato y prueba comprobados | Despliegue aprobado |
| Cambio de plan, renovación, cancelación y preservación | Suite PostgreSQL V2/legacy y puertos de proveedor simulados; se mantienen checkouts auténticos de prueba anteriores | No equivalen a renovación productiva observada |
| Agenda | Navegador: servicio de 30 min/15.000 CLP → profesional → sucursal → jueves 10:00 → reserva pública sin consentimiento comercial → Appointment persistida | Google OAuth y correo real no se ejercen en este staging |
| Bloqueos, colisiones y permisos | Regresiones unitarias/PG y de booking existentes; aislamiento negativo HTTP entre dueños | No se presenta como una sesión UI completa de cada variante |
| Google Calendar | Hotfix de main incorporado; pruebas de fallback y scopes | Ensayo OAuth externo pendiente en staging remoto autorizado |
| Transaccionales | Fuente y entorno originales intactos; el staging suprime notificaciones mediante mock | Los logs de QA que dicen “delivered” **no** acreditan entrega externa |
| Puri estándar | UI móvil y control de acceso; ante claves/asignación ausentes muestra “Puri aún no está configurado”, sin gasto externo | Fusionar y aprobar cuotas estándar/IA y configurar credenciales; no prometer IA habilitada por el template Free |
| Puri avanzado | HTTP real: análisis SQL de inactivos → borrador → preparación → revisión → aprobación explícita | IA y análisis proactivo están apagados en staging. Las dos respuestas auténticas OpenAI del informe 25 son evidencia histórica, no nueva |
| Cuotas y costos | PG: trial, agotamiento, reserva, liquidación, costo desconocido y permisos. No se interpreta costo desconocido como cero | La propuesta Puri del informe 25 sigue pendiente; precios de modelo tienen vencimiento |
| Sitios Plus | UI crea/edita borrador; API HTTP sube imagen al almacenamiento local, valida propiedad/revisión y publica. Host sintético sirve título e interfaz de reservas. Trial vencido devuelve 404 y conserva contenido/reservas; restaurarlo recupera publicación | Carga mediante chooser del navegador no certificada: el conector agotó la espera. Se verificó la misma carga por API. Dominio personalizado y Cloudinary/Vercel reales no se configuraron |
| Contact Flow | HTTP real: inactivos → recomendación aprobada → cohorte con consentimiento → autorización explícita → worker → entrega simulada → baja POST → supresión única → replay sin duplicados | Producción sigue apagada; configuración permanente y respuestas seguras pendientes |

Las integraciones externas se distinguen de los recorridos HTTP con proveedor simulado. La reserva desde el widget se comprobó de principio a persistencia; no se afirma haber hecho una segunda reserva desde el sitio publicado. Las pruebas PostgreSQL cubren recuperación incierta, firmas, cuotas y precedencia de eventos, pero no sustituyen tráfico auténtico del proveedor.

## 4. Staging preparado y reproducción

Se recomienda **un proyecto separado de Vercel**, `puragenda-next-staging`, con HTTPS estable propuesto `https://next-staging.puragenda.cl`, base PostgreSQL/Supabase independiente y variables exclusivas. Evita heredar accidentalmente secretos, dominios o DB de producción. El Preview actual de la rama apunta al último commit remoto y **no contiene esta candidata sin commit**; no se utiliza como certificación. No se creó ni desplegó el proyecto remoto.

El staging local reproducible sí está preparado: snapshot `e9f91e86b420`, DB `puragenda_commercial_test_rce9f91e86b420`, HTTP `127.0.0.1:3128`, TLS `localhost:3448`. Todas las migraciones se aplicaron sobre PostgreSQL aislado. Cuentas y datos son sintéticos; claves reales de Resend, OpenAI, Google, Mercado Pago y Cloudinary están ausentes. El preload bloquea `fetch`, `http` y `https` externos; sus tres pruebas negativas pasaron. No es un firewall del sistema operativo: futuras integraciones con otros transportes requieren el mismo aislamiento.

Archivos reproducibles: `scripts/prepare-next-staging.mjs`, `seed-next-staging.ts`, `run-next-staging.mjs`, `next-staging-network-guard.mjs` y perfil `config/release/puragenda-next.json`.

```powershell
# Iniciar solamente el clúster local dedicado conservado (PostgreSQL 17).
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' -D 'C:\Users\diego\Desktop\agenda\scratch\commercial-pg' -o '-h 127.0.0.1 -p 55443' -l 'C:\Users\diego\.codex\worktrees\puragenda-next-audit\agenda\scratch\next-rc-20261028\postgres.log' start
# Solo una DB desechable loopback cuyo nombre pase el validador del script.
$env:COMMERCIAL_V2_TEST_DATABASE_URL='postgresql://commercial_test@127.0.0.1:55443/puragenda_commercial_test'
node scripts/prepare-next-staging.mjs --prepare-local
node scripts/run-next-staging.mjs
```

El preparador crea un nuevo snapshot y DB; no sobrescribe los anteriores. Las credenciales quedan exclusivamente en `scratch/next-staging/<id>/staging-accounts.private.json`; el runtime/certificados tienen ACL del usuario y SYSTEM. El certificado localhost dura 14 días: renovar preparando otro snapshot. La prueba HTTPS validó certificado **y hostname** con CA local explícita en el cliente Node; la inspección UI usó HTTP loopback, sin saltar avisos del navegador ni alterar confianza del sistema.

Al cerrar se detuvieron el runner Next/TLS y el PostgreSQL iniciado para QA, tras comprobar que no quedaban otros clientes. Se conservan bases, snapshots y respaldos. Para reusar el snapshot actual, iniciar ese PostgreSQL y ejecutar solo `node scripts/run-next-staging.mjs`. Las pestañas temporales se cerraron y se conservó la sesión original de Resend.

En el snapshot registrado se ejecutaron `node scripts/test-next-staging.mjs` y `node scripts/test-next-staging-websites.mjs`. El segundo requiere primero el recorrido UI documentado de registro Plus, servicio/profesional/reserva y edición de portada con el nombre sintético fijo del script; no se ofrece como un E2E automático desde una DB vacía. Para repetir completo, preparar otro snapshot, repetir esos pasos UI y ejecutar ambos scripts. El seed nativo incluye profesionales explícitos y retira las cachés históricas del fixture legacy antes del análisis HTTP.

Limitaciones locales: Google Fonts está bloqueado por aislamiento y se muestra la fuente fallback; el enlace “Ver sitio” genera el host `.localhost` sin puerto, por lo que en QA se debe usar `http://<subdominio>.localhost:3128` (el harness fija el Host sobre loopback). No se certifica con ello DNS/TLS público. La UI se revisó a **1440 × 959** y **389 × 843 CSS px**, sin overflow horizontal en las vistas observadas. [Escritorio](evidence/rc-website-desktop-2026-10-28.png), [dashboard móvil](evidence/rc-dashboard-mobile-2026-10-28.png), [widget móvil](evidence/rc-widget-mobile-2026-10-28.png).

## 5. Scheduler y hosting

El dashboard actual muestra **Vercel Hobby y Fluid Compute habilitado**, 1 vCPU/2 GB. Hobby permite cron **una vez al día**; no satisface el tick de un minuto. Además, sus condiciones limitan Hobby al uso personal no comercial: resolver hosting comercial compatible antes del lanzamiento, independientemente de mantener Resend Free. No se compró un plan. [Cron y precios](https://vercel.com/docs/cron-jobs/usage-and-pricing), [condiciones Hobby](https://vercel.com/docs/plans/hobby).

La función declara `maxDuration=60`, dentro del límite Fluid observado/documentado; no se cambiaron ajustes remotos. El presupuesto cooperativo de la aplicación es 20 s (válido entre 5 y 20 s), con operaciones y lotes acotados. Una operación en curso puede exceder ese presupuesto blando; el límite de función sigue siendo la barrera final. El tick observado tardó **1.619 ms** en dev, no es un benchmark ni SLA productivo. [Duración Vercel](https://vercel.com/docs/functions/configuring-functions/duration).

Recomendación preparada: **Cloudflare Workers Free Cron Trigger**, un único `* * * * *` UTC que invoca GET HTTPS con Bearer. Costo previsto **US$0 dentro de Free**, sin contratación ni activación. Presupuesto conservador: 1.440 ticks/día, como máximo 2.880 llamadas con un reintento; por debajo de 100.000 solicitudes/día. Free limita CPU a 10 ms; la espera de red no es CPU y Cron admite hasta 15 min de tiempo de pared. El consumo real de CPU y la cadencia deberán medirse en el runtime antes de certificarlo. [Límites](https://developers.cloudflare.com/workers/platform/limits/), [precios](https://developers.cloudflare.com/workers/platform/pricing/), [Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/).

`ops/commercial-scheduler/worker.mjs` y `wrangler.toml` están preparados con trigger vacío, `SCHEDULER_ENABLED=0`, sin endpoint público Workers y sin secretos en archivos. Solo acepta los dos destinos HTTPS exactos de producción/staging, no sigue redirects, cancela a 25 s y hace como máximo un reintento para transporte/429/5xx. No registra el bearer ni cuerpos con datos. El secreto se instala mediante el gestor de [secrets de Workers](https://developers.cloudflare.com/workers/configuration/secrets/), distinto por entorno.

La ruta acepta exclusivamente `COMMERCIAL_WORKER_SECRET`; **el `CRON_SECRET` legacy fue rechazado con 401 en HTTP real**. No intercambiarlos ni añadir este tick a los crons legacy. Lease de 120 s, fencing, locks y claves de idempotencia protegen solapamientos y reintentos; el siguiente tick recupera trabajo diferido. HTTP 503 y logs del scheduler muestran fallos; el superadmin muestra último éxito/error, cola y estados inciertos. Configurar al activar una alerta por más de cinco minutos sin éxito o por UNKNOWN/errores, sin enviar notificaciones desde esta tarea.

No se recomienda cron-job.org para transportar este bearer: su FAQ declara que no verifica certificados TLS. QStash Free ofrece 1.000 mensajes/día, insuficientes para 1.440 ticks más reintentos. [FAQ cron-job.org](https://cron-job.org/en/faq/), [QStash](https://upstash.com/pricing/qstash). Si se elige Vercel Pro u otro hosting compatible, reevaluar cron nativo y mantener **un solo scheduler** activo.

## 6. Configuración definitiva de Contact Flow

| Parámetro | Preparación final |
| --- | --- |
| Remitente | `contacto@contacto.puragenda.cl` |
| Reply-To | `CONTACT_FLOW_PRODUCTION_REPLY_TO=contacto@purocode.com` |
| Dominio comercial | Verificado en Resend; SPF, DKIM, retorno y CNAME de la certificación 26 conservados |
| Buzón | MX públicos de Zoho; entrega técnica confirmada por Resend el 28-10-2026; el propietario confirma atención por el equipo PuroCode en Zoho |
| Aperturas/clics | Sin tracking en el dominio certificado |
| Capacidad | `shared_free`: dominio/clave separan permisos y remitente, **no** cuota ni reputación del equipo |
| Producción | `CONTACT_FLOW_PRODUCTION_ENABLED=0`, `CONTACT_FLOW_EXTERNAL_RELEASE=false`, worker productivo apagado/kill switch cerrado en el borrador local |
| Aprobación | Ausente; no se declara verificado el enrutamiento compartido |

La configuración está en `.env.example`, el perfil de release y `.env.contact-flow-production.local` **ignorado, protegido e inactivo**. Este último no contiene claves de producción del proveedor; sus valores en blanco impiden habilitarlo accidentalmente. No se instalaron variables en Vercel ni se tocó el correo transaccional. No se modificaron MX de `puragenda.cl`, no se creó otro servicio de correo y no queda trabajo DNS para el dominio comercial ya verificado.

**Pruebas reales preservadas:** tres entregas a `tecnico-corporativo@example.invalid`, `tecnico-1@example.invalid` y `tecnico-2@example.invalid`; baja persistida del primero. Los destinos oficiales autorizados `bounced@resend.dev`, `complained@resend.dev` y `suppressed@resend.dev` generaron rebote, queja y supresión. La certificación 26 registró 12 eventos únicos Svix y replay auténtico idempotente; `delivery_delayed` y `failed` están suscritos y probados sintéticamente, no se inventa su recepción auténtica. En esta consolidación solo se añadió **un** mensaje técnico a `contacto@purocode.com`, estado `delivered`, sin campaña ni datos de negocios. Entrega del servidor no prueba apertura: no se inspeccionó la bandeja/ACL de Zoho ni se obtuvo una respuesta humana al mensaje.

**Respuestas compartidas:** el asunto y nombre visible del remitente identifican el negocio de esa campaña. El envío tiene un solo destinatario y no incorpora otros negocios. Esto ayuda al triage, pero nombres repetidos/edición del asunto/reenviados impiden correlación fiable; los tags de Resend no resuelven por sí solos las respuestas normales. No existe un procesador entrante que autentique y enrute cada respuesta a su negocio. No se certifica aislamiento de la bandeja Zoho.

Antes del lanzamiento se debe verificar acceso exclusivamente del equipo PuroCode autorizado y un procedimiento de correlación por mensaje/campaña y negocio, sin dar acceso compartido a los dueños ni reenviar hilos completos de otros negocios. Si ese procedimiento no resulta fiable con el Reply-To exacto elegido, resolver el enrutamiento antes de marcar `replyRoutingVerified`. No se agregó un servicio de correo entrante ni se amplió alcance con una función nueva.

Cuotas Free preparadas, **sin activarlas**: Plus trial 5/día, 30 totales y una campaña; Plus pagado 10/día, 150/mes, tres campañas de hasta 50; global comercial 10/día y 200/mes, intervalo de 30 días por contacto. Reserva transaccional de referencia 40/día y 1.000/mes. El límite global manda aunque varias cuentas tengan asignaciones mayores. Debe fusionarse este template con la política Puri aprobada, no reemplazarla ciegamente. Las lecturas de uso/capacidad caducan y cierran el envío si fallan; la reserva de la aplicación **no es una reserva atómica del proveedor frente a otros emisores del equipo**. Revisar headroom real y alarma del primer Plus pagado; Pro sigue siendo una contratación manual posterior, no automática.

Pendiente para activación coordinada: credencial de envío productiva restringida al dominio y credencial de lectura separada; webhook permanente `https://www.puragenda.cl/api/contact-flow/webhooks/resend` y su secreto; siete eventos; bajas y enlace de reservas HTTPS permanentes; scheduler y manifiesto revisado. El webhook de laboratorio continúa deshabilitado. Las URLs temporales de la certificación no son un servicio productivo. Completar el preflight con referencia del propietario y verificaciones reales; **solo después de aprobación y despliegue autorizado** cambiar ambos switches. Mantener bajas y verificación de eventos tardíos al pausar envíos.

## 7. Mercado Pago: evidencia y decisión operacional pendiente

Se conservan los checkouts de prueba mensual, anual y autorización de 30 días del informe 23, junto con la restauración del panel del informe 24. No se repitió ni reescribió el checkout. **No se ha observado un webhook automático auténtico de suscripciones** ni demostrado la correspondencia del secreto con la aplicación emisora. Sigue siendo un bloqueo externo.

La recuperación nativa consulta recursos canónicos, valida cuenta/moneda/monto/negocio, concilia una sola evidencia y no crea otro cobro. Se probó con puerto simulado también en runtime productivo guardado. Para producción requiere, además de los guards ya existentes, `PURAGENDA_MP_V2_PRODUCTION_RECOVERY_ENABLED=1`; su valor actual es 0. La autenticidad de un webhook no se sustituye por esa prueba sintética.

Decisión de lanzamiento: obtener/certificar el canal auténtico con Mercado Pago, o aprobar expresamente polling canónico supervisado como fallback con tratamiento de renovación vencida/UNKNOWN. No conceder acceso por una mera notificación o autorización sin pago confirmado; no re-POSTear una suscripción incierta. Preservar la evidencia y resolver la operación canónica antes de reintentar una creación. El worker general aporta la recuperación; no cambia los contratos legacy.

## 8. Verificaciones finales

| Verificación | Resultado |
| --- | --- |
| Suite general | **1.661 correctas**, 413 omitidas por condiciones de entorno; 241 archivos correctos, 16 omitidos |
| Diez suites PostgreSQL locales | **282 correctas**, sin omisiones; incluye legacy, migración, registro, V2, Puri, aislamiento y Contact Flow |
| Último guard de Contact Flow | Suite PG pertinente repetida: **26/26**; no se suman como tests únicos |
| Cambios finales banner/scheduler/release | **14/14**, incluidos en la suite general |
| E2E HTTP sobre servidor Next | **19 aserciones** de login/Puri/Contact Flow/TLS/aislamiento/worker y **12** de sitios/registro Basic/vencimiento; proveedores externos simulados |
| UI integrada | Registro Plus anual, servicio/profesional/horario/reserva, editor, dashboard/Puri móvil y widget; estado persistido contrastado por HTTP/PG |
| Typegen y TypeScript | Correctos |
| ESLint de archivos TS/TSX/MJS cambiados/nuevos | **0 errores**, siete avisos de imágenes `<img>` existentes |
| Build de producción aislado Webpack | Correcto; sin credenciales ni DB productivas |
| Prisma | Schema válido; bootstrap y upgrade legacy correctos, schema coincidente, datos/historia preservados, deploy repetido sin cambios |
| Seguridad | `npm audit --omit=dev`: **0 vulnerabilidades**. Auditoría total: cinco en herramientas dev (dos moderadas, tres bajas), documentadas sin downgrade destructivo |
| Conservación y secretos | 117/117 respaldos válidos, cero archivos iniciales ausentes, entorno original/transaccional intactos, cero secretos privados coincidentes en archivos públicos, índice vacío |
| Guard de red | fetch/http/https externos bloqueados antes de emitir solicitudes |

Las omisiones generales incluyen suites condicionadas que se ejecutaron aparte con PostgreSQL; no se presentan como aprobadas. Una repetición PG simultánea con compilaciones agotó el timeout de 5 s de un caso; la misma suite, sola y sin aumentar timeouts, pasó 26/26. No se escondieron los logs iniciales. Logs privados y manifiestos se conservan en `scratch/next-rc-20261028`; la evidencia pública incluye sus hashes.

Los parches de seguridad eliminan los avisos de runtime en zod, Hono/Node, undici, body-parser, qs y fast-uri. Quedan avisos dev de Vitest/mocker y shadcn/registry/deepmerge; no se importan esas herramientas en runtime de la aplicación. No se aplicó el downgrade mayor que sugería el arreglo forzado.

## 9. Propuesta de commits, sin ejecutarlos

El inventario enumera rutas y grupo orientativo. Antes de autorizar commits, revisar cada diff completo y dividir los archivos compartidos por hunks; ningún grupo implica `git add .`.

1. **Compatibilidad main:** las 19 rutas revisadas, su documentación y regresiones; en los tres solapamientos incorporar solo hunks de main preservando Next.
2. **Seguridad de dependencias:** `package.json` y lockfile juntos.
3. **Registro/catálogo/contratación V2:** validaciones, selección de plan/profesionales, paneles y gates, schema/migraciones existentes y pruebas de registro/legacy; banner/sidebar/staff corregidos.
4. **Mercado Pago V2:** `src/server/commercial-billing/mercadopago-v2*`, webhook/retorno, herramientas de certificación y tests; evidencia pública resumida, sin recibos privados.
5. **Puri y cuotas:** runtime/telemetría/precios, `commercial-usage*`, panel de consumo, recomendaciones y tests. No incluir una aprobación comercial ficticia.
6. **Contact Flow Free:** configuración/approval, capacidad/reservas, providers/eventos/supresiones, métricas/alerta, fixtures/tests y política propuesta.
7. **Operación y staging:** worker general, retiro de la ejecución V2 duplicada de crons, `ops/commercial-scheduler`, scripts y perfil de staging, tests de ruta y scheduler.
8. **Cierre y evidencia:** este informe, aviso de actualización en 27, inventarios, hashes y capturas sintéticas; `.gitignore` de evidencia privada.

Revisar especialmente `.env.example`, `prisma/schema.prisma`, archivos de permisos/entitlements, dashboard/superadmin, `campaigns/events/providers`, worker, fixtures compartidos y scripts PostgreSQL entre grupos. Conservar el orden de dependencias y ejecutar los checks del grupo. Después, integrar main en una rama autorizada resolviendo la historia real; no dar por hecho que un backport equivale a merge.

## 10. Bloqueos, despliegue y rollback

Bloqueos reales para anunciar disponibilidad completa:

1. Aprobación del release/Git y hosting comercial compatible; staging HTTPS remoto independiente aún no creado/desplegado.
2. Reply-To seguro por negocio: confirmar ACL y correlación/triage de Zoho o resolver enrutamiento. La entrega técnica y atención declarada no cubren ese requisito.
3. Claves/webhook/bajas permanentes, scheduler con supervisión y manifiesto de Contact Flow; envío sigue cerrado.
4. Aprobar/fusionar cuotas y presupuestos de **Puri** y configurar sus credenciales/snapshot de precios; Free SQL no habilita por sí solo el asistente IA.
5. Webhook auténtico de suscripciones MP pendiente, o aceptación explícita del fallback canónico con supervisión antes de cobrar/renovar automáticamente.

No hay una nueva acción DNS pendiente para `contacto.puragenda.cl`; tampoco se solicita cambiar MX de `puragenda.cl`. DNS/HTTPS del staging propuesto y eventuales dominios de sitios corresponden a una etapa remota autorizada. No marcar estas dependencias como capacidades ya operativas.

Secuencia de despliegue propuesta: aprobar commits → integración controlada de main → backup y ensayo de migraciones sobre copia independiente → desplegar staging con todos los proveedores productivos cerrados → certificar integraciones externas permitidas, routing y CPU/cadencia del scheduler → aprobar política y manifiesto → deploy de aplicación con salida comercial apagada → validar rutas permanentes y configurar webhook comercial → activar exactamente un scheduler → piloto técnico con destinatarios expresamente autorizados → aprobación final y activación comercial. Observar último éxito, cola/edad, UNKNOWN, cuotas/capacidad, supresiones y contratos sin renovación; revisar Resend Pro al primer Plus pagado.

Rollback: cerrar `CONTACT_FLOW_EXTERNAL_RELEASE` y `CONTACT_FLOW_PRODUCTION_ENABLED`, aplicar kill switch y pausar el trigger; conservar DB, colas, autorizaciones, secretos de tokens y atención de bajas/eventos tardíos. No borrar mensajes inciertos ni reiniciar contadores para reenviarlos. Apagar recovery productivo de MP si es necesario y resolver sus operaciones por recurso canónico. Restaurar la versión de aplicación compatible y variables previas; no ejecutar down migrations destructivas ni restaurar una DB vieja sobre pagos nuevos. Mantener los contratos legacy y reconciliaciones existentes. Reabrir solo tras conciliar e investigar la causa.

La siguiente etapa es una **prueba y aprobación del release con estas decisiones resueltas**, no desarrollar otro motor de campañas, correo o checkout.
