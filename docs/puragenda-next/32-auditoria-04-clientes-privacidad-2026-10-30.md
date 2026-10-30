# Puragenda Next — Auditoría 04: Clientes, privacidad y portal

Fecha de corte solicitada: 2026-10-30. Repositorio: `DiegoSalsa/Puragenda`.

## Resultado y alcance

Los nueve hallazgos originales fueron reproducidos y corregidos. El cierre de la revisión independiente sobre `d6f69cc248e308ebb3e6ee9d15d8444f5b9da56a` agrega la corrección 04-A, endurece el creador de sesiones de 04-B y corrige la elevación de sesiones durante la activación. La validación final no tiene pruebas fallidas: 2.389 casos Vitest distintos, 105 comprobaciones HTTP/navegador y dos escenarios de actualización de migraciones con 38 y 29 comprobaciones. La publicación requiere coordinar la migración y la transición de credenciales que se describen abajo; este trabajo no modifica producción.

Se trabajó exclusivamente en `fix/puragenda-next-audit-04-clients-privacy`, creada desde el SHA aprobado `aa780ac53feec66b6ed2b50b3d00511210592e52`. Se verificaron las referencias local y remota de `release/puragenda-next-rc1` contra ese SHA. La rama se publica únicamente para revisión independiente. No se modificaron `main` ni RC1 y no se hizo merge, despliegue, migración remota ni envío de correos. No se inspeccionaron cuentas ni datos personales productivos, ni se invocaron proveedores de pagos, correo, Calendar o IA durante las pruebas. El build descargó únicamente recursos públicos de fuentes mediante una excepción acotada.

## Preparación y aislamiento

El directorio original `C:/Users/diego/Desktop/agenda` tenía trabajo previo en otra rama. Se respaldaron el diff binario de los archivos versionados y 1.056 archivos no versionados antes de crear el worktree. Respaldo: `C:/Users/diego/.codex/backups/puragenda-audit04-20261030/`. La comparación SHA-256 del diff original contra `tracked.patch` al finalizar coincidió. No se restauró, revirtió ni guardó en stash ese trabajo.

Worktree de entrega: `C:/Users/diego/.codex/worktrees/puragenda-next-audit04/agenda`. Se instalaron las dependencias del lockfile sin cambiar manifiestos. Se leyeron las guías de seguridad, autenticación, cookies y Route Handlers incluidas en esta versión de Next.js y las instrucciones locales de Supabase/PostgreSQL.

Se utilizaron clústeres propios de PostgreSQL 17, accesibles únicamente por loopback: 55446 para las regresiones y 55447 para el escenario sin roles de Supabase, con bases descartables y datos sintéticos. Los ejecutores filtran el entorno y bloquean I/O externo; el staging usa secretos generados localmente en archivos ignorados y con permisos restringidos. HTTP: `127.0.0.1:3128`; HTTPS local: puerto 3448 con CA explícita, sin cambiar la confianza del sistema. El navegador bloqueó peticiones fuera de loopback. Al terminar se detuvieron únicamente el staging y los clústeres de esta auditoría.

Los fallos iniciales de reproducción se conservaron como evidencia técnica ignorada bajo `scratch/audit04/`; no forman parte de los resultados finales aprobados. No se crearon capturas, diagramas ni informes adicionales.

## 04-01 — Sesiones heredadas no revocables

**Estado: confirmado y corregido.**

- **Reproducción:** una cookie HMAC válida seguía resolviendo el correo después de logout, cambio y reset de contraseña. Un cliente legacy que consumía un magic link recibía otra credencial HMAC. Las pruebas de PostgreSQL fallaron antes de corregirlo. La lectura de perfil podía convertir una credencial antigua y prolongar su acceso.
- **Causa:** la verificación HMAC no consultaba revocaciones persistentes; revocar borraba únicamente sesiones modernas. La renovación podía extender hasta 400 días la vigencia y existía un fallback de creación después de una renovación fallida.
- **Solución:** todos los nuevos accesos, incluidos clientes sin contraseña, crean un token aleatorio `cps_` de 256 bits; PostgreSQL guarda su SHA-256. Para conservar la relación `accountId` no nula de RC1, el acceso legacy crea una cuenta pendiente con contraseña aleatoria deshabilitada; eso no activa login por contraseña. Se agregaron revocaciones por hash para cookies HMAC e invalidación por identidad al cambiar/resetear contraseña. Se preserva la expiración HMAC original de 30 días, sin conversión en lecturas de perfil. Se elimina el fallback que podía recrear acceso. Consumo de enlace y creación de sesión son atómicos; un bloqueo asesor por correo serializa creación y cambios de contraseña. El login comprueba que el hash de contraseña validado siga vigente.
- **Duración:** máximo absoluto de 90 días y 30 días de inactividad; leer/renovar actualiza actividad, nunca `expiresAt`. Estos límites también se verifican al resolver sesiones modernas anteriores de 400 días: las que excedan el límite deberán iniciar sesión nuevamente. Es una reducción intencional de exposición para un portal con historial y datos personales, sin borrado masivo de cuentas ni de sesiones durante la migración. Magic login: 15 minutos y un uso; activación/reset: 60 minutos. Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción.
- **Archivos:** `src/server/services/client-portal.service.ts`, rutas `src/app/api/client-portal/*`, accesos `src/app/mi-agenda/{entrar,activar}/[token]/route.ts`, interfaz del portal, schema y migración nueva.
- **Pruebas:** login/logout y replay, contraseña/reset y replay, cookie legacy válida/revocada, lectura sin conversión, expiración absoluta e inactiva, renovación concurrente con logout, login y magic concurrentes con cambio de contraseña, cookie segura e identidades separadas. PostgreSQL, HTTP real y navegador aprobados.
- **Residual:** una solicitud que ya fue autorizada puede terminar mientras ocurre un logout; la revocación impide accesos posteriores y la recreación de la credencial. Las instancias antiguas deben drenarse porque no conocen las revocaciones HMAC. Ver transición histórica.

## 04-02 — Titularidad ambigua de reservas

**Estado: confirmado y corregido.**

- **Reproducción:** con dos identidades sintéticas, cambiar el correo de `Client` permitía que la nueva identidad accediera a citas históricas mediante la condición OR del CRM. También se reprodujo la vinculación de una reserva pública con un CRM cuyo correo había cambiado, y la sobrescritura de atributos del cliente al declarar un correo existente.
- **Causa:** el dato de contacto mutable se trataba como autorización histórica y el alta pública actualizaba registros CRM existentes.
- **Solución:** `portalOwnerEmail` es una instantánea normalizada e inmutable de titularidad. Citas y planes legacy se inicializan desde su correo de reserva. El titular de un CRM legacy se deriva solamente de reservas con correo histórico unívoco. Consultar, cancelar y reagendar usan la misma regla, sin OR contra el correo CRM actual. Fidelización usa la misma instantánea. Triggers preservan el titular ante ediciones y rechazan asociaciones cliente/plan de otro negocio; las citas generadas heredan el titular del plan. El alta pública normaliza el correo y utiliza un upsert sin actualización de atributos existentes; si el contacto CRM ya no coincide con su titular no lo vincula ni modifica su consentimiento. La asociación operativa por correo no constituye autenticación: el portal exige prueba de control del correo.
- **Archivos:** servicio de portal, `src/server/services/booking-client.service.ts`, `src/server/booking/create-http.ts`, `src/server/actions/{appointment,recurring}.actions.ts`, `src/app/mis-premios/[clientId]/page.tsx`, schema y migración.
- **Pruebas:** dos clientes/dos negocios, historial de una identidad en varios negocios, reservas con y sin `clientId`, cambio de correo CRM y de contacto de cita, asociación legacy divergente, acceso/cancelación/reagendamiento cruzados con respuestas genéricas, triggers entre negocios y alta concurrente del mismo correo. PostgreSQL y HTTP aprobados.
- **Residual:** una migración no puede recuperar un correo histórico que ya fue sobrescrito ni inferir una identidad a partir de evidencias contradictorias. CRM ambiguos o sin historial quedan sin titular asignado automáticamente; las reservas que sí tienen instantánea conservan acceso. Cambiar el correo de contacto no transfiere titularidad. Una transferencia real exige verificación y un procedimiento explícito posterior, con trazabilidad; no se agregó una vía de transferencia sin verificar.

## 04-03 — Credenciales en campañas comerciales

**Estado: confirmado y corregido.**

- **Reproducción:** una campaña legacy invocaba la emisión de tokens de autenticación; la prueba negativa esperaba cero emisiones y falló. Un enlace comercial histórico de 30 días podía autenticar al destinatario de un reenvío.
- **Causa:** se reutilizaba un mecanismo de acceso como CTA comercial y pie de correos transaccionales/fidelización.
- **Solución:** campañas y pies genéricos enlazan a `/mi-agenda`, sin token. Se retiraron los emisores comerciales de credenciales. El magic login solicitado conserva su flujo separado, corto y de un uso. `authenticationIntent` distingue emisiones nuevas; enlaces RC1 de acceso solicitado con duración original de 15 minutos siguen siendo válidos hasta su vencimiento. Los antiguos enlaces largos de marketing/notificaciones no autentican y remiten al acceso normal. Los avisos de planes usan un identificador estable que requiere sesión.
- **Archivos:** `src/app/api/marketing/send/route.ts`, servicio de portal, `src/server/email/{send,templates}.ts`, rutas de entrada del portal y `src/app/api/cron/reminders/route.ts`.
- **Pruebas:** campaña legacy sin emisión, separación de Contact Flow V2, enlaces reenviados, token largo histórico, magic vencido/de un uso, cuenta activa y cliente legacy, portal anónimo, consentimiento y opt-out comercial. Suites general, legacy, Contact Flow y HTTP aprobadas.
- **Residual:** un enlace comercial ya canjeado pudo haber creado una sesión válida; no puede identificarse retrospectivamente su origen con el esquema anterior. Se detalla la remediación posible abajo. No se revocó ni reenvió nada en producción.

## 04-04 — Datos privados entregados a roles de Agenda

**Estado: confirmado y corregido.**

- **Reproducción:** al renderizar Agenda con un profesional con acceso propio aparecían marcadores de notas CRM, notas internas y respuestas de salud en las props serializadas. También se reproducía la carga del directorio CRM del negocio para un profesional sin permiso CRM.
- **Causa:** se confundía el acceso operativo a Agenda con autorización para cada categoría privada y se entregaban objetos completos al navegador.
- **Solución:** se filtra en servidor antes de serializar. Notas CRM requieren `clients.manage`; notas internas requieren el nuevo `appointments.notes.view`; salud requiere `health.view_own` con `staffId` coincidente o `health.view_all`, siempre dentro del alcance de negocio/Agenda autorizado. Propietario y administrador conservan acceso; recepcionista conserva CRM/notas pero no salud; profesional predeterminado y solo lectura de Agenda no reciben esas categorías. Los perfiles personalizados pueden conceder salud propia. Agenda, Hoy, recurrentes, Server Actions y APIs usan estas reglas; las APIs de citas construyen DTO con campos permitidos, sin hashes ni tokens. Escribir notas también requiere permiso. El selector CRM no se carga por disponer solamente de gestión de Agenda propia.
- **Archivos:** `src/core/permissions.ts`, `src/server/services/private-data.ts`, Agenda/Hoy/calendario/diálogos, panel recurrente, `today-dashboard.service.ts`, acciones de citas/recurrentes y `src/app/api/dashboard/appointments/**`.
- **Pruebas:** perfiles sintéticos propietario, administrador, recepcionista, profesional, permisos personalizados, solo lectura y sin CRM. Inspección de objetos de servidor y HTML/RSC HTTP, aislamiento por profesional, API sin campos privados y regresión Puri/MCP. No se basó la aprobación en ocultación visual. Todas aprobadas.
- **Residual:** los perfiles personalizados existentes no obtienen permisos sensibles por inferencia; un administrador debe concederlos expresamente cuando proceda. El permiso de categoría nunca amplía por sí solo el negocio o las citas autorizadas.

## 04-05 — Consentimiento de salud implícito

**Estado: confirmado y corregido.**

- **Reproducción:** una petición que omitía `healthAccepted` devolvía 201 por el default `?? true`. Una segunda prueba demostró que un formulario abierto antes de cambiar sus preguntas podía aceptarse sin reconocer el nuevo contenido.
- **Causa:** el servidor inventaba aceptación y no asociaba el envío con una versión del texto y preguntas.
- **Solución:** API y Server Action exigen el booleano `true`, versión actual y revisión SHA-256 de las preguntas configuradas. El widget envía estos valores. Se almacena fecha del servidor, versión `health-form-2026-10-30-v1` e instantánea del texto localizado mostrado, idioma, preguntas y revisión. El texto de la casilla y de la evidencia comparten la misma fuente. Un formulario desactualizado debe recargarse y aceptarse nuevamente. Si el plan no requiere salud se descartan respuestas no solicitadas; no se crea evidencia artificial. Un trigger rechaza nuevas altas que requieren salud y no contienen evidencia. No se inventa evidencia para registros anteriores ni se impide su actualización operativa.
- **Archivos:** ruta `src/app/api/widget/[slug]/book-recurring/route.ts`, `recurring.actions.ts`, widget, `src/core/health-consent.ts`, `src/server/services/health-consent.ts`, validación de booking, schema y migración.
- **Pruebas:** omitido, falso, string manipulado, verdadero con evidencia, versión/preguntas obsoletas, idioma, plan sin formulario, alta SQL sin evidencia y contrato legacy. PostgreSQL, HTTP y prueba de actualización desde RC1 aprobados.
- **Residual:** la evidencia acredita lo mostrado y enviado; no sustituye una valoración jurídica del consentimiento ni prueba la veracidad de las respuestas. No se añadió información clínica fuera de las capacidades existentes. Los widgets antiguos deben refrescar para enviar versión y revisión.

## 04-06 — HTML sin escape en correos de salud

**Estado: confirmado y corregido.**

- **Reproducción:** un enlace HTML sintético en preguntas/respuestas y en un motivo de rechazo aparecía como etiqueta activa en el HTML final.
- **Causa:** interpolación directa de contenido controlado por usuarios en plantillas HTML.
- **Solución:** escape de preguntas, respuestas, comentarios y campos próximos controlados por usuarios, incluidos nombres, direcciones y rechazos. Se conserva el contenido textual y la estructura visual; no se intenta sanearlo eliminando información legítima. El asunto sigue siendo texto, sin doble escape HTML.
- **Archivos:** `src/server/email/templates.ts`, pruebas de HTML y actualización de expectativa de plantilla próxima.
- **Pruebas:** etiquetas/enlaces, caracteres especiales, comillas, Unicode y texto largo en HTML generado; pruebas de envíos con proveedor simulado. Aprobadas.
- **Residual:** los correos de revisión de salud siguen entregando el contenido necesario al responsable del negocio definido por la funcionalidad existente. El canal correo no ofrece revocación de copias ya recibidas; no se ampliaron sus destinatarios.

## 04-07 — Indicador de citas completadas

**Estado: confirmado y corregido.**

- **Reproducción:** un cliente con seis citas, dos `COMPLETED` y estados `PENDING`, `CHECKED_IN`, `CANCELLED` y `NO_SHOW`, no recibía dos completadas.
- **Causa:** se contaban citas `CHECKED_IN` para `completedAppointments`.
- **Solución:** consulta filtrada por `COMPLETED`; total, filtros, paginación e historial almacenado conservados.
- **Archivos:** `src/server/services/client.service.ts`, `tests/server/client-list.service.test.ts` y suite PostgreSQL de esta auditoría.
- **Pruebas:** conteo exacto con todos los estados y regresiones del listado. Aprobadas.
- **Residual:** no se reescribieron estadísticas ni estados históricos; el indicador refleja los estados que realmente existen.

## 04-08 — Gestión duradera de planes por enlace

**Estado: confirmado y corregido.**

- **Reproducción:** un enlace reenviado con el correo correcto permitía leer un plan sin sesión; las acciones de pausa/cancelación tampoco exigían autenticación. Las pruebas negativas de reanudación también mostraron que la ruta procesaba solicitudes anónimas.
- **Causa:** se trataba el localizador duradero y un correo declarado como autenticación.
- **Solución:** página, GET y acciones exigen sesión del titular inmutable. El correo enviado es solo una comprobación adicional. Se admiten localizadores legacy para el titular autenticado hasta su expiración explícita o, si no existe, hasta 30 días después del fin del plan. Los nuevos enlaces rotados guardan hash, vencen a 30 días y pueden revocarse; rotar elimina el token antiguo. El portal y nuevas notificaciones usan el ID estable del plan bajo autenticación. No se serializa el token en `PlanClient`. Las acciones `rotate-link` y `revoke-link` permiten gestionar el enlace; revocarlo no elimina la facultad del titular de entrar desde su portal autenticado. Pausa/reanudación/cancelación bloquean plan y citas dentro de una transacción serializable, preservan abonos aprobados e historial cancelado y ejecutan efectos externos después del commit.
- **Archivos:** `src/server/services/portal-plan.service.ts`, rutas/páginas `src/app/{api/mi-plan,mi-plan}/[token]/**`, alta recurrente, portal, cron, schema y migración.
- **Pruebas:** anónimo, correo incorrecto, otra identidad, localizador válido/vencido/revocado/rotado, plan legacy, pausa/reanudación/cancelación, concurrencia sin citas duplicadas y protección de abonos aprobados. PostgreSQL y HTTP aprobados.
- **Residual:** los enlaces antiguos permanecen en mensajes o historiales; dejan de ser credenciales suficientes. No se inspeccionaron políticas de retención de URLs en infraestructura. No se probó entrega real de email ni Calendar por la prohibición de invocar proveedores; sus contratos se cubrieron con simulación/regresiones.

## 04-09 — Dirección y zona horaria multisucursal

**Estado: confirmado y corregido.**

- **Reproducción:** una cita de sucursal en Isla de Pascua mostraba la dirección y zona horaria de la casa matriz en el HTML del portal.
- **Causa:** se formateaba con los campos generales del negocio.
- **Solución:** reutilización de `resolveAppointmentVenue` de auditoría 02 con datos de la sucursal correspondiente y fallback para citas legacy sin sucursal. Se mantienen los instantes UTC almacenados.
- **Archivos:** `src/app/mi-agenda/page.tsx`, selección del servicio de portal y `tests/server/audit04-portal-venue.test.ts`.
- **Pruebas:** render de sucursal y fallback, Santiago, Isla de Pascua, Punta Arenas, invierno y ambos lados de la transición DST del 6 de septiembre. Se verifican horas esperadas fijas y que el instante UTC no cambie. HTTP, regresiones de Agenda, localización y correos aprobados.
- **Residual:** depende de la configuración correcta de zona/dirección de cada sucursal; no se modificaron configuraciones ni instantes históricos.

## Verificaciones transversales y defectos adicionales reproducidos

### Límites distribuidos y confianza de IP

Dos limitadores en memoria con idéntica configuración aceptaron dos presupuestos independientes. En una conexión directa sin proxy confiable también se reprodujo la evasión cambiando `X-Forwarded-For`. Esto demuestra límites por instancia y el riesgo fuera de un proxy controlado; no demuestra spoofing real en Vercel. Su documentación describe el tratamiento de las cabeceras de IP por el proveedor. [Vercel: Request headers](https://vercel.com/docs/headers/request-headers).

Los limitadores de autenticación/email del portal pasan a `ApiRateLimitBucket` en PostgreSQL, ya existente: presupuesto compartido y actualización atómica, sin servicio pago. En Vercel se utiliza la cabecera del proveedor con `VERCEL=1`; fuera de Vercel solo se confían cabeceras si `TRUST_PROXY_HEADERS=1`. Sin esa configuración se usa un presupuesto común `unknown`; ante fallo del almacenamiento se devuelve 503. La prueba PostgreSQL distribuye llamadas concurrentes entre instancias y verifica un solo presupuesto. Un proxy propio debe eliminar cabeceras aportadas por clientes antes de habilitar esa confianza. Otros consumidores legacy del limitador en memoria permanecen por instancia; no se declara resuelto globalmente ese comportamiento fuera del portal.

### Salidas de datos y acceso directo a tablas

Se inspeccionaron consultas y DTO del portal, HTML/RSC de Agenda, rutas de citas/planes, Puri/MCP, enlaces de correos y logs. Los datos operativos de contacto se conservan para usuarios autorizados a atender la cita; notas CRM/salud no se añaden por disponer de ese acceso. El portal no entrega formularios de salud ni notas de uso interno. Las respuestas cruzadas no distinguen información privada. No se añadieron tokens a analítica ni se capturaron datos reales. Las rutas privadas continúan sujetas a cookies/autorización del servidor.

Se reprodujo que logs de email incluían destinatarios o payloads del proveedor. Se sustituyeron por mensajes genéricos sin correo, nombre, código de premio ni error bruto. Pruebas de éxito y error verifican que esos marcadores no se registren. Esto no certifica retrospectivamente los logs productivos ni la retención de las URLs de acceso en proxies.

Se simuló localmente el escenario de grants públicos documentado por Supabase: `anon` podía leer filas sintéticas de tablas legacy antes de la corrección. La nueva migración habilita RLS y revoca privilegios de `PUBLIC`, `anon` y `authenticated` en `Client`, `Appointment` y `RecurringBooking`, además de las dos tablas nuevas de control de sesiones. No se conceden políticas públicas de lectura de clientes. El widget sigue operando mediante servidor. La aplicación Prisma debe usar su rol de servidor propietario/con bypass de RLS, igual que para otras tablas privadas; el scope por negocio sigue siendo responsabilidad del servidor. Se comprobaron grants/RLS después de aplicar todas las migraciones. Esto confirma el defecto bajo esa configuración de grants, no afirma haber encontrado esa configuración en producción. [Supabase: Row Level Security y grants](https://supabase.com/docs/guides/database/postgres/row-level-security).

### Integridad CRM y concurrencia

- Reemplazar credenciales de un registro pendiente dejaba válido el enlace de activación anterior: reproducido y corregido invalidando enlaces de activación previos bajo el bloqueo de identidad.
- El RUT chileno validaba estructura pero no dígito verificador: reproducido y corregido con módulo 11 para nuevas escrituras chilenas. Se conserva el documento internacional legacy al editar campos no relacionados.
- Un visitante que usaba un correo existente no debe sobrescribir nombre, teléfono o RUT de la identidad CRM: ahora el alta no actualiza esos campos. Si se editó el contacto CRM tampoco se le añade una reserva de otra identidad ni su opt-in.
- Se reprodujo la carrera de creación concurrente del mismo correo normalizado; se maneja `P2002` leyendo el registro ganador confirmado. No se crean dos clientes por esa carrera. No se fusionaron duplicados históricos con distinta capitalización ni identidades ambiguas.
- Actualizaciones parciales concurrentes de notas y RUT preservan ambos cambios; otro negocio no puede editar el cliente. La edición simultánea del mismo campo mantiene la semántica vigente de última escritura; no se diseñó un CRM nuevo con versionado de notas.
- Regresiones de pagos, abonos, historial, Calendar, fidelización, Gift Cards, Contact Flow, marketing legacy, recurrentes y MCP completadas con proveedores simulados/bloqueados.

## Cierre de revisión independiente: 04-A, 04-B y activación

### 04-A — Roles opcionales de PostgreSQL

**Estado: confirmado y corregido.** La migración 04 original falló en PostgreSQL real cuando `anon` y `authenticated` no existían. El log del servidor identificó `role "anon" does not exist`; Prisma abortó `20261030120000_client_portal_privacy` dentro de su transacción. La reproducción se ejecutó antes de cambiar el SQL.

Se conserva `REVOKE ... FROM PUBLIC` incondicional para las cinco tablas sensibles y se comprueba cada rol por separado en `pg_catalog.pg_roles` antes de revocar sus privilegios. Se mantienen RLS, triggers, columnas, backfill e índices. La migración no crea roles ni elimina datos. [PostgreSQL 17: REVOKE y privilegios de PUBLIC](https://www.postgresql.org/docs/17/sql-revoke.html).

Se amplió `scripts/test-audit-04-migrations.mjs`: verifica grants públicos y por defecto, prueba acceso con un rol público sintético, comprueba RLS, compara todas las columnas y filas históricas de clientes, citas, planes, cuentas y sesiones, y verifica ausencia de drift. Resultado: 38 comprobaciones con ambos roles existentes y grants concedidos; 29 con ambos roles ausentes al aplicar 04. La migración 03 tiene el mismo blob que en RC1.

La reconstrucción local del historial congelado anterior a RC1 necesita roles transitorios: el primer ensayo detectó que `20261022180000_commercial_migration_web_plus` ya los referenciaba. Para el caso sin roles, el ejecutor parte de un clúster propio que no los tiene, reconstruye RC1 con esos roles de fixture y elimina sus grants/roles **antes** de ejecutar la migración 04; comprueba explícitamente su ausencia en ese punto y al terminar. No se alteró ninguna migración histórica ni se presenta esto como una certificación de que todo el historial antiguo puede arrancar desde cero sin roles. Sí se verificó la transición de un esquema RC1 completo sin ellos y, en el otro escenario, la reconstrucción completa desde legacy hasta el estado final.

Archivos: migración 04, ejecutor de migraciones y runner `scripts/test-audit-04.mjs`. No se agregó otra migración ni se aplicó ninguna remotamente. Como el SQL de 04 cambió durante revisión y antes de su aprobación, una base local descartable que ya registró su checksum anterior debe reconstruirse; no se propone editar checksums ni el historial de una base real.

### 04-B — Prueba de credenciales al crear sesiones

**Estado: secuencia atribuida a las rutas descartada en el SHA revisado; creador de sesiones endurecido frente al riesgo reproducido.** Se inspeccionaron `profile/password/route.ts` y `reset-password/route.ts`: ambas ya borraban la cookie y exigían un login nuevo; no llamaban a un creador de sesión después de cambiar la contraseña. Las pruebas HTTP nuevas comprueban que la respuesta no emite un `cps_` y que no queda una fila de reemplazo. Se conserva este comportamiento.

Sí se reprodujo la variante a nivel de servicio: después del reset A y de un reset B más reciente, una llamada retrasada a `createClientPortalAccountSession(email)` aún podía emitir una sesión, porque su comprobación de hash era opcional. La prueba negativa falló antes de corregirlo. Ahora el creador exportado exige, en tipos y en ejecución, el hash exacto de la credencial que el llamador verificó. Dentro de la transacción y del bloqueo por identidad se compara con el hash vigente y con la activación de la cuenta. Un hash anterior, incluso después de volver a elegir la misma contraseña, no equivale al nuevo hash bcrypt. La llamada sin prueba también se rechaza. Los magic links siguen consumiendo su prueba de un uso y creando la sesión dentro de la misma transacción.

No se agregó una sesión automática al cambio/reset. Se conserva la revocación atómica de sesiones modernas, época HMAC y tokens pendientes. El acceso local de demo se adapta al consumo atómico de un magic link y conserva su bloqueo en producción; el ejecutor de QA de Puri pasa la prueba de su fixture. Estas adaptaciones son los únicos cambios fuera del servicio y sus pruebas necesarios por el contrato más estricto.

Pruebas PostgreSQL nuevas: dos resets concurrentes; cambio y reset concurrentes; creación/login frente a rotación en ambos órdenes; llamada retrasada sin prueba y con hash anterior; rechazo de contraseñas/enlaces previos; rollback total ante un fallo real de PostgreSQL después de comenzar la revocación. Las carreras usan conexiones independientes, mantienen el bloqueo real y esperan a observar ambas operaciones en `pg_locks` antes de liberarlo. Se comprobó que una emisión anterior queda revocada o que una emisión posterior con prueba obsoleta se rechaza, sin sesiones huérfanas. Los fallos SQL de prueba son triggers temporales exclusivos de la base sintética y se retiran al finalizar cada caso.

### Sesiones anteriores a la activación

**Estado: confirmado y corregido.** Una sesión `cps_` emitida por magic link mientras `emailVerifiedAt` era nulo comenzaba a resolver una cuenta verificada después de activar esa cuenta, sin cambiar de credencial. También falló el intercalado concurrente entre activación y consumo de un magic link anterior.

`verifyClientPortalAccount()` ahora invalida sesiones modernas, credenciales HMAC previas y enlaces pendientes **en la misma transacción** que establece `emailVerifiedAt`, conservando el bloqueo por identidad. La ruta de activación sigue borrando la cookie y solicitando un acceso nuevo. Los clientes legacy conservan el portal y pueden solicitar un magic link nuevo después de activar; el nuevo acceso puede consultar la cuenta verificada. No se convierten credenciales antiguas silenciosamente.

Se probaron replay de activación, cookie previa rechazada, enlaces magic pendientes invalidados, nuevo login legítimo, nuevo magic legítimo y rollback de `emailVerifiedAt`/consumo de token si PostgreSQL no logra revocar una sesión. La prueba TCP incluye registro real con email mock, activación, login y recuperación; los tokens de activación/reset usados por el ejecutor son fixtures controlados y no se recuperan de logs ni de proveedores externos.

### Archivos del cierre y resultados

El cierre modifica diez archivos respecto del SHA revisado: migración 04; servicio de portal; ruta local de demo; pruebas PostgreSQL de privacidad; prueba unitaria del servicio; scripts de migraciones, runner de auditoría, HTTP de privacidad y QA de Puri; y este informe. No modifica las rutas de cambio/reset porque ya aplicaban la política segura de cerrar acceso. Los nueve hallazgos originales se conservan corregidos.

La reproducción previa produjo tres fallos esperados entre 55 casos: creador sin prueba, elevación tras activación y su carrera con magic. Después se agregó una comprobación de rollback de activación: los **56 casos PostgreSQL de Auditoría 04** pasan en la regresión comercial completa. La primera comprobación TypeScript detectó un llamador antiguo en QA de Puri; se adaptó y se repitieron los controles. No se cuenta esa ejecución fallida como aprobada.

## Evidencia final de pruebas

### Casos Vitest sin doble conteo

| Ejecución final | Aprobadas en esa ejecución | Omitidas por guarda | Aporte distinto al total |
| --- | ---: | ---: | ---: |
| General: 275 archivos, 256 ejecutados | 1.818 | 571 | 1.818 |
| Comercial PostgreSQL completo, incluye auditorías 01/03/04 y Contact Flow | 399 | 0 | 399 |
| Booking/Agenda PostgreSQL | 97 | 0 | 60 |
| MCP PostgreSQL y seguridad | 53 | 0 | 27 |
| Legacy PostgreSQL: marketing, fidelización, Gift Cards y planes | 85 | 0 | 85 |
| **Total distinto ejecutado y aprobado** | | | **2.389** |

Los 37 casos compartidos de booking y los 26 casos compartidos de MCP ya están en la suite general. Las 571 omisiones de la ejecución general corresponden exactamente a los 399 + 60 + 27 + 85 casos posteriormente ejecutados en bases aisladas. No se suman reruns, ni los 56 casos de esta auditoría otra vez: ya están dentro de los 399 comerciales. Fallidas al cierre: **0**. No quedan casos omitidos de esta colección después de las ejecuciones condicionales.

### HTTP, navegador y migraciones

| Ejecutor | Comprobaciones aprobadas |
| --- | ---: |
| Bootstrap: alta anual, servicio, profesional, sucursal, booking idempotente, web | 6 |
| Auditoría 02: Agenda, disponibilidad, fechas bloqueadas, alcance | 14 |
| Auditoría 03: servicios, profesionales, historial y abonos | 13 |
| RC1/Contact Flow: HTTPS, autenticación, aislamiento, consentimiento, worker y replay | 19 |
| Auditoría 04: HTML/RSC, registro, activación, sesiones, planes, consentimiento | 49 HTTP + 4 navegador |
| **Total HTTP/navegador** | **105** |
| Actualización de migraciones RC1 → auditoría 04 con roles y grants | **38** |
| Actualización de migraciones RC1 → auditoría 04 sin roles | **29** |

El resultado RC1 incluye además una medición informativa de duración del worker; no se contó como prueba adicional. La E2E gráfica sí se ejecutó: Chrome headless mediante Playwright, viewport 390×844, login real, citas autorizadas sin marcadores privados, ausencia de overflow horizontal, logout sin cookie y acceso visual al formulario legacy sin contraseña. No se tomaron capturas. El envío real del email no se ejecutó.

El staging final se preparó de nuevo para ejecutar toda la secuencia sobre fixtures limpios. Reutilizar antes un fixture con fecha ya bloqueada produjo un fallo del ejecutor de Agenda; no se contó esa ejecución como aprobada. El runner antiguo de booking hacía `db push` sin los nuevos triggers: se corrigió para instalar las guardas reales de la migración y se repitieron los 97 casos y los 53 de MCP. La excepción de fuentes del build se limitó a HTTPS en `fonts.googleapis.com` y `fonts.gstatic.com`; APIs de proveedores permanecen bloqueadas y hay pruebas negativas de esa guarda. Los fallos iniciales de reproducción de los nueve defectos y estas incidencias de preparación no se ocultan como éxitos finales.

### Compilación y controles

- `prisma generate` y `prisma validate`: aprobados con entorno local sintético.
- `next typegen` y `tsc --noEmit`: aprobados, sin errores.
- ESLint: 0 errores, 32 advertencias preexistentes; no se presentan como cero advertencias.
- Build de producción aislado `next build --webpack`: aprobado, incluyendo prerender y rutas; ningún secreto de proveedor cargado.
- Protección de despliegue: 23 pruebas aprobadas, ya incluidas en las 1.818 generales. La rama auditora está bloqueada por Vercel, wrapper de build y workflow de seguridad; las protecciones anteriores permanecen.
- Revisión de secretos del cambio completo: lectura de cambios de autenticación/env, patrones de claves privadas/API/tokens, rutas privadas y diff revisados; cero coincidencias de credenciales y ningún `.env`, archivo `*.private.json` ni clúster local incluido en Git. Es revisión del cambio, no un escaneo de cuentas externas.
- `git diff --check`: aprobado. Migración de auditoría 03 sin diferencias respecto del SHA base. Referencia RC1 local/remota verificada de nuevo.

Los logs y JSON técnicos de ejecución se conservan ignorados en `scratch/audit04/` (el cierre usa `closure/`), `scratch/audit-03/`, `scratch/rc1-20261029/` y en el staging local. No se incorporan datos ni credenciales sintéticas del entorno a los commits.

### Repetición local

Ejecutar desde el worktree con PostgreSQL descartable propio, nunca con URL remota. Los runners validan host loopback y nombre de base de pruebas. Las regresiones completas utilizan los roles locales `anon` y `authenticated`, necesarios para reconstruir el historial anterior. El escenario sin roles exige otro clúster propio que inicialmente no los tenga y realiza la transición explicada en 04-A. Los clústeres de esta ejecución quedaron detenidos.

```powershell
$env:COMMERCIAL_V2_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55446/puragenda_commercial_test_audit04'
node scripts/test-audit-04.mjs general
node scripts/test-audit-04.mjs commercial
node scripts/test-audit-04.mjs booking
node scripts/test-audit-04.mjs mcp
node scripts/test-audit-04.mjs legacy
node scripts/test-audit-04.mjs migrations
node scripts/test-audit-04.mjs verify
$env:COMMERCIAL_V2_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55447/puragenda_commercial_test_audit04'
node scripts/test-audit-04.mjs migrations --without-supabase-roles
```

El modo `postgres` ejecuta solamente los 56 casos PostgreSQL de Auditoría 04; `verify` encadena Prisma generate/validate, typegen, TypeScript y ESLint con entorno filtrado. Para HTTP se debe usar nuevamente la URL del clúster de regresiones, crear un staging fresco con `node scripts/prepare-next-staging.mjs --prepare-local`, iniciar `node scripts/run-next-staging.mjs` y ejecutar en orden `scripts/bootstrap-next-staging-http.mjs`, `scripts/test-next-staging-agenda.mjs`, `scripts/test-next-staging-services-staff.mjs` y `scripts/test-next-staging.mjs`, seguidos de `node --import tsx scripts/test-next-staging-clients-privacy.mjs --browser`. No reutilizar fixtures alterados para la secuencia completa. El último script admite `AUDIT04_PLAYWRIGHT_MODULE` para resolver un módulo Playwright ya instalado; en esta máquina se utilizó el runtime local de Codex y Chrome disponible. No se agregó una dependencia al producto.

Compilación: `node scripts/build-commercial-isolated.mjs --webpack` con la misma URL de pruebas y sin archivos `.env` ambientales. TypeScript y Prisma deben recibir exclusivamente las URLs locales y secretos sintéticos, como en los runners; no cargar el entorno original del usuario.

## Migración, despliegue coordinado y reversión

Única migración agregada: `prisma/migrations/20261030120000_client_portal_privacy/migration.sql`. `20261029180000_preserve_service_staff_history` permanece intacta.

La nueva migración es transaccional y aditiva: agrega columnas, índices, tablas de identidad/revocación, instantáneas y guardas; rellena titularidad desde reservas y endurece acceso público. No elimina citas, clientes, pagos, planes ni fidelización. No cambia la nulabilidad de `ClientPortalSession.accountId`. Los contratos legacy mantienen su `healthAccepted` original sin fecha, versión ni evidencia fabricada. Se verificaron preservación de todas las columnas históricas, ambigüedades, RLS/grants y ausencia de drift Prisma en ambos escenarios de 04-A: 38/38 con roles y 29/29 sin ellos al aplicar 04.

Procedimiento de publicación futura, **no ejecutado aquí**:

1. Respaldar la base y revisar el plan de aplicación con un rol servidor apropiado. Verificar que integraciones legítimas no consulten directamente tablas privadas como `anon`/`authenticated`; la app probada lo hace por servidor.
2. Aplicar la migración antes del código nuevo. El backfill y los cambios de privilegios requieren una ventana controlada y revisar volumen/bloqueos en el entorno de destino; no se extrapola el tiempo de una base sintética a producción.
3. Publicar conjuntamente el servidor y widget nuevos. Drenar o restringir accesos a despliegues antiguos de portal/gestión de planes: RC1 ignora revocaciones HMAC y mantiene reglas antiguas. Los nuevos envíos de salud requieren refrescar formularios abiertos antes del cambio.
4. Verificar sesiones, titularidad, roles, RLS y acciones con cuentas de prueba autorizadas del entorno, sin exportar datos personales. Revisar los casos históricos descritos abajo antes de declarar terminada la transición.

Reversión segura: detener las nuevas entradas si hay una incidencia, conservar las columnas/instantáneas/evidencia y corregir hacia adelante. No eliminar la evidencia de consentimiento ni las revocaciones para volver a RC1. Un rollback de código a RC1 reabre fallos confirmados y no respeta la nueva política de sesión/planes; requeriría restringir esos accesos hasta restaurar un servidor seguro. La estructura aditiva evita pérdida histórica, pero no convierte un runtime antiguo en seguro. No se creó ni ejecutó un down migration destructivo.

## Credenciales históricas distribuidas y remediación de lanzamiento

| Credencial o identidad histórica | Comportamiento con esta entrega | Tratamiento durante el lanzamiento |
| --- | --- | --- |
| Magic solicitado RC1 de 15 minutos no consumido | Se acepta una vez hasta su vencimiento original y emite sesión moderna | Mantener este acceso legítimo; no prolongar el enlace |
| Link de marketing/pie transaccional largo de 30 días | No autentica; el destinatario utiliza el acceso normal y solicita un enlace corto | No reenviar campañas ni ejecutar revocaciones masivas; asegurar que las instancias antiguas no sigan canjeándolo |
| Cookie HMAC ya emitida | Conserva vencimiento original; logout guarda revocación por hash; cambio/reset/activación invalida por identidad | No renovar ni convertir silenciosamente. Retirar runtime antiguo que ignora esos controles |
| Sesión magic anterior a la activación | La activación la revoca junto a los enlaces pendientes | Solicitar un login o magic nuevo; no heredar acceso de cuenta verificada con la cookie previa |
| Cookie surgida del canje de una campaña antigua | El esquema anterior no identifica su origen | Si se identifica un incidente o un grupo afectado, justificar e invalidar su época por identidad mediante un procedimiento autorizado; no asumir que todas las sesiones están comprometidas |
| Sesión moderna anterior de hasta 400 días | Se aplican límites de 90 días absolutos/30 de inactividad | Avisar del posible nuevo login; no borrar cuentas ni historial |
| Localizador legacy de plan | Requiere sesión del titular; vencimiento explícito o fin del plan + 30 días | El titular puede entrar con ID estable desde su portal y rotar/revocar el enlace; no enviar credenciales nuevas masivamente |
| CRM sin evidencia o con correos históricos contradictorios | No recibe titularidad inventada ni transferencia por editar contacto | Reconciliación dirigida y verificada, preservando historial/pagos/fidelización; una transferencia debe auditarse y verificar la identidad destinataria |

No se inspeccionaron ni modificaron credenciales, filas o logs productivos para preparar estas medidas. Una remediación dirigida necesita autorización y evidencia del entorno de destino. Tampoco se rotó `AUTH_SECRET` globalmente: eso invalidaría otras credenciales sin distinguir los casos afectados.

## Límites de la aprobación

La aprobación corresponde al código y a los escenarios locales ejecutados. Quedan fuera la configuración efectiva de grants del proyecto remoto, retención de logs/URLs, permisos del rol remoto, revisión legal del consentimiento y entrega real de proveedores. Las incertidumbres históricas no se resuelven fabricando evidencia o reasignando titulares por correo CRM. Los limitadores en memoria fuera del portal conservan su limitación distribuida. Estos puntos y la coordinación de publicación deben atenderse en el entorno de lanzamiento; no se reportan como operaciones ya realizadas.

## Entrega Git e inventario

La entrega inicial comprende siete commits hasta `d6f69cc`, que fue publicado y revisado independientemente. El cierre agrega tres commits: `f97f036` para 04-A, `0913b77` para sesiones/activación y sus pruebas, y la actualización de este informe. Total: diez commits sobre RC1. El SHA completo final se entrega en la respuesta de cierre, evitando una autorreferencia imposible dentro del propio commit. La publicación se limita a esta rama, sin force push, merge, despliegue ni integración en RC1; queda congelada para aprobación definitiva.

Total: **82 archivos agregados o modificados respecto de RC1**, incluido este único informe. El cierre añade al inventario la adaptación de demo y del ejecutor QA de Puri al contrato de sesiones. No se modificaron manifiestos/lockfile ni se incorporó `scratch`. Inventario completo:

```text
.github/workflows/security.yml
docs/puragenda-next/32-auditoria-04-clientes-privacidad-2026-10-30.md
prisma/migrations/20261030120000_client_portal_privacy/migration.sql
prisma/schema.prisma
scripts/build-commercial-isolated.mjs
scripts/next-staging-network-guard.mjs
scripts/puri-plus-browser-qa.ts
scripts/test-audit-04-migrations.mjs
scripts/test-audit-04.mjs
scripts/test-booking-api-local.mjs
scripts/test-commercial-postgres.mjs
scripts/test-next-staging-clients-privacy.mjs
scripts/vercel-build.mjs
src/app/api/client-portal/forgot-password/route.ts
src/app/api/client-portal/login/route.ts
src/app/api/client-portal/profile/password/route.ts
src/app/api/client-portal/profile/route.ts
src/app/api/client-portal/register/route.ts
src/app/api/client-portal/request-link/route.ts
src/app/api/client-portal/reset-password/route.ts
src/app/api/client-portal/verify/route.ts
src/app/api/cron/reminders/route.ts
src/app/api/dashboard/appointments/[id]/route.ts
src/app/api/dashboard/appointments/route.ts
src/app/api/marketing/send/route.ts
src/app/api/mi-plan/[token]/actions/route.ts
src/app/api/mi-plan/[token]/route.ts
src/app/api/widget/[slug]/book-recurring/route.ts
src/app/dashboard/agenda/page.tsx
src/app/dashboard/appointment-detail-dialog.tsx
src/app/dashboard/appointment-editor.tsx
src/app/dashboard/recurring/page.tsx
src/app/dashboard/recurring/recurring-client.tsx
src/app/dashboard/today-screen.tsx
src/app/dashboard/weekly-calendar.tsx
src/app/mi-agenda/activar/[token]/route.ts
src/app/mi-agenda/client-portal-client.tsx
src/app/mi-agenda/demo/route.ts
src/app/mi-agenda/entrar/[token]/route.ts
src/app/mi-agenda/page.tsx
src/app/mi-plan/[token]/page.tsx
src/app/mi-plan/[token]/plan-client.tsx
src/app/mis-premios/[clientId]/page.tsx
src/app/widget/[slug]/page.tsx
src/app/widget/[slug]/widget-client.tsx
src/core/countries.ts
src/core/health-consent.ts
src/core/permissions.ts
src/server/actions/appointment.actions.ts
src/server/actions/recurring.actions.ts
src/server/booking/create-http.ts
src/server/email/send.ts
src/server/email/templates.ts
src/server/lib/distributed-rate-limit.ts
src/server/lib/rate-limit.ts
src/server/services/booking-client.service.ts
src/server/services/client-portal.service.ts
src/server/services/client.service.ts
src/server/services/health-consent.ts
src/server/services/portal-plan.service.ts
src/server/services/private-data.ts
src/server/services/today-dashboard.service.ts
src/server/validations/booking.ts
src/server/validations/client-portal.ts
tests/core/client-portal-email.test.ts
tests/core/countries.test.ts
tests/integration/clients-privacy-postgres.integration.test.ts
tests/server/audit04-agenda-serialization.test.ts
tests/server/audit04-consent.route.test.ts
tests/server/audit04-email-logs.test.ts
tests/server/audit04-email.test.ts
tests/server/audit04-network-guard.test.ts
tests/server/audit04-portal-venue.test.ts
tests/server/audit04-private-data.test.ts
tests/server/audit04-rate-limit.test.ts
tests/server/client-list.service.test.ts
tests/server/client-portal.service.test.ts
tests/server/email-send.test.ts
tests/server/loyalty-portal-access.test.ts
tests/server/marketing-v2-separation.test.ts
tests/server/rc1-deployment-safety.test.ts
vercel.json
```
