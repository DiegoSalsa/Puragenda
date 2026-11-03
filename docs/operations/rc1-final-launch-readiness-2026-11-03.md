# Puragenda Next — cierre de preproducción y bloqueantes finales

**Comprobación: 2026-11-03. Resultado: NO-GO — BLOQUEANTES TÉCNICOS.**

Base RC1: `a3fd2a35480d8152a33550d42e510291a49664a7`. Producción/main: `e74c92237e47db43425a7d47209520967e51bfb0`. Rama: `fix/puragenda-next-final-launch-blockers`. Ambas referencias locales/remotas conservan los SHA esperados. No se integró esta corrección a RC1 ni a main.

El build local está resuelto. Faltan staging remoto aislado y protección remota general contra previews de ramas antiguas. Esto corrige el veredicto anterior de este informe: **GO CON CONDICIONES no corresponde**. Las lecturas remotas son observaciones puntuales, no monitoreo continuo.

## A. Build y pruebas ejecutadas

Se reprodujeron exactamente cinco TS2307 retirando temporalmente `tests/` del artefacto y restaurándolo después. Los fixtures existen en Git. El `tsconfig.json` general incluye scripts de QA que los importan; `.vercelignore` excluye `tests/`. Esto demuestra la incompatibilidad de ese artefacto; no implica que todo método de integración Git de Vercel aplique `.vercelignore` igual.

`tsconfig.build.json` tipa `src/**`, `next.config.ts` y tipos generados de Next. `next.config.ts` selecciona `typescript.tsconfigPath`, con `ignoreBuildErrors: false`. `npm run typecheck` conserva scripts y fixtures completos. No se copió QA al runtime ni se actualizaron dependencias.

| Comprobación nueva de esta certificación | Resultado / alcance |
|---|---|
| `npm ci` normal | Aprobado; 853 paquetes; postinstall Prisma generate 7.10.0 |
| Prisma validate | Aprobado |
| `npx tsc -p tsconfig.build.json --noEmit` | Runtime aprobado |
| `npm run typecheck` | QA, scripts y fixtures aprobados |
| ESLint | 0 errores, 32 advertencias existentes; script de backup adicional sin errores |
| `node scripts/vercel-build.mjs` | Aprobado; Preview local; 164 páginas; sin migraciones productivas |
| `node scripts/build-commercial-isolated.mjs` | Aprobado también con **Node 24.14.0**, mismo major que Vercel; sin credenciales externas; red limitada a loopback y fuentes públicas Google |
| Protecciones y roles de migraciones | 47/47 aprobadas |
| `npm audit --omit=dev` | 0 vulnerabilidades; permanecen 23 avisos dev: 21 moderados, 2 bajos |

`/barberias/[city]` terminó con PostgreSQL 17 local correctamente migrado. El snapshot que usa junction a `node_modules` falló en Turbopack al resolver la raíz del paquete; el build en la raíz real del worktree terminó. Ese intento fallido no se cuenta como aprobado.

Las suites HTTP sobre una base nueva se ejecutaron **secuencialmente**: bootstrap 6; integrada 19 aserciones (su artefacto incluye además una entrada de duración); sitios 12; servicios/profesionales 13; agenda 14; comercial/recompensas 30; clientes/privacidad 49. Scheduler HTTPS aprobó deshabilitación por defecto, bearer dedicado, rechazo inválido y reintento. Proveedores simulados, cero llamadas de IA o envíos reales.

Los intentos paralelos iniciales interfirieron con fixtures y se descartaron. Billing/privacidad requirieron `node --import tsx`; privacidad necesitó crear su directorio de salida ignorado. Después se repitieron satisfactoriamente. No se presentan esos fallos del harness como aprobados ni resultados históricos como nuevas ejecuciones.

Navegador local: registro sintético, entrada automática al onboarding V2, negocio, horarios, asignación al profesional, servicio, consulta real al motor de disponibilidad y confirmación final. Tras recargar se conservaron el paso y la verificación, no la pantalla transitoria de felicitación. Se mostraron horas y enlace público. Sin inferencias. Se solicitó viewport 390 px, pero el navegador informó 582 px: sin overflow a ese ancho, **sin certificar 390 px**. Mensual/anual, Plus y recorridos remotos/móviles completos quedan pendientes. No se repitieron miles de unitarias.

## B. Vercel y GitHub

Panel autenticado: `purocode-projects/puragenda`, producción Ready en main `e74c922`. Raíz vacía, Node 24.x y build sin override que omita el comando versionado. Ignored Build Step **Automatic**, fuentes heredadas **No restrictions**, cero Deploy Hooks observados (ninguno invocado). Build machine **Elastic**, concurrencia **Run all builds immediately on-demand**, sin checks de promoción.

Commit publicado `1aa408fa23f711ce51c4b75085fcab5b9dff2147`: `git.deploymentEnabled` contiene `**: false`, `main: true` y exclusiones históricas. Vercel devolvió **No matches found** al buscar la rama exacta; GitHub devolvió cero deployments para ese SHA. Esto acredita el bloqueo observado de **esta rama con esta configuración**. No protege retroactivamente ramas sin ese archivo ni impide acciones manuales de administradores.

Cambio preparado, **no aplicado**: Ignored Build Step → **Only build production**. Conserva Production y cancela Preview de ramas antiguas. Vercel puede crear registros CANCELED que consumen cuotas/concurrencia: no equivale a impedir su creación inicial. La allowlist versionada sigue siendo la primera barrera. No se desconectó GitHub ni se modificó el proyecto remoto. [Documentación](https://vercel.com/docs/project-configuration/project-settings).

GitHub autenticado muestra **cero rulesets y ninguna protección clásica**. [Actions 41501071169](https://github.com/DiegoSalsa/Puragenda/actions/runs/41501071169): failure sin pasos, cuenta bloqueada por problema de facturación; codex-security omitido. La rama de corrección no dispara push (workflow limitado a main); cero checks no significa CI aprobado.

El [plan externo](rc1-final-launch-external-plan-2026-11-03.json) prepara reglas para dos socios: historial protegido en main/RC1; PR y una revisión en main. No exige todavía un check imposible de ejecutar. Se corrigió localmente `security.yml`: servicio PostgreSQL 17 desechable, bootstrap certificado y `build:commercial:isolated`, sin credenciales productivas ni variables de base expuestas a las unitarias. Los comandos de bootstrap/build pasaron localmente; el workflow completo aún no se ejecutó en GitHub. Antes de lanzamiento: desbloquear Actions, ejecutar baseline y autorizar exigir su nombre real. El agente no paga ni cambia planes. [Reglas GitHub](https://docs.github.com/en/rest/repos/rules?apiVersion=2026-03-10).

## C. Staging y PostgreSQL

**Staging remoto no creado ni certificado.** No se identificó proyecto Puragenda de staging reutilizable. Vercel Storage no mostró bases. Neon PuroCode mostró Pressita y PuroCode Capture; no se reutilizaron recursos ajenos.

Preparado: proyecto `puragenda-next-staging`, nueva base PostgreSQL **17**, dominio temporal `*.vercel.app` protegido por autenticación, variables exclusivas, sin Git auto-deploy ni dominios propios. No se usará el dominio `next-staging.puragenda.cl` del perfil histórico: DNS no está autorizado.

Crear el proyecto **sin desplegar**. El primer deploy autorizado debe ser **Preview**: importar y pulsar Deploy como Production ejecutaría la rama migradora de `vercel-build.mjs`. Usar primero el bundle bootstrap/cutover de `scripts/prepare-rc1-staging-release.mjs` contra la base nueva identificada en el panel. El fingerprint de URL evita errores de transcripción, pero no prueba aislamiento por sí solo. En el artefacto exclusivo de staging: `crons: []`, `git.deploymentEnabled: false`; no aplicar esos valores al proyecto productivo.

Mantener workers, proveedores, cobros, IA, proactividad y MCP apagados; simulaciones manuales con datos sintéticos. Secretos nuevos sólo en canal protegido. Configuración exacta y etapas de autorización en el plan adjunto.

Migraciones **locales nuevamente ejecutadas**: bootstrap desde cero y actualización legacy aprobados; schemaMatches, legacyDataUnchanged, historyPreserved y repeatedDeployUnchanged verdaderos. Sin cambios Prisma/SQL/migraciones ni ejecución SQL remota.

`node scripts/certify-staging-backup.mjs`: pg_dump → clon nuevo → modificar Business sintético → restore **del mismo clon** → comparar todas las filas y metadatos → eliminar clon. Última ejecución tras el smoke: **142 tablas, 597 filas, 7.508 ms**, datos restaurados idénticos, origen sin modificaciones. También pasó antes del smoke (541 filas, 5.859 ms). FK/PK/UNIQUE y RLS/políticas idénticas; CHECK comparados por nombre/validación, sin afirmar equivalencia semántica completa. PostgreSQL normaliza paréntesis de CHECK al restaurar: el primer intento literal falló por eso y se corrigió el alcance antes de repetir. Archivo dump y credenciales quedan en scratch ignorado. RLS catalogada no sustituye pruebas bajo el usuario real remoto.

## D. Matriz de integraciones

| Área | Estado real y evidencia | Bloqueante |
|---|---|---|
| Vercel | Rama corregida sin deployment observado; protección global pendiente | Sí |
| PostgreSQL | Migraciones, diff y restore certificados localmente; remoto pendiente | Sí |
| GitHub | Sin reglas; CI bloqueado por facturación | Sí |
| Registro | HTTP y navegador local; trial/catálogo sintéticos | Smoke remoto |
| Checkout | Simulado; cero suscripciones/pagos reales | Sandbox externo |
| Mercado Pago | Sesión autorizada; PuragendaSubs/Suscripciones; cuentas test existen; URLs test/live apuntan a raíz productiva | Entrega sandbox sin certificar |
| Resend | `puragenda.cl` y `contacto.puragenda.cl` Verified; envíos simulados; webhook transitorio deshabilitado | Antes de correo externo |
| Google Calendar | App verificada, cliente Puragenda Web Production; sin cuenta de prueba/OAuth ejercitado | Antes de Calendar |
| Puri/OpenAI | Ledger/límites locales; sin inferencias; modelo remoto enmascarado y organización no correlacionada con clave Vercel | Antes de IA |
| MCP | Controles locales; apagado; alerta de clasificación de secreto explicada abajo | Antes de MCP |
| Contact Flow | HTTP: consentimiento, supresión, worker e idempotencia; cero envíos | Antes de liberar envíos |
| Onboarding | Registro → horarios → servicio → disponibilidad local; sin rediseño | Smoke remoto |
| Sitios web | Publicación, medios, recuperación y aislamiento HTTP simulados | Smoke remoto |
| Seguridad | Escaneo por patrones, permisos y metadatos RLS locales | Aislamiento remoto pendiente |

**Mercado Pago:** no se usaron valores de credenciales, no se enviaron pruebas a producción ni se guardó configuración. URL global observada en ambos modos: `https://www.puragenda.cl/`. Handler V2 del código: `/api/webhooks/mercadopago-v2`; algunas operaciones pasan `notification_url` propio. La raíz no demuestra que todos los pagos fallen, pero no acredita entrega al handler. Falta callback HTTPS de staging, credenciales test exclusivas y ensayar firma, suscripciones sandbox, reintentos, idempotencia, conciliación y recuperación. No cambiar URL live durante esta fase.

**MCP:** tooltip exacto: la variable parece un secreto y sugiere rotarlo/guardarlo como Secret. Clasificación **Config**, ámbito **Production**, editada 19 de octubre. No prueba compromiso, formato inválido ni fallo de cifrado; valor no revelado. El código requiere base64/32 bytes y AES-256-GCM sin key id ni fallback. Sustituirla directamente puede romper recibos pendientes.

Procedimiento pendiente: conservar el valor y clasificarlo Secret si el panel lo permite de forma segura. Si existe evidencia que exija rotación: inventariar pendientes sin exportar payloads, pausar escrituras MCP, preparar compatibilidad de descifrado/versionado y probarla en staging antes del cambio. La ventana de 24 h no acredita purga si cleanup no corre. No cambiar clave ni purgar arbitrariamente. Retención 07-20 y presupuestos de Puri legacy siguen como requisitos antes de lanzar IA/MCP.

## E. Costos observados

Cifras del panel a la fecha, variables y agregadas por equipo; no una cotización.

| Proveedor | Observación | Límite práctico |
|---|---|---|
| Vercel | **Pro**, ciclo 1 nov–1 dic, crédito $0,28/$20 usado; Elastic/on-demand | Staging consume crédito y puede tener sobrecosto; no prometer costo marginal cero |
| Neon | Free $0/mes; panel: 1 GB, 100 horas cómputo, 10 ramas por proyecto | Crear PG17 sin upgrade; no se creó recurso |
| Resend | Free; 94/3.000 mensual, 3/100 diario, 2/3 dominios, 10 req/s | Cuota compartida; cero correos de prueba a clientes |
| OpenAI | Org visible: $100, **Limit not enforced**, alertas 80/100, gasto $0 | No se pudo asociar a Puragenda; no acredita corte efectivo |
| Google Cloud | Sin cuenta billing asociada al proyecto observado | Cuota OAuth no equivale a cuota Calendar |

Propuesta **sin aplicar**: alertas Vercel 50/80/100% del crédito, una certificación manual por vez, sin cron, IA y envíos cero en staging inicial, Neon suspendido cuando no se use, logs sin prompts/tokens/OAuth/PII. Antes de IA verificar proyecto/clave real, modelo/precios, presupuesto por negocio y límite efectivo: las alertas por sí solas no cortan tráfico. [OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits).

## F. Secuencia de lanzamiento y rollback

| Orden | Responsable | Operación y puerta de avance |
|---|---|---|
| 1 | Propietario + técnico | Autorizar controles remotos preparados; resolver billing Actions; verificar reglas y baseline |
| 2 | Técnico autorizado | Crear Vercel separado y Neon PG17 Free; registrar identidad, endpoints y roles; sin variables compartidas |
| 3 | Técnico | Migrar nueva base con bundle certificado; drift, FK, roles/RLS, tenants y backup-mutación-restore |
| 4 | Propietario | Autorizar primer Preview protegido tras comprobar aislamiento, flags, secretos y cero cron |
| 5 | Técnico | Smoke remoto: Basic/Plus, mensual/anual, 30 días Chile/CLP, agenda/concurrencia, onboarding, editor/reserva, móvil y permisos; simulaciones |
| 6 | Propietario + técnico | Autorizar cuentas test por proveedor; certificar MP sandbox y Calendar OAuth; IA/envíos siguen apagados salvo autorización precisa |
| 7 | Ambos socios | Revisar SHA/evidencias/retención/costos y aprobar integración a RC1; ninguna integración automática |
| 8 | Propietario | Autorizar separadamente ventana, backup productivo, migraciones forward-only y deploy; esta fase no los autoriza |
| 9 | Técnico + socio observador | Smoke y monitoreo; activar capacidades una por una; abortar según criterios inferiores |

Variables: DATABASE_URL/DIRECT_URL exclusivos, AUTH_SECRET nuevo, APP_URL/NEXT_PUBLIC_APP_URL, flags adjuntos; proveedor sandbox y callback, EMAIL_FROM verificado, modelo/precios/presupuestos IA y secretos separados de cron/MCP. Valores sensibles fuera de Git.

Rollback probado aquí: restore **sintético**. Schema de corrección idéntico a RC1; sin migraciones nuevas. No se demostró compatibilidad del main histórico con el futuro schema Next: **no recomendar rollback directo a main** hasta ejecutar esa versión contra una copia sintética posterior y probar reservas/pagos/integridad. No down migrations ni restore productivo en esta fase.

- Build: no promover, conservar deployment Ready anterior. Revertir el fix de build reintroduce el problema de fixtures y no se recomienda como solución.
- Aplicación/reservas: detener promoción/activaciones, preservar evidencia sin PII, corrección forward; no reintentar escrituras a ciegas.
- Migración: abortar antes del deploy, conservar backup y preparar corrección forward ensayada. Restore productivo requiere autorización y reconciliar escrituras posteriores.
- Pagos/correo: detener writer/worker afectado bajo autorización; preservar ledger/idempotencia y conciliar antes de reintentar; no cancelar suscripciones reales automáticamente.
- Recursos: IA/envíos apagados, detener staging autorizado y revisar límites/colas; una alerta no prueba corte de costos.

Abortar ante drift, secreto live en staging, acceso cross-tenant, reservas/cobros duplicados, deploy inesperado, cambios de main/producción o costos sin límite verificable.

## G. Diez respuestas de cierre

1. **Build completo:** sí en local aislado; sin deploy remoto de certificación.
2. **Previews:** ninguno observado para el SHA corregido; control general aún pendiente.
3. **Producción:** main/RC1 intactas; Vercel Ready en SHA esperado; sin mutaciones productivas por este trabajo.
4. **Staging real:** local sí, remoto no.
5. **Migraciones/backup:** certificados localmente; repetir en recurso remoto independiente.
6. **Proveedores:** paneles leídos y simulaciones locales; sandbox end-to-end/OAuth pendientes.
7. **GitHub:** sin reglas activas; Actions bloqueado por billing.
8. **Bloqueantes:** staging/aislamiento remoto, protección global previews/GitHub, CI operativo, smoke y proveedores a activar.
9. **Riesgos/costos:** Vercel Elastic/on-demand, OpenAI no atribuible ni limitado, cuotas Resend compartidas, callback MP y rollback histórico pendientes.
10. **Lanzamiento:** **NO-GO**. Corrección preparada; sin autorización de lanzamiento ni merge.

No se desplegó Next a producción, no hubo SQL remoto, pagos reales, correos a clientes, inferencias facturables, cambios DNS, planes, secretos remotos ni datos reales. No se publican URLs de hooks, tokens, cookies ni credenciales.
