# Puragenda Next — certificación operativa para lanzamiento

Fecha: 3 de noviembre de 2026. **NO-GO — BLOQUEANTE REAL.**

Existe un staging remoto funcional y protegido. Esto no autoriza producción: faltan CI efectivo, certificación de contratación/pagos sandbox y parte de los recorridos remotos. Calendar conserva su configuración productiva; no se deshabilitó ni se declara defectuoso por falta de cuenta de prueba.

## Referencias y alcance

| Referencia | SHA |
|---|---|
| Producción / `main` | `e74c92237e47db43425a7d47209520967e51bfb0` |
| `release/puragenda-next-rc1` | `a3fd2a35480d8152a33550d42e510291a49664a7` |
| Código del Preview certificado | `40b455b095dce882967e308c8839e23c1611f840` |
| Rama correctiva | `fix/puragenda-next-final-launch-blockers`; la entrega documental posterior conserva el runtime del SHA anterior |

Publicación de la rama correctiva solamente; comparada con RC1, relación lineal sin divergencia. No se integró a RC1 ni a main. Los resultados de las auditorías anteriores y del informe de preproducción son antecedentes, no nuevas ejecuciones. Evidencia estructurada en [el registro existente](evidence/rc1-final-launch-evidence-2026-11-03.json); preparación/configuración en [el plan existente](rc1-final-launch-external-plan-2026-11-03.json).

## Infraestructura real

- Producción: [purocode-projects/puragenda](https://vercel.com/purocode-projects/puragenda), proyecto `prj_4fJ3eJ9v7fyPSsPNl5pvIdi8W2Ti`. Ready en el main indicado. Ignored Build Step continúa **Only build production**. No se modificaron variables, DNS, dominio, base, proveedores o deployment productivos durante esta certificación.
- Staging: [puragenda-next-staging](https://vercel.com/purocode-projects/puragenda-next-staging), proyecto `prj_ma5nkDSDzQGBCFMhroTTzsGi07YD`, sin Git conectado ni variables compartidas. Node 24.x; build machine Basic fijo, 2 vCPU / 8 GB. El panel/API discrepó inicialmente con el dato anterior de Node: se corrigió exclusivamente staging desde 26.x a 24.x.
- URL de aplicación: **[staging protegido](https://project-8xjzo.vercel.app/login)**. Deployment [dpl_BkxGsTrcMTeQ1oWrLiRgf5RtYpz8](https://vercel.com/purocode-projects/puragenda-next-staging/BkxGsTrcMTeQ1oWrLiRgf5RtYpz8), Ready. API `target: staging`; los wrappers verificaron `VERCEL_ENV=preview`. No es Production del proyecto Puragenda.
- Protección: Vercel Authentication **All Deployments**, comprobada con peticiones sin cookies: tanto alias como URL inmutable redirigen a `vercel.com/sso-api`. Standard dejó el alias público durante una comprobación inicial; se retiró inmediatamente, se reforzó sólo staging y se volvió a vincular. Había datos exclusivamente sintéticos, sin credenciales de proveedores. No presentar esa primera comprobación como aprobada.
- Artefacto exclusivo de staging: cron vacío, Git deployment desactivado, noindex, install/build bloqueados antes de ejecutar npm si el proyecto o `VERCEL_ENV` no coinciden. Configuración productiva versionada conservada. El adapter Vercel recibe `.next-websites-qa`, igual al `distDir` efectivo de Next.
- 50 variables, sólo Preview; ocho sensibles. Secretos de sesión, cron, worker, Contact Flow y MCP nuevos. `DATABASE_URL` y `DIRECT_URL` remotos usan el rol de aplicación; la credencial de migración queda únicamente en el archivo privado local. Ninguna clave OpenAI, Google, Mercado Pago live, Resend, Cloudinary o Vercel de proveedor se cargó al runtime.
- Cron cero; worker apagado y kill switch activo. MP V2 y sus writers/recovery apagados; IA facturable, proactividad, Contact Flow externo y MCP externo apagados. El permiso temporal oficial para automatización de QA fue revocado al terminar: cero bypasses restantes y SSO conservado. Sitios usan publicación de aplicación sobre datos ficticios; no DNS ni conexión de dominio externa.

### Intentos de build, sin ocultar fallos

1. `dpl_6LF3hg9YwPZSsX6chj4Rgxs1LisZ`: error `npm ci`, dos entradas opcionales ausentes del lock. CLI había recibido `--target=preview`, pero el primer upload de un proyecto fue clasificado Production **del staging aislado**. No quedó operativo y no ejecutó migraciones. Se añadió una barrera también antes de instalar.
2. `dpl_3A41EfrP3Cx5Ki5S1PdddjatPYhs`: staging/Preview; instalación, compilación, TypeScript y 164 páginas aprobados. Empaquetado falló `NEXT_OUTPUT_DIR_MISSING`: Vercel buscaba `.next`. Se corrigió sólo el artefacto y se comprobó contra la configuración cargada de Next.
3. `dpl_BkxGsTrcMTeQ1oWrLiRgf5RtYpz8`: Ready tras autorización específica del tercer build. Instalación Linux real, compilación, tipos y empaquetado aprobados. Dos intentos anteriores fallidos no se cuentan como éxitos.

Cada reintento recibió autorización adicional. No hay autorización para un cuarto build. [API de deployment](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment), [protección](https://vercel.com/docs/deployment-protection).

## PostgreSQL, migraciones y respaldo

Neon PuroCode: proyecto `divine-glade-04170205`, branch `br-quiet-fog-bebr4tlj`, base `puragenda_next_staging`, PostgreSQL 17.11, AWS Ohio, Free. La branch nueva se llama `production` dentro de Neon; corresponde únicamente a este proyecto staging independiente, no a la base productiva. Identidad verificada en consola autenticada y en conexión SQL con certificado TLS validado.

El esquema estaba vacío antes de operar. Runner bootstrap/cutover certificado: **17 migraciones registradas**, migrate status actualizado, sin drift, 205 FK, 559 índices, 120 tablas con RLS, sin `pg_cron`. Repetir deploy conservó nombres/checksums/fechas de la historia. No se añadieron ni editaron migraciones Prisma anteriores.

Rol de runtime nuevo, sin superuser, CREATE DATABASE, CREATE ROLE, DDL, CREATE de esquema ni acceso a `_prisma_migrations`. Conserva BYPASSRLS requerido por la arquitectura Prisma del servidor: **no afirmar que RLS aísla tenants bajo ese rol**. El aislamiento de aplicación debe probarse con sesiones/servicios. Prueba SQL adicional con rol restringido vio cero contratos frente a dos sintéticos del propietario; grants y rol de prueba se revirtieron.

Respaldo real Neon con `pg_dump` → clon loopback desechable → modificar negocio → restore del mismo clon → comparar → retirar clon: **142 tablas y 130 filas**, origen sin cambios, mutación revertida, datos y metadatos comparados. TLS estricto y snapshots en UTC. Archivo SHA-256 `267bed60c46c22033d3a7d6f94b592542a83656c08db7b738e42a2bf3037c912`; datos `36ee74d6bc7146f0e7e7bd9334700b67b6670e82a3913010da021812ef0faca9`.

Limitación explícita: dump portable `--no-owner --no-acl`; no se restauraron ownership/grants. Se verificaron privilegios remotos por separado; el runbook productivo debe reponer/verificar sus roles. CHECK se comparan por nombre/validación, FK/PK/UNIQUE y RLS por su contrato/metadatos; no se afirma equivalencia textual completa de CHECK. No se restauró ni modificó producción.

## Certificación por módulo

| Módulo | Prueba local | Prueba remota nueva | Estado |
|---|---|---|---|
| Registro V2 | Antecedentes HTTP y validaciones previas | UI de registro, creación real y entrada a Setup aprobadas; primer trial 30 días; siguiente registro de misma IP sin otro trial | CERTIFICADO CON LIMITACIONES |
| Planes y checkout | Catálogo y contratos previos; sin cambiar precios | Basic/Plus y equipo observados; matriz mensual/anual y contratación externa todavía incompleta | BLOQUEADO |
| Agenda | Suites anteriores, sin contarlas nuevamente | Disponibilidad real interna/widget; reserva pública concurrente un 201 y un 409, replay idempotente, una reserva/cliente y slot retirado. Reprogramación, versión obsoleta, cancelación y replay aprobados; vínculos preservados | CERTIFICADO CON LIMITACIONES |
| Onboarding/Puri | 14 pruebas nuevas de uso comercial, orquestador y Setup; modelos simulados | Registro → propuesta determinista de horarios sin escritura → revisión → tres servicios → disponibilidad → enlace → finalizar y recargar, aprobado. Equipo dos profesionales y horario compartido aprobado con trial sintético explícito | CERTIFICADO CON LIMITACIONES |
| Sitios web Plus | HTTP/editor/multi-tenant anteriores | Login Plus, editor, preview con datos propios, autosave real y borrador aislado aprobados. Publicación rechazó portada incompleta. Subida Cloudinary y publicación completa pendientes | CERTIFICADO CON LIMITACIONES |
| Mercado Pago | Simulaciones y reconciliación anteriores | Sesión y cuentas test observadas; operación sandbox y webhook V2 aún sin certificar | BLOQUEADO |
| Resend | Pruebas de límites/certificado/supresión; simulaciones | Ambos dominios Verified; Free 3.000/mes, 100/día, 10 req/s; no envío ni evento externo | CERTIFICADO CON LIMITACIONES |
| Google Calendar | Antecedentes existentes, no nueva certificación | Sin cuenta de prueba autorizada; configuración existente preservada. Sin OAuth/FreeBusy/escritura/revocación nuevos | NO VERIFICADO |
| Contact Flow | Parte de 35 pruebas nuevas MCP/Contact Flow; consentimiento y límites | Externo apagado; no tick/productor ni envíos. Transporte remoto pendiente | CERTIFICADO CON LIMITACIONES |
| MCP | Contratos, OAuth/scopes y cifrado en 35 pruebas nuevas | Clave nueva sensible: cifrar → persistir Neon → leer → descifrar; alteración/clave distinta rechazadas; transacción revertida. MCP/OAuth remoto apagado y no ejercitado | CERTIFICADO CON LIMITACIONES |
| PostgreSQL | Regresión nueva bootstrap y legacy aprobada | Migración/drift/idempotencia/privilegios/RLS/backups aprobados en proyecto exacto | CERTIFICADO CON LIMITACIONES |
| Seguridad | 48 pruebas de protección/guardas, ocho canarios install/build, ESLint afectado y secret scan | Vercel SSO completo, variables separadas y flags comprobados; clave API ajena rechazada y sesión de otro tenant no puede modificar reserva; SSO final y bypass QA revocado | CERTIFICADO CON LIMITACIONES |
| CI/CD | Comandos relevantes locales; build remoto real aprobado | Dos rulesets activos; Actions no inicia jobs por bloqueo de billing | BLOQUEADO |

### Fallos y omisiones de QA

- El primer adaptador de navegador esperaba la categoría local `puri-demo`, ausente en Neon. Se adaptó al formulario real «Otro» con descripción; no fue un defecto de registro.
- El caso de equipo inicialmente mostró acceso terminado: el contrato era INACTIVE sin trial por reutilizar IP. Se comprobó en SQL y no se cambió antifraude. Dos cuentas sintéticas recibieron trials de fixture para continuar; no confundir esto con una concesión real de trial por registro.
- La continuación aprobó equipo y se detuvo por el límite de solicitudes antes de móvil. Un smoke móvil posterior inició sesión y mostró onboarding a 390 px; el límite bloqueó la continuación con «Failed to fetch». No se considera defecto del producto ni prueba aprobada: **390×844 y 360×800 siguen sin certificación completa**, tampoco móvil checkout/agenda/recuperación. No reutilizar esa captura como evidencia de éxito.
- Una aserción inicial esperaba CSRF en el endpoint de disponibilidad, que es lectura sin mutación; se corrigió el objetivo del harness a Puri. No hubo cambio funcional. Otra ejecución recibió 429 en login; se esperó el periodo sin spoof de IP ni desactivar el limitador. Después login y administración de reservas pasaron. Las respuestas vacías 404 de MCP/worker deshabilitados requirieron adaptar el parser del harness; no se activó ni ejecutó el worker.
- Cero excepciones de página registradas en los recorridos aprobados; esto no certifica todas las pantallas. Hay capturas y videos locales sintéticos; no se suben credenciales, cookies o dumps a Git.
- No se repitieron las miles de pruebas de auditorías anteriores. Regresión final nueva: **100 pruebas únicas / 11 archivos, cero fallos u omisiones**; incluye las 48 de protección/guardas y las de roles/Puri/MCP/Contact Flow, sin sumar ejecuciones repetidas. Prisma validate y TypeScript completo aprobados; build remoto nuevo tipó runtime. ESLint de archivos afectados sin errores. `npm audit --omit=dev`: cero.

## Proveedores y requisitos antes de activación

**Mercado Pago:** aplicación PuragendaSubs / Suscripciones. El panel «Credenciales de prueba» identifica otra aplicación y vendedor test; no inferir live/test por prefijo APP_USR. Verificar `/users/me`, país y etiqueta de test antes de cualquier escritura. La verificación de identidad se completó de nuevo; no se enviaron OTP por chat. No se cambió la URL live. Callback previsto: `https://project-8xjzo.vercel.app/api/webhooks/mercadopago-v2`. Requiere habilitación sandbox acotada, firma test e identificación del vendedor; Vercel SSO seguirá activo. La autorización temporal usada por QA no se debe entregar como enlace público ni dejarla vigente al cerrar. No se probó webhook ni cobro.

**Resend:** simulación predeterminada, sin claves en staging. Dominio/remitente/quota verificados en panel no prueban entrega. Una prueba externa deberá usar el modo test oficial y recipientes reservados, certificado del lab y cuota disponible; no enviar a clientes. No se cambió plan ni pay-as-you-go.

**Calendar:** no es bloqueo declarado de la integración existente. Para nueva certificación se necesita una cuenta de prueba autorizada, OAuth en sesión propia, calendario secundario sintético, FreeBusy/lectura/escritura/revocación y prueba de recuperación. No usar calendarios de clientes. Conservar configuración y permisos actuales; cualquier cambio productivo exige su alcance propio.

**Puri:** onboarding con reglas y ayuda determinista puede funcionar sin inferencias. Consultas de IA estándar no configuradas y Puri+ AI apagado; pruebas locales verifican límites, reservas, ledger y fallo seguro. Las asignaciones explícitas de presupuesto **Puri legacy** son requisito antes de lanzar IA: no habilitar una versión que retire innecesariamente el servicio histórico. Alertas de OpenAI/Vercel no son límites efectivos.

**Retención 07-20:** sigue siendo requisito de lanzamiento de IA/MCP: política aprobada, responsable, plazos por datos/sistemas, eliminación, conservación de evidencia y comprobación del scheduler. La expiración de recibos no prueba purga. No se implementó eliminación arbitraria. MCP productivo no se rotó; reclasificar la clave preservando su valor sólo mediante operación preparada, sin romper recibos pendientes.

**Dependencias 07-21:** 23 paquetes exclusivamente dev, 21 moderados y dos bajos, mismos avisos documentados en [Auditoría 07](../puragenda-next/35-auditoria-07-puri-mcp-onboarding-2026-11-01.md#11-dependencias-de-desarrollo). Nuevo audit productivo cero. Se agregaron al lock únicamente dos entradas opcionales requeridas por npm moderno, sin actualizar versiones existentes ni ejecutar `audit fix`. El diff es necesario para que `npm ci` remoto funcione.

## CI y reglas

Rulesets [26426317](https://github.com/DiegoSalsa/Puragenda/settings/rules/26426317) y [26426379](https://github.com/DiegoSalsa/Puragenda/settings/rules/26426379) Active: main/RC1 sin force push ni eliminación; main por PR, una aprobación y conversaciones resueltas, bypass administrativo sólo por PR.

[Actions 41501071169](https://github.com/DiegoSalsa/Puragenda/actions/runs/41501071169): baseline failure sin pasos; anotación exacta: «The job was not started because your account is locked due to a billing issue.» El panel GitHub confirma problema al facturar. No es un fallo de PostgreSQL/test y no se puede cerrar cambiando YAML. Propietario: GitHub → Settings → Billing and licensing → Payment information, revisar el cobro rechazado con proveedor/GitHub Support; no cambiar plan ni añadir pago por el agente. Tras desbloquear: ejecutar `Security checks` sobre esta rama, verificar PostgreSQL 17 desechable, npm ci/audit/lint/typecheck/test/build y el check real `baseline`. No se añadió como obligatorio antes de demostrar éxito.

## Rollback y lanzamiento

**Rollback directo al main actual: NO SEGURO.** Su cliente Prisma sobre copia sintética del esquema Next aprobó 98 lecturas, pero `Subscription` falla P2023: `PURAGENDA_PLUS` no existe en su enum `SubscriptionPlan`. No basta revertir el deployment de Vercel.

Alternativa comprobada parcialmente: runtime Next `ce9d5dc7e162612d6e0ddd10430a480667d2224d`, mismo código funcional/esquema que el candidato, con cliente actual sobre copia Next: 140 modelos leídos, cero fallos; transacción de suscripción, cliente y cancelación/restablecimiento de reserva conservó tenant e identidades y se revirtió. Es compatibilidad ORM, **no smoke HTTP remoto completo ni autorización de rollback productivo**. Preparar artefacto inmutable compatible y ensayar el smoke antes del lanzamiento. El lock de instalación corregido debe conservarse para recompilar; no volver al lock incompleto.

| Orden | Responsable | Operación y evidencia de avance |
|---|---|---|
| 1 | Técnico + propietario | Cerrar pendientes remotos dentro del presupuesto aceptado; CI real y sandbox MP, sin proveedores live |
| 2 | Ambos socios | Revisar diff/SHA/evidencias y aprobar PR correctivo a RC1; sin bypass, squash ni force push |
| 3 | Propietario + técnico | Aprobar política de retención/presupuestos legacy sólo para capacidades IA/MCP que se pretendan activar |
| 4 | Propietario | Autorizar por separado la ventana productiva, backup previo, migración y deployment; nada de ello está autorizado aquí |
| 5 | Técnico + socio observador | Verificar identidad productiva, roles, backup restaurable y baseline del contrato; aplicar runner certificado con controles; comprobar drift e historia |
| 6 | Técnico | Publicar artefacto aprobado, writers/cron/IA/envíos iniciales apagados; smoke de sesiones, registro, disponibilidad, reserva/idempotencia, clientes y Plus |
| 7 | Propietario | Activar individualmente capacidades certificadas; observar ledger, duplicados, errores y gasto; alertas con responsable |
| 8 | Técnico autorizado | Ante incidente, detener activaciones y usar aplicación compatible con esquema Next o corrección forward ensayada. Restore sólo como último recurso, reconciliando escrituras posteriores y con autorización específica |

Abortar ante drift, referencia distinta, secreto live en staging, acceso cruzado, duplicados, degradación de contratos legacy, deploy inesperado, fallo de backup/roles o gasto fuera del alcance autorizado. No down migrations automáticas. Producción/main y RC1 no se alteran en esta fase.

### Costos y límites

Vercel Pro comparte crédito por equipo. Budget observado US$10 es alerta, Pause false; **no garantiza tope para Preview**. On-demand seguía en US$0 en lectura autenticada de las 17:32 de Chile después de los tres builds; las métricas pueden retrasarse y la duración facturable no estaba disponible. Tres builds autorizados en total (dos errores y uno Ready), sin cuarto build aprobado. Solicitudes iniciales hasta 500 y extensión posterior de 500: máximo combinado 1.000; recursos/prefetch del navegador también cuentan. Vercel observó **979 solicitudes** al detener las pruebas funcionales; después sólo se hicieron dos verificaciones anónimas finales de protección (981 entre la métrica y esas dos comprobaciones, sin tratar una métrica retrasada como medidor instantáneo). No se envía más tráfico de certificación. El harness se detuvo al límite, no se usa una alerta como corte. Neon Free sin upgrade; Resend sin envíos; OpenAI cero inferencias. Sin cron, workers ni automatización Git activos en staging.

## Respuestas de cierre

1. **Staging:** desplegado y login sintético funcional, con Vercel Authentication completa y sin bypass QA vigente.
2. **Neon:** migrada e independiente, sin SQL productivo; privilegios/RLS con los límites indicados.
3. **Build remoto:** tercer intento Ready; dos fallos anteriores documentados.
4. **Registro/checkout/agenda:** registro, disponibilidad, reserva concurrente/idempotente, mover/cancelar y rechazo entre tenants sí; contratación sandbox pendiente.
5. **Onboarding V2:** recorrido individual y equipo aprobados; móvil/recuperación completa pendientes.
6. **Plus/editor:** editor/autosave/preview sí; publicación completa y proveedor de medios no certificados remotamente.
7. **MP sandbox:** no certificado; no pagos reales.
8. **Resend/Calendar/Contact Flow/MCP:** alcance y límites en matriz; Calendar existente preservado, sin nuevas pruebas externas.
9. **Actions:** bloqueado por billing del propietario; no check exitoso nuevo.
10. **Reglas:** dos rulesets activos, allowlist versionada y SSO staging completo; no permisos remotos debilitados al cierre.
11. **Backup/rollback:** restore sintético real aprobado; rollback a main rechazado; alternativa Next compatible con prueba ORM y smoke pendiente.
12. **Consumo:** riesgo Pro aceptado, sin tope efectivo; pruebas acotadas y sin IA/envíos/pagos reales.
13. **Intervención exacta:** el propietario debe resolver el cobro rechazado de GitHub en Billing and licensing → Payment information, o con soporte; el técnico ejecutará entonces baseline y pedirá revisión a RC1. Para MP, completar por canal seguro las credenciales/firma del vendedor test y habilitar el callback de staging, sin tocar live; no basta una sesión abierta. Quedan móvil completo, mensual/anual y publicación externa, para una certificación acotada posterior. Cuenta Calendar sólo si se solicita nueva certificación, sin deshabilitar la integración actual.
14. **Lanzamiento:** **NO-GO — BLOQUEANTE REAL** por CI y contratación/smoke remoto incompletos. No declarar GO CON LIMITACIONES para funciones necesarias sin certificar.

Esta integración no adelanta el lanzamiento. No se desplegó Puragenda productivo, no se migró su base, no se activaron funciones globales, pagos, correos, DNS ni inferencias reales.
